"use client";

import { useState, useEffect } from 'react';
import { MonacoCodeEditor } from './MonacoCodeEditor';

interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    time_limit: number;
    memory_limit: number;
    boilerplate_code: string;
    marks: number;
    total_submissions: number;
    total_accepted: number;
    acceptance_rate: number;
    examples: Array<{
        input: string;
        expected_output: string;
        explanation: string;
    }>;
    user_status?: {
        status: 'unattempted' | 'attempted' | 'solved' | 'viewed_solution';
        xp_earned: number;
        attempts_count: number;
    };
    createdAt: Date;
}

export function ProblemList() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchProblems();
    }, []);

    const fetchProblems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/problems');
            
            if (response.ok) {
                const data = await response.json();
                setProblems(data);
            } else {
                console.error('Failed to fetch problems');
            }
        } catch (error) {
            console.error('Error fetching problems:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'hard': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getDifficultyEmoji = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '🟢';
            case 'medium': return '🟡';
            case 'hard': return '🔴';
            default: return '⚪';
        }
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'solved': return '✅';
            case 'attempted': return '🔄';
            case 'viewed_solution': return '👁️';
            default: return '⭕';
        }
    };

    const filteredProblems = problems.filter(problem => {
        const matchesSearch = !searchQuery || 
            problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            problem.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            problem.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesDifficulty = !difficultyFilter || problem.difficulty === difficultyFilter;
        const matchesCategory = !categoryFilter || problem.category === categoryFilter;
        const matchesStatus = !statusFilter || problem.user_status?.status === statusFilter;

        return matchesSearch && matchesDifficulty && matchesCategory && matchesStatus;
    });

    if (selectedProblem) {
        return (
            <div className="space-y-6">
                {/* Problem Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSelectedProblem(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Problems
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${getDifficultyColor(selectedProblem.difficulty)}`}>
                            {getDifficultyEmoji(selectedProblem.difficulty)} {selectedProblem.difficulty.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-400">
                            {selectedProblem.marks} XP
                        </span>
                        {selectedProblem.user_status && (
                            <span className="text-sm text-gray-400">
                                {getStatusIcon(selectedProblem.user_status.status)} {selectedProblem.user_status.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Problem Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Problem Description */}
                    <div className="space-y-6">
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                            <h1 className="text-2xl font-bold text-white mb-4">{selectedProblem.title}</h1>
                            
                            <div className="prose prose-invert max-w-none">
                                <div className="text-gray-300 whitespace-pre-wrap mb-6">
                                    {selectedProblem.description}
                                </div>
                            </div>

                            {/* Problem Constraints */}
                            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#0a0a0a] border border-[#333] rounded-md">
                                <div>
                                    <div className="text-gray-400 text-xs">Time Limit</div>
                                    <div className="text-white text-sm">{selectedProblem.time_limit}ms</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-xs">Memory Limit</div>
                                    <div className="text-white text-sm">{selectedProblem.memory_limit}MB</div>
                                </div>
                            </div>

                            {/* Examples */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">Examples</h3>
                                {selectedProblem.examples.map((example, index) => (
                                    <div key={index} className="bg-[#0a0a0a] border border-[#333] rounded-md p-4">
                                        <div className="text-sm font-medium text-white mb-2">Example {index + 1}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-gray-400 text-xs mb-1">Input:</div>
                                                <pre className="bg-[#1a1a1a] p-2 rounded text-gray-300 text-xs font-mono">
                                                    {example.input}
                                                </pre>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs mb-1">Output:</div>
                                                <pre className="bg-[#1a1a1a] p-2 rounded text-gray-300 text-xs font-mono">
                                                    {example.expected_output}
                                                </pre>
                                            </div>
                                        </div>
                                        {example.explanation && (
                                            <div className="mt-2">
                                                <div className="text-gray-400 text-xs mb-1">Explanation:</div>
                                                <div className="text-gray-300 text-sm">{example.explanation}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Tags */}
                            {selectedProblem.tags.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-white mb-2">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProblem.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded-md text-xs"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Code Editor */}
                    <div>
                        <MonacoCodeEditor 
                            problem={selectedProblem}
                            onSubmissionResult={(result) => {
                                // Refresh problems to update status
                                fetchProblems();
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Problems</h1>
                <div className="text-gray-400 text-sm">
                    {problems.length} problems available
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                    type="text"
                    placeholder="Search problems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Categories</option>
                    <option value="algorithms">Algorithms</option>
                    <option value="data-structures">Data Structures</option>
                    <option value="dynamic-programming">Dynamic Programming</option>
                    <option value="graph">Graph</option>
                    <option value="tree">Tree</option>
                    <option value="array">Array</option>
                    <option value="string">String</option>
                    <option value="math">Math</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Status</option>
                    <option value="unattempted">Not Attempted</option>
                    <option value="attempted">Attempted</option>
                    <option value="solved">Solved</option>
                    <option value="viewed_solution">Viewed Solution</option>
                </select>
            </div>

            {/* Problems Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-400">Loading problems...</span>
                </div>
            ) : (
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#333]">
                            <thead className="bg-[#0a0a0a]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Difficulty
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Acceptance
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        XP
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-[#1a1a1a] divide-y divide-[#333]">
                                {filteredProblems.map((problem) => (
                                    <tr
                                        key={problem.id}
                                        onClick={() => setSelectedProblem(problem)}
                                        className="hover:bg-[#222] cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="text-lg">
                                                {getStatusIcon(problem.user_status?.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                                                {problem.title}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {problem.tags.slice(0, 3).join(', ')}
                                                {problem.tags.length > 3 && '...'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                                                {getDifficultyEmoji(problem.difficulty)} {problem.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {problem.category.replace('-', ' ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {problem.acceptance_rate.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-white">
                                                {problem.user_status?.xp_earned || 0} / {problem.marks}
                                            </div>
                                            {problem.user_status?.attempts_count && (
                                                <div className="text-xs text-gray-400">
                                                    {problem.user_status.attempts_count} attempts
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredProblems.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No Problems Found</h3>
                            <p className="text-gray-400">
                                {searchQuery || difficultyFilter || categoryFilter || statusFilter
                                    ? 'Try adjusting your filters'
                                    : 'No problems available yet'
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getStatusIcon(status?: string) {
    switch (status) {
        case 'solved': return '✅';
        case 'attempted': return '🔄';
        case 'viewed_solution': return '👁️';
        default: return '⭕';
    }
}