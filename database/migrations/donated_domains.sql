-- Migration for donated domains feature
-- This allows users to share their domains for others to use as subdomains

-- Create donated_domains table
CREATE TABLE IF NOT EXISTS donated_domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    donor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add donated domain support to user_pages table
ALTER TABLE user_pages 
ADD COLUMN IF NOT EXISTS donated_domain_id UUID REFERENCES donated_domains(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_using_donated_domain BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donated_domains_active ON donated_domains(is_active, domain_name);
CREATE INDEX IF NOT EXISTS idx_donated_domains_donor ON donated_domains(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donated_domain_usage_domain ON donated_domain_usage(donated_domain_id);
CREATE INDEX IF NOT EXISTS idx_user_pages_donated_domain ON user_pages(donated_domain_id);

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

-- Create triggers to automatically update subdomain counts
DROP TRIGGER IF EXISTS tr_update_donated_domain_count_insert ON donated_domain_usage;
CREATE TRIGGER tr_update_donated_domain_count_insert
    AFTER INSERT ON donated_domain_usage
    FOR EACH ROW EXECUTE FUNCTION update_donated_domain_count();

DROP TRIGGER IF EXISTS tr_update_donated_domain_count_delete ON donated_domain_usage;
CREATE TRIGGER tr_update_donated_domain_count_delete
    AFTER DELETE ON donated_domain_usage
    FOR EACH ROW EXECUTE FUNCTION update_donated_domain_count();

-- RLS (Row Level Security) policies
ALTER TABLE donated_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE donated_domain_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active donated domains
CREATE POLICY "Users can view active donated domains" ON donated_domains
    FOR SELECT USING (is_active = true);

-- Policy: Users can only manage their own donated domains
CREATE POLICY "Users can manage their own donated domains" ON donated_domains
    FOR ALL USING (auth.uid() = donor_user_id);

-- Policy: Users can view usage of donated domains they own
CREATE POLICY "Donors can view their domain usage" ON donated_domain_usage
    FOR SELECT USING (
        donated_domain_id IN (
            SELECT id FROM donated_domains WHERE donor_user_id = auth.uid()
        )
    );

-- Policy: System can manage donated domain usage (for API operations)
CREATE POLICY "System can manage donated domain usage" ON donated_domain_usage
    FOR ALL USING (true);

-- Add some sample donated domains (optional - remove in production)
-- INSERT INTO donated_domains (domain_name, donor_user_id, cloudflare_zone_id, cloudflare_api_token, donation_message, contact_email)
-- VALUES 
--     ('example.com', (SELECT id FROM auth.users LIMIT 1), 'sample_zone_id', 'sample_token', 'Free subdomains for everyone!', 'admin@example.com'),
--     ('freesite.org', (SELECT id FROM auth.users LIMIT 1), 'sample_zone_id_2', 'sample_token_2', 'Supporting the community', 'help@freesite.org');

COMMENT ON TABLE donated_domains IS 'Stores domains donated by users for community use';
COMMENT ON TABLE donated_domain_usage IS 'Tracks which subdomains are being used on donated domains';
COMMENT ON COLUMN donated_domains.cloudflare_api_token IS 'Store encrypted in production for security';
COMMENT ON COLUMN donated_domains.max_subdomains IS 'Prevents abuse by limiting subdomains per domain';
