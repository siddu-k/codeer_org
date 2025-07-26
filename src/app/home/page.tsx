"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRepoSetup } from "@/hooks/useRepoSetup";

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const repoStatus = useRepoSetup();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

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
        <div className="w-full h-screen bg-black relative">
            {/* Welcome message and logout */}
            <div className="absolute top-4 right-4 flex items-center gap-4">
                <span className="text-white text-sm">
                    Welcome, {session?.user?.name || session?.user?.email}
                </span>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-all duration-200"
                >
                    Sign Out
                </button>
            </div>

            {/* Repository setup status */}
            {repoStatus.loading && (
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
                    Setting up your data repository...
                </div>
            )}

            {repoStatus.success && repoStatus.details?.created && (
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-2 rounded-lg text-sm">
                    ✅ Repository created: codeer_org_data
                </div>
            )}

            {repoStatus.success && repoStatus.details?.exists && (
                <div className="absolute top-4 left-4 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">
                    ✅ Repository ready: codeer_org_data
                </div>
            )}

            {repoStatus.error && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm">
                    ❌ Setup error: {repoStatus.error}
                </div>
            )}

            {/* Main content - blank for now */}
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h1 className="text-white text-4xl font-bold mb-4">Welcome to Codeer</h1>
                    <p className="text-gray-400">Home page - Coming soon...</p>

                    {repoStatus.success && (
                        <div className="mt-8 p-4 bg-gray-900 rounded-lg max-w-md mx-auto">
                            <h3 className="text-white font-semibold mb-2">Your Data Repository</h3>
                            <p className="text-gray-300 text-sm mb-2">
                                Repository: <code className="bg-gray-800 px-1 rounded">codeer_org_data</code>
                            </p>
                            <p className="text-gray-400 text-xs">
                                Your coding stats and problems are automatically synced to your GitHub account.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
