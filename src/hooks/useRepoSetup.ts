"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function useRepoSetup() {
    const { data: session, status } = useSession();
    const [repoStatus, setRepoStatus] = useState<{
        loading: boolean;
        error?: string;
        success?: boolean;
        details?: any;
    }>({ loading: false });

    useEffect(() => {
        const setupRepository = async () => {
            if (status === "authenticated" && session?.accessToken) {
                setRepoStatus({ loading: true });

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
                            console.log("✅ Created new codeer_org_data repository");
                        } else if (result.exists) {
                            console.log("✅ Repository codeer_org_data already exists");
                        }
                    } else {
                        setRepoStatus({
                            loading: false,
                            error: result.error || "Failed to setup repository",
                        });
                    }
                } catch (error) {
                    console.error("Repository setup error:", error);
                    setRepoStatus({
                        loading: false,
                        error: "Network error during repository setup",
                    });
                }
            }
        };

        // Only run once when the user is authenticated
        if (status === "authenticated" && session?.accessToken && !repoStatus.loading && !repoStatus.success) {
            setupRepository();
        }
    }, [status, session, repoStatus.loading, repoStatus.success]);

    return repoStatus;
}
