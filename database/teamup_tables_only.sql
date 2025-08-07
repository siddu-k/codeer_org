-- Quick Teamup Tables Setup (if full setup failed)
-- Run this if you just need the teamup functionality working

-- Create enum types first
CREATE TYPE team_category AS ENUM ('startup', 'hackathon', 'open-source', 'learning', 'competition');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE contact_method AS ENUM ('Discord', 'Email', 'LinkedIn', 'Twitter', 'GitHub', 'Telegram', 'WhatsApp', 'Slack', 'Website', 'Other');

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT, 
    github_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TeamUp posts table
CREATE TABLE IF NOT EXISTS public.teamup_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    filled INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact information for TeamUp posts
CREATE TABLE IF NOT EXISTS public.teamup_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    contact_type contact_method NOT NULL,
    contact_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications to join teams
CREATE TABLE IF NOT EXISTS public.team_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teamup_post_id UUID REFERENCES public.teamup_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(teamup_post_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teamup_posts_user_id ON public.teamup_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_teamup_posts_category ON public.teamup_posts(category);
CREATE INDEX IF NOT EXISTS idx_teamup_posts_is_active ON public.teamup_posts(is_active);
CREATE INDEX IF NOT EXISTS idx_teamup_posts_created_at ON public.teamup_posts(created_at DESC);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
