import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface User {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  github_username?: string
  total_xp: number
  problems_solved: number
  current_streak: number
  max_streak: number
  last_solved_at?: string
  preferred_language?: string
  bio?: string
  location?: string
  website_url?: string
  created_at: string
  updated_at: string
}

export interface Problem {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  tags: string[]
  time_limit: number
  memory_limit: number
  boilerplate_code: string
  solution?: string
  hints: string[]
  marks: number
  status: 'draft' | 'published' | 'archived'
  created_by_user_id?: string
  total_submissions: number
  total_accepted: number
  acceptance_rate: number
  created_at: string
  updated_at: string
  // Relations
  created_by?: User
  test_cases?: ProblemTestCase[]
}

export interface ProblemTestCase {
  id: string
  problem_id: string
  input: string
  expected_output: string
  is_hidden: boolean
  explanation?: string
  order_index: number
  created_at: string
}

export interface UserProblemStatus {
  id: string
  user_id: string
  problem_id: string
  status: 'unattempted' | 'attempted' | 'solved' | 'viewed_solution'
  last_attempted_at?: string
  solved_at?: string
  xp_earned: number
  attempts_count: number
  best_runtime?: number
  best_memory?: number
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  user_id: string
  problem_id: string
  code: string
  language: string
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Memory Limit Exceeded' | 'Compilation Error' | 'Runtime Error' | 'Pending' | 'Internal Error'
  runtime?: number
  memory?: number
  judge0_token?: string
  test_case_results: any[]
  compile_output?: string
  error_message?: string
  submitted_at: string
  // Relations
  user?: User
  problem?: Problem
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_type: 'first_solve' | 'streak' | 'difficulty_master' | 'problem_creator' | 'community_contributor'
  title: string
  description: string
  icon?: string
  earned_at: string
  metadata: any
}

export interface TeamupPost {
  id: string
  title: string
  description: string
  tech_stack?: string
  goal?: string
  timeline?: string
  category: 'startup' | 'hackathon' | 'open-source' | 'learning' | 'competition'
  requirements?: string
  image_url?: string
  user_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  user?: User
  team_slots?: TeamSlot[]
  teamup_contacts?: TeamupContact[]
  team_applications?: TeamApplication[]
  team_members?: TeamMember[]
}

export interface TeamSlot {
  id: string
  teamup_post_id: string
  role: string
  count: number
  filled: number
  created_at: string
}

export interface TeamupContact {
  id: string
  teamup_post_id: string
  contact_type: 'Discord' | 'Email' | 'LinkedIn' | 'Twitter' | 'GitHub' | 'Telegram' | 'WhatsApp' | 'Slack' | 'Website' | 'Other'
  contact_value: string
  created_at: string
}

export interface TeamApplication {
  id: string
  teamup_post_id: string
  applicant_id: string
  role: string
  experience?: string
  portfolio?: string
  motivation?: string
  availability?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
  // Relations
  applicant?: User
  teamup_post?: TeamupPost
}

export interface TeamMember {
  id: string
  teamup_post_id: string
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
  // Relations
  user?: User
  teamup_post?: TeamupPost
}

// Project Expo Types
export interface Project {
  id: string
  title: string
  description: string
  short_description?: string
  category: 'web-app' | 'mobile-app' | 'desktop-app' | 'game' | 'ai-ml' | 'blockchain' | 'iot' | 'api' | 'library' | 'tool' | 'other'
  tech_stack: string[]
  github_url?: string
  live_demo_url?: string
  documentation_url?: string
  thumbnail_url?: string
  images: string[]
  features: string[]
  status: 'draft' | 'published' | 'archived'
  user_id: string
  likes_count: number
  views_count: number
  is_featured: boolean
  created_at: string
  updated_at: string
  // Relations
  user?: User
  likes?: ProjectLike[]
  comments?: ProjectComment[]
  tags?: ProjectTag[]
}

export interface ProjectLike {
  id: string
  project_id: string
  user_id: string
  created_at: string
  // Relations
  user?: User
  project?: Project
}

export interface ProjectComment {
  id: string
  project_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  // Relations
  user?: User
  project?: Project
}

export interface ProjectTag {
  id: string
  project_id: string
  tag: string
  created_at: string
}

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data as User
}
