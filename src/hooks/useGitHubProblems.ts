import { useState, useEffect } from 'react';

export interface GitHubProblem {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    description: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    examples: Array<{
        input: string;
        output: string;
        explanation: string;
    }>;
    tags: string[]; // Changed from string to string[] for consistency
    finalAnswer?: string;
    author?: string;
    filename: string;
    createdAt?: Date;
}

interface UseGitHubProblemsResult {
    problems: GitHubProblem[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    stats: {
        total: number;
        easy: number;
        medium: number;
        hard: number;
        categories: Record<string, number>;
    };
}

export function useGitHubProblems(): UseGitHubProblemsResult {
    const [problems, setProblems] = useState<GitHubProblem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProblems = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔄 Fetching problems from GitHub...');

            const url = forceRefresh
                ? `/api/github-problems?refresh=${Date.now()}` // Cache-busting parameter
                : '/api/github-problems';

            const response = await fetch(url, {
                headers: {
                    'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=1800' // 30 minutes cache unless refreshing
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch problems: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setProblems(data.problems);
                console.log(`✅ Loaded ${data.problems.length} problems from GitHub`);

                if (data.cached) {
                    console.log('📦 Data served from cache');
                }
            } else {
                throw new Error(data.error || 'Failed to fetch problems');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('❌ Error fetching GitHub problems:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        console.log('🔄 Force refreshing GitHub problems...');
        fetchProblems(true); // Force refresh to bypass cache
    };

    useEffect(() => {
        fetchProblems();
    }, []);

    // Calculate statistics
    const stats = {
        total: problems.length,
        easy: problems.filter(p => p.difficulty === 'easy').length,
        medium: problems.filter(p => p.difficulty === 'medium').length,
        hard: problems.filter(p => p.difficulty === 'hard').length,
        categories: problems.reduce((acc, problem) => {
            const category = problem.category || 'uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    };

    return {
        problems,
        loading,
        error,
        refresh,
        stats
    };
}

// Alternative hook that combines local and GitHub problems
export function useCombinedProblems() {
    const githubProblems = useGitHubProblems();
    const [localProblems, setLocalProblems] = useState<any[]>([]);

    useEffect(() => {
        // Load local problems from localStorage or API
        const loadLocalProblems = async () => {
            try {
                const response = await fetch('/api/problems');
                if (response.ok) {
                    const data = await response.json();
                    setLocalProblems(data);
                }
            } catch (error) {
                console.error('Error loading local problems:', error);
            }
        };

        loadLocalProblems();
    }, []);

    // Combine and deduplicate problems
    const allProblems = [
        ...githubProblems.problems,
        ...localProblems.map(p => ({
            ...p,
            source: 'local' as const
        }))
    ];

    // Remove duplicates based on title or ID
    const uniqueProblems = allProblems.filter((problem, index, self) =>
        index === self.findIndex(p => p.title === problem.title || p.id === problem.id)
    );

    return {
        problems: uniqueProblems,
        loading: githubProblems.loading,
        error: githubProblems.error,
        refresh: githubProblems.refresh,
        stats: {
            total: uniqueProblems.length,
            github: githubProblems.problems.length,
            local: localProblems.length,
            easy: uniqueProblems.filter(p => p.difficulty === 'easy').length,
            medium: uniqueProblems.filter(p => p.difficulty === 'medium').length,
            hard: uniqueProblems.filter(p => p.difficulty === 'hard').length,
        }
    };
}
