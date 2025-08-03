-- Migration for Pages Feature
-- Run this in your Supabase SQL editor

-- Create user_pages table
CREATE TABLE IF NOT EXISTS user_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subdomain TEXT NOT NULL,
    domain TEXT NOT NULL,
    full_domain TEXT NOT NULL,
    github_repo TEXT NOT NULL,
    github_pages_url TEXT,
    custom_domain_url TEXT,
    status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'active', 'error', 'disabled')),
    deployment_status TEXT NOT NULL DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'building', 'deployed', 'failed')),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    file_count INTEGER DEFAULT 0,
    repo_size INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create page_deployments table
CREATE TABLE IF NOT EXISTS page_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES user_pages(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deployed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    commit_sha TEXT,
    file_changes INTEGER DEFAULT 0,
    build_logs TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_pages_user_id ON user_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pages_subdomain_domain ON user_pages(subdomain, domain);
CREATE INDEX IF NOT EXISTS idx_user_pages_status ON user_pages(status);
CREATE INDEX IF NOT EXISTS idx_user_pages_created_at ON user_pages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_deployments_page_id ON page_deployments(page_id);
CREATE INDEX IF NOT EXISTS idx_page_deployments_started_at ON page_deployments(started_at DESC);

-- Create unique constraint for active subdomains
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_subdomain_domain 
ON user_pages(subdomain, domain) 
WHERE status != 'disabled';

-- Create RLS (Row Level Security) policies
ALTER TABLE user_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_deployments ENABLE ROW LEVEL SECURITY;

-- Policy for user_pages: Users can only see/manage their own pages
CREATE POLICY "Users can view their own pages" ON user_pages
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own pages" ON user_pages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own pages" ON user_pages
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own pages" ON user_pages
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Policy for page_deployments: Users can only see deployments for their pages
CREATE POLICY "Users can view deployments for their pages" ON page_deployments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_pages 
        WHERE user_pages.id = page_deployments.page_id 
        AND user_pages.user_id::text = auth.uid()::text
    ));

CREATE POLICY "Users can insert deployments for their pages" ON page_deployments
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM user_pages 
        WHERE user_pages.id = page_deployments.page_id 
        AND user_pages.user_id::text = auth.uid()::text
    ));

CREATE POLICY "Users can update deployments for their pages" ON page_deployments
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM user_pages 
        WHERE user_pages.id = page_deployments.page_id 
        AND user_pages.user_id::text = auth.uid()::text
    ));

-- Create function to increment page views
CREATE OR REPLACE FUNCTION increment_page_views(page_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_pages 
    SET page_views = COALESCE(page_views, 0) + 1,
        last_updated = NOW()
    WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_updated
CREATE TRIGGER update_user_pages_updated_at 
    BEFORE UPDATE ON user_pages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_pages TO anon, authenticated;
GRANT ALL ON page_deployments TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_page_views(UUID) TO anon, authenticated;

-- Create view for page statistics
CREATE OR REPLACE VIEW page_stats AS
SELECT 
    user_id,
    COUNT(*) as total_pages,
    COUNT(*) FILTER (WHERE status = 'active') as active_pages,
    COUNT(*) FILTER (WHERE status = 'error') as error_pages,
    COUNT(*) FILTER (WHERE deployment_status = 'deployed') as deployed_pages,
    SUM(page_views) as total_views,
    SUM(file_count) as total_files,
    SUM(repo_size) as total_storage
FROM user_pages 
WHERE status != 'disabled'
GROUP BY user_id;

GRANT SELECT ON page_stats TO anon, authenticated;
