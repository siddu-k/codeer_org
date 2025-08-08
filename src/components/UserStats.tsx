"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UserStats {
    total_xp: number;
    problems_solved: number;
    current_streak: number;
    max_streak: number;
    completion_percentage: number;
    difficulty_breakdown: {
        easy: number;
        medium: number;
        hard: number;
    };
    recent_submissions: Array<{
        id: string;
        problem_title: string;
        problem_difficulty: string;
        status: string;
        language: string;
        runtime?: number;
        memory?: number;
        submitted_at: string;
    }>;
}

export function UserStats() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.email) {
            fetchStats();
        }
    }, [session?.user?.email]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/stats');
            
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!session?.user) {
        return (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 text-center">
                <p className="text-gray-400">Sign in to view your progress</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-[#333] rounded w-1/4"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-16 bg-[#333] rounded"></div>
                        <div className="h-16 bg-[#333] rounded"></div>
                        <div className="h-16 bg-[#333] rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 text-center">
                <p className="text-gray-400">Failed to load stats</p>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Accepted': return 'text-green-400';
            case 'Wrong Answer': return 'text-red-400';
            case 'Time Limit Exceeded': return 'text-yellow-400';
            case 'Memory Limit Exceeded': return 'text-orange-400';
            case 'Compilation Error': return 'text-purple-400';
            case 'Runtime Error': return 'text-pink-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.total_xp}</div>
                    <div className="text-sm text-gray-400">Total XP</div>
                </div>
                
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.problems_solved}</div>
                    <div className="text-sm text-gray-400">Problems Solved</div>
                </div>
                
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">{stats.current_streak}</div>
                    <div className="text-sm text-gray-400">Current Streak</div>
                </div>
                
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.completion_percentage}%</div>
                    <div className="text-sm text-gray-400">Completion</div>
                </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Problems Solved by Difficulty</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{stats.difficulty_breakdown.easy}</div>
                        <div className="text-sm text-gray-400">🟢 Easy</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{stats.difficulty_breakdown.medium}</div>
                        <div className="text-sm text-gray-400">🟡 Medium</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{stats.difficulty_breakdown.hard}</div>
                        <div className="text-sm text-gray-400">🔴 Hard</div>
                    </div>
                </div>
            </div>

            {/* Recent Submissions */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Submissions</h3>
                {stats.recent_submissions.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No submissions yet</p>
                ) : (
                    <div className="space-y-3">
                        {stats.recent_submissions.map((submission) => (
                            <div key={submission.id} className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#333] rounded-md">
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${getStatusColor(submission.status)}`}>
                                        {submission.status}
                                    </span>
                                    <span className="text-white text-sm">{submission.problem_title}</span>
                                    <span className="text-gray-400 text-xs">{submission.language}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {submission.runtime && (
                                        <span>{submission.runtime}ms</span>
                                    )}
                                    {submission.memory && (
                                        <span>{submission.memory}KB</span>
                                    )}
                                    <span>{new Date(submission.submitted_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}