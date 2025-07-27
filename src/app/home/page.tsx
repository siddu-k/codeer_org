"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRepoSetup } from "@/hooks/useRepoSetup";
import { useGitHubProblems, useCombinedProblems } from "@/hooks/useGitHubProblems";
import { Home, Lock, Terminal, User, LogOut, Code, Brain, Users, Presentation, BookOpen, ChevronDown, ChevronRight, Info, LayoutDashboard, FileText, Plus, Save, X, Eye, Edit, Trash2, RefreshCw, Github, Cloud, ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import { syncUserWithSupabase } from "@/lib/userSync";
import { saveProblemToGitHub } from "@/lib/githubApi";
import { loadProblems, calculateProblemStats, filterAndSortProblems, formatDate, type Problem, type ProblemStats } from "@/lib/problemsUtils";
import { type GitHubProblem } from "@/hooks/useGitHubProblems";

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const repoStatus = useRepoSetup();
    const [activeTab, setActiveTab] = useState<string | null>("home");
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [activeQuickCreateTab, setActiveQuickCreateTab] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Problem creation form state
    const [problemForm, setProblemForm] = useState({
        title: "",
        description: "",
        difficulty: "easy",
        category: "algorithms",
        inputFormat: "",
        outputFormat: "",
        constraints: "",
        examples: [{ input: "", output: "", explanation: "" }],
        tags: "",
        finalAnswer: ""
    });

    // GitHub problems integration
    const githubProblems = useGitHubProblems();
    const combinedProblems = useCombinedProblems();

    // Problems page state
    const [problems, setProblems] = useState<Problem[]>([]);
    const [problemStats, setProblemStats] = useState<ProblemStats>({
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        categories: {}
    });
    const [useGitHubData, setUseGitHubData] = useState(true); // Toggle between local and GitHub data
    const [searchQuery, setSearchQuery] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
    const [isLoadingProblems, setIsLoadingProblems] = useState(false);

    // Problem solving page state
    const [selectedProblem, setSelectedProblem] = useState<Problem | GitHubProblem | null>(null);
    const [isInSolvingMode, setIsInSolvingMode] = useState(false);
    const [code, setCode] = useState("// Write your solution here\n");
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");

    const handleSaveProblem = async () => {
        console.log('HandleSaveProblem called');
        console.log('Session status:', status);
        console.log('Session data:', session);
        console.log('Access token available:', !!session?.accessToken);

        if (!session?.accessToken) {
            console.error('No access token available');
            setSaveStatus('error');
            return;
        }

        if (!problemForm.title.trim()) {
            console.error('Problem title is required');
            setSaveStatus('error');
            return;
        }

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const success = await saveProblemToGitHub(problemForm, session.accessToken);

            if (success) {
                setSaveStatus('success');
                console.log('Problem saved successfully!');
            } else {
                setSaveStatus('error');
                console.error('Failed to save problem');
            }
        } catch (error) {
            console.error('Error saving problem:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
            // Auto-reset status after 3 seconds
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    // Function to load problems (local or GitHub)
    const loadProblemsData = useCallback(async () => {
        setIsLoadingProblems(true);
        try {
            let problemsData: Problem[] = [];

            if (useGitHubData) {
                // Use GitHub problems ONLY (not combined)
                problemsData = githubProblems.problems;
            } else {
                // Use local problems only
                problemsData = await loadProblems();
            }

            setProblems(problemsData);
            setProblemStats(calculateProblemStats(problemsData));

            // Apply current filters
            const filtered = filterAndSortProblems(
                problemsData,
                searchQuery,
                difficultyFilter,
                categoryFilter,
                sortBy
            );
            setFilteredProblems(filtered);
        } catch (error) {
            console.error('Error loading problems:', error);
        } finally {
            setIsLoadingProblems(false);
        }
    }, [useGitHubData, searchQuery, difficultyFilter, categoryFilter, sortBy, githubProblems.problems]);

    // Unified refresh function for both GitHub and local data
    const handleRefresh = async () => {
        if (useGitHubData) {
            // Refresh GitHub data
            await githubProblems.refresh();
        } else {
            // Refresh local data
            await loadProblemsData();
        }
    };

    // Handle problem selection for solving
    const handleProblemClick = (problem: Problem) => {
        setSelectedProblem(problem);
        setIsInSolvingMode(true);
        setCode("// Write your solution here\n");
    };

    // Handle closing problem solving mode
    const handleCloseSolving = () => {
        setIsInSolvingMode(false);
        setSelectedProblem(null);
        setCode("// Write your solution here\n");
    };

    // Update problems when GitHub data changes or toggle switches
    useEffect(() => {
        if (useGitHubData && !githubProblems.loading) {
            setProblems(githubProblems.problems);
            setProblemStats({
                total: githubProblems.stats.total,
                easy: githubProblems.stats.easy,
                medium: githubProblems.stats.medium,
                hard: githubProblems.stats.hard,
                categories: githubProblems.stats.categories
            });

            // Apply current filters
            const filtered = filterAndSortProblems(
                githubProblems.problems,
                searchQuery,
                difficultyFilter,
                categoryFilter,
                sortBy
            );
            setFilteredProblems(filtered);
        } else if (!useGitHubData) {
            loadProblemsData();
        }
    }, [useGitHubData, githubProblems.loading, githubProblems.stats.total, githubProblems.problems, searchQuery, difficultyFilter, categoryFilter, sortBy, loadProblemsData]);

    // Function to handle filtering and sorting
    const applyFilters = () => {
        const filtered = filterAndSortProblems(
            problems,
            searchQuery,
            difficultyFilter,
            categoryFilter,
            sortBy
        );
        setFilteredProblems(filtered);
    };

    // Apply filters whenever filter state changes (but not when problems change, to avoid infinite loops)
    useEffect(() => {
        if (problems.length > 0) {
            const filtered = filterAndSortProblems(
                problems,
                searchQuery,
                difficultyFilter,
                categoryFilter,
                sortBy
            );
            setFilteredProblems(filtered);
        }
    }, [searchQuery, difficultyFilter, categoryFilter, sortBy]); // Removed 'problems' to prevent infinite loops

    // Load problems when component mounts or when problems tab is accessed
    useEffect(() => {
        if (activeTab === "problems") {
            loadProblemsData();
        }
    }, [activeTab, loadProblemsData]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }

        // Sync user with Supabase when authenticated
        if (status === "authenticated" && session?.user) {
            const syncUser = async () => {
                try {
                    const user = session.user;
                    const githubUser = {
                        email: user?.email || ""
                    };

                    const result = await syncUserWithSupabase(githubUser);
                    if (result) {
                        console.log("User synced with Supabase:", result);
                    } else {
                        console.error("Failed to sync user with Supabase");
                    }
                } catch (error) {
                    console.error("Error syncing user:", error);
                }
            };

            syncUser();
        }
    }, [status, router, session]);

    if (status === "loading") {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <div className="w-full h-screen bg-black flex">
            {/* Sidebar */}
            <div className="w-64 bg-[#111] border-r border-[#333] flex flex-col">
                {/* Logo */}
                <div className="p-6">
                    <div className="flex items-center gap-1">
                        <h1
                            className="text-white text-xl font-bold tracking-wider uppercase"
                            style={{ fontFamily: 'Gugi, sans-serif' }}
                        >
                            CODEER
                        </h1>
                        <Image
                            src="/odeer3.png"
                            alt="Codeer Logo"
                            width={24}
                            height={24}
                            className="text-white"
                        />
                    </div>
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 p-4">
                    <nav className="space-y-2">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-4 px-2">
                            More
                        </div>
                        <a
                            href="#"
                            className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveTab("home");
                                setActiveQuickCreateTab(null);
                            }}
                        >
                            Explore
                        </a>

                        {/* Quick Create with Dropdown */}
                        <div>
                            <button
                                className="flex items-center justify-between w-full gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                                onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                            >
                                <span>Quick Create</span>
                                {isQuickCreateOpen ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {isQuickCreateOpen && (
                                <div className="ml-4 mt-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="relative group">
                                        <a
                                            href="#"
                                            className="flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveQuickCreateTab("problem");
                                                setActiveTab(null);
                                            }}
                                        >
                                            <span>Problem</span>
                                            <Info className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            Create coding challenges and algorithm problems
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <a
                                            href="#"
                                            className="flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveQuickCreateTab("page");
                                                setActiveTab(null);
                                            }}
                                        >
                                            <span>Page</span>
                                            <Info className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            Build new web pages and components
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <a
                                            href="#"
                                            className="flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveQuickCreateTab("teamup");
                                                setActiveTab(null);
                                            }}
                                        >
                                            <span>TeamUp</span>
                                            <Info className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            Start team collaborations and pair programming
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <a
                                            href="#"
                                            className="flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveQuickCreateTab("learning-docs");
                                                setActiveTab(null);
                                            }}
                                        >
                                            <span>Learning Docs</span>
                                            <Info className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            Create tutorials and educational content
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <a
                                            href="#"
                                            className="flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveQuickCreateTab("project-publish");
                                                setActiveTab(null);
                                            }}
                                        >
                                            <span>Project Publish</span>
                                            <Info className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            Share your projects with the community
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <a
                            href="#"
                            className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveTab("dashboard");
                                setActiveQuickCreateTab(null);
                            }}
                        >
                            Dashboard
                        </a>
                        <a
                            href="#"
                            className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveTab("pages");
                                setActiveQuickCreateTab(null);
                            }}
                        >
                            Pages
                        </a>
                    </nav>
                </div>

                {/* User Profile Section */}
                <div className="p-4 border-t border-[#333]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <div className="text-white text-sm font-medium">
                                {session?.user?.name || session?.user?.email || "User"}
                            </div>
                            <div className="text-gray-400 text-xs">GitHub Account</div>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-2 w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Top Navbar - Only show when not in Quick Create mode, Dashboard, or Pages */}
                {!activeQuickCreateTab && activeTab !== "dashboard" && activeTab !== "pages" && (
                    <div className="bg-black border-b border-[#333] px-6 py-4">
                        <div className="flex items-center gap-4">
                            {/* Home Tab */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === "home"
                                    ? "bg-[#1a1a1a] border border-[#404040]"
                                    : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#333]"
                                    }`}
                                onClick={() => {
                                    setActiveTab("home");
                                    setActiveQuickCreateTab(null);
                                }}
                            >
                                <Home className={`w-4 h-4 transition-colors duration-300 ${activeTab === "home" ? "text-white" : "text-gray-500"}`} />
                                <span className={`font-medium transition-colors duration-300 ${activeTab === "home" ? "text-white" : "text-gray-500"}`}>Home</span>
                            </div>

                            {/* Separator Line */}
                            <div className="w-px h-6 bg-[#333]"></div>

                            {/* Problems Tab */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === "problems"
                                    ? "bg-[#1a1a1a] border border-[#404040]"
                                    : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#333]"
                                    }`}
                                onClick={() => {
                                    setActiveTab("problems");
                                    setActiveQuickCreateTab(null);
                                }}
                            >
                                <Brain className={`w-4 h-4 transition-colors duration-300 ${activeTab === "problems" ? "text-white" : "text-gray-500"}`} />
                                <span className={`font-medium transition-colors duration-300 ${activeTab === "problems" ? "text-white" : "text-gray-500"}`}>Problems</span>
                            </div>

                            {/* TeamUp Tab */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === "teamup"
                                    ? "bg-[#1a1a1a] border border-[#404040]"
                                    : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#333]"
                                    }`}
                                onClick={() => {
                                    setActiveTab("teamup");
                                    setActiveQuickCreateTab(null);
                                }}
                            >
                                <Users className={`w-4 h-4 transition-colors duration-300 ${activeTab === "teamup" ? "text-white" : "text-gray-500"}`} />
                                <span className={`font-medium transition-colors duration-300 ${activeTab === "teamup" ? "text-white" : "text-gray-500"}`}>TeamUp</span>
                            </div>

                            {/* Project Expo Tab */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === "project-expo"
                                    ? "bg-[#1a1a1a] border border-[#404040]"
                                    : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#333]"
                                    }`}
                                onClick={() => {
                                    setActiveTab("project-expo");
                                    setActiveQuickCreateTab(null);
                                }}
                            >
                                <Presentation className={`w-4 h-4 transition-colors duration-300 ${activeTab === "project-expo" ? "text-white" : "text-gray-500"}`} />
                                <span className={`font-medium transition-colors duration-300 ${activeTab === "project-expo" ? "text-white" : "text-gray-500"}`}>Project Expo</span>
                            </div>

                            {/* Learning Tab */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === "learning"
                                    ? "bg-[#1a1a1a] border border-[#404040]"
                                    : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#333]"
                                    }`}
                                onClick={() => {
                                    setActiveTab("learning");
                                    setActiveQuickCreateTab(null);
                                }}
                            >
                                <BookOpen className={`w-4 h-4 transition-colors duration-300 ${activeTab === "learning" ? "text-white" : "text-gray-500"}`} />
                                <span className={`font-medium transition-colors duration-300 ${activeTab === "learning" ? "text-white" : "text-gray-500"}`}>Learning</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className={`flex-1 overflow-hidden ${activeQuickCreateTab ? 'p-0' : 'p-6'}`}>
                    <div className="h-full transition-all duration-500 ease-in-out">
                        {/* Regular Tab Content - Only show when not in Quick Create mode */}
                        {!activeQuickCreateTab && activeTab === "home" && (
                            <div className="grid grid-cols-2 gap-6 h-full animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Top Left Card */}
                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-gray-400 text-lg mb-2">Problems Solved</div>
                                        <div className="text-white text-3xl font-bold">0</div>
                                    </div>
                                </div>

                                {/* Top Right Card */}
                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-gray-400 text-lg mb-2">Current Streak</div>
                                        <div className="text-white text-3xl font-bold">0 days</div>
                                    </div>
                                </div>

                                {/* Bottom Full Width Card */}
                                <div className="col-span-2 bg-[#1a1a1a] rounded-xl border border-[#333] p-6 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-gray-400 text-lg mb-4">Recent Activity</div>
                                        <div className="text-gray-500">No recent activity to display</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "problems" && (
                            <div className="h-full w-full animate-in fade-in slide-in-from-right-4 duration-500 overflow-auto">
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h1 className="text-white text-3xl font-bold mb-2">Problems Collection</h1>
                                            <p className="text-gray-400">Browse and manage your coding challenges</p>

                                            {/* Data Source Toggle */}
                                            <div className="flex items-center justify-between mt-4">
                                                {/* Toggle Selector */}
                                                <div className="relative bg-[#1a1a1a] rounded-lg p-1 border border-[#333] overflow-hidden">
                                                    {/* Sliding Background */}
                                                    <div
                                                        className={`absolute top-1 bottom-1 rounded-md transition-all duration-500 ease-out ${useGitHubData
                                                            ? 'left-1 right-1/2 bg-[#333] shadow-lg shadow-black/20'
                                                            : 'left-1/2 right-1 bg-[#333] shadow-lg shadow-black/20'
                                                            }`}
                                                    />
                                                    <div className="flex relative z-10">
                                                        {/* Community Problems */}
                                                        <button
                                                            onClick={() => setUseGitHubData(true)}
                                                            className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-500 ease-out transform ${useGitHubData
                                                                ? 'text-white scale-105 z-20'
                                                                : 'text-gray-400 hover:text-gray-300 hover:scale-102 z-10'
                                                                }`}
                                                        >
                                                            <Github className={`w-4 h-4 transition-all duration-300 ${useGitHubData ? 'text-white' : 'text-gray-400'}`} />
                                                            <span className="transition-all duration-300">Community Problems</span>
                                                        </button>

                                                        {/* CODEER Suggested */}
                                                        <button
                                                            onClick={() => setUseGitHubData(false)}
                                                            className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-500 ease-out transform ${!useGitHubData
                                                                ? 'text-white scale-105 z-20'
                                                                : 'text-gray-400 hover:text-gray-300 hover:scale-102 z-10'
                                                                }`}
                                                        >
                                                            <Sparkles className={`w-4 h-4 transition-all duration-300 ${!useGitHubData ? 'text-white' : 'text-gray-400'}`} />
                                                            <span className="transition-all duration-300">Codeer Suggested</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Status Indicator */}
                                                <div className="flex items-center gap-6 ml-8">
                                                    {useGitHubData && (
                                                        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-400">
                                                            {githubProblems.loading ? (
                                                                <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-900/20 px-4 py-2 rounded-full border border-yellow-600/30 animate-pulse">
                                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                                    <span>Loading...</span>
                                                                </div>
                                                            ) : githubProblems.error ? (
                                                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-full border border-red-600/30 animate-in shake duration-300">
                                                                    <X className="w-3 h-3" />
                                                                    <span>Connection Error</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 px-4 py-2 rounded-full border border-green-600/30 animate-in slide-in-from-bottom-2 duration-300">
                                                                    <Cloud className="w-3 h-3 animate-pulse" />
                                                                    <span>Connected</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Single unified refresh button */}
                                            <button
                                                onClick={handleRefresh}
                                                disabled={githubProblems.loading || isLoadingProblems}
                                                className="flex items-center justify-center p-2 bg-[#1a1a1a] hover:bg-[#333] border border-[#404040] text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                                                title={useGitHubData ? "Refresh Community Problems" : "Refresh CODEER Suggested Problems"}
                                            >
                                                <RefreshCw className={`w-4 h-4 ${(githubProblems.loading || isLoadingProblems) ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filter and Search */}
                                    <div className="mb-6 grid grid-cols-12 gap-4">
                                        <div className="col-span-6">
                                            <input
                                                type="text"
                                                placeholder="Search problems..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <select
                                                value={difficultyFilter}
                                                onChange={(e) => setDifficultyFilter(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="">All Difficulties</option>
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="">All Categories</option>
                                                <option value="algorithms">Algorithms</option>
                                                <option value="data-structures">Data Structures</option>
                                                <option value="dynamic-programming">Dynamic Programming</option>
                                                <option value="graph-theory">Graph Theory</option>
                                                <option value="mathematics">Mathematics</option>
                                                <option value="string-processing">String Processing</option>
                                                <option value="sorting-searching">Sorting & Searching</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="title">Title A-Z</option>
                                                <option value="difficulty">Difficulty</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-4 gap-4 mb-8">
                                        <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                            <div className="text-gray-400 text-sm mb-1">Total Problems</div>
                                            <div className="text-white text-2xl font-bold">{problemStats.total}</div>
                                        </div>
                                        <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                            <div className="text-gray-400 text-sm mb-1">Easy</div>
                                            <div className="text-green-400 text-2xl font-bold">{problemStats.easy}</div>
                                        </div>
                                        <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                            <div className="text-gray-400 text-sm mb-1">Medium</div>
                                            <div className="text-yellow-400 text-2xl font-bold">{problemStats.medium}</div>
                                        </div>
                                        <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                            <div className="text-gray-400 text-sm mb-1">Hard</div>
                                            <div className="text-red-400 text-2xl font-bold">{problemStats.hard}</div>
                                        </div>
                                    </div>

                                    {/* Problems List/Grid */}
                                    <div className="space-y-4">
                                        {isLoadingProblems ? (
                                            <div className="text-center py-12 animate-in fade-in duration-300">
                                                <div className="inline-flex items-center gap-2 text-gray-400">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    <span>Loading problems...</span>
                                                </div>
                                            </div>
                                        ) : filteredProblems.length > 0 ? (
                                            filteredProblems.map((problem, index) => {
                                                const difficultyConfig = {
                                                    easy: { color: 'text-green-400', bg: 'bg-green-900/50', border: 'border-green-600', emoji: '🟢' },
                                                    medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/50', border: 'border-yellow-600', emoji: '🟡' },
                                                    hard: { color: 'text-red-400', bg: 'bg-red-900/50', border: 'border-red-600', emoji: '🔴' }
                                                };
                                                const diffConfig = difficultyConfig[problem.difficulty] || difficultyConfig.easy;
                                                const difficultyLabel = problem.difficulty ?
                                                    problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1) : 'Easy';

                                                // Ensure unique key by combining id with index as fallback
                                                const uniqueKey = problem.id || `problem-${index}`;

                                                return (
                                                    <div
                                                        key={uniqueKey}
                                                        className="bg-[#1a1a1a] rounded-lg border border-[#333] p-6 hover:border-[#404040] hover:shadow-lg hover:shadow-black/20 transition-all duration-300 ease-out cursor-pointer transform hover:scale-[1.01] animate-in slide-in-from-bottom-6 fade-in"
                                                        style={{
                                                            animationDelay: `${index * 50}ms`,
                                                            animationDuration: '500ms',
                                                            animationFillMode: 'both'
                                                        }}
                                                        onClick={() => handleProblemClick(problem)}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="text-white text-lg font-semibold">{problem.title || 'Untitled Problem'}</h3>
                                                                    <span className={`px-2 py-1 ${diffConfig.bg} ${diffConfig.color} text-xs rounded-full border ${diffConfig.border}`}>
                                                                        {diffConfig.emoji} {difficultyLabel}
                                                                    </span>
                                                                    <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded-full border border-blue-600">
                                                                        {problem.category || 'General'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                                                    {problem.description || 'No description available'}
                                                                </p>
                                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                    {problem.tags && problem.tags.length > 0 && (
                                                                        <>
                                                                            <span>Tags: {problem.tags.join(', ')}</span>
                                                                            <span>•</span>
                                                                        </>
                                                                    )}
                                                                    <span>Created: {formatDate(problem.createdAt)}</span>
                                                                    {problem.createdBy && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>created by {problem.createdBy}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            /* Empty State */
                                            <div className="text-center py-12 bg-[#1a1a1a] rounded-lg border border-[#333]">
                                                <Brain className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                                <div className="text-gray-400 text-xl mb-2">
                                                    {searchQuery || difficultyFilter || categoryFilter ? 'No Problems Found' : 'No Problems Yet'}
                                                </div>
                                                <div className="text-gray-500 mb-4">
                                                    {searchQuery || difficultyFilter || categoryFilter
                                                        ? 'Try adjusting your search or filters to find problems'
                                                        : 'Start creating coding challenges to build your collection'
                                                    }
                                                </div>
                                                {!(searchQuery || difficultyFilter || categoryFilter) && (
                                                    <button
                                                        onClick={() => {
                                                            setActiveQuickCreateTab("problem");
                                                            setActiveTab(null);
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Create Your First Problem
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "teamup" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">TeamUp Section</div>
                                    <div className="text-gray-500">Coming Soon - Collaborate with other developers</div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "project-expo" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <Presentation className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">Project Expo Section</div>
                                    <div className="text-gray-500">Coming Soon - Showcase your projects</div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "learning" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">Learning Section</div>
                                    <div className="text-gray-500">Coming Soon - Educational resources and tutorials</div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "dashboard" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <LayoutDashboard className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">Dashboard Section</div>
                                    <div className="text-gray-500">Coming Soon - Analytics and overview dashboard</div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "pages" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">Pages Section</div>
                                    <div className="text-gray-500">Coming Soon - Page management and creation tools</div>
                                </div>
                            </div>
                        )}

                        {/* Quick Create Content Sections - Full Screen */}
                        {activeQuickCreateTab === "problem" && (
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500 overflow-auto">
                                <div className="p-8">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h1 className="text-white text-3xl font-bold mb-2">Create Problem</h1>
                                            <p className="text-gray-400">Build coding challenges and algorithm problems</p>
                                        </div>
                                        <button
                                            onClick={() => setActiveQuickCreateTab(null)}
                                            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-12 gap-6">
                                        {/* Main Form */}
                                        <div className="col-span-8 space-y-6">
                                            {/* Basic Information */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h2 className="text-white text-xl font-semibold mb-4">Basic Information</h2>

                                                {/* Title */}
                                                <div className="mb-4">
                                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                                        Problem Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={problemForm.title}
                                                        onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                                                        placeholder="e.g., Two Sum, Binary Tree Traversal"
                                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>

                                                {/* Description */}
                                                <div className="mb-4">
                                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                                        Problem Description
                                                    </label>
                                                    <textarea
                                                        value={problemForm.description}
                                                        onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                                                        placeholder="Describe the problem clearly. What needs to be solved?"
                                                        rows={6}
                                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                    />
                                                </div>

                                                {/* Difficulty and Category */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                                            Difficulty
                                                        </label>
                                                        <select
                                                            value={problemForm.difficulty}
                                                            onChange={(e) => setProblemForm({ ...problemForm, difficulty: e.target.value })}
                                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="easy">Easy</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="hard">Hard</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                                            Category
                                                        </label>
                                                        <select
                                                            value={problemForm.category}
                                                            onChange={(e) => setProblemForm({ ...problemForm, category: e.target.value })}
                                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="algorithms">Algorithms</option>
                                                            <option value="data-structures">Data Structures</option>
                                                            <option value="dynamic-programming">Dynamic Programming</option>
                                                            <option value="graph-theory">Graph Theory</option>
                                                            <option value="mathematics">Mathematics</option>
                                                            <option value="string-processing">String Processing</option>
                                                            <option value="sorting-searching">Sorting & Searching</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Input/Output Format */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h2 className="text-white text-xl font-semibold mb-4">Input/Output Format</h2>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                                            Input Format
                                                        </label>
                                                        <textarea
                                                            value={problemForm.inputFormat}
                                                            onChange={(e) => setProblemForm({ ...problemForm, inputFormat: e.target.value })}
                                                            placeholder="Describe the input format..."
                                                            rows={4}
                                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                                            Output Format
                                                        </label>
                                                        <textarea
                                                            value={problemForm.outputFormat}
                                                            onChange={(e) => setProblemForm({ ...problemForm, outputFormat: e.target.value })}
                                                            placeholder="Describe the expected output format..."
                                                            rows={4}
                                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Constraints */}
                                                <div>
                                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                                        Constraints
                                                    </label>
                                                    <textarea
                                                        value={problemForm.constraints}
                                                        onChange={(e) => setProblemForm({ ...problemForm, constraints: e.target.value })}
                                                        placeholder="List constraints (e.g., 1 ≤ n ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9)"
                                                        rows={3}
                                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Examples */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-white text-xl font-semibold">Examples</h2>
                                                    <button
                                                        onClick={() => setProblemForm({
                                                            ...problemForm,
                                                            examples: [...problemForm.examples, { input: "", output: "", explanation: "" }]
                                                        })}
                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Add Example
                                                    </button>
                                                </div>

                                                {problemForm.examples.map((example, index) => (
                                                    <div key={index} className="mb-6 p-4 bg-[#111] rounded-lg border border-[#333]">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h3 className="text-gray-300 font-medium">Example {index + 1}</h3>
                                                            {problemForm.examples.length > 1 && (
                                                                <button
                                                                    onClick={() => setProblemForm({
                                                                        ...problemForm,
                                                                        examples: problemForm.examples.filter((_, i) => i !== index)
                                                                    })}
                                                                    className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                                                                >
                                                                    <X className="w-4 h-4 text-gray-500" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                                            <div>
                                                                <label className="block text-gray-400 text-sm mb-1">Input</label>
                                                                <textarea
                                                                    value={example.input}
                                                                    onChange={(e) => {
                                                                        const newExamples = [...problemForm.examples];
                                                                        newExamples[index].input = e.target.value;
                                                                        setProblemForm({ ...problemForm, examples: newExamples });
                                                                    }}
                                                                    placeholder="Sample input..."
                                                                    rows={3}
                                                                    className="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-400 text-sm mb-1">Output</label>
                                                                <textarea
                                                                    value={example.output}
                                                                    onChange={(e) => {
                                                                        const newExamples = [...problemForm.examples];
                                                                        newExamples[index].output = e.target.value;
                                                                        setProblemForm({ ...problemForm, examples: newExamples });
                                                                    }}
                                                                    placeholder="Expected output..."
                                                                    rows={3}
                                                                    className="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-gray-400 text-sm mb-1">Explanation (Optional)</label>
                                                            <textarea
                                                                value={example.explanation}
                                                                onChange={(e) => {
                                                                    const newExamples = [...problemForm.examples];
                                                                    newExamples[index].explanation = e.target.value;
                                                                    setProblemForm({ ...problemForm, examples: newExamples });
                                                                }}
                                                                placeholder="Explain this example..."
                                                                rows={2}
                                                                className="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Final Answer */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h2 className="text-white text-xl font-semibold mb-4">Final Answer</h2>
                                                <div className="mb-2">
                                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                                        Solution/Answer to the Problem
                                                    </label>
                                                    <p className="text-gray-500 text-sm mb-3">
                                                        Provide the correct solution or approach to solve this problem. This will help reviewers understand the expected solution.
                                                    </p>
                                                    <textarea
                                                        value={problemForm.finalAnswer}
                                                        onChange={(e) => setProblemForm({ ...problemForm, finalAnswer: e.target.value })}
                                                        placeholder="Explain the solution approach, algorithm, or provide the complete answer..."
                                                        rows={8}
                                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sidebar */}
                                        <div className="col-span-4 space-y-6">
                                            {/* Settings */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h2 className="text-white text-xl font-semibold mb-4">Settings</h2>

                                                {/* Tags */}
                                                <div>
                                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                                        Tags (comma-separated)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={problemForm.tags}
                                                        onChange={(e) => setProblemForm({ ...problemForm, tags: e.target.value })}
                                                        placeholder="array, sorting, binary-search"
                                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h2 className="text-white text-xl font-semibold mb-4">Actions</h2>

                                                <div className="space-y-3">
                                                    <button
                                                        onClick={handleSaveProblem}
                                                        disabled={isSaving || !problemForm.title.trim()}
                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${isSaving || !problemForm.title.trim()
                                                            ? 'bg-gray-600 cursor-not-allowed'
                                                            : saveStatus === 'success'
                                                                ? 'bg-green-600 hover:bg-green-700'
                                                                : saveStatus === 'error'
                                                                    ? 'bg-red-600 hover:bg-red-700'
                                                                    : 'bg-blue-600 hover:bg-blue-700'
                                                            } text-white`}
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        {isSaving
                                                            ? 'Saving...'
                                                            : saveStatus === 'success'
                                                                ? 'Saved!'
                                                                : saveStatus === 'error'
                                                                    ? 'Error - Retry'
                                                                    : 'Save Problem'
                                                        }
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            // TODO: Implement save as draft
                                                            console.log("Saving as draft:", problemForm);
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                                    >
                                                        Save as Draft
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            // Reset form
                                                            setProblemForm({
                                                                title: "",
                                                                description: "",
                                                                difficulty: "easy",
                                                                category: "algorithms",
                                                                inputFormat: "",
                                                                outputFormat: "",
                                                                constraints: "",
                                                                examples: [{ input: "", output: "", explanation: "" }],
                                                                tags: "",
                                                                finalAnswer: ""
                                                            });
                                                            setSaveStatus('idle');
                                                        }}
                                                        disabled={isSaving}
                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${isSaving
                                                            ? 'bg-gray-600 cursor-not-allowed'
                                                            : 'bg-red-600 hover:bg-red-700'
                                                            } text-white`}
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Reset Form
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Preview */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h2 className="text-white text-xl font-semibold mb-4">Preview</h2>
                                                <div className="text-sm text-gray-400 space-y-2">
                                                    <div><span className="text-gray-300">Title:</span> {problemForm.title || "Untitled"}</div>
                                                    <div><span className="text-gray-300">Difficulty:</span> <span className={`capitalize ${problemForm.difficulty === 'easy' ? 'text-green-400' :
                                                        problemForm.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>{problemForm.difficulty}</span></div>
                                                    <div><span className="text-gray-300">Category:</span> {problemForm.category}</div>
                                                    <div><span className="text-gray-300">Examples:</span> {problemForm.examples.length}</div>
                                                    <div><span className="text-gray-300">Tags:</span> {problemForm.tags || "None"}</div>
                                                    <div><span className="text-gray-300">Has Answer:</span> <span className={problemForm.finalAnswer ? 'text-green-400' : 'text-red-400'}>{problemForm.finalAnswer ? 'Yes' : 'No'}</span></div>
                                                </div>

                                                {/* Save Status */}
                                                {saveStatus !== 'idle' && (
                                                    <div className={`mt-4 p-3 rounded-lg text-sm ${saveStatus === 'success'
                                                        ? 'bg-green-900/50 border border-green-600 text-green-300'
                                                        : 'bg-red-900/50 border border-red-600 text-red-300'
                                                        }`}>
                                                        {saveStatus === 'success'
                                                            ? '✅ Problem saved to GitHub successfully! A pull request has been automatically created to contribute your problem to the main CODEER repository.'
                                                            : '❌ Failed to save problem. Please try again.'
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeQuickCreateTab === "page" && (
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-8 h-full">
                                    <div className="text-center mb-8">
                                        <div className="text-white text-3xl mb-4">Create Page</div>
                                        <div className="text-gray-400 mb-8">Build new web pages and components</div>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-8 text-gray-400 h-full flex items-center justify-center">
                                        Page creation interface will be implemented here
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeQuickCreateTab === "teamup" && (
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-8 h-full">
                                    <div className="text-center mb-8">
                                        <div className="text-white text-3xl mb-4">Create TeamUp</div>
                                        <div className="text-gray-400 mb-8">Start team collaborations and pair programming</div>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-8 text-gray-400 h-full flex items-center justify-center">
                                        TeamUp creation interface will be implemented here
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeQuickCreateTab === "learning-docs" && (
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-8 h-full">
                                    <div className="text-center mb-8">
                                        <div className="text-white text-3xl mb-4">Create Learning Docs</div>
                                        <div className="text-gray-400 mb-8">Create tutorials and educational content</div>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-8 text-gray-400 h-full flex items-center justify-center">
                                        Learning documentation creation interface will be implemented here
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeQuickCreateTab === "project-publish" && (
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-8 h-full">
                                    <div className="text-center mb-8">
                                        <div className="text-white text-3xl mb-4">Publish Project</div>
                                        <div className="text-gray-400 mb-8">Share your projects with the community</div>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-8 text-gray-400 h-full flex items-center justify-center">
                                        Project publishing interface will be implemented here
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Problem Solving Interface - Full Screen */}
                        {isInSolvingMode && selectedProblem && (
                            <div className="fixed inset-0 bg-black z-50 flex flex-col">
                                {/* Header */}
                                <div className="bg-[#1a1a1a] border-b border-[#333] px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleCloseSolving}
                                            className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#404040] text-white rounded text-sm transition-colors"
                                        >
                                            <ArrowLeft className="w-3 h-3" />
                                            Back
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-white text-lg font-semibold">{selectedProblem.title}</h1>
                                            <span className={`px-2 py-1 text-xs rounded-full border ${selectedProblem.difficulty === 'easy' ? 'bg-green-900/50 text-green-400 border-green-600' :
                                                selectedProblem.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-600' :
                                                    'bg-red-900/50 text-red-400 border-red-600'
                                                }`}>
                                                {selectedProblem.difficulty === 'easy' ? '🟢' :
                                                    selectedProblem.difficulty === 'medium' ? '🟡' : '🔴'}
                                                {selectedProblem.difficulty?.charAt(0).toUpperCase() + selectedProblem.difficulty?.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 flex h-0">
                                    {/* Left Panel - Problem Description */}
                                    <div className="w-1/2 bg-black border-r border-[#333] overflow-y-auto h-full scrollbar-hide">
                                        <div className="p-6">
                                            <div className="mb-6">
                                                <h2 className="text-white text-2xl font-bold mb-4">Problem Description</h2>
                                                <div className="text-gray-300 mb-6 leading-relaxed">
                                                    {selectedProblem.description || 'No description available'}
                                                </div>
                                            </div>

                                            {/* Input/Output Format */}
                                            {(selectedProblem.inputFormat || selectedProblem.outputFormat) && (
                                                <div className="mb-6">
                                                    <h3 className="text-white text-lg font-semibold mb-3">Format</h3>
                                                    {selectedProblem.inputFormat && (
                                                        <div className="mb-4">
                                                            <h4 className="text-gray-300 font-medium mb-2">Input:</h4>
                                                            <div className="bg-[#1a1a1a] rounded-lg p-4 text-gray-300 text-sm">
                                                                {selectedProblem.inputFormat}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {selectedProblem.outputFormat && (
                                                        <div className="mb-4">
                                                            <h4 className="text-gray-300 font-medium mb-2">Output:</h4>
                                                            <div className="bg-[#1a1a1a] rounded-lg p-4 text-gray-300 text-sm">
                                                                {selectedProblem.outputFormat}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Examples */}
                                            {selectedProblem.examples && selectedProblem.examples.length > 0 && (
                                                <div className="mb-6">
                                                    <h3 className="text-white text-lg font-semibold mb-3">Examples</h3>
                                                    {selectedProblem.examples.map((example, index) => (
                                                        <div key={index} className="mb-4 bg-[#1a1a1a] rounded-lg p-4">
                                                            <h4 className="text-gray-300 font-medium mb-3">Example {index + 1}:</h4>
                                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                                <div>
                                                                    <div className="text-gray-400 text-sm mb-1">Input:</div>
                                                                    <div className="bg-[#111] rounded p-3 text-green-400 font-mono text-sm">
                                                                        {example.input}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-gray-400 text-sm mb-1">Output:</div>
                                                                    <div className="bg-[#111] rounded p-3 text-blue-400 font-mono text-sm">
                                                                        {example.output}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {example.explanation && (
                                                                <div>
                                                                    <div className="text-gray-400 text-sm mb-1">Explanation:</div>
                                                                    <div className="text-gray-300 text-sm">
                                                                        {example.explanation}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Constraints */}
                                            {selectedProblem.constraints && (
                                                <div className="mb-6">
                                                    <h3 className="text-white text-lg font-semibold mb-3">Constraints</h3>
                                                    <div className="bg-[#1a1a1a] rounded-lg p-4 text-gray-300 text-sm">
                                                        {selectedProblem.constraints}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {selectedProblem.tags && selectedProblem.tags.length > 0 && (
                                                <div className="mb-6">
                                                    <h3 className="text-white text-lg font-semibold mb-3">Tags</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedProblem.tags.map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="px-3 py-1 bg-blue-900/50 text-blue-400 text-sm rounded-full border border-blue-600"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Solution */}
                                            {((selectedProblem as GitHubProblem).finalAnswer || (selectedProblem as Problem).solution) && (
                                                <div className="mb-6">
                                                    <h3 className="text-white text-lg font-semibold mb-3">Solution</h3>
                                                    <div className="bg-[#1a1a1a] rounded-lg p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                                        {(selectedProblem as GitHubProblem).finalAnswer || (selectedProblem as Problem).solution}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Author Information */}
                                            {((selectedProblem as GitHubProblem).author || (selectedProblem as Problem).createdBy) && (
                                                <div className="mb-6">
                                                    <div className="text-center py-4 border-t border-[#333]">
                                                        <div className="text-gray-400 text-sm">
                                                            Created by <span className="text-blue-400 font-medium">{(selectedProblem as GitHubProblem).author || (selectedProblem as Problem).createdBy}</span>
                                                        </div>
                                                        <div className="text-gray-500 text-xs mt-1">
                                                            Created with CODEER Platform
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Panel - Code Editor */}
                                    <div className="w-1/2 bg-[#0d1117] flex flex-col">
                                        {/* Editor Header */}
                                        <div className="bg-[#1a1a1a] border-b border-[#333] px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-gray-300 text-sm">Language:</label>
                                                    <select
                                                        value={selectedLanguage}
                                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                                        className="bg-[#333] text-white px-3 py-1 rounded text-sm border border-[#404040]"
                                                    >
                                                        <option value="javascript">JavaScript</option>
                                                        <option value="python">Python</option>
                                                        <option value="java">Java</option>
                                                        <option value="cpp">C++</option>
                                                        <option value="c">C</option>
                                                        <option value="csharp">C#</option>
                                                        <option value="go">Go</option>
                                                        <option value="rust">Rust</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
                                                    Run
                                                </button>
                                                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                                                    Test
                                                </button>
                                            </div>
                                        </div>

                                        {/* Code Editor */}
                                        <div className="flex-1 relative">
                                            <textarea
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="w-full h-full p-4 bg-[#0d1117] text-white font-mono text-sm resize-none focus:outline-none placeholder-gray-500 placeholder-opacity-50"
                                                placeholder="// Write your solution here..."
                                                style={{
                                                    lineHeight: '1.5',
                                                    tabSize: '4'
                                                }}
                                            />
                                        </div>

                                        {/* Output Panel */}
                                        <div className="h-40 bg-[#1a1a1a] border-t border-[#333]">
                                            <div className="px-4 py-2 border-b border-[#333]">
                                                <h3 className="text-white text-sm font-medium">Output</h3>
                                            </div>
                                            <div className="p-4 h-full overflow-auto">
                                                <div className="text-gray-400 text-sm font-mono">
                                                    // Output will appear here...
                                                </div>
                                            </div>
                                        </div>

                                        {/* Input Panel */}
                                        <div className="h-32 bg-[#1a1a1a] border-t border-[#333]">
                                            <div className="px-4 py-2 border-b border-[#333]">
                                                <h3 className="text-white text-sm font-medium">Input</h3>
                                            </div>
                                            <div className="p-3">
                                                <textarea
                                                    placeholder="Enter test input here..."
                                                    className="w-full h-20 bg-[#0d1117] text-white font-mono text-sm resize-none focus:outline-none border border-[#333] rounded p-3"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
