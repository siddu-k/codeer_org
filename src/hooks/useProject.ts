import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Project, ProjectComment } from '@/lib/supabase'
import {
    getProjects,
    getFeaturedProjects,
    getProjectById,
    getUserProjects,
    createProject,
    updateProject,
    deleteProject,
    toggleProjectLike,
    addProjectComment,
    getProjectCategories,
    getPopularTags
} from '@/lib/projectApi'

// Hook for fetching projects with filtering and pagination
export const useProjects = (options: {
    page?: number
    limit?: number
    category?: string
    search?: string
    sortBy?: 'created_at' | 'likes_count' | 'views_count'
    sortOrder?: 'asc' | 'desc'
} = {}) => {
    const [projects, setProjects] = useState<Project[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchProjects = async () => {
        try {
            setLoading(true)
            setError(null)
            const result = await getProjects(options)
            setProjects(result.data)
            setTotal(result.total)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProjects()
    }, [
        options.page,
        options.limit,
        options.category,
        options.search,
        options.sortBy,
        options.sortOrder
    ])

    return {
        projects,
        total,
        loading,
        error,
        refetch: fetchProjects
    }
}

// Hook for featured projects
export const useFeaturedProjects = (limit: number = 6) => {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await getFeaturedProjects(limit)
                setProjects(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch featured projects')
            } finally {
                setLoading(false)
            }
        }

        fetchFeatured()
    }, [limit])

    return { projects, loading, error }
}

// Hook for single project
export const useProject = (projectId: string | null) => {
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!projectId) {
            setProject(null)
            setLoading(false)
            return
        }

        const fetchProject = async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await getProjectById(projectId)
                setProject(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch project')
            } finally {
                setLoading(false)
            }
        }

        fetchProject()
    }, [projectId])

    return { project, loading, error }
}

// Hook for user's projects
export const useUserProjects = () => {
    const { data: session } = useSession()
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUserProjects = async () => {
        if (!session?.user?.email) {
            setProjects([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)
            const data = await getUserProjects(session.user.email)
            setProjects(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch your projects')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUserProjects()
    }, [session?.user?.email])

    return {
        projects,
        loading,
        error,
        refetch: fetchUserProjects
    }
}

// Hook for project management (CRUD operations)
export const useProjectManager = () => {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async (projectData: {
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
    }) => {
        console.log('useProjectManager handleCreate called with:', {
            projectData,
            userEmail: session?.user?.email,
            sessionExists: !!session
        })

        if (!session?.user?.email) {
            const errorMsg = 'Please sign in to create a project'
            console.error(errorMsg)
            throw new Error(errorMsg)
        }

        try {
            setLoading(true)
            setError(null)
            console.log('Calling createProject API...')
            const project = await createProject(projectData, session.user.email)
            console.log('Project created successfully:', project)
            return project
        } catch (err) {
            console.error('Error in handleCreate:', err)
            const message = err instanceof Error ? err.message : 'Failed to create project'
            setError(message)
            throw new Error(message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (
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
        }>
    ) => {
        console.log('useProjectManager handleUpdate called with:', {
            projectId,
            projectData,
            userEmail: session?.user?.email
        })

        if (!session?.user?.email) {
            const errorMsg = 'Please sign in to update project'
            console.error(errorMsg)
            throw new Error(errorMsg)
        }

        try {
            setLoading(true)
            setError(null)
            console.log('Calling updateProject API...')
            const project = await updateProject(projectId, projectData, session.user.email)
            console.log('Project updated successfully:', project)
            return project
        } catch (err) {
            console.error('Error in handleUpdate:', err)
            const message = err instanceof Error ? err.message : 'Failed to update project'
            setError(message)
            throw new Error(message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (projectId: string) => {
        if (!session?.user?.email) {
            throw new Error('Please sign in to delete project')
        }

        try {
            setLoading(true)
            setError(null)
            await deleteProject(projectId, session.user.email)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete project'
            setError(message)
            throw new Error(message)
        } finally {
            setLoading(false)
        }
    }

    return {
        createProject: handleCreate,
        updateProject: handleUpdate,
        deleteProject: handleDelete,
        loading,
        error
    }
}

// Hook for project interactions (like, comment)
export const useProjectInteractions = () => {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)

    const handleLike = async (projectId: string) => {
        if (!session?.user?.email) {
            throw new Error('Please sign in to like projects')
        }

        try {
            setLoading(true)
            const isLiked = await toggleProjectLike(projectId, session.user.email)
            return isLiked
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to like project')
        } finally {
            setLoading(false)
        }
    }

    const handleComment = async (projectId: string, content: string) => {
        if (!session?.user?.email) {
            throw new Error('Please sign in to comment')
        }

        try {
            setLoading(true)
            const comment = await addProjectComment(projectId, content, session.user.email)
            return comment
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to add comment')
        } finally {
            setLoading(false)
        }
    }

    return {
        likeProject: handleLike,
        commentOnProject: handleComment,
        loading
    }
}

// Hook for project categories
export const useProjectCategories = () => {
    return getProjectCategories()
}

// Hook for popular tags
export const usePopularTags = (limit: number = 20) => {
    const [tags, setTags] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTags = async () => {
            try {
                setLoading(true)
                const data = await getPopularTags(limit)
                setTags(data)
            } catch (err) {
                console.error('Failed to fetch popular tags:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchTags()
    }, [limit])

    return { tags, loading }
}
