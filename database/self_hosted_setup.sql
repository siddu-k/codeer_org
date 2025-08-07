-- CODEER Platform - Complete Database Setup for Self-Hosted Supabase
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.project_tags CASCADE;
DROP TABLE IF EXISTS public.project_comments CASCADE;
DROP TABLE IF EXISTS public.project_likes CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.team_applications CASCADE;
DROP TABLE IF EXISTS public.teamup_contacts CASCADE;
DROP TABLE IF EXISTS public.team_slots CASCADE;
DROP TABLE IF EXISTS public.teamup_posts CASCADE;
DROP TABLE IF EXISTS public.donated_domain_usage CASCADE;
DROP TABLE IF EXISTS public.donated_domains CASCADE;
DROP TABLE IF EXISTS public.page_deployments CASCADE;
DROP TABLE IF EXISTS public.user_pages CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS public.increment_team_slot_filled(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_donated_domain_count() CASCADE;

-- Drop enum types if they exist
DROP TYPE IF EXISTS project_category CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS contact_method CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS team_category CASCADE;

-- Create enum types
CREATE TYPE team_category AS ENUM ('startup', 'hackathon', 'open-source', 'learning', 'competition');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE contact_method AS ENUM ('Discord', 'Email', 'LinkedIn', 'Twitter', 'GitHub', 'Telegram', 'WhatsApp', 'Slack', 'Website', 'Other');
CREATE TYPE project_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE project_category AS ENUM ('web-app', 'mobile-app', 'desktop-app', 'game', 'ai-ml', 'blockchain', 'iot', 'api', 'library', 'tool', 'other');

-- 1. USERS TABLE (Core user management with GitHub integration)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT, 
    github_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TEAMUP POSTS TABLE (Team collaboration features)
CREATE TABLE IF NOT EXISTS public.teamup_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT,
    goal TEXT,
    timeline TEXT,
    category team_category DEFAULT 'startup',
    requirements TEXT,
    image_url TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TEAM SLOTS TABLE (Roles needed for each TeamUp)
CREATE TABLE IF NOT EXISTS public.team_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    filled INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TEAMUP CONTACTS TABLE (Contact information for TeamUp posts)
CREATE TABLE IF NOT EXISTS public.teamup_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    contact_type contact_method NOT NULL,
    contact_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TEAM APPLICATIONS TABLE (Applications to join teams)
CREATE TABLE IF NOT EXISTS public.team_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    applicant_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    experience TEXT,
    portfolio TEXT,
    motivation TEXT,
    availability TEXT,
    status application_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teamup_post_id, applicant_id, role)
);

-- 6. TEAM MEMBERS TABLE (Accepted applications)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(teamup_post_id, user_id)
);

-- 7. PROJECTS TABLE (Project Expo - Published Projects)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    category project_category DEFAULT 'other',
    tech_stack TEXT[], -- Array of technologies used
    github_url TEXT,
    live_demo_url TEXT,
    documentation_url TEXT,
    thumbnail_url TEXT,
    images TEXT[], -- Array of project screenshots/images
    features TEXT[], -- Array of key features
    status project_status DEFAULT 'published',
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PROJECT LIKES TABLE (For tracking who liked what)
CREATE TABLE IF NOT EXISTS public.project_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 9. PROJECT COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.project_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. PROJECT TAGS TABLE (For better discoverability)
CREATE TABLE IF NOT EXISTS public.project_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, tag)
);

