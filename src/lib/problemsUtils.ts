export interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    examples: Array<{
        input: string;
        output: string;
        explanation: string;
    }>;
    solution?: string;
    createdBy?: string;
    createdAt?: Date | string; // Support both Date objects and string dates from JSON
    filename: string;
}

export interface ProblemStats {
    total: number;
    easy: number;
    medium: number;
    hard: number;
    categories: { [key: string]: number };
}

// Function to read all problems from the API
export async function loadProblems(): Promise<Problem[]> {
    try {
        const response = await fetch('/api/problems');
        if (!response.ok) {
            throw new Error('Failed to fetch problems');
        }
        const problemsData = await response.json();

        // Convert date strings back to Date objects
        return problemsData.map((problem: any) => ({
            ...problem,
            createdAt: new Date(problem.createdAt)
        }));
    } catch (error) {
        console.error('Error loading problems:', error);
        return [];
    }
}

// Function to calculate statistics from problems array
export function calculateProblemStats(problems: Problem[]): ProblemStats {
    const stats: ProblemStats = {
        total: problems.length,
        easy: 0,
        medium: 0,
        hard: 0,
        categories: {}
    };

    problems.forEach(problem => {
        // Count by difficulty
        if (problem.difficulty === 'easy') stats.easy++;
        else if (problem.difficulty === 'medium') stats.medium++;
        else if (problem.difficulty === 'hard') stats.hard++;

        // Count by category
        if (problem.category) {
            stats.categories[problem.category] = (stats.categories[problem.category] || 0) + 1;
        }
    });

    return stats;
}

// Helper function to safely get time from date
function getTimeFromDate(date: Date | string | undefined): number {
    if (!date) return 0;

    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        return isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
    } catch {
        return 0;
    }
}

// Function to filter and sort problems
export function filterAndSortProblems(
    problems: Problem[],
    searchQuery: string = '',
    difficultyFilter: string = '',
    categoryFilter: string = '',
    sortBy: string = 'newest'
): Problem[] {
    let filtered = [...problems];

    // Apply search filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(problem =>
            problem.title.toLowerCase().includes(query) ||
            problem.description.toLowerCase().includes(query) ||
            problem.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }

    // Apply difficulty filter
    if (difficultyFilter && difficultyFilter !== '') {
        filtered = filtered.filter(problem => problem.difficulty === difficultyFilter);
    }

    // Apply category filter
    if (categoryFilter && categoryFilter !== '') {
        filtered = filtered.filter(problem => problem.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return getTimeFromDate(b.createdAt) - getTimeFromDate(a.createdAt);
            case 'oldest':
                return getTimeFromDate(a.createdAt) - getTimeFromDate(b.createdAt);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'difficulty':
                const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            default:
                return 0;
        }
    });

    return filtered;
}

// Function to format date for display
export function formatDate(date: Date | string | undefined): string {
    if (!date) {
        return 'No date available';
    }

    // Convert string dates to Date objects
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
    }

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;

    return dateObj.toLocaleDateString();
}
