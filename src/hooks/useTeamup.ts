import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { TeamupPost, TeamApplication, TeamMember } from '@/lib/supabase'
import {
    getTeamupPosts,
    getUserTeamupPosts,
    createTeamupPost,
    getApplicationsForPost,
    getUserApplications,
    createApplication,
    updateApplicationStatus,
    getTeamMembers,
    getTeamupStats,
    TeamupFormData,
    ApplicationFormData
} from '@/lib/teamupApiNextAuth'

export const useTeamupPosts = (filters?: {
    category?: string
    search?: string
    sortBy?: string
}) => {
    const [posts, setPosts] = useState<TeamupPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getTeamupPosts(filters?.category)
            setPosts(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch posts')
        } finally {
            setLoading(false)
        }
    }, [filters?.category, filters?.search, filters?.sortBy])

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    const refresh = () => fetchPosts()

    return { posts, loading, error, refresh }
}

export const useUserTeamupPosts = () => {
    const { data: session } = useSession()
    const [posts, setPosts] = useState<TeamupPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPosts = useCallback(async () => {
        if (!session?.user?.email) {
            setPosts([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)
            const data = await getUserTeamupPosts(session.user.email)
            setPosts(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch user posts')
        } finally {
            setLoading(false)
        }
    }, [session?.user?.email])

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    const refresh = () => fetchPosts()

    return { posts, loading, error, refresh }
}

export const useTeamupForm = () => {
    const { data: session } = useSession()
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submitPost = async (formData: TeamupFormData) => {
        if (!session?.user?.email) {
            throw new Error('User not authenticated')
        }

        try {
            setSubmitting(true)
            setError(null)

            const result = await createTeamupPost(
                formData,
                session.user.email,
                session.user.name || undefined,
                session.user.image || undefined
            )

            return result
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create post'
            setError(errorMessage)
            throw err
        } finally {
            setSubmitting(false)
        }
    }

    return { submitPost, submitting, error }
}

export const useTeamupApplications = (postId?: string) => {
    const { data: session } = useSession()
    const [applications, setApplications] = useState<TeamApplication[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchApplications = useCallback(async () => {
        if (!postId) return

        try {
            setLoading(true)
            setError(null)
            const data = await getApplicationsForPost(postId)
            setApplications(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch applications')
        } finally {
            setLoading(false)
        }
    }, [postId])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const submitApplication = async (formData: ApplicationFormData) => {
        if (!session?.user?.email) {
            throw new Error('User not authenticated')
        }

        try {
            setError(null)
            const result = await createApplication(
                formData,
                session.user.email,
                session.user.name || undefined,
                session.user.image || undefined
            )

            // Refresh applications after creating
            await fetchApplications()
            return result
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit application'
            setError(errorMessage)
            throw err
        }
    }

    const updateStatus = async (applicationId: string, status: 'pending' | 'accepted' | 'rejected') => {
        try {
            setError(null)
            const result = await updateApplicationStatus(applicationId, status)

            // Refresh applications after updating
            await fetchApplications()
            return result
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update application status'
            setError(errorMessage)
            throw err
        }
    }

    const refresh = () => fetchApplications()

    return {
        applications,
        loading,
        error,
        submitApplication,
        updateStatus,
        refresh
    }
}

export const useUserApplications = () => {
    const { data: session } = useSession()
    const [applications, setApplications] = useState<TeamApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchApplications = useCallback(async () => {
        if (!session?.user?.email) {
            setApplications([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)
            const data = await getUserApplications(session.user.email)
            setApplications(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch user applications')
        } finally {
            setLoading(false)
        }
    }, [session?.user?.email])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const refresh = () => fetchApplications()

    return { applications, loading, error, refresh }
}

export const useTeamMembers = (postId?: string) => {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchMembers = useCallback(async () => {
        if (!postId) return

        try {
            setLoading(true)
            setError(null)
            const data = await getTeamMembers(postId)
            setMembers(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch team members')
        } finally {
            setLoading(false)
        }
    }, [postId])

    useEffect(() => {
        fetchMembers()
    }, [fetchMembers])

    const refresh = () => fetchMembers()

    return { members, loading, error, refresh }
}

export const useTeamupStats = () => {
    const [stats, setStats] = useState({
        totalPosts: 0,
        totalApplications: 0,
        totalMembers: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getTeamupStats()
            setStats(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const refresh = () => fetchStats()

    return { stats, loading, error, refresh }
}

// Hook for managing applications (for project creators)
export const useProjectApplications = (projectId: string | null) => {
    const { data: session } = useSession()
    const [applications, setApplications] = useState<TeamApplication[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchApplications = useCallback(async () => {
        if (!projectId || !session?.user?.email) {
            setApplications([])
            return
        }

        try {
            setLoading(true)
            setError(null)
            const { getProjectApplications } = await import('@/lib/teamupApiNextAuth')
            const data = await getProjectApplications(projectId, session.user.email)
            setApplications(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch applications')
        } finally {
            setLoading(false)
        }
    }, [projectId, session?.user?.email])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const updateStatus = async (applicationId: string, status: 'accepted' | 'rejected') => {
        if (!session?.user?.email) return

        try {
            await updateApplicationStatus(applicationId, status, session.user.email)
            await fetchApplications() // Refresh applications
        } catch (err) {
            throw err
        }
    }

    return { applications, loading, error, refresh: fetchApplications, updateStatus }
}
