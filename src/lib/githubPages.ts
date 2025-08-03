import { Octokit } from '@octokit/rest';

export interface GitHubRepo {
    name: string;
    full_name: string;
    html_url: string;
    clone_url: string;
    pages_url?: string;
}

export interface FileUpload {
    path: string;
    content: string;
    encoding?: 'utf-8' | 'base64';
}

export class GitHubPagesAPI {
    private octokit: Octokit;
    private username: string;

    constructor(accessToken: string, username: string) {
        this.octokit = new Octokit({
            auth: accessToken,
        });
        this.username = username;
    }

    /**
     * Create a new repository for the page
     */
    async createRepository(repoName: string, description?: string): Promise<GitHubRepo | null> {
        try {
            // Sanitize repository name
            const sanitizedName = repoName
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            const response = await this.octokit.rest.repos.createForAuthenticatedUser({
                name: sanitizedName,
                description: description || 'Personal website created with Codeer',
                private: false, // Must be public for GitHub Pages
                auto_init: false, // We'll add files manually
                has_issues: false,
                has_projects: false,
                has_wiki: false,
            });

            const data = response.data;

            return {
                name: data.name,
                full_name: data.full_name,
                html_url: data.html_url,
                clone_url: data.clone_url,
            };
        } catch (error: any) {
            console.error('Error creating repository:', error);
            if (error.status === 422) {
                throw new Error('Repository name already exists or is invalid');
            }
            throw new Error(`Failed to create repository: ${error.message}`);
        }
    }

    /**
     * Upload files to repository
     */
    async uploadFiles(repoName: string, files: FileUpload[]): Promise<boolean> {
        try {
            // Create initial commit with all files
            const commits = [];

            for (const file of files) {
                try {
                    await this.octokit.rest.repos.createOrUpdateFileContents({
                        owner: this.username,
                        repo: repoName,
                        path: file.path,
                        message: `Add ${file.path}`,
                        content: Buffer.from(file.content, file.encoding || 'utf-8').toString('base64'),
                        committer: {
                            name: 'Codeer Platform',
                            email: 'noreply@codeer.org'
                        },
                        author: {
                            name: 'Codeer Platform',
                            email: 'noreply@codeer.org'
                        }
                    });

                    commits.push(file.path);
                    console.log(`Uploaded: ${file.path}`);
                } catch (fileError: any) {
                    console.error(`Error uploading ${file.path}:`, fileError);
                    // Continue with other files
                }
            }

            return commits.length > 0;
        } catch (error: any) {
            console.error('Error uploading files:', error);
            return false;
        }
    }

    /**
     * Enable GitHub Pages for repository
     */
    async enableGitHubPages(repoName: string, customDomain?: string): Promise<string | null> {
        try {
            // Enable GitHub Pages
            const pagesResponse = await this.octokit.rest.repos.createPagesSite({
                owner: this.username,
                repo: repoName,
                source: {
                    branch: 'main',
                    path: '/',
                },
            });

            console.log('GitHub Pages enabled:', pagesResponse.data.html_url);

            // Add custom domain if provided
            if (customDomain) {
                await this.addCustomDomain(repoName, customDomain);
            }

            return pagesResponse.data.html_url || null;
        } catch (error: any) {
            console.error('Error enabling GitHub Pages:', error);

            // If pages already exist, try to get the URL
            try {
                const existingPages = await this.octokit.rest.repos.getPages({
                    owner: this.username,
                    repo: repoName,
                });
                return existingPages.data.html_url || null;
            } catch (getError) {
                console.error('Error getting existing pages:', getError);
            }

            return null;
        }
    }

    /**
     * Add custom domain to GitHub Pages
     */
    async addCustomDomain(repoName: string, domain: string): Promise<boolean> {
        try {
            // Create or update CNAME file
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.username,
                repo: repoName,
                path: 'CNAME',
                message: 'Add custom domain',
                content: Buffer.from(domain).toString('base64'),
                committer: {
                    name: 'Codeer Platform',
                    email: 'noreply@codeer.org'
                },
                author: {
                    name: 'Codeer Platform',
                    email: 'noreply@codeer.org'
                }
            });

            // Update Pages settings with custom domain
            await this.octokit.rest.repos.updateInformationAboutPagesSite({
                owner: this.username,
                repo: repoName,
                cname: domain,
            });

