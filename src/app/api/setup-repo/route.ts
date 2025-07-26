import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { GitHubAPI } from "@/lib/github-api";
import { Octokit } from "octokit";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the access token from the request body
        const { accessToken } = await request.json();

        if (!accessToken) {
            return NextResponse.json({ error: "Access token required" }, { status: 400 });
        }

        // Get GitHub username from GitHub API
        const octokit = new Octokit({ auth: accessToken });
        const { data: user } = await octokit.rest.users.getAuthenticated();
        const githubUsername = user.login;

        if (!githubUsername) {
            return NextResponse.json({ error: "Unable to determine GitHub username" }, { status: 400 });
        }

        // Initialize GitHub API
        const githubAPI = new GitHubAPI(accessToken);

        // Create or ensure the repository exists
        const result = await githubAPI.ensureRepoExists(githubUsername);

        return NextResponse.json({
            success: true,
            username: githubUsername,
            repository: "codeer_org_data",
            ...result
        });

    } catch (error) {
        console.error("Error in setup-repo API:", error);
        return NextResponse.json(
            { error: "Failed to setup repository", details: error },
            { status: 500 }
        );
    }
}
