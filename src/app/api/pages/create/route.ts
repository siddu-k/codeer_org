import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CloudflareAPI, validateSubdomain, checkSubdomainAvailability, DonatedDomainCloudflare } from '@/lib/cloudflare';
import { GitHubPagesAPI, convertFilesToUploads, validateWebsiteFiles } from '@/lib/githubPages';
import { pageManager } from '@/lib/pageManager';
import { getUserByEmail } from '@/lib/userSync';
import { donatedDomainManager } from '@/lib/donatedDomains';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Check if we have access token (for GitHub operations)
        const accessToken = (session as any).accessToken;
        if (!accessToken) {
            return NextResponse.json(
                { error: 'GitHub access token not available. Please sign in again.' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const title = formData.get('title') as string;
        const subdomain = formData.get('subdomain') as string;
        const domain = formData.get('domain') as string;
        const donatedDomainId = formData.get('donatedDomainId') as string; // New field for donated domains
        const files = formData.getAll('files') as File[];

        // Validate inputs
        if (!title || !subdomain || !domain) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (files.length === 0) {
            return NextResponse.json(
                { error: 'No files uploaded' },
                { status: 400 }
            );
        }

        // Validate subdomain format
        const subdomainValidation = validateSubdomain(subdomain);
        if (!subdomainValidation.valid) {
            return NextResponse.json(
                { error: subdomainValidation.error },
                { status: 400 }
            );
        }

        // Check subdomain availability
        let isAvailable = false;
        let usingDonatedDomain = false;

        if (donatedDomainId) {
            // Check availability on donated domain
            usingDonatedDomain = true;
            isAvailable = await donatedDomainManager.checkSubdomainAvailability(donatedDomainId, subdomain);

            if (!isAvailable) {
                return NextResponse.json(
                    { error: `Subdomain ${subdomain} is not available on the selected donated domain` },
                    { status: 409 }
                );
            }
        } else {
            // Check availability on default domains
            const availability = await checkSubdomainAvailability(subdomain);
            isAvailable = availability.domains[domain];

            console.log('Subdomain availability check:', {
                subdomain,
                domain,
                availabilityResult: availability,
                isAvailable
            });

            if (!isAvailable) {
                return NextResponse.json(
                    { error: `Subdomain ${subdomain}.${domain} is not available` },
                    { status: 409 }
                );
            }
        }

        // Get user info
        const user = await getUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Convert files to upload format
        console.log('Converting files for upload...');
        const fileUploads = await Promise.all(
            files.map(async (file) => {
                console.log(`Processing file: ${file.name} (${file.size} bytes)`);
                return {
                    path: file.name,
                    content: await file.text(),
                    encoding: 'utf-8' as const
                };
            })
        );
        console.log(`Converted ${fileUploads.length} files for upload`);

        // Validate website files
        const fileValidation = validateWebsiteFiles(fileUploads);
        if (!fileValidation.valid) {
            return NextResponse.json(
                { error: fileValidation.error },
                { status: 400 }
            );
        }
        console.log('File validation passed');

        // Initialize APIs
        console.log('Initializing GitHub API...');

        // Test GitHub API connection and get real username
        let githubUsername: string;
        try {
            const testResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                }
            });

            if (!testResponse.ok) {
                throw new Error(`GitHub API test failed: ${testResponse.status}`);
            }

            const userData = await testResponse.json();
            githubUsername = userData.login;
            console.log('GitHub API connection verified for user:', githubUsername);
        } catch (apiTestError: any) {
            console.error('GitHub API test failed:', apiTestError);
            throw new Error(`GitHub authentication failed: ${apiTestError.message}`);
        }

        const githubAPI = new GitHubPagesAPI(accessToken, githubUsername);

        const cloudflareAPI = new CloudflareAPI();

        // Handle domain logic for donated domains
        let actualDomain = domain;
        let donatedDomainInfo = null;

        if (usingDonatedDomain && donatedDomainId) {
            // Get donated domain information
            const donatedDomains = await donatedDomainManager.getAvailableDomains();
            donatedDomainInfo = donatedDomains.find(d => d.id === donatedDomainId);

            if (!donatedDomainInfo) {
                return NextResponse.json(
                    { error: 'Donated domain not found or unavailable' },
                    { status: 400 }
                );
            }

            actualDomain = donatedDomainInfo.domain_name;
        }

        // Generate unique repository name
        const repoName = `${subdomain}-${actualDomain.replace('.', '-')}-site`;
        const fullDomain = `${subdomain}.${actualDomain}`;

        // Declare variables in the outer scope
        let pageRecord: any = null;
        let deploymentId: string | null = null;

        try {
            // Step 1: Create page record in database
            pageRecord = await pageManager.createPage({
                user_id: user.id,
                title,
                subdomain,
                domain: actualDomain,
                github_repo: `${githubUsername}/${repoName}`,
                file_count: files.length,
                repo_size: fileUploads.reduce((total, file) => total + file.content.length, 0),
                donated_domain_id: usingDonatedDomain ? donatedDomainId : null,
                is_using_donated_domain: usingDonatedDomain,
                metadata: {
                    description: `Personal website: ${title}`,
                    tags: ['personal', 'website'],
                    file_names: files.map(f => f.name),
                    using_donated_domain: usingDonatedDomain,
                    donated_domain_name: usingDonatedDomain ? actualDomain : null
                }
            });

            if (!pageRecord) {
                throw new Error('Failed to create page record');
            }

            // Step 2: Create deployment record
            deploymentId = await pageManager.createDeployment(pageRecord.id, files.length);

            // Step 3: Create GitHub repository
            await pageManager.updatePageStatus(pageRecord.id, 'creating', 'building');

            console.log('Creating GitHub repository...');
            let repo;
            try {
                repo = await githubAPI.createRepository(repoName, `Personal website: ${title}`);
                if (!repo) {
                    throw new Error('Repository creation returned null');
                }
                console.log('Repository created successfully:', repo.html_url);
            } catch (repoError: any) {
                console.error('Repository creation error:', repoError);
                throw new Error(`Failed to create GitHub repository: ${repoError.message}`);
            }

            // Step 4: Upload files to repository
            console.log('Uploading files to repository...');
            try {
                const uploadSuccess = await githubAPI.uploadFiles(repoName, fileUploads);
                if (!uploadSuccess) {
                    throw new Error('File upload returned false - no files were uploaded successfully');
                }
                console.log('Files uploaded successfully');
            } catch (uploadError: any) {
                console.error('File upload error:', uploadError);
                throw new Error(`Failed to upload files to repository: ${uploadError.message}`);
            }

            // Step 5: Enable GitHub Pages with custom domain
            const pagesUrl = await githubAPI.enableGitHubPages(repoName, fullDomain);
            if (!pagesUrl) {
                throw new Error('Failed to enable GitHub Pages');
            }

            // Step 6: Create Cloudflare DNS record
            let dnsSuccess = false;

            if (usingDonatedDomain && donatedDomainInfo) {
                // Reserve subdomain on donated domain
                const reservationSuccess = await donatedDomainManager.reserveSubdomain(
                    donatedDomainId,
                    pageRecord.id,
                    subdomain
                );

                if (!reservationSuccess) {
                    throw new Error('Failed to reserve subdomain on donated domain');
                }

                // Get credentials for donated domain
                const credentials = await donatedDomainManager.getDomainCredentials(donatedDomainId);
                if (!credentials) {
                    throw new Error('Failed to get credentials for donated domain');
                }

                // Create DNS record using donated domain's credentials
                dnsSuccess = await DonatedDomainCloudflare.createSubdomainForDonatedDomain(
                    subdomain,
                    actualDomain,
                    `${session.user.email.split('@')[0]}.github.io`, // GitHub Pages URL
                    credentials.zoneId,
                    credentials.apiToken
                );
            } else {
                // Use default domain logic
                dnsSuccess = await cloudflareAPI.createSubdomain(
                    subdomain,
                    actualDomain,
                    session.user.email.split('@')[0],
                    repoName
                );
            }

            if (!dnsSuccess) {
                throw new Error('Failed to create DNS record');
            }

            // Step 7: Update page record with success
            await pageManager.updatePageStatus(
                pageRecord.id,
                'active',
                'deployed',
                {
                    github_pages_url: pagesUrl,
                    custom_domain_url: `https://${fullDomain}`
                }
            );

            // Step 8: Update deployment record
            if (deploymentId) {
                await pageManager.updateDeployment(deploymentId, 'deployed');
            }

            return NextResponse.json({
                success: true,
                page: {
                    id: pageRecord.id,
                    title,
                    domain: fullDomain,
                    github_url: repo.html_url,
                    pages_url: pagesUrl,
                    custom_url: `https://${fullDomain}`,
                    status: 'active'
                }
            });

        } catch (error: any) {
            console.error('Error in page creation process:', error);

            // Update page status to error if page was created
            if (pageRecord) {
                await pageManager.updatePageStatus(
                    pageRecord.id,
                    'error',
                    'failed',
                    {
                        metadata: {
                            ...pageRecord.metadata,
                            error_message: error.message,
                            failed_at: new Date().toISOString()
                        }
                    }
                );

                // Update deployment record
                if (deploymentId) {
                    await pageManager.updateDeployment(
                        deploymentId,
                        'failed',
                        error.message
                    );
                }
            }

            return NextResponse.json(
                { error: `Failed to create page: ${error.message}` },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Unexpected error in create-page API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get user info
        const user = await getUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get user's pages
        const pages = await pageManager.getUserPages(user.id);

        return NextResponse.json({
            pages: pages.map(page => ({
                id: page.id,
                title: page.title,
                domain: page.full_domain,
                status: page.status,
                deployment_status: page.deployment_status,
                github_repo: page.github_repo,
                custom_url: page.custom_domain_url,
                created_at: page.created_at,
                last_updated: page.last_updated,
                file_count: page.file_count,
                page_views: page.page_views || 0
            }))
        });

    } catch (error: any) {
        console.error('Error fetching user pages:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
