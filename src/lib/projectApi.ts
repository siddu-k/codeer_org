import { supabase } from './supabase'
import type { Project, ProjectLike, ProjectComment, ProjectTag } from './supabase'

// Ensure user exists in our users table
const ensureUserExists = async (email: string) => {
    try {
        console.log('Checking if user exists for email:', email)

        // First try to find existing user
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (fetchError) {
            console.log('User fetch error:', fetchError)
            if (fetchError.code === 'PGRST116') {
                // No user found
                throw new Error('User not found in database. Please sign out and sign in again to create your profile.')
            }
            throw new Error(`Database error: ${fetchError.message}`)
        }

        if (existingUser) {
            console.log('User found:', { id: existingUser.id, email: existingUser.email })
            return existingUser
        }

        // This shouldn't happen with the new auth setup
        throw new Error('User not found in database. Please refresh the page and sign in again.')
    } catch (error) {
        console.error('Error in ensureUserExists:', error)
        throw error
    }
}

// Get all published projects with pagination and filtering
export const getProjects = async (options: {
    page?: number
    limit?: number
    category?: string
    search?: string
    sortBy?: 'created_at' | 'likes_count' | 'views_count'
    sortOrder?: 'asc' | 'desc'
} = {}): Promise<{ data: Project[], total: number }> => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            search,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = options

        let query = supabase
            .from('projects')
            .select(`
                *,
                user:users(display_name, avatar_url, github_username),
                tags:project_tags(tag)
            `)
            .eq('status', 'published')

        // Apply filters
        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }

        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })

        // Apply pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) throw error

        return {
            data: data || [],
            total: count || 0
        }
    } catch (error) {
        console.error('Error fetching projects:', error)
        throw error
    }
}

// Get featured projects
export const getFeaturedProjects = async (limit: number = 6): Promise<Project[]> => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                user:users(display_name, avatar_url, github_username),
                tags:project_tags(tag)
            `)
            .eq('status', 'published')
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching featured projects:', error)
        throw error
    }
}

// Get project by ID
export const getProjectById = async (projectId: string): Promise<Project | null> => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                user:users(display_name, avatar_url, github_username),
                tags:project_tags(tag),
                comments:project_comments(
                    *,
                    user:users(display_name, avatar_url, github_username)
                )
            `)
            .eq('id', projectId)
            .single()

        if (error) throw error

        // Increment view count
        await supabase
            .from('projects')
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq('id', projectId)

        return data
    } catch (error) {
        console.error('Error fetching project:', error)
        throw error
    }
}

// Get user's projects
export const getUserProjects = async (userEmail: string): Promise<Project[]> => {
    try {
        const user = await ensureUserExists(userEmail)

        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                tags:project_tags(tag)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching user projects:', error)
        throw error
    }
}

// Create new project
export const createProject = async (projectData: {
    title: string
    description: string
    short_description?: string
    category: string
    tech_stack: string[]
    github_url?: string
    live_demo_url?: string
    documentation_url?: string
    thumbnail_url?: string
    images?: string[]
    features?: string[]
    tags?: string[]
    status?: 'draft' | 'published'
}, userEmail: string): Promise<Project> => {
    try {
        console.log('Creating project with data:', {
            ...projectData,
            userEmail,
            tech_stack: Array.isArray(projectData.tech_stack) ? projectData.tech_stack : []
        })

        // Ensure user exists
        const user = await ensureUserExists(userEmail)
        console.log('User found:', { id: user.id, email: user.email })

        // Prepare project data for insertion
        const insertData = {
            title: projectData.title,
            description: projectData.description,
            short_description: projectData.short_description || null,
            category: projectData.category,
            tech_stack: Array.isArray(projectData.tech_stack) ? projectData.tech_stack : [],
            github_url: projectData.github_url || null,
            live_demo_url: projectData.live_demo_url || null,
            documentation_url: projectData.documentation_url || null,
            thumbnail_url: projectData.thumbnail_url || null,
            images: Array.isArray(projectData.images) ? projectData.images : [],
            features: Array.isArray(projectData.features) ? projectData.features : [],
            status: projectData.status || 'published',
            user_id: user.id
        }

        console.log('Inserting project data:', insertData)

        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert(insertData)
            .select()
            .single()

        if (projectError) {
            console.error('Supabase project insert error:', projectError)
            throw new Error(`Database error: ${projectError.message || 'Unknown error'}`)
        }

        console.log('Project created successfully:', project)

        // Add tags if provided
        if (projectData.tags && projectData.tags.length > 0) {
            const tagsData = projectData.tags.map(tag => ({
                project_id: project.id,
                tag: tag.trim().toLowerCase()
            }))

            console.log('Adding tags:', tagsData)

            const { error: tagsError } = await supabase
                .from('project_tags')
                .insert(tagsData)

            if (tagsError) {
                console.error('Error adding tags:', tagsError)
                // Don't throw here, just log the error
            }
        }

        return project
    } catch (error) {
        console.error('Error creating project:', error)

        // Create a more descriptive error
        if (error instanceof Error) {
            throw new Error(`Failed to create project: ${error.message}`)
        } else {
            throw new Error('Failed to create project: Unknown error occurred')
        }
    }
}

