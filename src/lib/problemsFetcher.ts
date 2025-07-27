// Fetch problems from GitHub without using API (no rate limits)
export interface GitHubProblem {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    description: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    examples: Array<{
        input: string;
        output: string;
        explanation: string;
    }>;
    tags: string[]; // Changed from string to string[] to match Problem interface
    finalAnswer?: string;
    author?: string;
    filename: string;
    rawContent: string;
    createdAt?: Date; // Add optional creation date for consistency
}

// Method 1: Fetch from raw.githubusercontent.com (NO API LIMITS - No GitHub API Usage)
export async function fetchProblemsFromRaw(): Promise<GitHubProblem[]> {
    try {
        console.log('🔄 Fetching problems from raw GitHub content (No API)...');

        // Use web scraping directly - NO GitHub API calls
        console.log('📄 Using GitHub page scraping...');
        const fileList = await scrapeGitHubProblemsPage();

        if (fileList.length === 0) {
            // Fallback: Use known common problem files
            console.log('📋 Using fallback known file list...');
            const knownFiles = [
                'two-sum.md',
                'reverse-string.md',
                'fibonacci-sequence.md',
                'palindrome-check.md',
                'binary-search.md',
                'merge-sort.md',
                'quick-sort.md',
                'linked-list-reverse.md',
                'valid-parentheses.md',
                'maximum-subarray.md'
            ];
            fileList.push(...knownFiles);
        }

        // Fetch each file's content from raw.githubusercontent.com (NO RATE LIMITS)
        const problems: GitHubProblem[] = [];

        for (const filename of fileList) {
            try {
                const rawUrl = `https://raw.githubusercontent.com/sriox-cloud/codeer_problems/main/problems/${filename}`;

                const response = await fetch(rawUrl);

                if (response.ok) {
                    const content = await response.text();
                    const problem = parseMarkdownToProblem(content, filename);
                    if (problem) {
                        problems.push(problem);
                    }
                } else {
                    console.warn(`⚠️ Failed to fetch ${filename}: ${response.status}`);
                }

                // Small delay to be respectful
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`❌ Error fetching file ${filename}:`, error);
            }
        }

        return problems;
    } catch (error) {
        console.error('❌ Error fetching problems:', error);
        return [];
    }
}

