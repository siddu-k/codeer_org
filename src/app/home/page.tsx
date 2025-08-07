"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRepoSetup } from "@/hooks/useRepoSetup";
import { useGitHubProblems, useCombinedProblems } from "@/hooks/useGitHubProblems";
import { useTeamupPosts, useUserTeamupPosts, useUserApplications, useProjectApplications } from "@/hooks/useTeamup";
import { useProjects, useFeaturedProjects, useProjectCategories, useProjectManager, useProjectInteractions, useUserProjects } from "@/hooks/useProject";
import { useUserPages, useCreatePage, useSubdomainAvailability, usePageManagement } from "@/hooks/usePages";
import { DomainSelector } from "@/components/DomainSelector";
import { DonatedDomainsManager } from "@/components/DonatedDomainsManager";
import { Home, Lock, Terminal, User, LogOut, Code, Brain, Users, Presentation, BookOpen, ChevronDown, ChevronRight, Info, LayoutDashboard, FileText, Plus, Save, X, Eye, Edit, Trash2, RefreshCw, Github, Cloud, ArrowLeft, Sparkles, Settings, Search, ExternalLink, Calendar, Clock, Target, MessageSquare, UserCheck, Send, ImageIcon, Filter, Grid, List, ThumbsUp, Star, Heart } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { syncUserWithSupabase } from "@/lib/userSync";
import { saveProblemToGitHub } from "@/lib/githubApi";
import { loadProblems, calculateProblemStats, filterAndSortProblems, formatDate, type Problem, type ProblemStats } from "@/lib/problemsUtils";
import { type GitHubProblem } from "@/hooks/useGitHubProblems";
import { type Project } from "@/lib/supabase";

// TeamUp Form Interface
interface TeamupFormData {
    title: string
    description: string
    techStack: string
    goal: string
    timeline: string
    category: 'startup' | 'hackathon' | 'open-source' | 'learning' | 'competition'
    teamSlots: Array<{ role: string; count: number; filled: number }>
    contactInfo: Array<{ title: string; value: string }>
    requirements: string
    imageUrl: string
}

