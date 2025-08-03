-- Complete Pages System Migration
-- This creates all tables needed for the pages feature including donated domains

-- Create users table (if not exists from auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    github_username VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_pages table
CREATE TABLE IF NOT EXISTS user_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) NOT NULL, -- DNS subdomain limit
    domain VARCHAR(255) NOT NULL,
    full_domain VARCHAR(255) NOT NULL, -- subdomain.domain
    github_repo VARCHAR(255) NOT NULL,
    github_pages_url TEXT,
    custom_domain_url TEXT,
    status VARCHAR(20) DEFAULT 'creating' CHECK (status IN ('creating', 'active', 'error', 'disabled')),
    deployment_status VARCHAR(20) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'building', 'deployed', 'failed')),
    file_count INTEGER DEFAULT 0,
    repo_size BIGINT DEFAULT 0, -- bytes
    page_views INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Donated domain support
    donated_domain_id UUID,
    is_using_donated_domain BOOLEAN DEFAULT false,
    
    -- Metadata as JSONB for flexibility
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    UNIQUE(subdomain, domain), -- Prevent duplicate subdomains on same domain
    CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$'),
    CONSTRAINT valid_domain CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$')
);

-- Create page_deployments table for deployment tracking
CREATE TABLE IF NOT EXISTS page_deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES user_pages(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deployed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    commit_sha VARCHAR(40),
    file_changes INTEGER DEFAULT 0,
    build_logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create donated_domains table
CREATE TABLE IF NOT EXISTS donated_domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    donor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cloudflare_zone_id VARCHAR(255) NOT NULL,
    cloudflare_api_token TEXT NOT NULL, -- Encrypted storage recommended in production
    is_active BOOLEAN DEFAULT true,
    max_subdomains INTEGER DEFAULT 100, -- Limit subdomains per donated domain
    current_subdomains INTEGER DEFAULT 0,
    donation_message TEXT,
    contact_email VARCHAR(255),
    terms_of_use TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_domain_name CHECK (domain_name ~ '^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$'),
    CONSTRAINT positive_limits CHECK (max_subdomains > 0 AND current_subdomains >= 0),
    CONSTRAINT subdomain_limit CHECK (current_subdomains <= max_subdomains)
);

-- Create donated_domain_usage table to track subdomain usage
CREATE TABLE IF NOT EXISTS donated_domain_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donated_domain_id UUID NOT NULL REFERENCES donated_domains(id) ON DELETE CASCADE,
    user_page_id UUID NOT NULL REFERENCES user_pages(id) ON DELETE CASCADE,
    subdomain VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique subdomain per donated domain
    UNIQUE(donated_domain_id, subdomain)
);

-- Add foreign key constraint for donated domains (after table creation)
ALTER TABLE user_pages 
ADD CONSTRAINT fk_user_pages_donated_domain 
FOREIGN KEY (donated_domain_id) REFERENCES donated_domains(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_pages_user_id ON user_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pages_subdomain_domain ON user_pages(subdomain, domain);
CREATE INDEX IF NOT EXISTS idx_user_pages_status ON user_pages(status);
CREATE INDEX IF NOT EXISTS idx_user_pages_full_domain ON user_pages(full_domain);
CREATE INDEX IF NOT EXISTS idx_user_pages_donated_domain ON user_pages(donated_domain_id);

CREATE INDEX IF NOT EXISTS idx_page_deployments_page_id ON page_deployments(page_id);
CREATE INDEX IF NOT EXISTS idx_page_deployments_status ON page_deployments(status);

CREATE INDEX IF NOT EXISTS idx_donated_domains_active ON donated_domains(is_active, domain_name);
CREATE INDEX IF NOT EXISTS idx_donated_domains_donor ON donated_domains(donor_user_id);

CREATE INDEX IF NOT EXISTS idx_donated_domain_usage_domain ON donated_domain_usage(donated_domain_id);
CREATE INDEX IF NOT EXISTS idx_donated_domain_usage_subdomain ON donated_domain_usage(subdomain);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);

