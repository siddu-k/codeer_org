import { supabase, TeamupPost, TeamSlot, TeamupContact, TeamApplication, TeamMember } from './supabase'

// Types for form data
export interface TeamupFormData {
    title: string
    description: string
    techStack?: string
    goal?: string
    timeline?: string
    category: 'startup' | 'hackathon' | 'open-source' | 'learning' | 'competition'
    requirements?: string
    imageUrl?: string
    teamSlots: Array<{ role: string; count: number; filled: number }>
    contactInfo: Array<{ title: string; value: string }>
    is_active?: boolean
}

export interface ApplicationFormData {
    teamupPostId: string
    role: string
    experience?: string
    portfolio?: string
    motivation?: string
    availability?: string
}

// Helper function to get or create user with email (client-side version)
export const ensureUserExists = async (email: string, name?: string, avatarUrl?: string) => {
    // First check if user exists
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (existingUser) {
        return existingUser
    }

    if (fetchError && fetchError.code === 'PGRST116') {
        // User doesn't exist, create them
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email: email,
                display_name: name,
                avatar_url: avatarUrl,
                github_username: name // You might want to get this from GitHub API
            })
            .select()
            .single()

        if (createError) throw createError
        return newUser
    }

    throw fetchError
}

// TeamUp Posts API Functions
export const createTeamupPost = async (formData: TeamupFormData, userEmail: string, userName?: string, userAvatar?: string): Promise<TeamupPost> => {
    try {
        // Ensure user exists in our database
        const user = await ensureUserExists(userEmail, userName, userAvatar)

        // Create the main teamup post
        const { data: post, error: postError } = await supabase
            .from('teamup_posts')
            .insert({
                title: formData.title,
                description: formData.description,
                tech_stack: formData.techStack,
                goal: formData.goal,
                timeline: formData.timeline,
                category: formData.category,
                requirements: formData.requirements,
                image_url: formData.imageUrl,
                user_id: user.id
            })
            .select()
            .single()

        if (postError) throw postError

        // Create team slots
        if (formData.teamSlots.length > 0) {
            const { error: slotsError } = await supabase
                .from('team_slots')
                .insert(
                    formData.teamSlots.map(slot => ({
                        teamup_post_id: post.id,
                        role: slot.role,
                        count: slot.count,
                        filled: slot.filled
                    }))
                )

            if (slotsError) throw slotsError
        }

        // Create contact information
        if (formData.contactInfo.length > 0) {
            const { error: contactsError } = await supabase
                .from('teamup_contacts')
                .insert(
                    formData.contactInfo.map(contact => ({
                        teamup_post_id: post.id,
                        contact_type: contact.title as any, // Type assertion for enum
                        contact_value: contact.value
                    }))
                )

            if (contactsError) throw contactsError
        }

        return post
    } catch (error) {
        console.error('Error creating teamup post:', error)
        throw error
    }
}

// Update TeamUp post
export const updateTeamupPost = async (postId: string, formData: TeamupFormData, userEmail: string): Promise<TeamupPost> => {
    try {
        // Verify user ownership
        const user = await ensureUserExists(userEmail)

        const { data: existingPost, error: fetchError } = await supabase
            .from('teamup_posts')
            .select('user_id')
            .eq('id', postId)
            .single()

        if (fetchError) throw fetchError
        if (existingPost.user_id !== user.id) {
            throw new Error('Not authorized to update this post')
        }

        // Update the post
        const { data: post, error: updateError } = await supabase
            .from('teamup_posts')
            .update({
                title: formData.title,
                description: formData.description,
                tech_stack: formData.techStack,
                goal: formData.goal,
                timeline: formData.timeline,
                category: formData.category,
                requirements: formData.requirements,
                image_url: formData.imageUrl,
                is_active: formData.is_active !== false,
                updated_at: new Date().toISOString()
            })
            .eq('id', postId)
            .select(`
                *,
                user:users(*),
                team_slots(*),
                teamup_contacts(*)
            `)
            .single()

        if (updateError) throw updateError

        // Update team slots if provided
        if (formData.teamSlots && formData.teamSlots.length > 0) {
            // Delete existing slots
            await supabase
                .from('team_slots')
                .delete()
                .eq('teamup_post_id', postId)

            // Insert new slots
            const { error: slotsError } = await supabase
                .from('team_slots')
                .insert(
                    formData.teamSlots.map(slot => ({
                        teamup_post_id: postId,
                        role: slot.role,
                        count: slot.count,
                        filled: slot.filled || 0
                    }))
                )

            if (slotsError) throw slotsError
        }

        // Update contact information if provided
        if (formData.contactInfo && formData.contactInfo.length > 0) {
            // Delete existing contacts
            await supabase
                .from('teamup_contacts')
                .delete()
                .eq('teamup_post_id', postId)

            // Insert new contacts
            const validContacts = formData.contactInfo.filter(contact => contact.value.trim())
            if (validContacts.length > 0) {
                const { error: contactsError } = await supabase
                    .from('teamup_contacts')
                    .insert(
                        validContacts.map(contact => ({
                            teamup_post_id: postId,
                            contact_type: contact.title as any,
                            contact_value: contact.value
                        }))
                    )

                if (contactsError) throw contactsError
            }
        }

        return post
    } catch (error) {
        console.error('Error updating teamup post:', error)
        throw error
    }
}

