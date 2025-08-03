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
  created_at: string
  updated_at: string
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