-- Create function to update subdomain count
CREATE OR REPLACE FUNCTION update_donated_domain_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment count when subdomain is used
        UPDATE donated_domains 
        SET current_subdomains = current_subdomains + 1,
            updated_at = NOW()
        WHERE id = NEW.donated_domain_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement count when subdomain is removed
        UPDATE donated_domains 
        SET current_subdomains = current_subdomains - 1,
            updated_at = NOW()
        WHERE id = OLD.donated_domain_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user_pages updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update subdomain counts
DROP TRIGGER IF EXISTS tr_update_donated_domain_count_insert ON donated_domain_usage;
CREATE TRIGGER tr_update_donated_domain_count_insert
    AFTER INSERT ON donated_domain_usage
    FOR EACH ROW EXECUTE FUNCTION update_donated_domain_count();

DROP TRIGGER IF EXISTS tr_update_donated_domain_count_delete ON donated_domain_usage;
CREATE TRIGGER tr_update_donated_domain_count_delete
    AFTER DELETE ON donated_domain_usage
    FOR EACH ROW EXECUTE FUNCTION update_donated_domain_count();

-- Create triggers to update timestamps
DROP TRIGGER IF EXISTS tr_update_user_pages_updated_at ON user_pages;
CREATE TRIGGER tr_update_user_pages_updated_at
    BEFORE UPDATE ON user_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_users_updated_at ON users;
CREATE TRIGGER tr_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_donated_domains_updated_at ON donated_domains;
CREATE TRIGGER tr_update_donated_domains_updated_at
    BEFORE UPDATE ON donated_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security) if using Supabase
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_pages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_deployments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE donated_domains ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE donated_domain_usage ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (uncomment if using Supabase Auth)
-- 
-- -- Users can only see their own data
-- CREATE POLICY "Users can view own data" ON users
--     FOR SELECT USING (auth.uid() = id);
-- 
-- CREATE POLICY "Users can update own data" ON users
--     FOR UPDATE USING (auth.uid() = id);
-- 
-- -- Users can manage their own pages
-- CREATE POLICY "Users can manage own pages" ON user_pages
--     FOR ALL USING (user_id = auth.uid());
-- 
-- -- Users can view their own deployments
-- CREATE POLICY "Users can view own deployments" ON page_deployments
--     FOR SELECT USING (
--         page_id IN (SELECT id FROM user_pages WHERE user_id = auth.uid())
--     );
-- 
-- -- Users can view all active donated domains
-- CREATE POLICY "Users can view active donated domains" ON donated_domains
--     FOR SELECT USING (is_active = true);
-- 
-- -- Users can only manage their own donated domains
-- CREATE POLICY "Users can manage own donated domains" ON donated_domains
--     FOR ALL USING (donor_user_id = auth.uid());
-- 
-- -- Users can view usage of donated domains they own
-- CREATE POLICY "Donors can view their domain usage" ON donated_domain_usage
--     FOR SELECT USING (
--         donated_domain_id IN (
--             SELECT id FROM donated_domains WHERE donor_user_id = auth.uid()
--         )
--     );

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with GitHub integration';
COMMENT ON TABLE user_pages IS 'User-created pages with GitHub Pages hosting';
COMMENT ON TABLE page_deployments IS 'Deployment history and status tracking';
COMMENT ON TABLE donated_domains IS 'Domains donated by users for community use';
COMMENT ON TABLE donated_domain_usage IS 'Tracks which subdomains are being used on donated domains';

COMMENT ON COLUMN donated_domains.cloudflare_api_token IS 'Store encrypted in production for security';
COMMENT ON COLUMN donated_domains.max_subdomains IS 'Prevents abuse by limiting subdomains per domain';
COMMENT ON COLUMN user_pages.metadata IS 'Flexible JSON storage for page metadata';
COMMENT ON COLUMN user_pages.repo_size IS 'Repository size in bytes';

-- Insert some example data (remove in production)
-- INSERT INTO users (email, display_name, github_username) VALUES 
-- ('admin@codeer.org', 'Admin User', 'admin')
-- ON CONFLICT (email) DO NOTHING;

COMMIT;
