interface ProblemData {
    title: string;
    description: string;
    difficulty: string;
    category: string;
    inputFormat: string;
    outputFormat: string;
    constraints: string;
    examples: Array<{
        input: string;
        output: string;
        explanation: string;
    }>;
    tags: string;
    finalAnswer: string;
}

export async function saveProblemToGitHub(problemData: ProblemData, accessToken: string): Promise<boolean> {
    try {
        console.log('Starting GitHub save process...');
        console.log('Access token length:', accessToken ? accessToken.length : 0);
        console.log('Access token starts with:', accessToken ? accessToken.substring(0, 8) + '...' : 'null');

        // Validate access token format
        if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 10) {
            throw new Error('Invalid or missing access token');
        }

        // Test token validity first with better error handling
        console.log('Testing token validity...');
        let testResponse;
        try {
            testResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });
        } catch (fetchError) {
            console.error('Network error during token test:', fetchError);
            throw new Error('Network error: Unable to connect to GitHub API. Please check your internet connection.');
        }

        console.log('Token test response:', testResponse.status, testResponse.statusText);

        if (!testResponse.ok) {
            let errorMessage = 'Token validation failed';
            try {
                const errorData = await testResponse.json();
                errorMessage = errorData.message || errorMessage;
                console.error('Token validation error details:', errorData);
            } catch (parseError) {
                console.error('Could not parse error response:', parseError);
            }

            if (testResponse.status === 401) {
                throw new Error('Invalid GitHub access token. Please sign out and sign in again.');
            } else if (testResponse.status === 403) {
                throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
            } else {
                throw new Error(`GitHub API error: ${testResponse.status} ${errorMessage}`);
            }
        }

        // Get user info to include username in the markdown
        const userInfo = await testResponse.json();
        const githubUsername = userInfo.login;
        console.log('GitHub username:', githubUsername);

        // Format the problem as markdown with username
        const markdownContent = formatProblemAsMarkdown(problemData, githubUsername);

        // Create filename from title (sanitize for filesystem)
        const filename = sanitizeFilename(problemData.title) + '.md';
        console.log('Generated filename:', filename);

        // Check if the codeer_org_data repository exists, create if not
        await ensureRepositoryExists(accessToken);
        console.log('Repository check/creation completed');

        // Create the file in the problems folder
        const success = await createFileInRepository(
            accessToken,
            'codeer_org_data',
            `problems/${filename}`,
            markdownContent,
            `Add problem: ${problemData.title}`
        );

        console.log('File creation result:', success);

        // If file creation was successful, save to fork and create pull request
        if (success) {
            try {
                console.log('Saving to fork and creating pull request to main CODEER repository...');
                await saveToForkAndCreatePR(accessToken, problemData, filename, markdownContent);
            } catch (prError) {
                console.error('Failed to save to fork or create pull request:', prError);
                // Don't fail the main operation if fork/PR creation fails
            }
        }

        return success;
    } catch (error) {
        console.error('Error saving problem to GitHub:', error);
        // Re-throw with more specific error message
        throw error;
    }
}