// Create Page Form Interface
interface CreatePageFormData {
    title: string
    domain: string
    subdomain: string
    files: FileList | null
    isUploading: boolean
    uploadProgress: number
}

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

    // Problem page mode state
    const [problemPageMode, setProblemPageMode] = useState<'browse' | 'add' | 'manage'>('browse');

    // Problem solving page state
    const [selectedProblem, setSelectedProblem] = useState<Problem | GitHubProblem | null>(null);
    const [isInSolvingMode, setIsInSolvingMode] = useState(false);
    const [code, setCode] = useState("// Write your solution here\n");
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");

    // Home page problems carousel state
    const [manualScrollIndex, setManualScrollIndex] = useState(0);
    const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);
    const [lastManualScrollTime, setLastManualScrollTime] = useState(0);

    // TeamUp search and filter state
    const [teamupSearchQuery, setTeamupSearchQuery] = useState("");
    const [teamupCategoryFilter, setTeamupCategoryFilter] = useState("");
    const [teamupSortBy, setTeamupSortBy] = useState("newest");

    // Project detail modal state
    const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
    const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);

    // TeamUp state management using hook
    const {
        posts: teamupPosts,
        loading: isLoadingTeamups,
        error: teamupsError,
        refresh: refreshTeamups
    } = useTeamupPosts({
        category: teamupCategoryFilter,
        search: teamupSearchQuery,
        sortBy: teamupSortBy
    });

    // User's own TeamUp posts hook
    const {
        posts: userTeamupPosts,
        loading: isLoadingUserPosts,
        error: userPostsError,
        refresh: refreshUserPosts
    } = useUserTeamupPosts();

    // User's applications hook
    const {
        applications: userApplications,
        loading: isLoadingApplications,
        error: applicationsError,
        refresh: refreshApplications
    } = useUserApplications();

    const [filteredTeamups, setFilteredTeamups] = useState<any[]>([]);
    const [showCreateTeamupForm, setShowCreateTeamupForm] = useState(false);

    // TeamUp form state
    const [teamupForm, setTeamupForm] = useState<TeamupFormData>({
        title: "",
        description: "",
        techStack: "",
        goal: "",
        timeline: "",
        category: "startup",
        teamSlots: [
            { role: "Developer", count: 1, filled: 0 },
            { role: "Designer", count: 1, filled: 0 }
        ],
        contactInfo: [
            { title: "Discord", value: "" }
        ],
        requirements: "",
        imageUrl: ""
    });

    // Application state
    const [selectedTeamup, setSelectedTeamup] = useState<any>(null);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [applicationForm, setApplicationForm] = useState({
        role: "",
        experience: "",
        portfolio: "",
        motivation: "",
        availability: ""
    });

    // Edit TeamUp state
    const [editingTeamup, setEditingTeamup] = useState<any>(null);
    const [showEditForm, setShowEditForm] = useState(false);

    // Project applications view state
    const [selectedProjectForApplications, setSelectedProjectForApplications] = useState<any>(null);
    const [showProjectApplications, setShowProjectApplications] = useState(false);

    // Project applications hook (for viewing applications to user's projects)
    const {
        applications: projectApplications,
        loading: isLoadingProjectApplications,
        error: projectApplicationsError,
        refresh: refreshProjectApplications,
        updateStatus: updateApplicationStatus
    } = useProjectApplications(selectedProjectForApplications?.id || null);

    // Pages state management using hooks
    const { pages: userPages, loading: isLoadingPages, error: pagesError, refresh: refreshPages } = useUserPages();
    const { createPage, creating: isCreatingPage, progress: creationProgress, currentStep: creationStep } = useCreatePage();
    const { checkAvailability, checking: isCheckingAvailability, availability: subdomainAvailability } = useSubdomainAvailability();
    const { updatePage, deletePage, updating: updatingPageId } = usePageManagement();

    const [pagesActiveTab, setPagesActiveTab] = useState<'create' | 'manage' | 'donate-domain'>('create');
    const [selectedPageForEdit, setSelectedPageForEdit] = useState<any>(null);

    // Create page form state
    const [createPageForm, setCreatePageForm] = useState<CreatePageFormData>({
        title: "",
        domain: "sidu.me", // Default provider
        subdomain: "",
        files: null,
        isUploading: false,
        uploadProgress: 0
    });

    // Domain selection state
    const [domainType, setDomainType] = useState<'default' | 'donated'>('default');
    const [selectedDonatedDomainId, setSelectedDonatedDomainId] = useState('');
    const [isDomainAvailable, setIsDomainAvailable] = useState(true);

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

    // Handle manual scrolling in problems container
    const handleProblemsScroll = (direction: 'up' | 'down') => {
        if (combinedProblems.problems.length <= 5) return;

        const maxIndex = Math.max(0, combinedProblems.problems.length - 5);
        setIsManuallyScrolling(true);
        setLastManualScrollTime(Date.now());

        setManualScrollIndex(prev => {
            if (direction === 'up') {
                return Math.max(0, prev - 1);
            } else {
                return Math.min(maxIndex, prev + 1);
            }
        });

        // Reset to auto-scroll after 10 seconds of no manual interaction
        setTimeout(() => {
            if (Date.now() - lastManualScrollTime >= 10000) {
                setIsManuallyScrolling(false);
            }
        }, 10000);
    };

    const handleContainerWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.preventDefault();
        e.nativeEvent.stopImmediatePropagation();

        const direction = e.deltaY > 0 ? 'down' : 'up';
        handleProblemsScroll(direction);

        // Additional safety: return false to prevent any further propagation
        return false;
    };

    const handleContainerTouch = (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const touch = e.touches[0];
        const startY = touch.clientY;

        const handleTouchMove = (moveEvent: TouchEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();

            const currentTouch = moveEvent.touches[0];
            const deltaY = startY - currentTouch.clientY;

            if (Math.abs(deltaY) > 30) { // Minimum swipe distance
                const direction = deltaY > 0 ? 'up' : 'down';
                handleProblemsScroll(direction);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            }
        };

        const handleTouchEnd = (endEvent: TouchEvent) => {
            endEvent.preventDefault();
            endEvent.stopPropagation();
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
    };

    // Handle closing problem solving mode
    const handleCloseSolving = () => {
        setIsInSolvingMode(false);
        setSelectedProblem(null);
        setCode("// Write your solution here\n");
    };

    // Handle project detail modal
    const handleProjectDetail = (project: Project) => {
        setSelectedProjectForDetail(project);
        setIsProjectDetailModalOpen(true);
    };

    const handleCloseProjectDetail = () => {
        setIsProjectDetailModalOpen(false);
        setSelectedProjectForDetail(null);
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

                                    {/* Learning Docs - Hidden for now */}
                                    {/* <div className="relative group">
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
                                    </div> */}

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

                            {/* My Pages Tab */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === "my-pages"
                                    ? "bg-[#1a1a1a] border border-[#404040]"
                                    : "border border-transparent hover:bg-[#1a1a1a] hover:border-[#333]"
                                    }`}
                                onClick={() => {
                                    setActiveTab("my-pages");
                                    setActiveQuickCreateTab(null);
                                }}
                            >
                                <FileText className={`w-4 h-4 transition-colors duration-300 ${activeTab === "my-pages" ? "text-white" : "text-gray-500"}`} />
                                <span className={`font-medium transition-colors duration-300 ${activeTab === "my-pages" ? "text-white" : "text-gray-500"}`}>My Pages</span>
                            </div>

                            {/* Learning Tab - Hidden for now */}
                            {/* <div
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
                            </div> */}
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
                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 flex flex-col">
                                    <div className="text-gray-400 text-lg mb-4 text-center">All Problems</div>
                                    <div className="flex-1 flex items-center justify-center relative">
                                        {combinedProblems.loading ? (
                                            <div className="text-gray-500">Loading problems...</div>
                                        ) : combinedProblems.problems.length > 0 ? (
                                            <div
                                                className="w-full h-full relative overflow-hidden select-none"
                                                onWheel={handleContainerWheel}
                                                onTouchStart={handleContainerTouch}
                                                onMouseMove={(e) => e.stopPropagation()}
                                                onScroll={(e) => e.preventDefault()}
                                                style={{
                                                    touchAction: 'none',
                                                    overscrollBehavior: 'contain',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                {/* Problems container with smooth sliding chain effect */}
                                                <div className="absolute inset-0 overflow-hidden">
                                                    {(() => {
                                                        const totalProblems = combinedProblems.problems.length;
                                                        const maxStartIndex = Math.max(0, totalProblems - 5);

                                                        // Use manual scroll index if user is manually scrolling, otherwise use auto-scroll
                                                        let startIndex;
                                                        if (isManuallyScrolling) {
                                                            startIndex = manualScrollIndex;
                                                        } else {
                                                            const currentTime = Math.floor(Date.now() / 4000); // Change every 4 seconds
                                                            startIndex = totalProblems <= 5 ? 0 : currentTime % (maxStartIndex + 1);
                                                        }

                                                        // Calculate the transform offset for smooth sliding
                                                        const itemHeight = 56; // h-12 (48px) + space-y-2 (8px) = 56px
                                                        const translateY = -startIndex * itemHeight;

                                                        return (
                                                            <div
                                                                className="transition-transform duration-500 ease-in-out"
                                                                style={{ transform: `translateY(${translateY}px)` }}
                                                            >
                                                                <div className="space-y-2">
                                                                    {combinedProblems.problems.map((problem, index) => {
                                                                        const difficultyConfig = {
                                                                            easy: { color: 'text-green-400', bg: 'bg-green-900/50', border: 'border-green-600', emoji: '🟢' },
                                                                            medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/50', border: 'border-yellow-600', emoji: '🟡' },
                                                                            hard: { color: 'text-red-400', bg: 'bg-red-900/50', border: 'border-red-600', emoji: '🔴' }
                                                                        };

                                                                        // Safely get difficulty with proper fallback
                                                                        const problemDifficulty = problem.difficulty?.toLowerCase() || 'easy';
                                                                        const diffConfig = difficultyConfig[problemDifficulty as keyof typeof difficultyConfig] || difficultyConfig.easy;
                                                                        const difficultyLabel = problem.difficulty ?
                                                                            problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1) : 'Easy';

                                                                        return (
                                                                            <div
                                                                                key={problem.id || `problem-${index}`}
                                                                                className="h-12 p-2 bg-[#2a2a2a] rounded-lg border border-[#444] hover:border-[#555] transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-black/20 transform hover:scale-[1.02] flex-shrink-0"
                                                                                onClick={() => handleProblemClick(problem)}
                                                                            >
                                                                                <div className="flex items-center justify-between h-full">
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="text-white text-sm font-medium truncate mb-0.5">
                                                                                            {problem.title || 'Untitled Problem'}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={`px-1 py-0.5 ${diffConfig.bg} ${diffConfig.color} text-xs rounded border ${diffConfig.border} flex items-center gap-1`}>
                                                                                                <span className="text-xs">{diffConfig.emoji}</span>
                                                                                                {difficultyLabel}
                                                                                            </span>
                                                                                            <span className="px-1 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded border border-blue-600">
                                                                                                {problem.category || 'General'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Scroll indicator */}
                                                {combinedProblems.problems.length > 5 && (
                                                    <div className="absolute bottom-2 right-2 pointer-events-none">
                                                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                            <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse"></div>
                                                            <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                                            <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-gray-500 text-center">
                                                <div>No problems available</div>
                                                <div className="text-xs mt-1">Check your connection</div>
                                            </div>
                                        )}
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
                                    {/* Header with Mode Toggle */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h1 className="text-white text-3xl font-bold mb-2">Problems</h1>
                                            <p className="text-gray-400">Browse, create, and manage coding problems</p>
                                        </div>

                                        {/* Mode Toggle Slider */}
                                        <div className="relative bg-[#1a1a1a] rounded-xl p-1 border border-[#333]">
                                            <div className="flex relative">
                                                {/* Sliding Background */}
                                                <div
                                                    className="absolute top-1 bottom-1 bg-[#333] rounded-lg transition-all duration-300 ease-out"
                                                    style={{
                                                        left: problemPageMode === 'browse' ? '4px' : problemPageMode === 'add' ? 'calc(33.33% + 1px)' : 'calc(66.66% + 2px)',
                                                        width: 'calc(33.33% - 2px)'
                                                    }}
                                                />

                                                {/* Browse Button */}
                                                <button
                                                    onClick={() => setProblemPageMode('browse')}
                                                    className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg min-w-[100px] ${problemPageMode === 'browse' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                                                        }`}
                                                >
                                                    Browse
                                                </button>

                                                {/* Add Button */}
                                                <button
                                                    onClick={() => setProblemPageMode('add')}
                                                    className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg min-w-[100px] ${problemPageMode === 'add' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                                                        }`}
                                                >
                                                    Add Problem
                                                </button>

                                                {/* Manage Button */}
                                                <button
                                                    onClick={() => setProblemPageMode('manage')}
                                                    className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg min-w-[100px] ${problemPageMode === 'manage' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                                                        }`}
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Browse Mode Content */}
                                    {problemPageMode === 'browse' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {/* Data Source Toggle */}
                                            <div className="flex items-center justify-between mt-4 mb-6">
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

                                                {/* Status Indicator and Refresh */}
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

                                                        // Safely get difficulty with proper fallback
                                                        const problemDifficulty = problem.difficulty?.toLowerCase() || 'easy';
                                                        const diffConfig = difficultyConfig[problemDifficulty as keyof typeof difficultyConfig] || difficultyConfig.easy;
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
                                                                onClick={() => setProblemPageMode('add')}
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
                                    )}

                                    {/* Add Problem Mode Content */}
                                    {problemPageMode === 'add' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="grid grid-cols-12 gap-6">
                                                {/* Main Form */}
                                                <div className="col-span-8 space-y-6">
                                                    {/* Basic Info */}
                                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                        <h2 className="text-white text-xl font-semibold mb-4">Basic Information</h2>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="block text-gray-300 text-sm font-medium mb-2">Problem Title</label>
                                                                <input
                                                                    type="text"
                                                                    value={problemForm.title}
                                                                    onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                                                                    placeholder="Enter problem title..."
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                                                                <textarea
                                                                    value={problemForm.description}
                                                                    onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                                                                    placeholder="Describe the problem in detail..."
                                                                    rows={6}
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-gray-300 text-sm font-medium mb-2">Difficulty</label>
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
                                                                    <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
                                                                    <select
                                                                        value={problemForm.category}
                                                                        onChange={(e) => setProblemForm({ ...problemForm, category: e.target.value })}
                                                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                                                    >
                                                                        <option value="algorithms">Algorithms</option>
                                                                        <option value="data-structures">Data Structures</option>
                                                                        <option value="dynamic-programming">Dynamic Programming</option>
                                                                        <option value="math">Mathematics</option>
                                                                        <option value="strings">Strings</option>
                                                                        <option value="arrays">Arrays</option>
                                                                        <option value="graphs">Graphs</option>
                                                                        <option value="trees">Trees</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Format Specifications */}
                                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                        <h2 className="text-white text-xl font-semibold mb-4">Input/Output Format</h2>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-gray-300 text-sm font-medium mb-2">Input Format</label>
                                                                <textarea
                                                                    value={problemForm.inputFormat}
                                                                    onChange={(e) => setProblemForm({ ...problemForm, inputFormat: e.target.value })}
                                                                    placeholder="Describe the input format..."
                                                                    rows={4}
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-300 text-sm font-medium mb-2">Output Format</label>
                                                                <textarea
                                                                    value={problemForm.outputFormat}
                                                                    onChange={(e) => setProblemForm({ ...problemForm, outputFormat: e.target.value })}
                                                                    placeholder="Describe the output format..."
                                                                    rows={4}
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="mt-4">
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">Constraints</label>
                                                            <textarea
                                                                value={problemForm.constraints}
                                                                onChange={(e) => setProblemForm({ ...problemForm, constraints: e.target.value })}
                                                                placeholder="List the problem constraints..."
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
                                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                                            >
                                                                Add Example
                                                            </button>
                                                        </div>

                                                        {problemForm.examples.map((example, index) => (
                                                            <div key={index} className="mb-6 p-4 bg-[#111] rounded-lg border border-[#333]">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h4 className="text-gray-300 font-medium">Example {index + 1}</h4>
                                                                    {problemForm.examples.length > 1 && (
                                                                        <button
                                                                            onClick={() => setProblemForm({
                                                                                ...problemForm,
                                                                                examples: problemForm.examples.filter((_, i) => i !== index)
                                                                            })}
                                                                            className="text-red-400 hover:text-red-300 text-sm"
                                                                        >
                                                                            Remove
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
                                                                            placeholder="Example input..."
                                                                            rows={3}
                                                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
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
                                                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
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
                                                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Final Answer */}
                                                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                        <h2 className="text-white text-xl font-semibold mb-4">Final Answer</h2>
                                                        <div className="mb-2">
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">Solution</label>
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

                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">Tags (comma-separated)</label>
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
                                                                {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Failed!' : 'Save Problem'}
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    console.log('Save as draft clicked');
                                                                }}
                                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                                            >
                                                                Save as Draft
                                                            </button>

                                                            <button
                                                                onClick={() => {
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
                                                            <div><strong>Title:</strong> {problemForm.title || 'No title'}</div>
                                                            <div><strong>Difficulty:</strong> {problemForm.difficulty}</div>
                                                            <div><strong>Category:</strong> {problemForm.category}</div>
                                                            <div><strong>Examples:</strong> {problemForm.examples.length}</div>
                                                            <div><strong>Tags:</strong> {problemForm.tags || 'No tags'}</div>
                                                            <div><strong>Solution:</strong> {problemForm.finalAnswer ? 'Provided' : 'Missing'}</div>
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
                                    )}

                                    {/* Manage Mode Content */}
                                    {problemPageMode === 'manage' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="max-w-4xl mx-auto">
                                                {/* Header */}
                                                <div className="text-center mb-8">
                                                    <div className="flex items-center justify-center gap-3 mb-4">
                                                        <Github className="w-8 h-8 text-blue-400" />
                                                        <h2 className="text-white text-2xl font-bold">Manage Your Problems</h2>
                                                    </div>
                                                    <p className="text-gray-400">Edit your problems directly in your forked GitHub repository</p>
                                                </div>

                                                {/* Repository Card */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-8 mb-6">
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <Github className="w-8 h-8 text-white" />
                                                        </div>

                                                        <h3 className="text-white text-xl font-semibold mb-2">
                                                            sriox-cloud/codeer_problems
                                                        </h3>
                                                        <p className="text-gray-400 mb-6">
                                                            Main repository containing all community problems
                                                        </p>

                                                        {/* Edit Button */}
                                                        <button
                                                            onClick={() => {
                                                                const repoUrl = 'https://github.com/sriox-cloud/codeer_problems';
                                                                window.open(repoUrl, '_blank');
                                                            }}
                                                            className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                                        >
                                                            <Edit className="w-5 h-5" />
                                                            Edit Problems in GitHub
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Instructions Card */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                                            <Info className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-white font-semibold mb-3">How to Edit Problems</h4>
                                                            <div className="space-y-3 text-gray-300 text-sm">
                                                                <div className="flex items-start gap-3">
                                                                    <span className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                                                                    <div>
                                                                        <strong>Navigate to the repository:</strong> Click the "Edit Problems in GitHub" button above to open the main codeer_problems repository.
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-start gap-3">
                                                                    <span className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                                                                    <div>
                                                                        <strong>Fork the repository:</strong> Click the "Fork" button in the top-right corner of the GitHub page to create your own copy.
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-start gap-3">
                                                                    <span className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                                                                    <div>
                                                                        <strong>Navigate to problems folder:</strong> In your forked repository, go to the <code className="bg-[#333] px-1 py-0.5 rounded text-xs">problems/</code> directory.
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-start gap-3">
                                                                    <span className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">4</span>
                                                                    <div>
                                                                        <strong>Add or edit problems:</strong> Create new problem files or edit existing ones using GitHub's online editor.
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-start gap-3">
                                                                    <span className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">5</span>
                                                                    <div>
                                                                        <strong>Commit and create PR:</strong> Commit your changes and create a pull request to merge them back to the main repository.
                                                                    </div>
                                                                </div>
                                                            </div>                                                            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                                                                <div className="flex items-start gap-2">
                                                                    <div className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5">💡</div>
                                                                    <div className="text-yellow-300 text-sm">
                                                                        <strong>Tip:</strong> Fork the repository first, then work on your own copy. Your contributions will be reviewed and merged into the main repository through pull requests.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="grid grid-cols-2 gap-4 mt-6">
                                                    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <FileText className="w-5 h-5 text-green-400" />
                                                            <h5 className="text-white font-medium">Create New Problem</h5>
                                                        </div>
                                                        <p className="text-gray-400 text-sm mb-3">Add a new problem to your repository</p>
                                                        <button
                                                            onClick={() => setProblemPageMode('add')}
                                                            className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                                                        >
                                                            Go to Add Problem →
                                                        </button>
                                                    </div>

                                                    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Eye className="w-5 h-5 text-blue-400" />
                                                            <h5 className="text-white font-medium">Browse Problems</h5>
                                                        </div>
                                                        <p className="text-gray-400 text-sm mb-3">View all community problems</p>
                                                        <button
                                                            onClick={() => setProblemPageMode('browse')}
                                                            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                                                        >
                                                            Go to Browse →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "teamup" && (
                            <div className="h-full w-full animate-in fade-in slide-in-from-right-4 duration-500 overflow-auto">
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h1 className="text-white text-3xl font-bold mb-2">TeamUp</h1>
                                            <p className="text-gray-400">Find collaborators and join exciting startup projects</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setActiveQuickCreateTab("teamup");
                                                setActiveTab(null);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create TeamUp
                                        </button>
                                    </div>

                                    {/* Filter and Search */}
                                    <div className="mb-6 grid grid-cols-12 gap-4">
                                        <div className="col-span-6">
                                            <input
                                                type="text"
                                                placeholder="Search teamups..."
                                                value={teamupSearchQuery}
                                                onChange={(e) => setTeamupSearchQuery(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <select
                                                value={teamupCategoryFilter}
                                                onChange={(e) => setTeamupCategoryFilter(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="">All Categories</option>
                                                <option value="startup">Startup</option>
                                                <option value="hackathon">Hackathon</option>
                                                <option value="open-source">Open Source</option>
                                                <option value="learning">Learning Project</option>
                                                <option value="competition">Competition</option>
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <select
                                                value={teamupSortBy}
                                                onChange={(e) => setTeamupSortBy(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="deadline">Deadline</option>
                                                <option value="most-needed">Most Needed</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Banner Section */}
                                    <div className="relative bg-gradient-to-r from-gray-900 via-black to-gray-800 rounded-xl p-6 mb-6 overflow-hidden border border-[#333]">
                                        <div className="absolute inset-0 bg-black/40"></div>
                                        <div className="relative z-10">
                                            <h2 className="text-white text-2xl font-bold mb-2">Find Your Dream Team</h2>
                                            <p className="text-gray-300 text-base mb-3">Connect with talented developers, designers, and innovators to bring your ideas to life</p>
                                            <div className="flex items-center gap-6 text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span className="text-sm">{teamupPosts.length} Active Projects</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-4 h-4" />
                                                    <span className="text-sm">Multiple Categories</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm">Real-time Updates</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Decorative elements */}
                                        <div className="absolute top-4 right-4 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
                                        <div className="absolute bottom-4 right-8 w-16 h-16 bg-white/3 rounded-full translate-y-6 translate-x-6"></div>
                                    </div>

                                    {/* TeamUp Posts Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {isLoadingTeamups ? (
                                            Array.from({ length: 4 }).map((_, index) => (
                                                <div key={index} className="bg-[#1a1a1a] rounded-lg border border-[#333] p-6 animate-pulse">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex-1">
                                                            <div className="h-6 bg-[#333] rounded w-3/4 mb-2"></div>
                                                            <div className="h-4 bg-[#333] rounded w-1/2 mb-3"></div>
                                                            <div className="h-4 bg-[#333] rounded w-full mb-1"></div>
                                                            <div className="h-4 bg-[#333] rounded w-5/6"></div>
                                                        </div>
                                                    </div>
                                                    <div className="h-10 bg-[#333] rounded w-full"></div>
                                                </div>
                                            ))
                                        ) : teamupsError ? (
                                            <div className="col-span-2 text-center py-12 animate-in fade-in duration-300">
                                                <div className="inline-flex items-center gap-2 text-red-400">
                                                    <X className="w-4 h-4" />
                                                    <span>Error loading teamups: {teamupsError}</span>
                                                </div>
                                                <button
                                                    onClick={refreshTeamups}
                                                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : teamupPosts.length > 0 ? (
                                            <>
                                                {teamupPosts.map((post, index) => (
                                                    <div
                                                        key={post.id || index}
                                                        className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 hover:border-[#404040] hover:shadow-lg hover:shadow-black/20 transition-all duration-300 ease-out animate-in slide-in-from-bottom-6 fade-in"
                                                        style={{
                                                            animationDelay: `${index * 100}ms`,
                                                            animationDuration: '500ms',
                                                            animationFillMode: 'both'
                                                        }}
                                                    >
                                                        {/* Banner Image */}
                                                        {post.image_url && (
                                                            <div className="mb-3">
                                                                <img
                                                                    src={post.image_url}
                                                                    alt={post.title}
                                                                    className="w-full h-32 object-cover rounded-lg border border-[#333]"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Post Header */}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="text-white text-lg font-semibold line-clamp-1">{post.title}</h3>
                                                                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full border border-blue-600/30 capitalize">
                                                                        {post.category}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-300 mb-3 line-clamp-2 text-sm">{post.description}</p>
                                                            </div>
                                                        </div>

                                                        {/* Project Details */}
                                                        <div className="grid grid-cols-1 gap-2 mb-3">
                                                            {post.goal && (
                                                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                                    <Target className="w-4 h-4 flex-shrink-0" />
                                                                    <span className="line-clamp-1">{post.goal}</span>
                                                                </div>
                                                            )}
                                                            {post.timeline && (
                                                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                                    <Clock className="w-4 h-4 flex-shrink-0" />
                                                                    <span className="line-clamp-1">{post.timeline}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Tech Stack */}
                                                        {post.tech_stack && (
                                                            <div className="mb-3">
                                                                <div className="text-gray-400 text-sm mb-2">Tech Stack:</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {post.tech_stack.split(',').slice(0, 3).map((tech: string, techIndex: number) => (
                                                                        <span key={techIndex} className="px-2 py-1 bg-[#333] text-gray-300 text-xs rounded">
                                                                            {tech.trim()}
                                                                        </span>
                                                                    ))}
                                                                    {post.tech_stack.split(',').length > 3 && (
                                                                        <span className="px-2 py-1 bg-[#333] text-gray-400 text-xs rounded">
                                                                            +{post.tech_stack.split(',').length - 3} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Team Slots */}
                                                        {post.team_slots && post.team_slots.length > 0 && (
                                                            <div className="mb-3">
                                                                <div className="text-gray-400 text-sm mb-2">Looking for:</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {post.team_slots.slice(0, 2).map((slot: any, slotIndex: number) => (
                                                                        <div key={slotIndex} className="flex items-center gap-2 px-3 py-1 bg-[#333] rounded-lg">
                                                                            <Users className="w-3 h-3 text-blue-400" />
                                                                            <span className="text-gray-300 text-sm">{slot.role}</span>
                                                                            <span className="text-blue-400 text-sm">({slot.filled}/{slot.count})</span>
                                                                        </div>
                                                                    ))}
                                                                    {post.team_slots.length > 2 && (
                                                                        <div className="px-3 py-1 bg-[#333] rounded-lg text-gray-400 text-sm">
                                                                            +{post.team_slots.length - 2} more
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Footer with Author and Apply Button */}
                                                        <div className="flex items-center justify-between pt-4 border-t border-[#333]">
                                                            <div className="flex items-center gap-3">
                                                                {post.user?.avatar_url ? (
                                                                    <img
                                                                        src={post.user.avatar_url}
                                                                        alt={post.user.display_name || 'User'}
                                                                        className="w-8 h-8 rounded-full"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                                                        <User className="w-4 h-4 text-white" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="text-white text-sm font-medium">
                                                                        {post.user?.display_name || 'Anonymous'}
                                                                    </div>
                                                                    <div className="text-gray-400 text-xs">
                                                                        {new Date(post.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Always show Apply button in exploration */}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTeamup(post);
                                                                    setShowApplicationForm(true);
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                                            >
                                                                <UserCheck className="w-4 h-4" />
                                                                Apply
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="col-span-2 text-center py-12 bg-[#1a1a1a] rounded-lg border border-[#333]">
                                                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                                <div className="text-gray-400 text-xl mb-2">No TeamUp Posts Yet</div>
                                                <div className="text-gray-500 mb-4">Be the first to start a collaboration!</div>
                                                <button
                                                    onClick={() => {
                                                        setActiveQuickCreateTab("teamup");
                                                        setActiveTab(null);
                                                    }}
                                                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Create TeamUp Post
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "project-expo" && (
                            <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
                                <ProjectExpoSection onProjectClick={handleProjectDetail} />
                            </div>
                        )}

                        {!activeQuickCreateTab && activeTab === "my-pages" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">My Pages</div>
                                    <div className="text-gray-500">Coming Soon - Manage your personal pages and content</div>
                                </div>
                            </div>
                        )}

                        {/* Learning Section - Hidden for now */}
                        {/* {!activeQuickCreateTab && activeTab === "learning" && (
                            <div className="h-full flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                    <div className="text-gray-400 text-xl mb-2">Learning Section</div>
                                    <div className="text-gray-500">Coming Soon - Educational resources and tutorials</div>
                                </div>
                            </div>
                        )} */}

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
                            <div className="h-full flex bg-black animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Sidebar */}
                                <div className="w-80 bg-[#1a1a1a] border-r border-[#333] flex flex-col">
                                    {/* Header */}
                                    <div className="p-6 border-b border-[#333]">
                                        <h2 className="text-white text-xl font-bold mb-1">Pages</h2>
                                        <p className="text-gray-400 text-sm">Create and manage your web pages</p>
                                    </div>

                                    {/* Navigation Tabs */}
                                    <div className="p-4">
                                        <div className="space-y-2">
                                            <button
                                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${pagesActiveTab === 'create'
                                                    ? 'bg-[#333] text-white border border-[#444]'
                                                    : 'text-gray-400 hover:text-white hover:bg-[#333]'
                                                    }`}
                                                onClick={() => setPagesActiveTab('create')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Plus className="w-5 h-5" />
                                                    <span className="font-medium">Create a Page</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 ml-8">
                                                    Build new websites with custom domains
                                                </div>
                                            </button>

                                            <button
                                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${pagesActiveTab === 'manage'
                                                    ? 'bg-[#333] text-white border border-[#444]'
                                                    : 'text-gray-400 hover:text-white hover:bg-[#333]'
                                                    }`}
                                                onClick={() => setPagesActiveTab('manage')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Settings className="w-5 h-5" />
                                                    <span className="font-medium">Manage Pages</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 ml-8">
                                                    Edit and update your existing pages
                                                </div>
                                            </button>

                                            <button
                                                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${pagesActiveTab === 'donate-domain'
                                                    ? 'bg-[#333] text-white border border-[#444]'
                                                    : 'text-gray-400 hover:text-white hover:bg-[#333]'
                                                    }`}
                                                onClick={() => setPagesActiveTab('donate-domain')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Heart className="w-5 h-5" />
                                                    <span className="font-medium">Donate Domain</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 ml-8">
                                                    Share your domain with the community
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="p-4 mt-auto border-t border-[#333]">
                                        <div className="bg-[#333] rounded-lg p-4">
                                            <div className="text-gray-400 text-sm mb-2">Your Pages</div>
                                            <div className="text-white text-2xl font-bold">
                                                {userPages.length}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                                Active websites
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 flex flex-col">
                                    {pagesActiveTab === 'create' && (
                                        <div className="flex-1 p-8 overflow-auto">
                                            <div className="max-w-2xl mx-auto">
                                                <div className="mb-8">
                                                    <h1 className="text-white text-3xl font-bold mb-2">Create a New Page</h1>
                                                    <p className="text-gray-400">Upload your website files and get a custom domain instantly</p>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Page Title */}
                                                    <div>
                                                        <label className="block text-white text-sm font-medium mb-2">
                                                            Page Title
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={createPageForm.title}
                                                            onChange={(e) => setCreatePageForm(prev => ({ ...prev, title: e.target.value }))}
                                                            placeholder="My Awesome Website"
                                                            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>

                                                    {/* Domain Configuration */}
                                                    <div>
                                                        <label className="block text-white text-sm font-medium mb-4">
                                                            Domain Configuration
                                                        </label>
                                                        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
                                                            <DomainSelector
                                                                selectedType={domainType}
                                                                onTypeChange={setDomainType}
                                                                selectedDomain={createPageForm.domain}
                                                                onDomainChange={(domain) => setCreatePageForm(prev => ({ ...prev, domain: domain }))}
                                                                selectedDonatedDomainId={selectedDonatedDomainId}
                                                                onDonatedDomainIdChange={setSelectedDonatedDomainId}
                                                                subdomain={createPageForm.subdomain}
                                                                onAvailabilityChange={setIsDomainAvailable}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Subdomain Input */}
                                                    <div>
                                                        <label className="block text-white text-sm font-medium mb-2">
                                                            Subdomain
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={createPageForm.subdomain}
                                                            onChange={(e) => setCreatePageForm(prev => ({ ...prev, subdomain: e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase() }))}
                                                            placeholder="mysite"
                                                            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                        />
                                                        {createPageForm.subdomain && createPageForm.domain && (
                                                            <div className="mt-2 text-sm text-gray-400">
                                                                Your site will be available at: <span className="text-blue-400">{createPageForm.subdomain}.{createPageForm.domain}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-6">
                                                        {/* File Upload Section */}
                                                        <div>
                                                            <label className="block text-white text-sm font-medium mb-2">
                                                                Website Files *
                                                            </label>
                                                            <div className="border-2 border-dashed border-[#333] rounded-lg p-8 text-center hover:border-[#404040] transition-colors">
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    accept=".html,.css,.js,.png,.jpg,.jpeg,.gif,.svg,.ico,.json,.txt,.md"
                                                                    onChange={(e) => {
                                                                        const files = e.target.files;
                                                                        if (files) {
                                                                            // Check if index.html is present
                                                                            const hasIndexHtml = Array.from(files).some(file =>
                                                                                file.name.toLowerCase() === 'index.html'
                                                                            );

                                                                            if (!hasIndexHtml) {
                                                                                alert('Please include an index.html file as your main page.');
                                                                                e.target.value = '';
                                                                                return;
                                                                            }

                                                                            setCreatePageForm(prev => ({ ...prev, files }));
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                    id="file-upload"
                                                                />
                                                                <label htmlFor="file-upload" className="cursor-pointer">
                                                                    <div className="flex flex-col items-center">
                                                                        <Cloud className="w-12 h-12 text-gray-400 mb-4" />
                                                                        <div className="text-white text-lg font-medium mb-2">
                                                                            Drop your files here or click to browse
                                                                        </div>
                                                                        <div className="text-gray-400 text-sm mb-4">
                                                                            Upload HTML, CSS, JS, images and other website files
                                                                        </div>
                                                                        <div className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                                                                            Choose Files
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            </div>

                                                            {/* File List */}
                                                            {createPageForm.files && createPageForm.files.length > 0 && (
                                                                <div className="mt-4 space-y-2">
                                                                    <div className="text-white text-sm font-medium mb-2">
                                                                        Selected Files ({createPageForm.files.length}):
                                                                    </div>
                                                                    <div className="max-h-32 overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded-lg p-3">
                                                                        {Array.from(createPageForm.files).map((file, index) => (
                                                                            <div key={index} className="flex items-center justify-between py-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className={`w-2 h-2 rounded-full ${file.name.toLowerCase() === 'index.html'
                                                                                        ? 'bg-green-400'
                                                                                        : 'bg-blue-400'
                                                                                        }`} />
                                                                                    <span className="text-gray-300 text-sm">{file.name}</span>
                                                                                    {file.name.toLowerCase() === 'index.html' && (
                                                                                        <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded">
                                                                                            Main Page
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-gray-500 text-xs">
                                                                                    {(file.size / 1024).toFixed(1)} KB
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="mt-2 text-xs text-gray-400">
                                                                <strong>Requirements:</strong> Must include an index.html file.
                                                                Supported formats: HTML, CSS, JS, PNG, JPG, GIF, SVG, ICO, JSON, TXT, MD
                                                            </div>
                                                        </div>

                                                        {/* Create Button */}
                                                        <div className="pt-4">
                                                            <button
                                                                onClick={async () => {
                                                                    if (!createPageForm.title.trim()) {
                                                                        alert('Please enter a page title.');
                                                                        return;
                                                                    }
                                                                    if (!createPageForm.subdomain.trim()) {
                                                                        alert('Please enter a subdomain.');
                                                                        return;
                                                                    }
                                                                    if (!createPageForm.files || createPageForm.files.length === 0) {
                                                                        alert('Please select files to upload.');
                                                                        return;
                                                                    }
                                                                    if (!isDomainAvailable && domainType === 'donated') {
                                                                        alert('This subdomain is not available. Please choose a different one.');
                                                                        return;
                                                                    }

                                                                    try {
                                                                        await createPage({
                                                                            title: createPageForm.title,
                                                                            subdomain: createPageForm.subdomain,
                                                                            domain: createPageForm.domain,
                                                                            donatedDomainId: domainType === 'donated' ? selectedDonatedDomainId : undefined,
                                                                            files: createPageForm.files
                                                                        });

                                                                        // Reset form on success
                                                                        setCreatePageForm({
                                                                            title: "",
                                                                            domain: "sidu.me",
                                                                            subdomain: "",
                                                                            files: null,
                                                                            isUploading: false,
                                                                            uploadProgress: 0
                                                                        });

                                                                        // Clear file input
                                                                        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                                                                        if (fileInput) fileInput.value = '';

                                                                        alert('Page created successfully!');

                                                                    } catch (error) {
                                                                        console.error('Error creating page:', error);
                                                                        alert('Failed to create page. Please try again.');
                                                                    }
                                                                }}
                                                                disabled={isCreatingPage || !createPageForm.files || createPageForm.files.length === 0}
                                                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                                                            >
                                                                {isCreatingPage ? (
                                                                    <>
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                        Creating Page... ({creationProgress}%)
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Cloud className="w-4 h-4" />
                                                                        Create Page
                                                                    </>
                                                                )}
                                                            </button>

                                                            {isCreatingPage && (
                                                                <div className="mt-4 space-y-2">
                                                                    <div className="flex justify-between text-sm text-gray-400">
                                                                        <span>Current Step:</span>
                                                                        <span>{creationStep}</span>
                                                                    </div>
                                                                    <div className="w-full bg-[#333] rounded-full h-2">
                                                                        <div
                                                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                                            style={{ width: `${creationProgress}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {pagesActiveTab === 'manage' && (
                                        <div className="flex-1 p-8 overflow-auto">
                                            <div className="max-w-4xl mx-auto">
                                                <div className="mb-8">
                                                    <h1 className="text-white text-3xl font-bold mb-2">Manage Pages</h1>
                                                    <p className="text-gray-400">Edit and update your existing websites</p>
                                                </div>

                                                {isLoadingPages ? (
                                                    <div className="text-center py-12">
                                                        <div className="text-gray-400 text-lg">Loading your pages...</div>
                                                    </div>
                                                ) : pagesError ? (
                                                    <div className="text-center py-12">
                                                        <div className="text-red-400 text-lg mb-2">Error loading pages</div>
                                                        <div className="text-gray-500 mb-4">{pagesError}</div>
                                                        <button
                                                            onClick={refreshPages}
                                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                                        >
                                                            Try Again
                                                        </button>
                                                    </div>
                                                ) : userPages && userPages.length > 0 ? (
                                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                        {userPages.map((page) => (
                                                            <div key={page.id} className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 hover:border-[#444] transition-colors">
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <div>
                                                                        <h3 className="text-white font-semibold text-lg mb-1">{page.title}</h3>
                                                                        <p className="text-gray-400 text-sm">{page.domain}</p>
                                                                    </div>
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${page.status === 'active' ? 'bg-green-900 text-green-300' :
                                                                        page.status === 'creating' ? 'bg-yellow-900 text-yellow-300' :
                                                                            page.status === 'error' ? 'bg-red-900 text-red-300' :
                                                                                'bg-gray-900 text-gray-300'
                                                                        }`}>
                                                                        {page.status}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-2 mb-4">
                                                                    <div className="flex items-center text-sm text-gray-400">
                                                                        <FileText className="w-4 h-4 mr-2" />
                                                                        {page.file_count} files
                                                                    </div>
                                                                    <div className="flex items-center text-sm text-gray-400">
                                                                        <Calendar className="w-4 h-4 mr-2" />
                                                                        Created {new Date(page.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-2">
                                                                    <a
                                                                        href={page.custom_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors text-center"
                                                                    >
                                                                        Visit Site
                                                                    </a>
                                                                    <a
                                                                        href={`https://github.com/${page.github_repo}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="px-3 py-2 bg-[#333] hover:bg-[#444] text-white text-sm font-medium rounded-md transition-colors"
                                                                    >
                                                                        GitHub
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12">
                                                        <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                                        <div className="text-gray-400 text-lg mb-2">No pages created yet</div>
                                                        <div className="text-gray-500 mb-4">Create your first page to get started</div>
                                                        <button
                                                            onClick={() => setPagesActiveTab('create')}
                                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                                        >
                                                            Create Your First Page
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {pagesActiveTab === 'donate-domain' && (
                                        <div className="flex-1 p-8 overflow-auto">
                                            <div className="max-w-6xl mx-auto">
                                                <div className="mb-8">
                                                    <h1 className="text-white text-3xl font-bold mb-2">Donate Your Domain</h1>
                                                    <p className="text-gray-400">Share your domain to help the community get free subdomains</p>
                                                </div>

                                                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
                                                    <DonatedDomainsManager />
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                                            onClick={() => {
                                                setActiveQuickCreateTab(null);
                                                router.push('/');
                                            }}
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
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500 overflow-auto">
                                <div className="p-8">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h1 className="text-white text-3xl font-bold mb-2">TeamUp Dashboard</h1>
                                            <p className="text-gray-400">Manage your collaborations and create new opportunities</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setActiveQuickCreateTab(null);
                                                router.push('/');
                                            }}
                                            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    {!showCreateTeamupForm ? (
                                        /* Dashboard View */
                                        <div className="space-y-6">
                                            {/* Quick Stats */}
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                                    <div className="text-gray-400 text-sm mb-1">Your Posts</div>
                                                    <div className="text-white text-2xl font-bold">0</div>
                                                </div>
                                                <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                                                    <div className="text-gray-400 text-sm mb-1">Applications</div>
                                                    <div className="text-blue-400 text-2xl font-bold">0</div>
                                                </div>
                                                <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-3">
                                                    <div className="text-gray-400 text-sm mb-1">Team Members</div>
                                                    <div className="text-green-400 text-xl font-bold">0</div>
                                                </div>
                                            </div>

                                            {/* Action Cards */}
                                            <div className="grid grid-cols-2 gap-6">
                                                {/* Create New TeamUp */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-[#404040] transition-all duration-300 cursor-pointer"
                                                    onClick={() => setShowCreateTeamupForm(true)}>
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                                            <Plus className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white text-lg font-semibold">Create TeamUp Post</h3>
                                                            <p className="text-gray-400 text-sm">Start a new collaboration project</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-300 text-sm">
                                                        Create a post to find collaborators for your startup idea, hackathon team, or open source project.
                                                    </div>
                                                </div>

                                                {/* Manage Applications */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-[#404040] transition-all duration-300 cursor-pointer">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                                                            <UserCheck className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white text-lg font-semibold">Manage Applications</h3>
                                                            <p className="text-gray-400 text-sm">Review and approve team members</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-300 text-sm">
                                                        Review applications from potential team members and build your dream team.
                                                    </div>
                                                </div>
                                            </div>                                            {/* Your Projects Showcase */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                                            <Target className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white text-xl font-semibold">Your Projects</h3>
                                                            <p className="text-gray-400 text-sm">Active collaborations and ongoing work</p>
                                                        </div>
                                                    </div>
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#404040] text-gray-300 rounded-lg transition-colors text-sm">
                                                        <Eye className="w-4 h-4" />
                                                        View All
                                                    </button>
                                                </div>

                                                {/* Projects Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {isLoadingUserPosts ? (
                                                        // Loading state
                                                        Array.from({ length: 2 }).map((_, index) => (
                                                            <div key={index} className="bg-[#111] rounded-lg border border-[#333] p-5 animate-pulse">
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-[#333] rounded-lg"></div>
                                                                        <div>
                                                                            <div className="h-4 bg-[#333] rounded w-24 mb-1"></div>
                                                                            <div className="h-3 bg-[#333] rounded w-16"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-3 bg-[#333] rounded w-12"></div>
                                                                </div>
                                                                <div className="h-3 bg-[#333] rounded w-full mb-1"></div>
                                                                <div className="h-3 bg-[#333] rounded w-3/4 mb-3"></div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex gap-1">
                                                                        <div className="w-6 h-6 bg-[#333] rounded-full"></div>
                                                                        <div className="w-6 h-6 bg-[#333] rounded-full"></div>
                                                                    </div>
                                                                    <div className="h-3 bg-[#333] rounded w-16"></div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : userPostsError ? (
                                                        // Error state
                                                        <div className="col-span-2 bg-[#111] rounded-lg border border-red-600/30 p-5 text-center">
                                                            <div className="text-red-400 mb-2">
                                                                <X className="w-8 h-8 mx-auto mb-2" />
                                                                Error loading your projects
                                                            </div>
                                                            <button
                                                                onClick={refreshUserPosts}
                                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                                            >
                                                                Retry
                                                            </button>
                                                        </div>
                                                    ) : userTeamupPosts.length > 0 ? (
                                                        // Real user projects
                                                        <>
                                                            {userTeamupPosts.slice(0, 3).map((post, index) => {
                                                                const categoryIcons = {
                                                                    'startup': Code,
                                                                    'hackathon': Presentation,
                                                                    'open-source': Github,
                                                                    'learning': BookOpen,
                                                                    'competition': Target
                                                                };
                                                                const CategoryIcon = categoryIcons[post.category] || Code;

                                                                return (
                                                                    <div key={post.id} className="bg-[#111] rounded-lg border border-[#333] p-4 hover:border-[#404040] transition-all duration-300 group cursor-pointer">
                                                                        {/* Banner Image */}
                                                                        {post.image_url && (
                                                                            <div className="mb-3">
                                                                                <img
                                                                                    src={post.image_url}
                                                                                    alt={post.title}
                                                                                    className="w-full h-20 object-cover rounded-lg border border-[#333]"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                                                                    <CategoryIcon className="w-4 h-4 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-white font-medium group-hover:text-blue-300 transition-colors line-clamp-1 text-sm">
                                                                                        {post.title}
                                                                                    </h4>
                                                                                    <p className="text-gray-400 text-xs capitalize">{post.category}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <div className={`w-2 h-2 rounded-full ${post.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                                                                <span className={`text-xs ${post.is_active ? 'text-green-400' : 'text-gray-400'}`}>
                                                                                    {post.is_active ? 'Active' : 'Inactive'}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                                                                            {post.description}
                                                                        </p>

                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex -space-x-2">
                                                                                {post.team_slots?.slice(0, 3).map((slot, slotIndex) => (
                                                                                    <div key={slotIndex} className="w-5 h-5 bg-blue-500 rounded-full border-2 border-[#111] flex items-center justify-center">
                                                                                        <span className="text-white text-xs font-medium">
                                                                                            {slot.role.charAt(0).toUpperCase()}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                                {(post.team_slots?.length || 0) > 3 && (
                                                                                    <div className="w-5 h-5 bg-purple-500 rounded-full border-2 border-[#111] flex items-center justify-center">
                                                                                        <span className="text-white text-xs font-medium">
                                                                                            +{(post.team_slots?.length || 0) - 3}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                                                                                <Clock className="w-3 h-3" />
                                                                                <span>{post.timeline || 'No timeline set'}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Action buttons for Your Projects */}
                                                                        <div className="flex gap-2 mt-3 pt-3 border-t border-[#333]">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingTeamup(post);
                                                                                    setShowEditForm(true);
                                                                                }}
                                                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs font-medium"
                                                                            >
                                                                                <Edit className="w-3 h-3" />
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedProjectForApplications(post);
                                                                                    setShowProjectApplications(true);
                                                                                }}
                                                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                                                                            >
                                                                                <UserCheck className="w-3 h-3" />
                                                                                Applications
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Add New Project Card */}
                                                            {userTeamupPosts.length < 4 && (
                                                                <div className="bg-[#111] rounded-lg border border-[#333] border-dashed p-4 flex flex-col items-center justify-center text-center min-h-[120px] hover:border-[#404040] transition-all duration-300 cursor-pointer"
                                                                    onClick={() => setShowCreateTeamupForm(true)}>
                                                                    <div className="w-8 h-8 bg-[#333] rounded-lg flex items-center justify-center mb-2">
                                                                        <Plus className="w-4 h-4 text-gray-400" />
                                                                    </div>
                                                                    <p className="text-gray-400 text-xs font-medium mb-1">Start New Project</p>
                                                                    <p className="text-gray-500 text-xs">Create a TeamUp post to find collaborators</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        // Empty state - no projects yet
                                                        <div className="col-span-2 bg-[#111] rounded-lg border border-[#333] border-dashed p-8 flex flex-col items-center justify-center text-center">
                                                            <div className="w-16 h-16 bg-[#333] rounded-lg flex items-center justify-center mb-4">
                                                                <Target className="w-8 h-8 text-gray-400" />
                                                            </div>
                                                            <h4 className="text-white font-medium mb-2">No Projects Yet</h4>
                                                            <p className="text-gray-400 text-sm mb-4">Create your first TeamUp post to start collaborating</p>
                                                            <button
                                                                onClick={() => setShowCreateTeamupForm(true)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                Create Project
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* My Applications */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                                                            <UserCheck className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white text-xl font-semibold">My Applications</h3>
                                                            <p className="text-gray-400 text-sm">Track your applications to join teams</p>
                                                        </div>
                                                    </div>
                                                    <button className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#404040] text-gray-300 rounded-lg transition-colors text-sm">
                                                        <Eye className="w-4 h-4" />
                                                        View All
                                                    </button>
                                                </div>

                                                {/* Applications List */}
                                                <div className="space-y-3">
                                                    {isLoadingApplications ? (
                                                        // Loading state
                                                        Array.from({ length: 3 }).map((_, index) => (
                                                            <div key={index} className="bg-[#111] rounded-lg border border-[#333] p-4 animate-pulse">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-[#333] rounded-lg"></div>
                                                                        <div>
                                                                            <div className="h-4 bg-[#333] rounded w-32 mb-1"></div>
                                                                            <div className="h-3 bg-[#333] rounded w-20"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-6 bg-[#333] rounded w-16"></div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : applicationsError ? (
                                                        // Error state
                                                        <div className="bg-[#111] rounded-lg border border-red-600/30 p-4 text-center">
                                                            <div className="text-red-400 mb-2">
                                                                <X className="w-6 h-6 mx-auto mb-2" />
                                                                Error loading applications
                                                            </div>
                                                            <button
                                                                onClick={refreshApplications}
                                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                                            >
                                                                Retry
                                                            </button>
                                                        </div>
                                                    ) : userApplications.length > 0 ? (
                                                        // Real applications
                                                        <>
                                                            {userApplications.slice(0, 4).map((application: any) => {
                                                                const statusColors = {
                                                                    pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-600/30' },
                                                                    accepted: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-600/30' },
                                                                    rejected: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-600/30' }
                                                                };
                                                                const statusStyle = statusColors[application.status as keyof typeof statusColors] || statusColors.pending;

                                                                return (
                                                                    <div key={application.id} className="bg-[#111] rounded-lg border border-[#333] p-4 hover:border-[#404040] transition-all duration-300">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                                                                    <Code className="w-5 h-5 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-white font-medium line-clamp-1">
                                                                                        {application.teamup_post?.title || 'Project Title'}
                                                                                    </h4>
                                                                                    <p className="text-gray-400 text-sm">Applied for: {application.role}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                                                                                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                                                            <span>Applied: {new Date(application.created_at).toLocaleDateString()}</span>
                                                                            {application.teamup_post?.category && (
                                                                                <span className="capitalize">{application.teamup_post.category}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    ) : (
                                                        // Empty state - no applications yet
                                                        <div className="bg-[#111] rounded-lg border border-[#333] border-dashed p-6 flex flex-col items-center justify-center text-center">
                                                            <div className="w-12 h-12 bg-[#333] rounded-lg flex items-center justify-center mb-3">
                                                                <UserCheck className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                            <h4 className="text-white font-medium mb-2">No Applications Yet</h4>
                                                            <p className="text-gray-400 text-sm">Start applying to projects in the Explore section</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Recent Activity */}
                                            <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                <h3 className="text-white text-lg font-semibold mb-4">Recent Activity</h3>
                                                <div className="text-center py-8 text-gray-400">
                                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                                                    <p>No recent activity to show</p>
                                                    <p className="text-sm">Create your first TeamUp post to get started!</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Create TeamUp Form */
                                        <div className="grid grid-cols-12 gap-6">
                                            {/* Main Form */}
                                            <div className="col-span-8 space-y-6">
                                                {/* Basic Information */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                    <h2 className="text-white text-xl font-semibold mb-4">Project Information</h2>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Project Title *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={teamupForm.title}
                                                                onChange={(e) => setTeamupForm({ ...teamupForm, title: e.target.value })}
                                                                placeholder="e.g., AI-Powered E-commerce Platform"
                                                                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Description *
                                                            </label>
                                                            <textarea
                                                                value={teamupForm.description}
                                                                onChange={(e) => setTeamupForm({ ...teamupForm, description: e.target.value })}
                                                                placeholder="Describe your project idea, what problem it solves, and what makes it unique..."
                                                                rows={4}
                                                                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                    Category
                                                                </label>
                                                                <select
                                                                    value={teamupForm.category}
                                                                    onChange={(e) => setTeamupForm({ ...teamupForm, category: e.target.value as 'startup' | 'hackathon' | 'open-source' | 'learning' | 'competition' })}
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                                                >
                                                                    <option value="startup">Startup</option>
                                                                    <option value="hackathon">Hackathon</option>
                                                                    <option value="open-source">Open Source</option>
                                                                    <option value="learning">Learning Project</option>
                                                                    <option value="competition">Competition</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                    Timeline
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={teamupForm.timeline}
                                                                    onChange={(e) => setTeamupForm({ ...teamupForm, timeline: e.target.value })}
                                                                    placeholder="e.g., 3 months, 6 weeks"
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Tech Stack
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={teamupForm.techStack}
                                                                onChange={(e) => setTeamupForm({ ...teamupForm, techStack: e.target.value })}
                                                                placeholder="React, Node.js, Python, MongoDB, etc."
                                                                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Project Goal
                                                            </label>
                                                            <textarea
                                                                value={teamupForm.goal}
                                                                onChange={(e) => setTeamupForm({ ...teamupForm, goal: e.target.value })}
                                                                placeholder="What do you want to achieve with this project?"
                                                                rows={3}
                                                                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Project Banner/Logo
                                                            </label>
                                                            <div className="space-y-3">
                                                                {/* Image URL Input */}
                                                                <input
                                                                    type="url"
                                                                    value={teamupForm.imageUrl || ''}
                                                                    onChange={(e) => setTeamupForm({ ...teamupForm, imageUrl: e.target.value })}
                                                                    placeholder="Paste direct image link here (e.g., https://i.ibb.co/xyz/image.png)"
                                                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                                />

                                                                {/* Upload Suggestion */}
                                                                <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                                                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                        <ExternalLink className="w-4 h-4 text-white" />
                                                                    </div>
                                                                    <div className="text-sm">
                                                                        <p className="text-blue-300 font-medium">Need to upload an image?</p>
                                                                        <p className="text-blue-200">
                                                                            Use{' '}
                                                                            <a
                                                                                href="https://imgbb.com/"
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                                                            >
                                                                                imgbb.com
                                                                            </a>{' '}
                                                                            to upload your image, then copy the "Direct link" and paste it above.
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Image Preview */}
                                                                {teamupForm.imageUrl && (
                                                                    <div className="relative">
                                                                        <div className="w-full h-40 bg-[#111] border border-[#333] rounded-lg overflow-hidden">
                                                                            <img
                                                                                src={teamupForm.imageUrl}
                                                                                alt="Project banner preview"
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => {
                                                                                    const target = e.target as HTMLImageElement;
                                                                                    target.style.display = 'none';
                                                                                    const nextElement = target.nextSibling as HTMLElement;
                                                                                    if (nextElement) {
                                                                                        nextElement.style.display = 'flex';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div className="hidden w-full h-full bg-[#111] border border-[#333] rounded-lg items-center justify-center text-gray-400">
                                                                                <div className="text-center">
                                                                                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                                                                    <p className="text-sm">Invalid image URL</p>
                                                                                    <p className="text-xs text-gray-500 mt-1">Make sure you're using the direct link from imgbb.com</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => setTeamupForm({ ...teamupForm, imageUrl: '' })}
                                                                            className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* No Image State */}
                                                                {!teamupForm.imageUrl && (
                                                                    <div className="w-full h-40 bg-[#111] border border-[#333] border-dashed rounded-lg flex items-center justify-center">
                                                                        <div className="text-center text-gray-400">
                                                                            <ImageIcon className="w-12 h-12 mx-auto mb-3" />
                                                                            <p className="text-sm">Add a project banner or logo</p>
                                                                            <p className="text-xs text-gray-500 mt-1">Upload to imgbb.com and paste the direct link above</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <p className="text-gray-500 text-xs">
                                                                    Upload your image to{' '}
                                                                    <a
                                                                        href="https://imgbb.com/"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:text-blue-300 underline transition-colors"
                                                                    >
                                                                        imgbb.com
                                                                    </a>{' '}
                                                                    and use the "Direct link" (not the share link). Supported formats: PNG, JPG, GIF.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Team Requirements */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h2 className="text-white text-xl font-semibold">Team Requirements</h2>
                                                        <button
                                                            onClick={() => setTeamupForm({
                                                                ...teamupForm,
                                                                teamSlots: [...teamupForm.teamSlots, { role: "", count: 1, filled: 0 }]
                                                            })}
                                                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            Add Role
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {teamupForm.teamSlots.map((slot, index) => (
                                                            <div key={index} className="flex items-center gap-3 p-3 bg-[#111] rounded-lg">
                                                                <input
                                                                    type="text"
                                                                    value={slot.role}
                                                                    onChange={(e) => {
                                                                        const newSlots = [...teamupForm.teamSlots];
                                                                        newSlots[index].role = e.target.value;
                                                                        setTeamupForm({ ...teamupForm, teamSlots: newSlots });
                                                                    }}
                                                                    placeholder="Role (e.g., Frontend Developer)"
                                                                    className="flex-1 bg-[#222] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={slot.count}
                                                                    onChange={(e) => {
                                                                        const newSlots = [...teamupForm.teamSlots];
                                                                        newSlots[index].count = parseInt(e.target.value) || 1;
                                                                        setTeamupForm({ ...teamupForm, teamSlots: newSlots });
                                                                    }}
                                                                    min="1"
                                                                    className="w-20 bg-[#222] border border-[#333] rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const newSlots = teamupForm.teamSlots.filter((_, i) => i !== index);
                                                                        setTeamupForm({ ...teamupForm, teamSlots: newSlots });
                                                                    }}
                                                                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Additional Info */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                    <h2 className="text-white text-xl font-semibold mb-4">Additional Information</h2>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Requirements & Skills
                                                            </label>
                                                            <textarea
                                                                value={teamupForm.requirements}
                                                                onChange={(e) => setTeamupForm({ ...teamupForm, requirements: e.target.value })}
                                                                placeholder="What skills and experience are you looking for in team members?"
                                                                rows={3}
                                                                className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                                                Contact Information
                                                            </label>
                                                            <div className="space-y-3">
                                                                {teamupForm.contactInfo.map((contact, index) => (
                                                                    <div key={index} className="flex items-center gap-3 p-3 bg-[#111] rounded-lg">
                                                                        <select
                                                                            value={contact.title}
                                                                            onChange={(e) => {
                                                                                const newContacts = [...teamupForm.contactInfo];
                                                                                newContacts[index].title = e.target.value;
                                                                                setTeamupForm({ ...teamupForm, contactInfo: newContacts });
                                                                            }}
                                                                            className="w-32 bg-[#222] border border-[#333] rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                                        >
                                                                            <option value="Discord">Discord</option>
                                                                            <option value="Email">Email</option>
                                                                            <option value="LinkedIn">LinkedIn</option>
                                                                            <option value="Twitter">Twitter</option>
                                                                            <option value="GitHub">GitHub</option>
                                                                            <option value="Telegram">Telegram</option>
                                                                            <option value="WhatsApp">WhatsApp</option>
                                                                            <option value="Slack">Slack</option>
                                                                            <option value="Website">Website</option>
                                                                            <option value="Other">Other</option>
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            value={contact.value}
                                                                            onChange={(e) => {
                                                                                const newContacts = [...teamupForm.contactInfo];
                                                                                newContacts[index].value = e.target.value;
                                                                                setTeamupForm({ ...teamupForm, contactInfo: newContacts });
                                                                            }}
                                                                            placeholder={`Enter your ${contact.title.toLowerCase()} handle/link`}
                                                                            className="flex-1 bg-[#222] border border-[#333] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const newContacts = teamupForm.contactInfo.filter((_, i) => i !== index);
                                                                                setTeamupForm({ ...teamupForm, contactInfo: newContacts });
                                                                            }}
                                                                            disabled={teamupForm.contactInfo.length === 1}
                                                                            className="p-2 text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                <button
                                                                    onClick={() => setTeamupForm({
                                                                        ...teamupForm,
                                                                        contactInfo: [...teamupForm.contactInfo, { title: "Discord", value: "" }]
                                                                    })}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                    Add Contact Method
                                                                </button>

                                                                <p className="text-gray-500 text-xs">
                                                                    Add multiple ways for team members to contact you. At least one contact method is required.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sidebar */}
                                            <div className="col-span-4 space-y-6">
                                                {/* Actions */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                    <h2 className="text-white text-xl font-semibold mb-4">Actions</h2>
                                                    <div className="space-y-3">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    console.log('Creating TeamUp post:', teamupForm);

                                                                    if (session?.user?.email) {
                                                                        // First sync user
                                                                        await syncUserWithSupabase({
                                                                            email: session.user.email,
                                                                            name: session.user.name || undefined,
                                                                            image: session.user.image || undefined,
                                                                            githubUsername: session.user.name || undefined
                                                                        });

                                                                        // Import createTeamupPost API
                                                                        const { createTeamupPost } = await import('@/lib/teamupApiNextAuth');

                                                                        // Create the teamup post
                                                                        await createTeamupPost(
                                                                            teamupForm,
                                                                            session.user.email,
                                                                            session.user.name || undefined,
                                                                            session.user.image || undefined
                                                                        );

                                                                        // Refresh the posts
                                                                        refreshTeamups();
                                                                        refreshUserPosts(); // Also refresh user's own projects

                                                                        // Reset form
                                                                        setTeamupForm({
                                                                            title: "",
                                                                            description: "",
                                                                            techStack: "",
                                                                            goal: "",
                                                                            timeline: "",
                                                                            category: "startup",
                                                                            teamSlots: [
                                                                                { role: "Developer", count: 1, filled: 0 },
                                                                                { role: "Designer", count: 1, filled: 0 }
                                                                            ],
                                                                            contactInfo: [
                                                                                { title: "Discord", value: "" }
                                                                            ],
                                                                            requirements: "",
                                                                            imageUrl: ""
                                                                        });

                                                                        setShowCreateTeamupForm(false);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error creating TeamUp post:', error);
                                                                }
                                                            }}
                                                            disabled={!teamupForm.title.trim() || !teamupForm.description.trim()}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                            Publish Post
                                                        </button>

                                                        <button
                                                            onClick={() => setShowCreateTeamupForm(false)}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                                        >
                                                            <ArrowLeft className="w-4 h-4" />
                                                            Back to Dashboard
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Preview */}
                                                <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                                                    <h2 className="text-white text-xl font-semibold mb-4">Preview</h2>
                                                    <div className="text-sm text-gray-400 space-y-2">
                                                        <div><strong>Title:</strong> {teamupForm.title || 'Not set'}</div>
                                                        <div><strong>Category:</strong> {teamupForm.category}</div>
                                                        <div><strong>Timeline:</strong> {teamupForm.timeline || 'Not set'}</div>
                                                        <div><strong>Team Slots:</strong> {teamupForm.teamSlots.length}</div>
                                                        <div><strong>Contact Methods:</strong> {teamupForm.contactInfo.filter(c => c.value.trim()).length}</div>
                                                        {teamupForm.imageUrl && <div><strong>Banner:</strong> Added</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Learning Docs Create Section - Hidden for now */}
                        {/* {activeQuickCreateTab === "learning-docs" && (
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
                        )} */}

                        {activeQuickCreateTab === "project-publish" && (
                            <div className="h-full w-full bg-black animate-in fade-in slide-in-from-right-4 duration-500">
                                <ProjectPublishForm />
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

            {/* Application Form Modal */}
            {showApplicationForm && selectedTeamup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-white text-2xl font-bold">Apply to Join Team</h2>
                            <button
                                onClick={() => {
                                    setShowApplicationForm(false);
                                    setSelectedTeamup(null);
                                    setApplicationForm({
                                        role: "",
                                        experience: "",
                                        portfolio: "",
                                        motivation: "",
                                        availability: ""
                                    });
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Project Info */}
                        <div className="bg-[#111] rounded-lg border border-[#333] p-4 mb-6">
                            <h3 className="text-white text-lg font-semibold mb-2">{selectedTeamup.title}</h3>
                            <p className="text-gray-300 text-sm mb-3">{selectedTeamup.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded capitalize">
                                    {selectedTeamup.category}
                                </span>
                                {selectedTeamup.timeline && (
                                    <span className="text-gray-400">Timeline: {selectedTeamup.timeline}</span>
                                )}
                            </div>
                        </div>

                        {/* Application Form */}
                        <div className="space-y-4">
                            {/* Role Selection */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Role you're applying for *
                                </label>
                                <select
                                    value={applicationForm.role}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, role: e.target.value })}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                    required
                                >
                                    <option value="">Select a role</option>
                                    {selectedTeamup.team_slots?.map((slot: any, index: number) => (
                                        <option key={index} value={slot.role} disabled={slot.filled >= slot.count}>
                                            {slot.role} ({slot.filled}/{slot.count} filled)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Your Experience *
                                </label>
                                <textarea
                                    value={applicationForm.experience}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, experience: e.target.value })}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                                    rows={4}
                                    placeholder="Describe your relevant experience, skills, and background..."
                                    required
                                />
                            </div>

                            {/* Portfolio */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Portfolio/Work Samples
                                </label>
                                <input
                                    type="url"
                                    value={applicationForm.portfolio}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, portfolio: e.target.value })}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="https://github.com/yourusername or portfolio URL"
                                />
                            </div>

                            {/* Motivation */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Why do you want to join this project? *
                                </label>
                                <textarea
                                    value={applicationForm.motivation}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, motivation: e.target.value })}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                                    rows={3}
                                    placeholder="What interests you about this project? How can you contribute?"
                                    required
                                />
                            </div>

                            {/* Availability */}
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Availability *
                                </label>
                                <input
                                    type="text"
                                    value={applicationForm.availability}
                                    onChange={(e) => setApplicationForm({ ...applicationForm, availability: e.target.value })}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="e.g., 10-15 hours per week, weekends only, flexible"
                                    required
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={async () => {
                                    try {
                                        if (!applicationForm.role || !applicationForm.experience || !applicationForm.motivation || !applicationForm.availability) {
                                            alert('Please fill in all required fields');
                                            return;
                                        }

                                        if (session?.user?.email) {
                                            // Import the API function
                                            const { createApplication } = await import('@/lib/teamupApiNextAuth');

                                            // Create application
                                            await createApplication({
                                                teamupPostId: selectedTeamup.id,
                                                role: applicationForm.role,
                                                experience: applicationForm.experience,
                                                portfolio: applicationForm.portfolio,
                                                motivation: applicationForm.motivation,
                                                availability: applicationForm.availability
                                            }, session.user.email, session.user.name || undefined, session.user.image || undefined);

                                            // Reset form and close modal
                                            setApplicationForm({
                                                role: "",
                                                experience: "",
                                                portfolio: "",
                                                motivation: "",
                                                availability: ""
                                            });
                                            setShowApplicationForm(false);
                                            setSelectedTeamup(null);

                                            alert('Application submitted successfully!');
                                        }
                                    } catch (error) {
                                        console.error('Error submitting application:', error);
                                        alert('Error submitting application. Please try again.');
                                    }
                                }}
                                disabled={!applicationForm.role || !applicationForm.experience || !applicationForm.motivation || !applicationForm.availability}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                            >
                                <Send className="w-4 h-4" />
                                Submit Application
                            </button>
                            <button
                                onClick={() => {
                                    setShowApplicationForm(false);
                                    setSelectedTeamup(null);
                                    setApplicationForm({
                                        role: "",
                                        experience: "",
                                        portfolio: "",
                                        motivation: "",
                                        availability: ""
                                    });
                                }}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit TeamUp Form Modal */}
            {showEditForm && editingTeamup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-white text-2xl font-bold">Edit TeamUp Post</h2>
                            <button
                                onClick={() => {
                                    setShowEditForm(false);
                                    setEditingTeamup(null);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Edit Form */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingTeamup?.title || ''}
                                        onChange={(e) => setEditingTeamup({ ...editingTeamup, title: e.target.value })}
                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="Project title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={editingTeamup?.description || ''}
                                        onChange={(e) => setEditingTeamup({ ...editingTeamup, description: e.target.value })}
                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                                        rows={4}
                                        placeholder="Describe your project..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={editingTeamup?.category || 'startup'}
                                            onChange={(e) => setEditingTeamup({ ...editingTeamup, category: e.target.value })}
                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="startup">Startup</option>
                                            <option value="hackathon">Hackathon</option>
                                            <option value="open-source">Open Source</option>
                                            <option value="learning">Learning Project</option>
                                            <option value="competition">Competition</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-2">
                                            Timeline
                                        </label>
                                        <input
                                            type="text"
                                            value={editingTeamup?.timeline || ''}
                                            onChange={(e) => setEditingTeamup({ ...editingTeamup, timeline: e.target.value })}
                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                            placeholder="e.g., 3 months"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Tech Stack
                                    </label>
                                    <input
                                        type="text"
                                        value={editingTeamup?.tech_stack || ''}
                                        onChange={(e) => setEditingTeamup({ ...editingTeamup, tech_stack: e.target.value })}
                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g., React, Node.js, MongoDB"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Goal
                                    </label>
                                    <textarea
                                        value={editingTeamup?.goal || ''}
                                        onChange={(e) => setEditingTeamup({ ...editingTeamup, goal: e.target.value })}
                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                                        rows={3}
                                        placeholder="What's the main goal of this project?"
                                    />
                                </div>
                            </div>

                            {/* Right Column - Banner & Additional Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Banner Image URL
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="url"
                                            value={editingTeamup?.image_url || ''}
                                            onChange={(e) => setEditingTeamup({ ...editingTeamup, image_url: e.target.value })}
                                            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                            placeholder="https://example.com/banner.jpg"
                                        />

                                        {/* Image Preview */}
                                        {editingTeamup?.image_url && (
                                            <div className="relative">
                                                <img
                                                    src={editingTeamup.image_url}
                                                    alt="Banner preview"
                                                    className="w-full h-32 object-cover rounded-lg border border-[#333]"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => setEditingTeamup({ ...editingTeamup, image_url: '' })}
                                                    className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        )}

                                        {!editingTeamup?.image_url && (
                                            <div className="border-2 border-dashed border-[#333] rounded-lg p-6 text-center">
                                                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-400 text-sm">Add a banner image to make your project stand out</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-300 text-sm font-medium mb-2">
                                        Requirements
                                    </label>
                                    <textarea
                                        value={editingTeamup?.requirements || ''}
                                        onChange={(e) => setEditingTeamup({ ...editingTeamup, requirements: e.target.value })}
                                        className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                                        rows={4}
                                        placeholder="What skills or experience are you looking for?"
                                    />
                                </div>

                                {/* Active/Inactive Toggle */}
                                <div>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={editingTeamup?.is_active !== false}
                                            onChange={(e) => setEditingTeamup({ ...editingTeamup, is_active: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 bg-[#111] border-[#333] rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="text-gray-300 text-sm">
                                            Project is active and accepting applications
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={async () => {
                                    try {
                                        if (!editingTeamup.title || !editingTeamup.description) {
                                            alert('Please fill in required fields');
                                            return;
                                        }

                                        if (session?.user?.email) {
                                            // Import the API function
                                            const { updateTeamupPost } = await import('@/lib/teamupApiNextAuth');

                                            // Update the post
                                            await updateTeamupPost(editingTeamup.id, {
                                                title: editingTeamup.title,
                                                description: editingTeamup.description,
                                                category: editingTeamup.category,
                                                timeline: editingTeamup.timeline,
                                                techStack: editingTeamup.tech_stack,
                                                goal: editingTeamup.goal,
                                                requirements: editingTeamup.requirements,
                                                imageUrl: editingTeamup.image_url,
                                                teamSlots: editingTeamup.team_slots || [],
                                                contactInfo: []
                                            }, session.user.email);

                                            // Refresh the posts
                                            refreshTeamups();
                                            refreshUserPosts();

                                            // Close the modal
                                            setShowEditForm(false);
                                            setEditingTeamup(null);

                                            alert('Project updated successfully!');
                                        }
                                    } catch (error) {
                                        console.error('Error updating project:', error);
                                        alert('Error updating project. Please try again.');
                                    }
                                }}
                                disabled={!editingTeamup?.title || !editingTeamup?.description}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                            >
                                <Save className="w-4 h-4" />
                                Update Project
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditForm(false);
                                    setEditingTeamup(null);
                                }}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Applications Modal */}
            {showProjectApplications && selectedProjectForApplications && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-white text-2xl font-bold">Applications for "{selectedProjectForApplications.title}"</h2>
                                <p className="text-gray-400">Manage applications from potential team members</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowProjectApplications(false);
                                    setSelectedProjectForApplications(null);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Applications List */}
                        {isLoadingProjectApplications ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="bg-[#111] rounded-lg border border-[#333] p-4 animate-pulse">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#333] rounded-full"></div>
                                                <div>
                                                    <div className="h-4 bg-[#333] rounded w-32 mb-1"></div>
                                                    <div className="h-3 bg-[#333] rounded w-24"></div>
                                                </div>
                                            </div>
                                            <div className="h-6 bg-[#333] rounded w-20"></div>
                                        </div>
                                        <div className="h-3 bg-[#333] rounded w-full mb-2"></div>
                                        <div className="h-3 bg-[#333] rounded w-3/4"></div>
                                    </div>
                                ))}
                            </div>
                        ) : projectApplicationsError ? (
                            <div className="text-center py-8">
                                <div className="text-red-400 mb-4">
                                    <X className="w-12 h-12 mx-auto mb-2" />
                                    Error loading applications
                                </div>
                                <button
                                    onClick={refreshProjectApplications}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : projectApplications.length > 0 ? (
                            <div className="space-y-4">
                                {projectApplications.map((application: any) => {
                                    const statusColors = {
                                        pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-600/30' },
                                        accepted: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-600/30' },
                                        rejected: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-600/30' }
                                    };
                                    const statusStyle = statusColors[application.status as keyof typeof statusColors] || statusColors.pending;

                                    return (
                                        <div key={application.id} className="bg-[#111] rounded-lg border border-[#333] p-4">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    {application.applicant?.avatar_url ? (
                                                        <img
                                                            src={application.applicant.avatar_url}
                                                            alt={application.applicant.display_name || 'Applicant'}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                                            <User className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="text-white font-medium">
                                                            {application.applicant?.display_name || 'Anonymous'}
                                                        </h4>
                                                        <p className="text-gray-400 text-sm">
                                                            Applied for: {application.role}
                                                        </p>
                                                        <p className="text-gray-500 text-xs">
                                                            {new Date(application.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                                                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <h5 className="text-gray-300 text-sm font-medium mb-2">Experience</h5>
                                                    <p className="text-gray-400 text-sm">{application.experience || 'Not provided'}</p>
                                                </div>
                                                <div>
                                                    <h5 className="text-gray-300 text-sm font-medium mb-2">Availability</h5>
                                                    <p className="text-gray-400 text-sm">{application.availability || 'Not provided'}</p>
                                                </div>
                                                <div>
                                                    <h5 className="text-gray-300 text-sm font-medium mb-2">Motivation</h5>
                                                    <p className="text-gray-400 text-sm">{application.motivation || 'Not provided'}</p>
                                                </div>
                                                {application.portfolio && (
                                                    <div>
                                                        <h5 className="text-gray-300 text-sm font-medium mb-2">Portfolio</h5>
                                                        <a
                                                            href={application.portfolio}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 text-sm underline"
                                                        >
                                                            View Portfolio
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {application.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await updateApplicationStatus(application.id, 'accepted');
                                                                refreshProjectApplications();
                                                            } catch (error) {
                                                                console.error('Error accepting application:', error);
                                                                alert('Error accepting application');
                                                            }
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await updateApplicationStatus(application.id, 'rejected');
                                                                refreshProjectApplications();
                                                            } catch (error) {
                                                                console.error('Error rejecting application:', error);
                                                                alert('Error rejecting application');
                                                            }
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <UserCheck className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                <h3 className="text-white text-lg font-medium mb-2">No Applications Yet</h3>
                                <p className="text-gray-400">When people apply to join your project, they'll appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Project Detail Modal */}
            <ProjectDetailModal
                project={selectedProjectForDetail}
                isOpen={isProjectDetailModalOpen}
                onClose={handleCloseProjectDetail}
            />
        </div>
    );
}

// Project Expo Section Component
const ProjectExpoSection = ({ onProjectClick }: { onProjectClick: (project: Project) => void }) => {
    const [activeView, setActiveView] = useState<'grid' | 'list'>('grid')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'created_at' | 'likes_count' | 'views_count'>('created_at')

    const categories = useProjectCategories()
    const { projects: featuredProjects } = useFeaturedProjects(3)
    const { projects, loading, error } = useProjects({
        category: selectedCategory,
        search: searchQuery,
        sortBy,
        limit: 12
    })

    return (
        <div className="h-full flex flex-col bg-black">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#333]">
                <div>
                    <h1 className="text-white text-2xl font-bold mb-1">Project Expo</h1>
                    <p className="text-gray-400">Discover amazing projects from the community</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-[#1a1a1a] rounded-lg border border-[#333]">
                        <button
                            onClick={() => setActiveView('grid')}
                            className={`p-2 ${activeView === 'grid' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setActiveView('list')}
                            className={`p-2 ${activeView === 'list' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-[#0a0a0a] border-r border-[#333] p-4 overflow-y-auto">
                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="mb-6">
                        <h3 className="text-white font-medium mb-3">Categories</h3>
                        <div className="space-y-1">
                            {categories.map((category) => (
                                <button
                                    key={category.value}
                                    onClick={() => setSelectedCategory(category.value)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === category.value
                                        ? 'bg-[#333] text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                                        }`}
                                >
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                        <h3 className="text-white font-medium mb-3">Sort By</h3>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="created_at">Latest</option>
                            <option value="likes_count">Most Liked</option>
                            <option value="views_count">Most Viewed</option>
                        </select>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        {/* Featured Projects */}
                        {featuredProjects.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    Featured Projects
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {featuredProjects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            featured
                                            onClick={onProjectClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Projects */}
                        <div className="mb-4">
                            <h2 className="text-white text-xl font-bold">All Projects</h2>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="bg-[#1a1a1a] rounded-lg border border-[#333] p-6 animate-pulse">
                                        <div className="h-40 bg-[#333] rounded mb-4"></div>
                                        <div className="h-4 bg-[#333] rounded mb-2"></div>
                                        <div className="h-3 bg-[#333] rounded mb-3"></div>
                                        <div className="flex gap-2 mb-3">
                                            <div className="h-6 w-16 bg-[#333] rounded"></div>
                                            <div className="h-6 w-20 bg-[#333] rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <div className="text-red-400 mb-2">Error loading projects</div>
                                <div className="text-gray-500 text-sm">{error}</div>
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="text-center py-12">
                                <Presentation className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                <h3 className="text-white text-lg font-medium mb-2">No Projects Found</h3>
                                <p className="text-gray-400">Try adjusting your search or category filters.</p>
                            </div>
                        ) : (
                            <div className={activeView === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                : "space-y-4"
                            }>
                                {projects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        listView={activeView === 'list'}
                                        onClick={onProjectClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Project Detail Modal Component
const ProjectDetailModal = ({ project, isOpen, onClose }: {
    project: Project | null,
    isOpen: boolean,
    onClose: () => void
}) => {
    const { likeProject } = useProjectInteractions()
    const [isLiked, setIsLiked] = useState(false)
    const [likesCount, setLikesCount] = useState<number>(project?.likes_count || 0)

    const handleLike = async () => {
        if (!project) return
        try {
            const liked = await likeProject(project.id)
            setIsLiked(liked)
            setLikesCount((prev: number) => liked ? prev + 1 : prev - 1)
        } catch (error) {
            console.error('Error liking project:', error)
        }
    }

    if (!project) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-[#0d0d0d] border-[#333]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side - Project Image */}
                    <div className="space-y-4">
                        <div className="aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden">
                            {project.thumbnail_url ? (
                                <img
                                    src={project.thumbnail_url}
                                    alt={project.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Code className="w-16 h-16 text-gray-500" />
                                </div>
                            )}
                        </div>

                        {/* Additional Images */}
                        {project.images && project.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {project.images.slice(0, 4).map((image: string, index: number) => (
                                    <div key={index} className="aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden">
                                        <img
                                            src={image}
                                            alt={`${project.title} screenshot ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right side - Project Details */}
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-2xl text-white">{project.title}</DialogTitle>
                        </DialogHeader>

                        {/* Stats & Actions */}
                        <div className="flex items-center justify-between border-b border-[#333] pb-4">
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {project.views_count || 0} views
                                </span>
                                <span className="flex items-center gap-1">
                                    <Heart className="w-4 h-4" />
                                    {likesCount} likes
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {project.github_url && (
                                    <a
                                        href={project.github_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#333] text-gray-300 rounded-lg transition-colors"
                                    >
                                        <Github className="w-4 h-4" />
                                        GitHub
                                    </a>
                                )}
                                {project.live_demo_url && (
                                    <a
                                        href={project.live_demo_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Live Demo
                                    </a>
                                )}
                                <button
                                    onClick={handleLike}
                                    className={`p-2 rounded-lg transition-colors ${isLiked
                                        ? 'text-red-400 hover:text-red-300'
                                        : 'text-gray-400 hover:text-red-400'
                                        }`}
                                >
                                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-[#333] text-gray-300 text-sm rounded-full">
                                {project.category}
                            </span>
                            <span className={`px-3 py-1 text-sm rounded-full ${project.status === 'published' ? 'bg-green-900 text-green-300' :
                                project.status === 'draft' ? 'bg-yellow-900 text-yellow-300' :
                                    'bg-gray-600 text-gray-300'
                                }`}>
                                {project.status}
                            </span>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            {project.short_description && (
                                <p className="text-gray-300 text-lg">
                                    {project.short_description}
                                </p>
                            )}
                            <div className="text-gray-400 space-y-2">
                                {project.description.split('\n').map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                            </div>
                        </div>

                        {/* Tech Stack */}
                        {project.tech_stack && project.tech_stack.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-white font-medium">Tech Stack</h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.tech_stack.map((tech: string, index: number) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-[#333] text-gray-300 text-sm rounded-full"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Features */}
                        {project.features && project.features.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-white font-medium">Features</h4>
                                <ul className="space-y-1 text-gray-400">
                                    {project.features.map((feature: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-green-400 mt-1">•</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Tags */}
                        {project.tags && project.tags.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-white font-medium">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag: any, index: number) => (
                                        <span
                                            key={index}
                                            className="px-2 py-1 bg-[#1a1a1a] text-gray-400 text-xs rounded border border-[#333]"
                                        >
                                            #{typeof tag === 'string' ? tag : tag.tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Author */}
                        <div className="flex items-center gap-3 pt-4 border-t border-[#333]">
                            <div className="w-10 h-10 bg-[#333] rounded-full flex items-center justify-center">
                                {project.user?.avatar_url ? (
                                    <img
                                        src={project.user.avatar_url}
                                        alt={project.user.display_name}
                                        className="w-full h-full rounded-full"
                                    />
                                ) : (
                                    <User className="w-5 h-5 text-gray-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-white font-medium">
                                    {project.user?.display_name || 'Anonymous'}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Published {new Date(project.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Documentation Link */}
                        {project.documentation_url && (
                            <a
                                href={project.documentation_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-[#1a1a1a] hover:bg-[#333] text-gray-300 rounded-lg transition-colors border border-[#333]"
                            >
                                <BookOpen className="w-4 h-4" />
                                View Documentation
                                <ExternalLink className="w-3 h-3 ml-auto" />
                            </a>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Project Card Component
const ProjectCard = ({ project, featured = false, listView = false, onClick }: {
    project: Project,
    featured?: boolean,
    listView?: boolean,
    onClick?: (project: Project) => void
}) => {
    const { likeProject } = useProjectInteractions()
    const [isLiked, setIsLiked] = useState(false)
    const [likesCount, setLikesCount] = useState<number>(project.likes_count || 0)

    const handleLike = async () => {
        try {
            const liked = await likeProject(project.id)
            setIsLiked(liked)
            setLikesCount((prev: number) => liked ? prev + 1 : prev - 1)
        } catch (error) {
            console.error('Error liking project:', error)
        }
    }

    if (listView) {
        return (
            <div
                className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 hover:border-[#404040] transition-all cursor-pointer"
                onClick={() => onClick?.(project)}
            >
                <div className="flex gap-4">
                    <div className="w-24 h-24 bg-[#333] rounded-lg flex-shrink-0">
                        {project.thumbnail_url ? (
                            <img
                                src={project.thumbnail_url}
                                alt={project.title}
                                className="w-full h-full object-cover rounded-lg"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Code className="w-8 h-8 text-gray-500" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-white font-medium mb-1">{project.title}</h3>
                                <p className="text-gray-400 text-sm mb-2 line-clamp-2">{project.short_description || project.description}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        {project.views_count || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-3 h-3" />
                                        {likesCount}
                                    </span>
                                    <span>{project.user?.display_name || 'Anonymous'}</span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike();
                                }}
                                className={`p-2 rounded-lg transition-colors ${isLiked
                                    ? 'text-red-400 hover:text-red-300'
                                    : 'text-gray-400 hover:text-red-400'
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={`bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden hover:border-[#404040] transition-all cursor-pointer ${featured ? 'ring-2 ring-yellow-500/20' : ''}`}
            onClick={() => onClick?.(project)}
        >
            {/* Project Image */}
            <div className="h-40 bg-[#333] relative">
                {project.thumbnail_url ? (
                    <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Code className="w-12 h-12 text-gray-500" />
                    </div>
                )}
                {featured && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-medium">
                        Featured
                    </div>
                )}
            </div>

            <div className="p-4">
                {/* Title & Description */}
                <h3 className="text-white font-medium mb-2">{project.title}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {project.short_description || project.description}
                </p>

                {/* Tech Stack */}
                {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {project.tech_stack.slice(0, 3).map((tech: string, index: number) => (
                            <span
                                key={index}
                                className="px-2 py-1 bg-[#333] text-gray-300 text-xs rounded"
                            >
                                {tech}
                            </span>
                        ))}
                        {project.tech_stack.length > 3 && (
                            <span className="px-2 py-1 bg-[#333] text-gray-500 text-xs rounded">
                                +{project.tech_stack.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Stats & Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {project.views_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {likesCount}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {project.github_url && (
                            <a
                                href={project.github_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Github className="w-4 h-4" />
                            </a>
                        )}
                        {project.live_demo_url && (
                            <a
                                href={project.live_demo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike();
                            }}
                            className={`p-1 transition-colors ${isLiked
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-gray-400 hover:text-red-400'
                                }`}
                        >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#333]">
                    <div className="w-6 h-6 bg-[#333] rounded-full flex items-center justify-center">
                        {project.user?.avatar_url ? (
                            <img
                                src={project.user.avatar_url}
                                alt={project.user.display_name}
                                className="w-full h-full rounded-full"
                            />
                        ) : (
                            <User className="w-3 h-3 text-gray-500" />
                        )}
                    </div>
                    <span className="text-gray-400 text-xs">
                        {project.user?.display_name || 'Anonymous'}
                    </span>
                </div>
            </div>
        </div>
    )
}

// Project Publish Form Component
const ProjectPublishForm = () => {
    const { createProject, updateProject, deleteProject, loading, error } = useProjectManager()
    const { projects: userProjects, loading: projectsLoading, refetch: refetchProjects } = useUserProjects()
    const categories = useProjectCategories()
    const [viewMode, setViewMode] = useState<'form' | 'preview' | 'manage'>('form')
    const [editingProject, setEditingProject] = useState<any>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        short_description: '',
        category: 'web-app',
        tech_stack: [] as string[],
        github_url: '',
        live_demo_url: '',
        documentation_url: '',
        thumbnail_url: '',
        features: [] as string[],
        tags: [] as string[],
        status: 'published' as 'draft' | 'published'
    })

    const [techInput, setTechInput] = useState('')
    const [featureInput, setFeatureInput] = useState('')
    const [tagInput, setTagInput] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title.trim() || !formData.description.trim()) {
            alert('Please fill in the required fields')
            return
        }

        try {
            if (editingProject) {
                // Update existing project
                await updateProject(editingProject.id, formData)
                alert('Project updated successfully!')
                setEditingProject(null)
            } else {
                // Create new project
                await createProject(formData)
                alert('Project published successfully!')
            }

            // Reset form and refresh projects
            setFormData({
                title: '',
                description: '',
                short_description: '',
                category: 'web-app',
                tech_stack: [],
                github_url: '',
                live_demo_url: '',
                documentation_url: '',
                thumbnail_url: '',
                features: [],
                tags: [],
                status: 'published'
            })
            refetchProjects()
            setViewMode('manage')
        } catch (err) {
            console.error('Error with project:', err)
        }
    }

    const handleEdit = (project: any) => {
        setEditingProject(project)
        setFormData({
            title: project.title || '',
            description: project.description || '',
            short_description: project.short_description || '',
            category: project.category || 'web-app',
            tech_stack: project.tech_stack || [],
            github_url: project.github_url || '',
            live_demo_url: project.live_demo_url || '',
            documentation_url: project.documentation_url || '',
            thumbnail_url: project.thumbnail_url || '',
            features: project.features || [],
            tags: project.tags?.map((t: any) => t.tag) || [],
            status: project.status || 'published'
        })
        setViewMode('form')
    }

    const handleDelete = async (projectId: string) => {
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                await deleteProject(projectId)
                alert('Project deleted successfully!')
                refetchProjects()
            } catch (err) {
                console.error('Error deleting project:', err)
            }
        }
    }

    const handleNewProject = () => {
        setEditingProject(null)
        setFormData({
            title: '',
            description: '',
            short_description: '',
            category: 'web-app',
            tech_stack: [],
            github_url: '',
            live_demo_url: '',
            documentation_url: '',
            thumbnail_url: '',
            features: [],
            tags: [],
            status: 'published'
        })
        setViewMode('form')
    }

    const addTech = () => {
        if (techInput.trim() && !formData.tech_stack.includes(techInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tech_stack: [...prev.tech_stack, techInput.trim()]
            }))
            setTechInput('')
        }
    }

    const removeTech = (tech: string) => {
        setFormData(prev => ({
            ...prev,
            tech_stack: prev.tech_stack.filter(t => t !== tech)
        }))
    }

    const addFeature = () => {
        if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
            setFormData(prev => ({
                ...prev,
                features: [...prev.features, featureInput.trim()]
            }))
            setFeatureInput('')
        }
    }

    const removeFeature = (feature: string) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter(f => f !== feature)
        }))
    }

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim().toLowerCase())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim().toLowerCase()]
            }))
            setTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag)
        }))
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#333]">
                <div>
                    <h1 className="text-white text-2xl font-bold mb-1">Publish Project</h1>
                    <p className="text-gray-400">Share your amazing project with the community</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">View:</span>
                        <div className="relative bg-[#1a1a1a] rounded-lg border border-[#333] p-1 flex">
                            <button
                                type="button"
                                onClick={() => setViewMode('form')}
                                className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${viewMode === 'form'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Edit className="w-4 h-4 inline mr-1" />
                                {editingProject ? 'Edit' : 'New'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${viewMode === 'preview'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Eye className="w-4 h-4 inline mr-1" />
                                Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('manage')}
                                className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${viewMode === 'manage'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4 inline mr-1" />
                                My Projects
                            </button>
                        </div>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${formData.status === 'draft'
                                ? 'bg-gray-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]'
                                }`}
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, status: 'published' }))}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${formData.status === 'published'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]'
                                }`}
                        >
                            Publish Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {viewMode === 'form' ? (
                    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                        {/* Basic Information */}
                        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                            <h2 className="text-white text-lg font-medium mb-4">Basic Information</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="lg:col-span-2">
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Project Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Enter your project title"
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    >
                                        {categories.filter(cat => cat.value !== 'all').map((category) => (
                                            <option key={category.value} value={category.value}>
                                                {category.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Thumbnail URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.thumbnail_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Short Description
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.short_description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                                        placeholder="A brief one-line description"
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Full Description *
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe your project in detail..."
                                        rows={4}
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Links */}
                        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                            <h2 className="text-white text-lg font-medium mb-4">Project Links</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">
                                        GitHub Repository
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.github_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                                        placeholder="https://github.com/username/repo"
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Live Demo
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.live_demo_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, live_demo_url: e.target.value }))}
                                        placeholder="https://yourproject.com"
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Documentation
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.documentation_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, documentation_url: e.target.value }))}
                                        placeholder="https://docs.yourproject.com"
                                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                            <h2 className="text-white text-lg font-medium mb-4">Tech Stack</h2>

                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={techInput}
                                    onChange={(e) => setTechInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                                    placeholder="Add technology (e.g., React, Node.js)"
                                    className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={addTech}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Add
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {formData.tech_stack.map((tech) => (
                                    <span
                                        key={tech}
                                        className="flex items-center gap-1 px-3 py-1 bg-[#333] text-gray-300 text-sm rounded-lg"
                                    >
                                        {tech}
                                        <button
                                            type="button"
                                            onClick={() => removeTech(tech)}
                                            className="text-gray-400 hover:text-red-400"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-3 pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {formData.status === 'draft' ? 'Save Draft' : 'Publish Project'}
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <div className="text-red-400 text-sm">{error}</div>
                            </div>
                        )}
                    </form>
                ) : viewMode === 'preview' ? (
                    /* Preview Mode */
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
                            {/* Project Preview Header */}
                            <div className="relative">
                                {formData.thumbnail_url && (
                                    <img
                                        src={formData.thumbnail_url}
                                        alt={formData.title || 'Project preview'}
                                        className="w-full h-48 object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-4 left-6 right-6">
                                    <h1 className="text-white text-2xl font-bold mb-2">
                                        {formData.title || 'Project Title'}
                                    </h1>
                                    <p className="text-gray-300 text-sm">
                                        {formData.short_description || 'Short description will appear here'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Category and Tech Stack */}
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm">
                                        {categories.find(cat => cat.value === formData.category)?.label || 'Category'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {formData.tech_stack.slice(0, 3).map((tech, index) => (
                                            <span key={index} className="px-2 py-1 bg-[#333] text-gray-300 rounded text-xs">
                                                {tech}
                                            </span>
                                        ))}
                                        {formData.tech_stack.length > 3 && (
                                            <span className="px-2 py-1 bg-[#333] text-gray-400 rounded text-xs">
                                                +{formData.tech_stack.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <h2 className="text-white text-lg font-medium mb-3">Description</h2>
                                    <p className="text-gray-300 leading-relaxed">
                                        {formData.description || 'Project description will appear here...'}
                                    </p>
                                </div>

                                {/* Features */}
                                {formData.features.length > 0 && (
                                    <div className="mb-6">
                                        <h2 className="text-white text-lg font-medium mb-3">Key Features</h2>
                                        <ul className="space-y-2">
                                            {formData.features.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-2 text-gray-300">
                                                    <Star className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Links */}
                                <div className="flex flex-wrap gap-3 mb-6">
                                    {formData.github_url && (
                                        <a
                                            href={formData.github_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#404040] text-white rounded-lg transition-colors"
                                        >
                                            <Github className="w-4 h-4" />
                                            View Code
                                        </a>
                                    )}
                                    {formData.live_demo_url && (
                                        <a
                                            href={formData.live_demo_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Live Demo
                                        </a>
                                    )}
                                    {formData.documentation_url && (
                                        <a
                                            href={formData.documentation_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            Documentation
                                        </a>
                                    )}
                                </div>

                                {/* Tags */}
                                {formData.tags.length > 0 && (
                                    <div className="mb-6">
                                        <h2 className="text-white text-lg font-medium mb-3">Tags</h2>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.tags.map((tag, index) => (
                                                <span key={index} className="px-3 py-1 bg-[#333] text-gray-300 rounded-full text-sm">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Preview Actions */}
                                <div className="flex justify-between items-center pt-6 border-t border-[#333]">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('form')}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#404040] text-white rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Project
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Publishing...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                {formData.status === 'draft' ? 'Save Draft' : 'Publish Project'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                                <div className="text-red-400 text-sm">{error}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* My Projects Management */
                    <div className="max-w-6xl mx-auto">
                        {/* Header with New Project Button */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-white text-2xl font-bold mb-1">My Projects</h2>
                                <p className="text-gray-400">Manage your published projects</p>
                            </div>
                            <button
                                onClick={handleNewProject}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New Project
                            </button>
                        </div>

                        {/* Projects Grid */}
                        {projectsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
                                <span className="text-gray-400">Loading your projects...</span>
                            </div>
                        ) : userProjects.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                <h3 className="text-white text-lg font-medium mb-2">No projects yet</h3>
                                <p className="text-gray-400 mb-4">Create your first project to get started</p>
                                <button
                                    onClick={handleNewProject}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Project
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {userProjects.map((project: any) => (
                                    <div key={project.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden hover:border-[#404040] transition-all group">
                                        {/* Project Thumbnail */}
                                        <div className="relative h-40 bg-[#0a0a0a] overflow-hidden">
                                            {project.thumbnail_url ? (
                                                <img
                                                    src={project.thumbnail_url}
                                                    alt={project.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="w-12 h-12 text-gray-500" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${project.status === 'published'
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : project.status === 'draft'
                                                        ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                                                        : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Project Info */}
                                        <div className="p-4">
                                            <h3 className="text-white font-medium mb-2 line-clamp-1">{project.title}</h3>
                                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{project.short_description || project.description}</p>

                                            {/* Category and Stats */}
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                                                    {categories.find(cat => cat.value === project.category)?.label || project.category}
                                                </span>
                                                <div className="flex items-center gap-3 text-gray-400 text-xs">
                                                    <span className="flex items-center gap-1">
                                                        <Heart className="w-3 h-3" />
                                                        {project.likes_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-3 h-3" />
                                                        {project.views_count || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tech Stack */}
                                            {project.tech_stack && project.tech_stack.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-4">
                                                    {project.tech_stack.slice(0, 3).map((tech: string, index: number) => (
                                                        <span key={index} className="px-2 py-1 bg-[#333] text-gray-300 rounded text-xs">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                    {project.tech_stack.length > 3 && (
                                                        <span className="px-2 py-1 bg-[#333] text-gray-400 rounded text-xs">
                                                            +{project.tech_stack.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(project)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(project.id)}
                                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {project.live_demo_url && (
                                                    <a
                                                        href={project.live_demo_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-6">
                                <div className="text-red-400 text-sm">{error}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