-- 11. USER PAGES TABLE (GitHub Pages hosting feature)
CREATE TABLE IF NOT EXISTS public.user_pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- 12. PAGE DEPLOYMENTS TABLE (Deployment tracking)
CREATE TABLE IF NOT EXISTS public.page_deployments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.user_pages(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deployed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    commit_sha VARCHAR(40),
    file_changes INTEGER DEFAULT 0,
    build_logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. DONATED DOMAINS TABLE
CREATE TABLE IF NOT EXISTS public.donated_domains (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    donor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- 14. DONATED DOMAIN USAGE TABLE
CREATE TABLE IF NOT EXISTS public.donated_domain_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    donated_domain_id UUID NOT NULL REFERENCES public.donated_domains(id) ON DELETE CASCADE,
    user_page_id UUID NOT NULL REFERENCES public.user_pages(id) ON DELETE CASCADE,
    subdomain VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique subdomain per donated domain
    UNIQUE(donated_domain_id, subdomain)
);

-- Add foreign key constraint for donated domains
ALTER TABLE public.user_pages 
ADD CONSTRAINT fk_user_pages_donated_domain 
FOREIGN KEY (donated_domain_id) REFERENCES public.donated_domains(id) ON DELETE SET NULL;

-- CREATE INDEXES for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_github_username ON public.users(github_username);

CREATE INDEX IF NOT EXISTS idx_teamup_posts_user_id ON public.teamup_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_teamup_posts_category ON public.teamup_posts(category);
CREATE INDEX IF NOT EXISTS idx_teamup_posts_is_active ON public.teamup_posts(is_active);
CREATE INDEX IF NOT EXISTS idx_teamup_posts_created_at ON public.teamup_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_slots_teamup_post_id ON public.team_slots(teamup_post_id);
CREATE INDEX IF NOT EXISTS idx_teamup_contacts_teamup_post_id ON public.teamup_contacts(teamup_post_id);

CREATE INDEX IF NOT EXISTS idx_team_applications_teamup_post_id ON public.team_applications(teamup_post_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_applicant_id ON public.team_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_team_applications_status ON public.team_applications(status);

CREATE INDEX IF NOT EXISTS idx_team_members_teamup_post_id ON public.team_members(teamup_post_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_likes_count ON public.projects(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_views_count ON public.projects(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON public.projects(is_featured);

CREATE INDEX IF NOT EXISTS idx_project_likes_project_id ON public.project_likes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_user_id ON public.project_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_user_id ON public.project_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON public.project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON public.project_tags(tag);

CREATE INDEX IF NOT EXISTS idx_user_pages_user_id ON public.user_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pages_subdomain_domain ON public.user_pages(subdomain, domain);
CREATE INDEX IF NOT EXISTS idx_user_pages_status ON public.user_pages(status);
CREATE INDEX IF NOT EXISTS idx_user_pages_full_domain ON public.user_pages(full_domain);
CREATE INDEX IF NOT EXISTS idx_user_pages_donated_domain ON public.user_pages(donated_domain_id);

CREATE INDEX IF NOT EXISTS idx_page_deployments_page_id ON public.page_deployments(page_id);
CREATE INDEX IF NOT EXISTS idx_page_deployments_status ON public.page_deployments(status);

CREATE INDEX IF NOT EXISTS idx_donated_domains_active ON public.donated_domains(is_active, domain_name);
CREATE INDEX IF NOT EXISTS idx_donated_domains_donor ON public.donated_domains(donor_user_id);

CREATE INDEX IF NOT EXISTS idx_donated_domain_usage_domain ON public.donated_domain_usage(donated_domain_id);
CREATE INDEX IF NOT EXISTS idx_donated_domain_usage_subdomain ON public.donated_domain_usage(subdomain);

-- CREATE FUNCTIONS

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update subdomain count
CREATE OR REPLACE FUNCTION update_donated_domain_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment count when subdomain is used
        UPDATE public.donated_domains 
        SET current_subdomains = current_subdomains + 1,
            updated_at = NOW()
        WHERE id = NEW.donated_domain_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement count when subdomain is removed
        UPDATE public.donated_domains 
        SET current_subdomains = current_subdomains - 1,
            updated_at = NOW()
        WHERE id = OLD.donated_domain_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to increment team slot filled count
CREATE OR REPLACE FUNCTION increment_team_slot_filled(post_id UUID, slot_role TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.team_slots 
    SET filled = filled + 1 
    WHERE teamup_post_id = post_id AND role = slot_role AND filled < count;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGERS

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teamup_posts_updated_at BEFORE UPDATE ON public.teamup_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_applications_updated_at BEFORE UPDATE ON public.team_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_comments_updated_at BEFORE UPDATE ON public.project_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_pages_updated_at BEFORE UPDATE ON public.user_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_donated_domains_updated_at BEFORE UPDATE ON public.donated_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for donated domain count management
CREATE TRIGGER tr_update_donated_domain_count_insert
    AFTER INSERT ON public.donated_domain_usage
    FOR EACH ROW EXECUTE FUNCTION update_donated_domain_count();

CREATE TRIGGER tr_update_donated_domain_count_delete
    AFTER DELETE ON public.donated_domain_usage
    FOR EACH ROW EXECUTE FUNCTION update_donated_domain_count();

-- CREATE VIEWS (Optional - for easier data access)

-- View for project statistics
CREATE OR REPLACE VIEW project_stats AS
SELECT 
    user_id,
    COUNT(*) as total_projects,
    SUM(likes_count) as total_likes,
    SUM(views_count) as total_views,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_projects,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_projects
FROM public.projects 
GROUP BY user_id;

-- View for user page statistics
CREATE OR REPLACE VIEW page_stats AS
SELECT 
    user_id,
    COUNT(*) as total_pages,
    SUM(page_views) as total_page_views,
    SUM(file_count) as total_files,
    SUM(repo_size) as total_storage
FROM public.user_pages 
WHERE status != 'disabled'
GROUP BY user_id;

-- GRANT PERMISSIONS (adjust based on your needs)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT SELECT ON project_stats TO anon, authenticated;
GRANT SELECT ON page_stats TO anon, authenticated;

-- ADD COMMENTS for documentation
COMMENT ON TABLE public.users IS 'User accounts with GitHub integration';
COMMENT ON TABLE public.teamup_posts IS 'Team collaboration posts';
COMMENT ON TABLE public.projects IS 'User project showcases';
COMMENT ON TABLE public.user_pages IS 'User-created pages with GitHub Pages hosting';
COMMENT ON TABLE public.page_deployments IS 'Deployment history and status tracking';
COMMENT ON TABLE public.donated_domains IS 'Domains donated by users for community use';
COMMENT ON TABLE public.donated_domain_usage IS 'Tracks which subdomains are being used on donated domains';

COMMENT ON COLUMN public.donated_domains.cloudflare_api_token IS 'Store encrypted in production for security';
COMMENT ON COLUMN public.donated_domains.max_subdomains IS 'Prevents abuse by limiting subdomains per domain';
COMMENT ON COLUMN public.user_pages.metadata IS 'Flexible JSON storage for page metadata';
COMMENT ON COLUMN public.user_pages.repo_size IS 'Repository size in bytes';

-- DATABASE SETUP COMPLETE
-- Your Supabase database is now ready for the CODEER platform!