function formatProblemAsMarkdown(problem: ProblemData, githubUsername?: string): string {
    const difficultyColor = {
        easy: '🟢',
        medium: '🟡',
        hard: '🔴'
    }[problem.difficulty] || '⚪';

    let markdown = `# ${problem.title || 'Untitled Problem'}\n\n`;

    // Metadata
    const difficulty = problem.difficulty || 'easy';
    const difficultyFormatted = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    markdown += `**Difficulty:** ${difficultyColor} ${difficultyFormatted}\n`;
    markdown += `**Category:** ${problem.category || 'general'}\n`;
    if (problem.tags) {
        markdown += `**Tags:** ${problem.tags}\n`;
    }
    markdown += `\n---\n\n`;

    // Description
    markdown += `## Problem Description\n\n${problem.description}\n\n`;

    // Input/Output Format
    if (problem.inputFormat) {
        markdown += `## Input Format\n\n${problem.inputFormat}\n\n`;
    }

    if (problem.outputFormat) {
        markdown += `## Output Format\n\n${problem.outputFormat}\n\n`;
    }

    // Constraints
    if (problem.constraints) {
        markdown += `## Constraints\n\n${problem.constraints}\n\n`;
    }

    // Examples
    if (problem.examples && problem.examples.length > 0) {
        markdown += `## Examples\n\n`;
        problem.examples.forEach((example, index) => {
            if (example.input || example.output) {
                markdown += `### Example ${index + 1}\n\n`;
                if (example.input) {
                    markdown += `**Input:**\n\`\`\`\n${example.input}\n\`\`\`\n\n`;
                }
                if (example.output) {
                    markdown += `**Output:**\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
                }
                if (example.explanation) {
                    markdown += `**Explanation:** ${example.explanation}\n\n`;
                }
            }
        });
    }

    // Solution
    if (problem.finalAnswer) {
        markdown += `## Solution\n\n${problem.finalAnswer}\n\n`;
    }

    // Footer
    markdown += `---\n\n`;
    if (githubUsername) {
        markdown += `*created by ${githubUsername.toLowerCase()}*\n\n`;
    }
    markdown += `*Created with CODEER Platform*\n`;

    return markdown;
}

function sanitizeFilename(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) || 'untitled-problem';
}

async function ensureRepositoryExists(accessToken: string): Promise<void> {
    try {
        console.log('Checking repository existence...');

        // Get user info first with better error handling
        console.log('Getting user info...');
        let userResponse;
        try {
            userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });
        } catch (fetchError) {
            console.error('Network error getting user info:', fetchError);
            throw new Error('Network error: Unable to connect to GitHub API');
        }

        if (!userResponse.ok) {
            let errorMessage = 'Failed to get user info';
            try {
                const errorData = await userResponse.json();
                errorMessage = errorData.message || errorMessage;
                console.error('User info error details:', errorData);
            } catch (parseError) {
                console.error('Could not parse user info error:', parseError);
            }
            throw new Error(`GitHub API error: ${userResponse.status} ${errorMessage}`);
        }

        const user = await userResponse.json();
        const username = user.login;
        console.log('User:', username);

        if (!username) {
            throw new Error('Could not get GitHub username from API response');
        }

        // Check if repository exists
        console.log('Checking if repository exists...');
        let repoResponse;
        try {
            repoResponse = await fetch(`https://api.github.com/repos/${username}/codeer_org_data`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });
        } catch (fetchError) {
            console.error('Network error checking repository:', fetchError);
            throw new Error('Network error: Unable to check repository existence');
        }

        if (repoResponse.status === 404) {
            console.log('Repository does not exist, creating...');
            // Repository doesn't exist, create it
            await createRepository(accessToken);
            console.log('Repository created successfully');
        } else if (!repoResponse.ok) {
            let errorMessage = 'Failed to check repository';
            try {
                const errorData = await repoResponse.json();
                errorMessage = errorData.message || errorMessage;
                console.error('Repository check error details:', errorData);
            } catch (parseError) {
                console.error('Could not parse repository check error:', parseError);
            }
            throw new Error(`GitHub API error: ${repoResponse.status} ${errorMessage}`);
        } else {
            console.log('Repository already exists');
        }
    } catch (error) {
        console.error('Error in ensureRepositoryExists:', error);
        throw error;
    }
}

async function createRepository(accessToken: string): Promise<void> {
    console.log('Creating repository...');

    let response;
    try {
        response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CODEER-Platform/1.0'
            },
            body: JSON.stringify({
                name: 'codeer_org_data',
                description: 'CODEER Platform - Problems and Learning Content',
                private: false,
                auto_init: true,
            }),
        });
    } catch (fetchError) {
        console.error('Network error creating repository:', fetchError);
        throw new Error('Network error: Unable to create repository');
    }

    console.log('Repository creation response status:', response.status);

    if (!response.ok) {
        let errorMessage = 'Failed to create repository';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            console.error('Repository creation error details:', errorData);

            // Handle specific GitHub errors
            if (response.status === 422 && errorData.errors) {
                const error = errorData.errors[0];
                if (error.message.includes('already exists')) {
                    console.log('Repository already exists, continuing...');
                    return; // Repository exists, that's fine
                }
            }
        } catch (parseError) {
            console.error('Could not parse repository creation error:', parseError);
        }

        throw new Error(`GitHub API error: ${response.status} ${errorMessage}`);
    }

    console.log('Repository created successfully');
}