// Method 2: Scrape GitHub page (when API is not available)
async function scrapeGitHubProblemsPage(): Promise<string[]> {
    try {
        const pageUrl = 'https://github.com/sriox-cloud/codeer_problems/tree/main/problems';

        // Note: This would need to be done on the server side due to CORS
        // For client-side, we'll use a CORS proxy or the API
        console.log('🌐 Attempting to scrape GitHub page...');

        // Use a CORS proxy for client-side scraping
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Scraping failed: ${response.status}`);
        }

        const data = await response.json();
        const html = data.contents;

        // Extract .md filenames from the HTML
        const mdFilePattern = /href="[^"]*\/([^"]*\.md)"/g;
        const matches = [];
        let match;

        while ((match = mdFilePattern.exec(html)) !== null) {
            matches.push(match[1]);
        }

        return [...new Set(matches)]; // Remove duplicates
    } catch (error) {
        console.error('❌ Scraping failed:', error);
        return [];
    }
}

// Method 3: Use GitHub's content API with caching (still subject to rate limits but cached)
export async function fetchProblemsWithCaching(): Promise<GitHubProblem[]> {
    const cacheKey = 'github_problems_cache';
    const cacheExpiry = 'github_problems_cache_expiry';
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

    try {
        // Check if we have cached data
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheExpiry);

        if (cachedData && cacheTime) {
            const isExpired = Date.now() - parseInt(cacheTime) > CACHE_DURATION;
            if (!isExpired) {
                console.log('📦 Using cached problems data');
                return JSON.parse(cachedData);
            }
        }

        console.log('🔄 Fetching fresh problems data...');
        const problems = await fetchProblemsFromRaw();

        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify(problems));
        localStorage.setItem(cacheExpiry, Date.now().toString());

        return problems;
    } catch (error) {
        console.error('❌ Error with caching:', error);
        // Try to return cached data even if expired
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            console.log('📦 Using expired cached data as fallback');
            return JSON.parse(cachedData);
        }
        return [];
    }
}

// Parse markdown content to problem object
function parseMarkdownToProblem(content: string, filename: string): GitHubProblem | null {
    try {
        const lines = content.split('\n');
        let title = '';
        let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
        let category = 'general';
        let description = '';
        let inputFormat = '';
        let outputFormat = '';
        let constraints = '';
        let tags: string[] = []; // Changed to array to match interface
        let finalAnswer = '';
        let author = '';
        const examples: Array<{ input: string; output: string; explanation: string }> = [];

        let currentSection = '';
        let currentExample: any = {};
        let sectionContent = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Extract title from first heading
            if (line.startsWith('# ') && !title) {
                title = line.substring(2).trim();
                continue;
            }

            // Extract metadata
            if (line.includes('**Difficulty:**')) {
                const diffMatch = line.match(/🟢|🟡|🔴/);
                if (diffMatch) {
                    const emoji = diffMatch[0];
                    difficulty = emoji === '🟢' ? 'easy' : emoji === '🟡' ? 'medium' : 'hard';
                }
                continue;
            }

            if (line.includes('**Category:**')) {
                category = line.split('**Category:**')[1]?.trim() || 'general';
                continue;
            }

            if (line.includes('**Tags:**')) {
                const tagsString = line.split('**Tags:**')[1]?.trim() || '';
                tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
                continue;
            }

            // Extract author from footer - handle multiple formats
            if (line.includes('*created by ') || line.includes('*Created by ')) {
                const authorMatch = line.match(/\*[Cc]reated by ([^*]+)\*/);
                if (authorMatch) {
                    author = authorMatch[1].trim();
                }
                continue;
            }

            // Also check for alternative author formats
            if (line.includes('**Author:**') || line.includes('**Created by:**')) {
                const authorMatch = line.split(/\*\*(?:Author|Created by):\*\*/)[1];
                if (authorMatch) {
                    author = authorMatch.trim();
                }
                continue;
            }

            // Section headers
            if (line.startsWith('## ')) {
                // Save previous section
                if (currentSection && sectionContent.trim()) {
                    const sectionLower = currentSection.toLowerCase();
                    switch (sectionLower) {
                        case 'problem description':
                        case 'description':
                            description = sectionContent.trim();
                            break;
                        case 'input format':
                        case 'input':
                            inputFormat = sectionContent.trim();
                            break;
                        case 'output format':
                        case 'output':
                            outputFormat = sectionContent.trim();
                            break;
                        case 'constraints':
                            constraints = sectionContent.trim();
                            break;
                        case 'solution':
                        case 'answer':
                        case 'final answer':
                            // Clean up solution content - remove footer lines
                            let cleanedSolution = sectionContent.trim()
                                .replace(/\*Created with CODEER Platform\*/g, '')
                                .replace(/\*created by [^*]+\*/g, '')
                                .replace(/\*Created by [^*]+\*/g, '')
                                .replace(/---+/g, '')
                                .trim();
                            finalAnswer = cleanedSolution;
                            break;
                    }
                }

                currentSection = line.substring(3).trim();
                sectionContent = '';
                continue;
            }

            // Example parsing
            if (line.startsWith('### Example')) {
                if (currentExample.input || currentExample.output) {
                    examples.push({
                        input: currentExample.input || '',
                        output: currentExample.output || '',
                        explanation: currentExample.explanation || ''
                    });
                }
                currentExample = {};
                continue;
            }

            if (line.includes('**Input:**')) {
                let inputContent = '';
                i++;
                while (i < lines.length && !lines[i].includes('**Output:**') && !lines[i].includes('**Explanation:**')) {
                    const contentLine = lines[i].trim();
                    if (contentLine !== '```' && contentLine !== '') {
                        inputContent += contentLine + '\n';
                    }
                    i++;
                }
                i--; // Back up one line
                currentExample.input = inputContent.trim();
                continue;
            }

            if (line.includes('**Output:**')) {
                let outputContent = '';
                i++;
                while (i < lines.length && !lines[i].includes('**Explanation:**') && !lines[i].startsWith('### ')) {
                    const contentLine = lines[i].trim();
                    if (contentLine !== '```' && contentLine !== '') {
                        outputContent += contentLine + '\n';
                    }
                    i++;
                }
                i--; // Back up one line
                currentExample.output = outputContent.trim();
                continue;
            }

            if (line.includes('**Explanation:**')) {
                currentExample.explanation = line.split('**Explanation:**')[1]?.trim() || '';
                continue;
            }

            // Add to current section content (skip footer lines and horizontal rules)
            if (currentSection && !line.startsWith('---') && line !== '' &&
                !line.includes('*Created with CODEER Platform*') &&
                !line.includes('*created by ') &&
                !line.includes('*Created by ') &&
                !line.match(/^\*+$/) && // Skip lines with just asterisks
                line.trim() !== '---') { // Skip horizontal rules
                sectionContent += line + '\n';
            }
        }

        // Save last section
        if (currentSection && sectionContent.trim()) {
            const sectionLower = currentSection.toLowerCase();
            switch (sectionLower) {
                case 'problem description':
                case 'description':
                    description = sectionContent.trim();
                    break;
                case 'input format':
                case 'input':
                    inputFormat = sectionContent.trim();
                    break;
                case 'output format':
                case 'output':
                    outputFormat = sectionContent.trim();
                    break;
                case 'constraints':
                    constraints = sectionContent.trim();
                    break;
                case 'solution':
                case 'answer':
                case 'final answer':
                    // Clean up solution content - remove footer lines
                    let cleanedSolution = sectionContent.trim()
                        .replace(/\*Created with CODEER Platform\*/g, '')
                        .replace(/\*created by [^*]+\*/g, '')
                        .replace(/\*Created by [^*]+\*/g, '')
                        .replace(/---+/g, '')
                        .trim();
                    finalAnswer = cleanedSolution;
                    break;
            }
        }

        // Add last example
        if (currentExample.input || currentExample.output) {
            examples.push({
                input: currentExample.input || '',
                output: currentExample.output || '',
                explanation: currentExample.explanation || ''
            });
        }

        return {
            id: filename.replace('.md', ''),
            title: title || 'Untitled Problem',
            difficulty,
            category,
            description,
            inputFormat,
            outputFormat,
            constraints,
            examples,
            tags,
            finalAnswer,
            author,
            filename,
            rawContent: content,
            createdAt: new Date() // Add a default creation date for GitHub problems
        };
    } catch (error) {
        console.error(`❌ Error parsing ${filename}:`, error);
        return null;
    }
}

// Method 4: Server-side fetch (for Next.js API routes)
export async function fetchProblemsServerSide(): Promise<GitHubProblem[]> {
    // This would be used in a Next.js API route
    // /api/problems/route.ts
    try {
        const response = await fetch(
            'https://api.github.com/repos/sriox-cloud/codeer_problems/contents/problems',
            {
                headers: {
                    'User-Agent': 'CODEER-Platform/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const files = await response.json();
        const mdFiles = files.filter((file: any) => file.name.endsWith('.md'));

        const problems: GitHubProblem[] = [];

        for (const file of mdFiles) {
            try {
                const contentResponse = await fetch(file.download_url);
                if (contentResponse.ok) {
                    const content = await contentResponse.text();
                    const problem = parseMarkdownToProblem(content, file.name);
                    if (problem) {
                        problems.push(problem);
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${file.name}:`, error);
            }
        }

        return problems;
    } catch (error) {
        console.error('Error fetching problems server-side:', error);
        return [];
    }
}
