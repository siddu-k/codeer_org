import { supabase, type User } from '@/lib/supabase'

export interface GitHubUser {
    email: string
    name?: string
    image?: string
    githubUsername?: string
}

/**
 * Sync GitHub user data with Supabase
 * This function will create or update a user in the database
 */
export async function syncUserWithSupabase(githubUser: GitHubUser): Promise<User | null> {
    try {
        const { email, name, image, githubUsername } = githubUser

        if (!email) {
            console.error('No email provided for user sync')
            return null
        }

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
            // User already exists, update with latest GitHub data
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    display_name: name || existingUser.display_name,
                    avatar_url: image || existingUser.avatar_url,
                    github_username: githubUsername || existingUser.github_username,
                    updated_at: new Date().toISOString()
                })
                .eq('email', email)
                .select()
                .single()

            if (updateError) {
                console.error('Error updating user:', updateError)
                return existingUser // Return existing user even if update fails
            }

            console.log('User updated in Supabase:', updatedUser)
            return updatedUser
        } else {
            // Create new user
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    email,
                    display_name: name,
                    avatar_url: image,
                    github_username: githubUsername
                })
                .select()
                .single()

            if (insertError) {
                console.error('Error creating user:', insertError)
                return null
            }

            console.log('New user created in Supabase:', newUser)
            return newUser
        }
    } catch (error) {
        console.error('Error in syncUserWithSupabase:', error)
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

        if (error && error.code !== 'PGRST116') {
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
 * Update user profile
 */
export async function updateUserProfile(email: string, updates: Partial<User>): Promise<User | null> {
    try {
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('email', email)
            .select()
            .single()

        if (error) {
            console.error('Error updating user profile:', error)
            return null
        }

        console.log('User profile updated:', updatedUser)
        return updatedUser
    } catch (error) {
        console.error('Unexpected error in updateUserProfile:', error)
        return null
    }
}
