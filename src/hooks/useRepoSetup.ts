"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/components/toast-provider";

export function useRepoSetup() {
    const { data: session, status } = useSession();
    const { showToast, updateToast } = useToast();
    const [repoStatus, setRepoStatus] = useState<{
        loading: boolean;
        error?: string;
        success?: boolean;
        details?: any;
    }>({ loading: false });

    // Track if setup has been attempted to prevent duplicates
    const setupAttempted = useRef(false);

    const setupRepository = useCallback(async () => {
        if (!session?.accessToken || setupAttempted.current) return;

        setupAttempted.current = true;
        setRepoStatus({ loading: true });

        // Show loading toast
        const toastId = showToast("Setting up your data repository...", "loading");

        try {
            const response = await fetch("/api/setup-repo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    accessToken: session.accessToken,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setRepoStatus({
                    loading: false,
                    success: true,
                    details: result,
                });

                if (result.created) {
                    updateToast(toastId, "Repository created successfully! 🎉", "success");
                } else if (result.exists) {
                    updateToast(toastId, "Repository is ready and up to date ✨", "success");
                }
            } else {
                setRepoStatus({
                    loading: false,
                    error: result.error || "Failed to setup repository",
                });
                updateToast(toastId, `Setup failed: ${result.error || "Unknown error"}`, "error");
                setupAttempted.current = false; // Reset on error to allow retry
            }
        } catch (error) {
            console.error("Repository setup error:", error);
            setRepoStatus({
                loading: false,
                error: "Network error during repository setup",
            });
            updateToast(toastId, "Network error during setup", "error");
            setupAttempted.current = false; // Reset on error to allow retry
        }
    }, [session?.accessToken, showToast, updateToast]);

    useEffect(() => {
        // Only run once when the user is authenticated and setup hasn't been attempted
        if (status === "authenticated" && session?.accessToken && !repoStatus.loading && !repoStatus.success && !setupAttempted.current) {
            setupRepository();
        }
    }, [status, session?.accessToken, repoStatus.loading, repoStatus.success, setupRepository]);

    return repoStatus;
}