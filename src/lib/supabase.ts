import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types (simplified - can be extended later)
export interface User {
    id: string
    email: string
    created_at: string
    updated_at: string
}

// Future table types (commented out for now - uncomment when you add the tables)
/*
export interface Problem {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  test_cases: any[]
  user_id: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  title: string
  description: string
  tech_stack: string[]
  github_url?: string
  demo_url?: string
  image_url?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface TeamUp {
  id: string
  title: string
  description: string
  tech_stack: string[]
  max_members: number
  current_members: number
  status: 'open' | 'in_progress' | 'completed'
  user_id: string
  created_at: string
  updated_at: string
}

export interface LearningDoc {
  id: string
  title: string
  content: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  user_id: string
  created_at: string
  updated_at: string
}
*/