export const getTeamupPosts = async (category?: string, limit: number = 20): Promise<TeamupPost[]> => {
    try {
        let query = supabase
            .from('teamup_posts')
            .select(`
                *,
                user:users(*),
                team_slots(*),
                teamup_contacts(*),
                team_applications(count),
                team_members(count)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching teamup posts:', error)
        throw error
    }
}

export const getTeamupPostById = async (id: string): Promise<TeamupPost | null> => {
    try {
        const { data, error } = await supabase
            .from('teamup_posts')
            .select(`
                *,
                user:users(*),
                team_slots(*),
                teamup_contacts(*),
                team_applications(*),
                team_members(*)
            `)
            .eq('id', id)
            .eq('is_active', true)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    } catch (error) {
        console.error('Error fetching teamup post:', error)
        throw error
    }
}

// Applications API Functions
export const createApplication = async (formData: ApplicationFormData, userEmail: string, userName?: string, userAvatar?: string): Promise<TeamApplication> => {
    try {
        const user = await ensureUserExists(userEmail, userName, userAvatar)

        const { data, error } = await supabase
            .from('team_applications')
            .insert({
                teamup_post_id: formData.teamupPostId,
                applicant_id: user.id,
                role: formData.role,
                experience: formData.experience,
                portfolio: formData.portfolio,
                motivation: formData.motivation,
                availability: formData.availability
            })
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error creating application:', error)
        throw error
    }
}

export const getApplicationsForPost = async (postId: string): Promise<TeamApplication[]> => {
    try {
        const { data, error } = await supabase
            .from('team_applications')
            .select(`
                *,
                applicant:users(*)
            `)
            .eq('teamup_post_id', postId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching applications:', error)
        throw error
    }
}

export const updateApplicationStatus = async (
    applicationId: string,
    status: 'pending' | 'accepted' | 'rejected',
    creatorEmail?: string
): Promise<TeamApplication> => {
    try {
        // If creatorEmail is provided, verify authorization
        if (creatorEmail) {
            const { data: application, error: fetchError } = await supabase
                .from('team_applications')
                .select(`
                    *,
                    teamup_post:teamup_posts(user_id)
                `)
                .eq('id', applicationId)
                .single()

            if (fetchError) throw fetchError
            if (!application) throw new Error('Application not found')

            const creator = await ensureUserExists(creatorEmail)
            if (application.teamup_post.user_id !== creator.id) {
                throw new Error('Not authorized to update this application')
            }
        }

        const { data, error } = await supabase
            .from('team_applications')
            .update({ status })
            .eq('id', applicationId)
            .select()
            .single()

        if (error) throw error

        // If application is accepted, create team member
        if (status === 'accepted') {
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    teamup_post_id: data.teamup_post_id,
                    user_id: data.applicant_id,
                    role: data.role
                })

            if (memberError) throw memberError

            // Increment team slot filled count
            await supabase.rpc('increment_team_slot_filled', {
                post_id: data.teamup_post_id,
                slot_role: data.role
            })
        }

        return data
    } catch (error) {
        console.error('Error updating application status:', error)
        throw error
    }
}

// Team Members API Functions
export const getTeamMembers = async (postId: string): Promise<TeamMember[]> => {
    try {
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                *,
                user:users(*)
            `)
            .eq('teamup_post_id', postId)
            .eq('is_active', true)
            .order('joined_at', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching team members:', error)
        throw error
    }
}

// User's TeamUp posts
export const getUserTeamupPosts = async (userEmail: string): Promise<TeamupPost[]> => {
    try {
        const user = await ensureUserExists(userEmail)

        const { data, error } = await supabase
            .from('teamup_posts')
            .select(`
                *,
                team_slots(*),
                teamup_contacts(*),
                team_applications(count),
                team_members(count)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user teamup posts:', error)
        throw error
    }
}

// User's applications
export const getUserApplications = async (userEmail: string): Promise<TeamApplication[]> => {
    try {
        const user = await ensureUserExists(userEmail)

        const { data, error } = await supabase
            .from('team_applications')
            .select(`
                *,
                teamup_post:teamup_posts(*)
            `)
            .eq('applicant_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user applications:', error)
        throw error
    }
}

// Analytics functions
export const getTeamupStats = async () => {
    try {
        const [postsResult, applicationsResult, membersResult] = await Promise.all([
            supabase.from('teamup_posts').select('id', { count: 'exact', head: true }),
            supabase.from('team_applications').select('id', { count: 'exact', head: true }),
            supabase.from('team_members').select('id', { count: 'exact', head: true })
        ])

        return {
            totalPosts: postsResult.count || 0,
            totalApplications: applicationsResult.count || 0,
            totalMembers: membersResult.count || 0
        }
    } catch (error) {
        console.error('Error fetching teamup stats:', error)
        return { totalPosts: 0, totalApplications: 0, totalMembers: 0 }
    }
}

// Get applications for a specific project (for creators)
export const getProjectApplications = async (projectId: string, creatorEmail: string): Promise<TeamApplication[]> => {
    try {
        // Verify ownership
        const creator = await ensureUserExists(creatorEmail)
        const { data: project, error: projectError } = await supabase
            .from('teamup_posts')
            .select('user_id')
            .eq('id', projectId)
            .single()

        if (projectError) throw projectError
        if (project.user_id !== creator.id) {
            throw new Error('Not authorized to view applications for this project')
        }

        // Get applications
        const { data, error } = await supabase
            .from('team_applications')
            .select(`
                *,
                applicant:users(display_name, avatar_url, github_username)
            `)
            .eq('teamup_post_id', projectId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching project applications:', error)
        throw error
    }
}