// Update project
export const updateProject = async (
    projectId: string,
    projectData: Partial<{
        title: string
        description: string
        short_description: string
        category: string
        tech_stack: string[]
        github_url: string
        live_demo_url: string
        documentation_url: string
        thumbnail_url: string
        images: string[]
        features: string[]
        tags: string[]
        status: 'draft' | 'published' | 'archived'
    }>,
    userEmail: string
): Promise<Project> => {
    try {
        console.log('Updating project with data:', { projectId, projectData, userEmail })

        const user = await ensureUserExists(userEmail)
        console.log('User found for update:', { id: user.id, email: user.email })

        // Verify ownership
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('user_id')
            .eq('id', projectId)
            .single()

        if (fetchError) {
            console.error('Error fetching project for ownership check:', fetchError)
            throw new Error(`Failed to verify project ownership: ${fetchError.message}`)
        }

        if (project.user_id !== user.id) {
            throw new Error('Not authorized to update this project')
        }

        // Prepare update data (exclude tags from main update)
        const { tags, ...updateData } = projectData

        // Clean up the update data
        const cleanUpdateData = Object.fromEntries(
            Object.entries(updateData).map(([key, value]) => [
                key,
                value === '' ? null : value
            ])
        )

        console.log('Updating project with cleaned data:', cleanUpdateData)

        const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update(cleanUpdateData)
            .eq('id', projectId)
            .select(`
                *,
                tags:project_tags(tag)
            `)
            .single()

        if (updateError) {
            console.error('Supabase project update error:', updateError)
            throw new Error(`Database error: ${updateError.message || 'Unknown error'}`)
        }

        console.log('Project updated successfully:', updatedProject)

        // Handle tags if provided
        if (tags !== undefined) {
            console.log('Updating tags:', tags)

            // Delete existing tags
            const { error: deleteTagsError } = await supabase
                .from('project_tags')
                .delete()
                .eq('project_id', projectId)

            if (deleteTagsError) {
                console.error('Error deleting existing tags:', deleteTagsError)
                // Don't throw here, just log the error
            }

            // Add new tags if any
            if (tags.length > 0) {
                const tagsData = tags.map(tag => ({
                    project_id: projectId,
                    tag: tag.trim().toLowerCase()
                }))

                console.log('Adding new tags:', tagsData)

                const { error: tagsError } = await supabase
                    .from('project_tags')
                    .insert(tagsData)

                if (tagsError) {
                    console.error('Error adding new tags:', tagsError)
                    // Don't throw here, just log the error
                }
            }
        }

        return updatedProject
    } catch (error) {
        console.error('Error updating project:', error)

        // Create a more descriptive error
        if (error instanceof Error) {
            throw new Error(`Failed to update project: ${error.message}`)
        } else {
            throw new Error('Failed to update project: Unknown error occurred')
        }
    }
}

// Delete project
export const deleteProject = async (projectId: string, userEmail: string): Promise<void> => {
    try {
        const user = await ensureUserExists(userEmail)

        // Verify ownership
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('user_id')
            .eq('id', projectId)
            .single()

        if (fetchError) throw fetchError
        if (project.user_id !== user.id) {
            throw new Error('Not authorized to delete this project')
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)

        if (error) throw error
    } catch (error) {
        console.error('Error deleting project:', error)
        throw error
    }
}

// Like/Unlike project
export const toggleProjectLike = async (projectId: string, userEmail: string): Promise<boolean> => {
    try {
        const user = await ensureUserExists(userEmail)

        // Check if already liked
        const { data: existingLike } = await supabase
            .from('project_likes')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .single()

        if (existingLike) {
            // Unlike
            await supabase
                .from('project_likes')
                .delete()
                .eq('project_id', projectId)
                .eq('user_id', user.id)

            // Decrease like count
            const { data: project } = await supabase
                .from('projects')
                .select('likes_count')
                .eq('id', projectId)
                .single()

            await supabase
                .from('projects')
                .update({ likes_count: Math.max(0, (project?.likes_count || 0) - 1) })
                .eq('id', projectId)

            return false
        } else {
            // Like
            await supabase
                .from('project_likes')
                .insert({
                    project_id: projectId,
                    user_id: user.id
                })

            // Increase like count
            const { data: project } = await supabase
                .from('projects')
                .select('likes_count')
                .eq('id', projectId)
                .single()

            await supabase
                .from('projects')
                .update({ likes_count: (project?.likes_count || 0) + 1 })
                .eq('id', projectId)

            return true
        }
    } catch (error) {
        console.error('Error toggling project like:', error)
        throw error
    }
}

// Add comment to project
export const addProjectComment = async (
    projectId: string,
    content: string,
    userEmail: string
): Promise<ProjectComment> => {
    try {
        const user = await ensureUserExists(userEmail)

        const { data, error } = await supabase
            .from('project_comments')
            .insert({
                project_id: projectId,
                user_id: user.id,
                content: content.trim()
            })
            .select(`
                *,
                user:users(display_name, avatar_url, github_username)
            `)
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error adding comment:', error)
        throw error
    }
}

// Get project categories
export const getProjectCategories = () => [
    { value: 'all', label: 'All Categories' },
    { value: 'web-app', label: 'Web App' },
    { value: 'mobile-app', label: 'Mobile App' },
    { value: 'desktop-app', label: 'Desktop App' },
    { value: 'game', label: 'Game' },
    { value: 'ai-ml', label: 'AI/ML' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'iot', label: 'IoT' },
    { value: 'api', label: 'API' },
    { value: 'library', label: 'Library' },
    { value: 'tool', label: 'Tool' },
    { value: 'other', label: 'Other' }
]

// Get popular tags
export const getPopularTags = async (limit: number = 20): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('project_tags')
            .select('tag')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        // Get unique tags
        const uniqueTags = [...new Set(data?.map(item => item.tag) || [])]
        return uniqueTags
    } catch (error) {
        console.error('Error fetching popular tags:', error)
        return []
    }
}
