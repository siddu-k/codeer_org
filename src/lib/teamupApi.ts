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
}

export interface ApplicationFormData {
    teamupPostId: string
    role: string
    experience?: string
    portfolio?: string
    motivation?: string
    availability?: string
}

// TeamUp Posts API Functions
export const createTeamupPost = async (formData: TeamupFormData): Promise<TeamupPost> => {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

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
            const slotsToInsert = formData.teamSlots
                .filter(slot => slot.role.trim())
                .map(slot => ({
                    teamup_post_id: post.id,
                    role: slot.role,
                    count: slot.count,
                    filled: slot.filled
                }))

            if (slotsToInsert.length > 0) {
                const { error: slotsError } = await supabase
                    .from('team_slots')
                    .insert(slotsToInsert)

                if (slotsError) throw slotsError
            }
        }

        // Create contact information
        if (formData.contactInfo.length > 0) {
            const contactsToInsert = formData.contactInfo
                .filter(contact => contact.value.trim())
                .map(contact => ({
                    teamup_post_id: post.id,
                    contact_type: contact.title as any,
                    contact_value: contact.value
                }))

            if (contactsToInsert.length > 0) {
                const { error: contactsError } = await supabase
                    .from('teamup_contacts')
                    .insert(contactsToInsert)

                if (contactsError) throw contactsError
            }
        }

        return post
    } catch (error) {
        console.error('Error creating teamup post:', error)
        throw error
    }
}

export const getTeamupPosts = async (filters?: {
    category?: string
    search?: string
    sortBy?: string
}): Promise<TeamupPost[]> => {
    try {
        let query = supabase
            .from('teamup_posts')
            .select(`
                *,
                user:users(*),
                team_slots(*),
                teamup_contacts(*),
                team_members(count)
            `)
            .eq('is_active', true)

        // Apply filters
        if (filters?.category && filters.category !== '') {
            query = query.eq('category', filters.category)
        }

        if (filters?.search && filters.search.trim()) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }

        // Apply sorting
        switch (filters?.sortBy) {
            case 'oldest':
                query = query.order('created_at', { ascending: true })
                break
            case 'title':
                query = query.order('title', { ascending: true })
                break
            case 'newest':
            default:
                query = query.order('created_at', { ascending: false })
                break
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching teamup posts:', error)
        throw error
    }
}

export const getUserTeamupPosts = async (userId?: string): Promise<TeamupPost[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        const targetUserId = userId || user?.id

        if (!targetUserId) throw new Error('User not found')

        const { data, error } = await supabase
            .from('teamup_posts')
            .select(`
                *,
                team_slots(*),
                teamup_contacts(*),
                team_applications(*),
                team_members(*)
            `)
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user teamup posts:', error)
        throw error
    }
}

// Application API Functions
export const createApplication = async (formData: ApplicationFormData): Promise<TeamApplication> => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

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

export const getApplicationsForPost = async (teamupPostId: string): Promise<TeamApplication[]> => {
    try {
        const { data, error } = await supabase
            .from('team_applications')
            .select(`
                *,
                applicant:users(*)
            `)
            .eq('teamup_post_id', teamupPostId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching applications:', error)
        throw error
    }
}

export const getUserApplications = async (): Promise<TeamApplication[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

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

export const updateApplicationStatus = async (
    applicationId: string,
    status: 'accepted' | 'rejected'
): Promise<TeamApplication> => {
    try {
        const { data, error } = await supabase
            .from('team_applications')
            .update({ status })
            .eq('id', applicationId)
            .select()
            .single()

        if (error) throw error

        // If accepted, create team member record
        if (status === 'accepted') {
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    teamup_post_id: data.teamup_post_id,
                    user_id: data.applicant_id,
                    role: data.role
                })

            if (memberError) throw memberError

            // Update team slot filled count
            const { error: slotError } = await supabase.rpc(
                'increment_team_slot_filled',
                {
                    post_id: data.teamup_post_id,
                    slot_role: data.role
                }
            )

            if (slotError) console.warn('Could not update slot count:', slotError)
        }

        return data
    } catch (error) {
        console.error('Error updating application status:', error)
        throw error
    }
}

// Team Members API Functions
export const getTeamMembers = async (teamupPostId: string): Promise<TeamMember[]> => {
    try {
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                *,
                user:users(*)
            `)
            .eq('teamup_post_id', teamupPostId)
            .eq('is_active', true)
            .order('joined_at', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching team members:', error)
        throw error
    }
}

// Statistics API Functions
export const getTeamupStats = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { userPosts: 0, applications: 0, teamMembers: 0, activeProjects: 0 }

        // Get user's posts count
        const { count: userPostsCount } = await supabase
            .from('teamup_posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        // Get user's applications count
        const { count: applicationsCount } = await supabase
            .from('team_applications')
            .select('*', { count: 'exact', head: true })
            .eq('applicant_id', user.id)

        // Get user's team memberships count
        const { count: teamMembersCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true)

        // Get active projects (user posts + team memberships)
        const { count: activeProjectsCount } = await supabase
            .from('teamup_posts')
            .select('*', { count: 'exact', head: true })
            .or(`user_id.eq.${user.id},team_members.user_id.eq.${user.id}`)
            .eq('is_active', true)

        return {
            userPosts: userPostsCount || 0,
            applications: applicationsCount || 0,
            teamMembers: teamMembersCount || 0,
            activeProjects: activeProjectsCount || 0
        }
    } catch (error) {
        console.error('Error fetching teamup stats:', error)
        return { userPosts: 0, applications: 0, teamMembers: 0, activeProjects: 0 }
    }
}