async function createFileInRepository(
    accessToken: string,
    repo: string,
    path: string,
    content: string,
    message: string
): Promise<boolean> {
    try {
        console.log('Creating file in repository...');

        // Get user info first
        let userResponse;
        try {
            userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });
        } catch (fetchError) {
            console.error('Network error getting user for file creation:', fetchError);
            return false;
        }

        if (!userResponse.ok) {
            console.error('Failed to get user info for file creation');
            return false;
        }

        const user = await userResponse.json();
        const username = user.login;
        console.log('Creating file for user:', username);

        // Check if file already exists
        let checkResponse;
        try {
            checkResponse = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${path}`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });
        } catch (fetchError) {
            console.error('Network error checking file existence:', fetchError);
            return false;
        }

        const body: any = {
            message,
            content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
        };

        // If file exists, we need the SHA for updating
        if (checkResponse.ok) {
            try {
                const existingFile = await checkResponse.json();
                body.sha = existingFile.sha;
                console.log('File exists, updating with SHA:', existingFile.sha);
            } catch (parseError) {
                console.error('Could not parse existing file data:', parseError);
                return false;
            }
        } else {
            console.log('File does not exist, creating new file');
        }

        let createResponse;
        try {
            createResponse = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
                body: JSON.stringify(body),
            });
        } catch (fetchError) {
            console.error('Network error creating/updating file:', fetchError);
            return false;
        }

        if (!createResponse.ok) {
            let errorMessage = 'Failed to create/update file';
            try {
                const errorData = await createResponse.json();
                errorMessage = errorData.message || errorMessage;
                console.error('File creation error details:', errorData);
            } catch (parseError) {
                console.error('Could not parse file creation error:', parseError);
            }
            console.error(`File creation failed: ${createResponse.status} ${errorMessage}`);
            return false;
        }

        console.log('File created/updated successfully');
        return true;
    } catch (error) {
        console.error('Error creating file in repository:', error);
        return false;
    }
}

async function saveToForkAndCreatePR(
    accessToken: string,
    problemData: ProblemData,
    filename: string,
    markdownContent: string
): Promise<void> {
    try {
        console.log('🚀 Starting fork-based workflow...');

        const mainRepoOwner = 'sriox-cloud';
        const mainRepoName = 'codeer';

        // Get user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CODEER-Platform/1.0'
            },
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get user info');
        }

        const user = await userResponse.json();
        const username = user.login;
        console.log('👤 User:', username);

        // Step 1: Check if main repository exists
        console.log('🔍 Checking main repository...');
        const mainRepoResponse = await fetch(`https://api.github.com/repos/${mainRepoOwner}/${mainRepoName}`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CODEER-Platform/1.0'
            },
        });

        if (!mainRepoResponse.ok) {
            throw new Error(`Main repository ${mainRepoOwner}/${mainRepoName} does not exist or is not accessible`);
        }

        const mainRepo = await mainRepoResponse.json();
        const mainDefaultBranch = mainRepo.default_branch;
        console.log('✅ Main repository found, default branch:', mainDefaultBranch);

        // Step 2: Check if user already has a fork
        console.log('🔍 Checking if fork exists...');
        let forkExists = false;
        let forkRepo = null;

        try {
            const forkCheckResponse = await fetch(`https://api.github.com/repos/${username}/${mainRepoName}`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });

            if (forkCheckResponse.ok) {
                forkRepo = await forkCheckResponse.json();
                // Verify it's actually a fork
                if (forkRepo.fork && forkRepo.parent && forkRepo.parent.full_name === `${mainRepoOwner}/${mainRepoName}`) {
                    forkExists = true;
                    console.log('✅ Fork already exists');
                } else {
                    console.log('❌ Repository exists but is not a fork of the main repo');
                    throw new Error(`Repository ${username}/${mainRepoName} exists but is not a fork of ${mainRepoOwner}/${mainRepoName}`);
                }
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not a fork')) {
                throw error;
            }
            console.log('ℹ️ Fork does not exist, will create one');
        }

        // Step 3: Create fork if it doesn't exist
        if (!forkExists) {
            console.log('🍴 Creating fork...');
            const forkResponse = await fetch(`https://api.github.com/repos/${mainRepoOwner}/${mainRepoName}/forks`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });

            if (!forkResponse.ok) {
                const errorData = await forkResponse.json().catch(() => ({}));
                throw new Error(`Failed to create fork: ${forkResponse.status} ${errorData.message || ''}`);
            }

            forkRepo = await forkResponse.json();
            console.log('✅ Fork created successfully');

            // Wait for fork to be ready (GitHub needs time to set up the fork)
            console.log('⏳ Waiting for fork to be ready...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify fork is ready
            let retries = 3;
            while (retries > 0) {
                try {
                    const verifyResponse = await fetch(`https://api.github.com/repos/${username}/${mainRepoName}`, {
                        headers: {
                            'Authorization': `token ${accessToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'CODEER-Platform/1.0'
                        },
                    });

                    if (verifyResponse.ok) {
                        console.log('✅ Fork is ready');
                        break;
                    }
                } catch (error) {
                    console.log(`⏳ Fork not ready yet, retrying... (${retries} attempts left)`);
                }

                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (retries === 0) {
                throw new Error('Fork creation timed out');
            }
        }

        const forkDefaultBranch = forkRepo?.default_branch || mainDefaultBranch;
        console.log('📂 Fork default branch:', forkDefaultBranch);

        // Step 4: Create the problem file in the fork
        console.log('💾 Creating file in fork...');
        const filePath = `problems/${filename}`;

        // Check if file already exists in fork
        let existingFileSha = null;
        try {
            const existingFileResponse = await fetch(`https://api.github.com/repos/${username}/${mainRepoName}/contents/${filePath}`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CODEER-Platform/1.0'
                },
            });

            if (existingFileResponse.ok) {
                const existingFile = await existingFileResponse.json();
                existingFileSha = existingFile.sha;
                console.log('ℹ️ File exists in fork, will update');
            }
        } catch (error) {
            console.log('ℹ️ File does not exist in fork, will create new');
        }

        // Create/update file in fork
        const fileBody: any = {
            message: `Add problem: ${problemData.title}`,
            content: btoa(unescape(encodeURIComponent(markdownContent))), // Base64 encode the markdown content
            author: {
                name: username,
                email: `${username}@users.noreply.github.com`
            },
            committer: {
                name: username,
                email: `${username}@users.noreply.github.com`
            }
        };

        if (existingFileSha) {
            fileBody.sha = existingFileSha;
        }

        const createFileResponse = await fetch(`https://api.github.com/repos/${username}/${mainRepoName}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CODEER-Platform/1.0'
            },
            body: JSON.stringify(fileBody),
        });

        if (!createFileResponse.ok) {
            const errorData = await createFileResponse.json().catch(() => ({}));
            throw new Error(`Failed to create file in fork: ${createFileResponse.status} ${errorData.message || ''}`);
        }

        const fileData = await createFileResponse.json();
        console.log('✅ File saved to fork successfully');
        console.log('📁 File URL:', fileData.content.html_url);

        // Step 5: Create pull request from fork to main repository
        console.log('📤 Creating pull request...');

        const prTitle = `Add problem: ${problemData.title}`;
        const prBody = `## 🎯 New Problem Submission

**📚 Problem Title:** ${problemData.title}  
**⚡ Difficulty:** ${problemData.difficulty}  
**🏷️ Category:** ${problemData.category}  

**📝 Description:**
${problemData.description}

**🏷️ Tags:** ${problemData.tags || 'None'}

---

### 🤖 Automated Submission
- **👤 Submitted by:** @${username}  
- **🛠️ Platform:** CODEER  
- **📂 File Location:** \`problems/${filename}\`  
- **🔄 Workflow:** Fork → Pull Request  

> This problem was automatically submitted through the CODEER Platform's community contribution system.`;

        const prPayload = {
            title: prTitle,
            body: prBody,
            head: `${username}:${forkDefaultBranch}`, // From user's fork
            base: mainDefaultBranch, // To main repository
            maintainer_can_modify: true // Allow maintainers to edit the PR
        };

        const prResponse = await fetch(`https://api.github.com/repos/${mainRepoOwner}/${mainRepoName}/pulls`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'CODEER-Platform/1.0'
            },
            body: JSON.stringify(prPayload),
        });

        if (!prResponse.ok) {
            const errorData = await prResponse.json().catch(() => ({}));

            // Check if PR already exists
            if (prResponse.status === 422 && errorData.errors) {
                const alreadyExistsError = errorData.errors.find((err: any) =>
                    err.message && err.message.includes('pull request already exists')
                );

                if (alreadyExistsError) {
                    console.log('ℹ️ Pull request already exists for this change');
                    return;
                }
            }

            console.error('❌ PR creation failed:', prResponse.status, errorData);
            throw new Error(`Failed to create pull request: ${prResponse.status} ${errorData.message || 'Unknown error'}`);
        }

        const prData = await prResponse.json();
        console.log('🎉 Pull request created successfully!');
        console.log('🔗 PR URL:', prData.html_url);
        console.log('📊 PR Number:', `#${prData.number}`);
        console.log('✨ Title:', prTitle);

        // Success summary
        console.log('\n🎯 WORKFLOW COMPLETED SUCCESSFULLY');
        console.log(`✅ Problem saved to fork: ${username}/${mainRepoName}`);
        console.log(`✅ Pull request created: ${prData.html_url}`);
        console.log('👀 The CODEER team will review and merge your contribution!');

    } catch (error) {
        console.error('❌ Error in fork-based workflow:', error);
        throw error;
    }
}