            console.log(`Custom domain ${domain} added to ${repoName}`);
            return true;
        } catch (error: any) {
            console.error('Error adding custom domain:', error);
            return false;
        }
    }

    /**
     * Get repository information
     */
    async getRepository(repoName: string): Promise<GitHubRepo | null> {
        try {
            const { data } = await this.octokit.rest.repos.get({
                owner: this.username,
                repo: repoName,
            });

            // Try to get pages info
            let pagesUrl;
            try {
                const pagesData = await this.octokit.rest.repos.getPages({
                    owner: this.username,
                    repo: repoName,
                });
                pagesUrl = pagesData.data.html_url;
            } catch (pagesError) {
                // Pages might not be enabled
                pagesUrl = undefined;
            }

            return {
                name: data.name,
                full_name: data.full_name,
                html_url: data.html_url,
                clone_url: data.clone_url,
                pages_url: pagesUrl,
            };
        } catch (error: any) {
            console.error('Error getting repository:', error);
            return null;
        }
    }

    /**
     * Delete a repository
     */
    async deleteRepository(repoName: string): Promise<boolean> {
        try {
            await this.octokit.rest.repos.delete({
                owner: this.username,
                repo: repoName,
            });

            console.log(`Repository ${repoName} deleted successfully`);
            return true;
        } catch (error: any) {
            console.error('Error deleting repository:', error);
            return false;
        }
    }

    /**
     * List user repositories that are GitHub Pages sites
     */
    async listPageRepositories(): Promise<GitHubRepo[]> {
        try {
            const { data } = await this.octokit.rest.repos.listForUser({
                username: this.username,
                type: 'owner',
                per_page: 100,
            });

            const pageRepos: GitHubRepo[] = [];

            for (const repo of data) {
                try {
                    const pagesData = await this.octokit.rest.repos.getPages({
                        owner: this.username,
                        repo: repo.name,
                    });

                    pageRepos.push({
                        name: repo.name,
                        full_name: repo.full_name,
                        html_url: repo.html_url,
                        clone_url: repo.clone_url || '',
                        pages_url: pagesData.data.html_url,
                    });
                } catch (pagesError) {
                    // Repository doesn't have pages enabled
                    continue;
                }
            }

            return pageRepos;
        } catch (error: any) {
            console.error('Error listing page repositories:', error);
            return [];
        }
    }

    /**
     * Update files in repository
     */
    async updateFiles(repoName: string, files: FileUpload[], commitMessage?: string): Promise<boolean> {
        try {
            for (const file of files) {
                try {
                    // Get existing file SHA if it exists
                    let sha;
                    try {
                        const existingFile = await this.octokit.rest.repos.getContent({
                            owner: this.username,
                            repo: repoName,
                            path: file.path,
                        });

                        if ('sha' in existingFile.data) {
                            sha = existingFile.data.sha;
                        }
                    } catch (getError) {
                        // File doesn't exist, that's fine
                    }

                    await this.octokit.rest.repos.createOrUpdateFileContents({
                        owner: this.username,
                        repo: repoName,
                        path: file.path,
                        message: commitMessage || `Update ${file.path}`,
                        content: Buffer.from(file.content, file.encoding || 'utf-8').toString('base64'),
                        sha,
                        committer: {
                            name: 'Codeer Platform',
                            email: 'noreply@codeer.org'
                        },
                        author: {
                            name: 'Codeer Platform',
                            email: 'noreply@codeer.org'
                        }
                    });

                    console.log(`Updated: ${file.path}`);
                } catch (fileError: any) {
                    console.error(`Error updating ${file.path}:`, fileError);
                    // Continue with other files
                }
            }

            return true;
        } catch (error: any) {
            console.error('Error updating files:', error);
            return false;
        }
    }
}

/**
 * Convert FileList to FileUpload array
 */
export function convertFilesToUploads(files: FileList): Promise<FileUpload[]> {
    return Promise.all(
        Array.from(files).map(async (file) => {
            return new Promise<FileUpload>((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = () => {
                    resolve({
                        path: file.webkitRelativePath || file.name,
                        content: reader.result as string,
                        encoding: 'utf-8'
                    });
                };

                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });
        })
    );
}

/**
 * Validate that required files are present
 */
export function validateWebsiteFiles(files: FileUpload[]): { valid: boolean; error?: string } {
    // Check if index.html exists
    const hasIndexHtml = files.some(file =>
        file.path.toLowerCase() === 'index.html' ||
        file.path.toLowerCase().endsWith('/index.html')
    );

    if (!hasIndexHtml) {
        return { valid: false, error: 'An index.html file is required' };
    }

    // Check file size limits (GitHub has 100MB repo limit)
    const totalSize = files.reduce((total, file) => total + file.content.length, 0);
    const maxSize = 50 * 1024 * 1024; // 50MB limit for safety

    if (totalSize > maxSize) {
        return { valid: false, error: 'Total file size exceeds 50MB limit' };
    }

    return { valid: true };
}
