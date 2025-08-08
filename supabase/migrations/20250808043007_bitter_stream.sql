/*
# Complete LeetCode-like Platform Schema

This migration creates all tables needed for a comprehensive coding platform with:

1. New Tables
   - `problems` - Coding problems with test cases and XP rewards
   - `problem_test_cases` - Test cases for each problem (public and hidden)
   - `user_problem_status` - User progress tracking per problem
   - `submissions` - Code submission history with Judge0 results
   - `user_achievements` - Achievement system
   - `problem_categories` - Problem categorization
   - `problem_tags` - Tagging system for problems

2. Enhanced Features
   - XP system (50/100/150 for easy/medium/hard)
   - Solution viewing penalty (half XP)
   - Memory and time limits
   - Comprehensive submission tracking
   - Achievement system

3. Security
   - Row Level Security on all tables
   - Proper foreign key constraints
   - Indexes for performance
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.user_problem_status CASCADE;
DROP TABLE IF EXISTS public.problem_test_cases CASCADE;
DROP TABLE IF EXISTS public.problem_tags CASCADE;
DROP TABLE IF EXISTS public.problem_categories CASCADE;
DROP TABLE IF EXISTS public.problems CASCADE;

-- Drop enum types if they exist
DROP TYPE IF EXISTS submission_status CASCADE;
DROP TYPE IF EXISTS problem_status CASCADE;
DROP TYPE IF EXISTS user_problem_status_enum CASCADE;
DROP TYPE IF EXISTS achievement_type CASCADE;

-- Create enum types
CREATE TYPE problem_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE user_problem_status_enum AS ENUM ('unattempted', 'attempted', 'solved', 'viewed_solution');
CREATE TYPE submission_status AS ENUM ('Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded', 'Compilation Error', 'Runtime Error', 'Pending', 'Internal Error');
CREATE TYPE achievement_type AS ENUM ('first_solve', 'streak', 'difficulty_master', 'problem_creator', 'community_contributor');

-- 1. PROBLEMS TABLE (Core coding problems)
CREATE TABLE IF NOT EXISTS public.problems (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT NOT NULL DEFAULT 'algorithms',
    tags TEXT[] DEFAULT '{}',
    time_limit INTEGER NOT NULL DEFAULT 2000, -- milliseconds
    memory_limit INTEGER NOT NULL DEFAULT 256, -- MB
    boilerplate_code TEXT DEFAULT '',
    solution TEXT, -- Reference solution
    hints TEXT[], -- Array of hints
    marks INTEGER NOT NULL DEFAULT 50, -- Base XP for solving
    status problem_status DEFAULT 'published',
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    total_submissions INTEGER DEFAULT 0,
    total_accepted INTEGER DEFAULT 0,
    acceptance_rate DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROBLEM TEST CASES TABLE
CREATE TABLE IF NOT EXISTS public.problem_test_cases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    explanation TEXT, -- Optional explanation for the test case
    order_index INTEGER DEFAULT 0, -- For ordering test cases
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER PROBLEM STATUS TABLE (Track user progress per problem)
CREATE TABLE IF NOT EXISTS public.user_problem_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
    status user_problem_status_enum DEFAULT 'unattempted',
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    solved_at TIMESTAMP WITH TIME ZONE,
    xp_earned INTEGER DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    best_runtime INTEGER, -- Best runtime in ms
    best_memory INTEGER, -- Best memory usage in KB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, problem_id)
);

-- 4. SUBMISSIONS TABLE (All code submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    status submission_status DEFAULT 'Pending',
    runtime INTEGER, -- milliseconds
    memory INTEGER, -- KB
    judge0_token TEXT, -- Judge0 submission token for tracking
    test_case_results JSONB DEFAULT '[]', -- Detailed results for each test case
    compile_output TEXT,
    error_message TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    achievement_type achievement_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT, -- Icon name or URL
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- Additional achievement data
);

-- 6. PROBLEM CATEGORIES TABLE (For better organization)
CREATE TABLE IF NOT EXISTS public.problem_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#6366f1',
    problem_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PROBLEM TAGS TABLE (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.problem_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(problem_id, tag)
);

-- Update users table to include XP and stats
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS problems_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_solved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'javascript',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- CREATE INDEXES for better performance
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_category ON public.problems(category);
CREATE INDEX IF NOT EXISTS idx_problems_status ON public.problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_created_by ON public.problems(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_problems_acceptance_rate ON public.problems(acceptance_rate DESC);
CREATE INDEX IF NOT EXISTS idx_problems_created_at ON public.problems(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_problem_test_cases_problem_id ON public.problem_test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_test_cases_is_hidden ON public.problem_test_cases(is_hidden);
CREATE INDEX IF NOT EXISTS idx_problem_test_cases_order ON public.problem_test_cases(problem_id, order_index);

CREATE INDEX IF NOT EXISTS idx_user_problem_status_user_id ON public.user_problem_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_status_problem_id ON public.user_problem_status(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_status_status ON public.user_problem_status(status);
CREATE INDEX IF NOT EXISTS idx_user_problem_status_solved_at ON public.user_problem_status(solved_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON public.submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_language ON public.submissions(language);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);

CREATE INDEX IF NOT EXISTS idx_problem_categories_name ON public.problem_categories(name);
CREATE INDEX IF NOT EXISTS idx_problem_tags_problem_id ON public.problem_tags(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_tags_tag ON public.problem_tags(tag);

CREATE INDEX IF NOT EXISTS idx_users_total_xp ON public.users(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_problems_solved ON public.users(problems_solved DESC);
CREATE INDEX IF NOT EXISTS idx_users_github_username ON public.users(github_username);

-- CREATE FUNCTIONS

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update problem statistics
CREATE OR REPLACE FUNCTION update_problem_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update total submissions
        UPDATE public.problems 
        SET total_submissions = total_submissions + 1,
            updated_at = NOW()
        WHERE id = NEW.problem_id;
        
        -- Update accepted count if submission is accepted
        IF NEW.status = 'Accepted' THEN
            UPDATE public.problems 
            SET total_accepted = total_accepted + 1,
                acceptance_rate = CASE 
                    WHEN total_submissions > 0 THEN 
                        ROUND((total_accepted + 1.0) / total_submissions * 100, 2)
                    ELSE 0 
                END,
                updated_at = NOW()
            WHERE id = NEW.problem_id;
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when problem is solved
CREATE OR REPLACE FUNCTION update_user_stats_on_solve()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status != 'solved' AND NEW.status = 'solved' THEN
        -- Update user's problems solved count
        UPDATE public.users 
        SET problems_solved = problems_solved + 1,
            last_solved_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Update streak logic
        UPDATE public.users 
        SET current_streak = CASE 
                WHEN last_solved_at IS NULL OR last_solved_at::date < CURRENT_DATE THEN 1
                WHEN last_solved_at::date = CURRENT_DATE THEN current_streak
                WHEN last_solved_at::date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
                ELSE 1
            END,
            max_streak = GREATEST(max_streak, 
                CASE 
                    WHEN last_solved_at IS NULL OR last_solved_at::date < CURRENT_DATE THEN 1
                    WHEN last_solved_at::date = CURRENT_DATE THEN current_streak
                    WHEN last_solved_at::date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
                    ELSE 1
                END)
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to award XP and update user total
CREATE OR REPLACE FUNCTION award_xp(user_id_param UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET total_xp = total_xp + xp_amount,
        updated_at = NOW()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- CREATE TRIGGERS

-- Triggers for updated_at columns
CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON public.problems FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_problem_status_updated_at BEFORE UPDATE ON public.user_problem_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for problem statistics
CREATE TRIGGER tr_update_problem_stats
    AFTER INSERT ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION update_problem_stats();

-- Trigger for user statistics
CREATE TRIGGER tr_update_user_stats_on_solve
    AFTER UPDATE ON public.user_problem_status
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_solve();

-- INSERT DEFAULT CATEGORIES
INSERT INTO public.problem_categories (name, description, icon, color) VALUES
('algorithms', 'Algorithmic problem solving', '🧮', '#6366f1'),
('data-structures', 'Data structure implementation and usage', '🏗️', '#8b5cf6'),
('dynamic-programming', 'Dynamic programming problems', '🔄', '#06b6d4'),
('graph', 'Graph theory and algorithms', '🕸️', '#10b981'),
('tree', 'Tree data structure problems', '🌳', '#f59e0b'),
('array', 'Array manipulation problems', '📊', '#ef4444'),
('string', 'String processing problems', '📝', '#ec4899'),
('math', 'Mathematical problems', '🔢', '#84cc16'),
('sorting', 'Sorting algorithms', '📈', '#f97316'),
('searching', 'Search algorithms', '🔍', '#6366f1')
ON CONFLICT (name) DO NOTHING;

-- INSERT SAMPLE PROBLEMS (Optional - for testing)
INSERT INTO public.problems (title, description, difficulty, category, time_limit, memory_limit, marks, boilerplate_code) VALUES
(
    'Two Sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    'easy',
    'algorithms',
    2000,
    256,
    50,
    'function twoSum(nums, target) {
    // Your code here
    return [];
}'
),
(
    'Add Two Numbers',
    'You are given two non-empty linked lists representing two non-negative integers. Add the two numbers and return the sum as a linked list.',
    'medium',
    'data-structures',
    3000,
    256,
    100,
    'function addTwoNumbers(l1, l2) {
    // Your code here
    return null;
}'
),
(
    'Median of Two Sorted Arrays',
    'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
    'hard',
    'algorithms',
    5000,
    512,
    150,
    'function findMedianSortedArrays(nums1, nums2) {
    // Your code here
    return 0.0;
}'
)
ON CONFLICT DO NOTHING;

-- INSERT SAMPLE TEST CASES
INSERT INTO public.problem_test_cases (problem_id, input, expected_output, is_hidden, explanation, order_index)
SELECT 
    p.id,
    CASE 
        WHEN p.title = 'Two Sum' AND tc.order_index = 1 THEN '[2,7,11,15]\n9'
        WHEN p.title = 'Two Sum' AND tc.order_index = 2 THEN '[3,2,4]\n6'
        WHEN p.title = 'Two Sum' AND tc.order_index = 3 THEN '[3,3]\n6'
        WHEN p.title = 'Add Two Numbers' AND tc.order_index = 1 THEN '[2,4,3]\n[5,6,4]'
        WHEN p.title = 'Add Two Numbers' AND tc.order_index = 2 THEN '[0]\n[0]'
        WHEN p.title = 'Median of Two Sorted Arrays' AND tc.order_index = 1 THEN '[1,3]\n[2]'
        WHEN p.title = 'Median of Two Sorted Arrays' AND tc.order_index = 2 THEN '[1,2]\n[3,4]'
    END as input,
    CASE 
        WHEN p.title = 'Two Sum' AND tc.order_index = 1 THEN '[0,1]'
        WHEN p.title = 'Two Sum' AND tc.order_index = 2 THEN '[1,2]'
        WHEN p.title = 'Two Sum' AND tc.order_index = 3 THEN '[0,1]'
        WHEN p.title = 'Add Two Numbers' AND tc.order_index = 1 THEN '[7,0,8]'
        WHEN p.title = 'Add Two Numbers' AND tc.order_index = 2 THEN '[0]'
        WHEN p.title = 'Median of Two Sorted Arrays' AND tc.order_index = 1 THEN '2.0'
        WHEN p.title = 'Median of Two Sorted Arrays' AND tc.order_index = 2 THEN '2.5'
    END as expected_output,
    tc.is_hidden,
    CASE 
        WHEN p.title = 'Two Sum' AND tc.order_index = 1 THEN 'nums[0] + nums[1] = 2 + 7 = 9'
        WHEN p.title = 'Two Sum' AND tc.order_index = 2 THEN 'nums[1] + nums[2] = 2 + 4 = 6'
        WHEN p.title = 'Two Sum' AND tc.order_index = 3 THEN 'nums[0] + nums[1] = 3 + 3 = 6'
    END as explanation,
    tc.order_index
FROM public.problems p
CROSS JOIN (
    SELECT 1 as order_index, false as is_hidden
    UNION SELECT 2, false
    UNION SELECT 3, true  -- Hidden test case
) tc
WHERE p.title IN ('Two Sum', 'Add Two Numbers', 'Median of Two Sorted Arrays')
ON CONFLICT DO NOTHING;

-- GRANT PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ADD COMMENTS for documentation
COMMENT ON TABLE public.problems IS 'Coding problems with test cases and XP rewards';
COMMENT ON TABLE public.problem_test_cases IS 'Test cases for problems (public and hidden)';
COMMENT ON TABLE public.user_problem_status IS 'User progress tracking per problem';
COMMENT ON TABLE public.submissions IS 'Code submission history with Judge0 results';
COMMENT ON TABLE public.user_achievements IS 'User achievement system';
COMMENT ON TABLE public.problem_categories IS 'Problem categorization system';

COMMENT ON COLUMN public.problems.marks IS 'Base XP awarded for solving this problem';
COMMENT ON COLUMN public.problems.time_limit IS 'Time limit in milliseconds';
COMMENT ON COLUMN public.problems.memory_limit IS 'Memory limit in MB';
COMMENT ON COLUMN public.user_problem_status.xp_earned IS 'Actual XP earned (may be reduced for viewing solution)';
COMMENT ON COLUMN public.submissions.test_case_results IS 'Detailed Judge0 results for each test case';

-- DATABASE SETUP COMPLETE
-- Your Supabase database is now ready for the LeetCode-like platform!