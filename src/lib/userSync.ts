import { supabase, type User } from '@/lib/supabase'

export interface GitHubUser {
    email: string
    // Additional fields can be added later when you extend the schema
    // github_id?: string
    // github_username?: string
    // name?: string
    // avatar_url?: string
}

/**
 * Sync GitHub user data with Supabase
 * This function will create or update a user in the database
 */
export async function syncUserWithSupabase(githubUser: GitHubUser): Promise<User | null> {
    try {
        const { email } = githubUser

        // Check if user already exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 is "not found" error, which is fine
            console.error('Error fetching user:', fetchError)
            return null
        }

        if (existingUser) {
            // User already exists, just return it
            console.log('User already exists in Supabase:', existingUser)
            return existingUser
        } else {
            // Create new user
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    email
                })
                .select()
                .single()

            if (insertError) {
                console.error('Error creating user:', insertError)
                return null
            }

            console.log('User created successfully:', newUser)
            return newUser
        }
    } catch (error) {
        console.error('Unexpected error in syncUserWithSupabase:', error)
        return null
    }
}

/**
 * Get user by email from Supabase
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // User not found
                return null
            }
            console.error('Error fetching user by email:', error)
            return null
        }

        return user
    } catch (error) {
        console.error('Unexpected error in getUserByEmail:', error)
        return null
    }
}

/**
 * Delete user from Supabase
 */
export async function deleteUser(userId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)

        if (error) {
            console.error('Error deleting user:', error)
            return false
        }

        console.log('User deleted successfully')
        return true
    } catch (error) {
        console.error('Unexpected error in deleteUser:', error)
        return false
    }
}

/**
 * Get all users from Supabase (admin function)
 */
export async function getAllUsers(): Promise<User[]> {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching all users:', error)
            return []
        }

        return users || []
    } catch (error) {
        console.error('Unexpected error in getAllUsers:', error)
        return []
    }
}
