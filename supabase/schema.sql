-- DROP ALL EXISTING OBJECTS FIRST (Clean slate)
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.project_tags CASCADE;
DROP TABLE IF EXISTS public.project_comments CASCADE;
DROP TABLE IF EXISTS public.project_likes CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.team_applications CASCADE;
DROP TABLE IF EXISTS public.teamup_contacts CASCADE;
DROP TABLE IF EXISTS public.team_slots CASCADE;
DROP TABLE IF EXISTS public.teamup_posts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.increment_team_slot_filled(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS project_category CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS contact_method CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS team_category CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE team_category AS ENUM ('startup', 'hackathon', 'open-source', 'learning', 'competition');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE contact_method AS ENUM ('Discord', 'Email', 'LinkedIn', 'Twitter', 'GitHub', 'Telegram', 'WhatsApp', 'Slack', 'Website', 'Other');
CREATE TYPE project_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE project_category AS ENUM ('web-app', 'mobile-app', 'desktop-app', 'game', 'ai-ml', 'blockchain', 'iot', 'api', 'library', 'tool', 'other');

-- Users table (standalone for NextAuth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT, 
    github_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TeamUp posts table
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

-- Team slots (roles needed for each TeamUp)
CREATE TABLE IF NOT EXISTS public.team_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    filled INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact information for TeamUp posts
CREATE TABLE IF NOT EXISTS public.teamup_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    contact_type contact_method NOT NULL,
    contact_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications to join teams
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

-- Team members (accepted applications)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(teamup_post_id, user_id)
);

-- Project Expo - Published Projects
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

-- Project likes (for tracking who liked what)
CREATE TABLE IF NOT EXISTS public.project_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Project comments
CREATE TABLE IF NOT EXISTS public.project_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project tags (for better discoverability)
CREATE TABLE IF NOT EXISTS public.project_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, tag)
);

-- Create indexes for better performance
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

-- Project indexes
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

-- Row Level Security (RLS) policies - Disabled for NextAuth compatibility
-- You can re-enable these later with custom JWT tokens if needed
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.teamup_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.team_slots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.teamup_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (commented out for NextAuth compatibility)
-- You can implement custom authorization logic in your API layer instead

-- RLS Policies for users table
-- CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
-- CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
-- CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for teamup_posts table
-- CREATE POLICY "Anyone can view active teamup posts" ON public.teamup_posts FOR SELECT USING (is_active = true);
-- CREATE POLICY "Users can create teamup posts" ON public.teamup_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own teamup posts" ON public.teamup_posts FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own teamup posts" ON public.teamup_posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for team_slots table
-- CREATE POLICY "Anyone can view team slots for active posts" ON public.team_slots FOR SELECT USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND is_active = true)
-- );
-- CREATE POLICY "Post owners can manage team slots" ON public.team_slots FOR ALL USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND user_id = auth.uid())
-- );

-- RLS Policies for teamup_contacts table
-- CREATE POLICY "Anyone can view contacts for active posts" ON public.teamup_contacts FOR SELECT USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND is_active = true)
-- );
-- CREATE POLICY "Post owners can manage contacts" ON public.teamup_contacts FOR ALL USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND user_id = auth.uid())
-- );

-- RLS Policies for team_applications table
-- CREATE POLICY "Users can view applications to their posts" ON public.team_applications FOR SELECT USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND user_id = auth.uid())
--     OR applicant_id = auth.uid()
-- );
-- CREATE POLICY "Users can create applications" ON public.team_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
-- CREATE POLICY "Users can update own applications" ON public.team_applications FOR UPDATE USING (auth.uid() = applicant_id);
-- CREATE POLICY "Post owners can update application status" ON public.team_applications FOR UPDATE USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND user_id = auth.uid())
-- );

-- RLS Policies for team_members table
-- CREATE POLICY "Anyone can view team members for active posts" ON public.team_members FOR SELECT USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND is_active = true)
-- );
-- CREATE POLICY "Post owners can manage team members" ON public.team_members FOR ALL USING (
--     EXISTS (SELECT 1 FROM public.teamup_posts WHERE id = teamup_post_id AND user_id = auth.uid())
-- );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teamup_posts_updated_at BEFORE UPDATE ON public.teamup_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_applications_updated_at BEFORE UPDATE ON public.team_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_comments_updated_at BEFORE UPDATE ON public.project_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User sync function (commented out - not needed for NextAuth)
-- This was for Supabase Auth integration, but we're using NextAuth with GitHub
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     INSERT INTO public.users (id, email, display_name, avatar_url, github_username)
--     VALUES (
--         new.id, 
--         new.email, 
--         COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
--         new.raw_user_meta_data->>'avatar_url',
--         new.raw_user_meta_data->>'user_name'
--     );
--     RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile (commented out)
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment team slot filled count
CREATE OR REPLACE FUNCTION increment_team_slot_filled(post_id UUID, slot_role TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.team_slots 
    SET filled = filled + 1 
    WHERE teamup_post_id = post_id AND role = slot_role AND filled < count;
END;
$$ LANGUAGE plpgsql;
