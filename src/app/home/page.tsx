"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GitHubLogoIcon, ExitIcon, PlusIcon } from '@radix-ui/react-icons';
import { ProblemList } from '@/components/ProblemList';
import { ProblemCreationForm } from '@/components/ProblemCreationForm';
import { UserStats } from '@/components/UserStats';
import { useToast } from "@/components/toast-provider";

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'problems' | 'create' | 'stats' | 'pages'>('problems');

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <div className="w-full min-h-screen bg-black" style={{ background: 'black' }}>
            {/* Header */}
            <header className="border-b border-gray-800 bg-black">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-white">CODEER</h1>
                            <span className="text-gray-400 text-sm">
                                Welcome back, {session?.user?.name || session?.user?.email}
                            </span>
                        </div>

                        <div className="flex items-center space-x-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-300 transition-colors"
                            >
                                <GitHubLogoIcon className="w-5 h-5" />
                            </a>
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <ExitIcon className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="border-b border-gray-800 bg-black">
                <div className="container mx-auto px-4">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => setActiveTab('problems')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                activeTab === 'problems'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            Problems
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                activeTab === 'create'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            <PlusIcon className="w-4 h-4 mr-1 inline" />
                            Create Problem
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                activeTab === 'stats'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            My Progress
                        </button>
                        <button
                            onClick={() => setActiveTab('pages')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                activeTab === 'pages'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            GitHub Pages
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Tab Content */}
                {activeTab === 'problems' && (
                    <ProblemList />
                )}

                {activeTab === 'create' && (
                    <ProblemCreationForm 
                        onSuccess={() => {
                            setActiveTab('problems');
                            showToast('Problem created successfully!', 'success');
                        }}
                    />
                )}

                {activeTab === 'stats' && (
                    <UserStats />
                )}

                {activeTab === 'pages' && (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">GitHub Pages Hosting</h3>
                        <p className="text-gray-400">
                            Host your static websites with custom domains (GitHub account required)
                        </p>
                        <p className="text-gray-500 text-sm mt-2">Coming Soon...</p>
                    </div>
                )}
            </main>
        </div>
    );
}