import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface GitHubFile {
    name: string;
    download_url: string;
}

interface GitHubProblem {
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
    tags: string[]; // Changed from string to string[] for consistency
    finalAnswer?: string;
    author?: string;
    filename: string;
    createdAt?: Date;
}

// Cache to avoid repeated requests
let cachedProblems: GitHubProblem[] | null = null;
let lastFetch = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
    try {
        // Get user session to access their GitHub token
        const session = await getServerSession(authOptions);
        const userAccessToken = (session as any)?.accessToken;

        console.log('🔐 User session check:', session?.user?.email ? 'Authenticated' : 'Not authenticated');
        console.log('🎫 Access token available:', userAccessToken ? 'Yes' : 'No');

        const { searchParams } = new URL(request.url);
        const forceRefresh = searchParams.has('refresh'); // Check if refresh parameter is present

        // Check cache first (only if not forcing refresh)
        if (!forceRefresh && cachedProblems && Date.now() - lastFetch < CACHE_DURATION) {
            console.log('📦 Returning cached problems');
            return NextResponse.json({
                success: true,
                problems: cachedProblems,
                cached: true,
                count: cachedProblems.length
            });
        }

        if (forceRefresh) {
            console.log('🔄 Force refresh requested - clearing cache');
            cachedProblems = null; // Clear the cache
            lastFetch = 0;
        }

        console.log('🔄 Fetching fresh problems from GitHub...');

        // Hybrid approach: Try GitHub API first (minimal usage), then fallback to scraping
        // Pass the user's access token for authenticated requests
        const problems = await fetchWithHybridApproach(userAccessToken);

        // Update cache
        cachedProblems = problems;
        lastFetch = Date.now();

        return NextResponse.json({
            success: true,
            problems,
            cached: false,
            count: problems.length,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in problems API:', error);

        // Return cached data if available, even if stale
        if (cachedProblems) {
            return NextResponse.json({
                success: true,
                problems: cachedProblems,
                cached: true,
                stale: true,
                count: cachedProblems.length,
                error: 'Using stale cache due to fetch error'
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch problems',
            problems: [],
            count: 0
        }, { status: 500 });
    }
}

// Hybrid fetching approach: API first, then scraping fallback
async function fetchWithHybridApproach(userAccessToken?: string): Promise<GitHubProblem[]> {
    console.log('🔄 Starting hybrid fetch approach...');

    // Try GitHub API first (minimal usage)
    const apiProblems = await tryGitHubAPI(userAccessToken);
    if (apiProblems.length > 0) {
        console.log(`✅ GitHub API successful: ${apiProblems.length} problems`);
        return apiProblems;
    }

    // Fallback to scraping method
    console.log('🌐 API failed/limited, falling back to scraping...');
    return await fetchViaScraping();
}

// Method 1: GitHub API (minimal usage - only 1 API call)
async function tryGitHubAPI(userAccessToken?: string): Promise<GitHubProblem[]> {
    try {
        console.log('🔑 Attempting GitHub API...');

        // Single API call to get the contents of the problems directory
        const apiUrl = 'https://api.github.com/repos/sriox-cloud/codeer_problems/contents/problems';

        // Determine which token to use - prioritize user's token, then fallback to app token
        const authToken = userAccessToken || process.env.GITHUB_TOKEN;
        console.log('🎫 Using token type:', userAccessToken ? 'User OAuth token' : 'App token');

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'codeer-problems-fetcher',
                'Accept': 'application/vnd.github.v3+json',
                // Add auth header if any token is available
                ...(authToken && {
                    'Authorization': `token ${authToken}`
                })
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ GitHub API response: ${response.status} ${response.statusText}`);
            return [];
        }

        const files: GitHubFile[] = await response.json();
        const mdFiles = files.filter(file => file.name.endsWith('.md'));

        console.log(`📁 Found ${mdFiles.length} .md files via API`);

        const problems: GitHubProblem[] = [];

        // Fetch each file using download_url (these are raw.githubusercontent.com URLs - no API calls)
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

                // Small delay to be respectful
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error(`❌ Error fetching ${file.name}:`, error);
            }
        }

        return problems;
    } catch (error) {
        console.error('❌ GitHub API error:', error);
        return [];
    }
}

// Method 2: Web scraping fallback (existing method renamed)
async function fetchViaScraping(): Promise<GitHubProblem[]> {
    const problems: GitHubProblem[] = [];

    try {
        console.log('🌐 Discovering files via web scraping (no API)...');

        // Method 1: Try to scrape GitHub page to get file list
        const fileList = await scrapeGitHubProblemsPage();

        if (fileList.length > 0) {
            // Fetch each file using raw URLs
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
                    console.error(`❌ Error fetching ${filename}:`, error);
                }
            }
        } else {
            // Files actually found in the repository (will be updated as we discover more)
            const knownFiles = [
                'nine-love-php144.md',
                'test.md',
                // Add common problem file patterns to ensure we catch any new files
                'two-sum.md',
                'add-two-numbers.md',
                'longest-substring.md',
                'median-two-sorted-arrays.md',
                'longest-palindromic-substring.md',
                'zigzag-conversion.md',
                'reverse-integer.md',
                'string-to-integer.md',
                'palindrome-number.md',
                'regular-expression-matching.md',
                'container-with-most-water.md',
                'integer-to-roman.md',
                'roman-to-integer.md',
                'longest-common-prefix.md',
                'three-sum.md',
                'three-sum-closest.md',
                'letter-combinations.md',
                'four-sum.md',
                'remove-nth-node.md',
                'valid-parentheses.md',
                'merge-two-sorted-lists.md',
                'generate-parentheses.md',
                'merge-k-sorted-lists.md',
                'swap-nodes-pairs.md',
                'reverse-nodes-k-group.md',
                'remove-duplicates.md',
                'remove-element.md',
                'implement-strstr.md',
                'divide-two-integers.md',
                'substring-concatenation.md',
                'next-permutation.md',
                'longest-valid-parentheses.md',
                'search-rotated-array.md',
                'find-first-last-position.md',
                'search-insert-position.md',
                'valid-sudoku.md',
                'sudoku-solver.md',
                'count-and-say.md',
                'combination-sum.md',
                'combination-sum-ii.md',
                'first-missing-positive.md',
                'trapping-rain-water.md',
                'multiply-strings.md',
                'wildcard-matching.md',
                'jump-game.md',
                'jump-game-ii.md',
                'permutations.md',
                'permutations-ii.md',
                'rotate-image.md',
                'group-anagrams.md',
                'pow-x-n.md',
                'maximum-subarray.md',
                'spiral-matrix.md',
                'n-queens.md',
                'n-queens-ii.md',
                'minimum-path-sum.md',
                'unique-paths.md',
                'unique-paths-ii.md',
                'plus-one.md',
                'add-binary.md',
                'text-justification.md',
                'sqrt-x.md',
                'climbing-stairs.md',
                'simplify-path.md',
                'edit-distance.md',
                'set-matrix-zeroes.md',
                'search-2d-matrix.md',
                'sort-colors.md',
                'minimum-window-substring.md',
                'combinations.md',
                'subsets.md',
                'word-search.md',
                'remove-duplicates-ii.md',
                'search-rotated-array-ii.md',
                'remove-duplicates-list.md',
                'remove-duplicates-list-ii.md',
                'partition-list.md',
                'reverse-linked-list-ii.md',
                'restore-ip-addresses.md',
                'binary-tree-inorder.md',
                'unique-binary-search-trees.md',
                'unique-binary-search-trees-ii.md',
                'interleaving-string.md',
                'validate-binary-search-tree.md',
                'recover-binary-search-tree.md',
                'same-tree.md',
                'symmetric-tree.md',
                'binary-tree-level-order.md',
                'binary-tree-zigzag.md',
                'binary-tree-level-order-ii.md',
                'construct-binary-tree.md',
                'construct-binary-tree-ii.md',
                'convert-sorted-array-bst.md',
                'convert-sorted-list-bst.md',
                'balanced-binary-tree.md',
                'minimum-depth-binary-tree.md',
                'path-sum.md',
                'path-sum-ii.md',
                'flatten-binary-tree.md',
                'distinct-subsequences.md',
                'populating-next-right-pointers.md',
                'populating-next-right-pointers-ii.md',
                'pascal-triangle.md',
                'pascal-triangle-ii.md',
                'triangle.md',
                'best-time-buy-sell-stock.md',
                'best-time-buy-sell-stock-ii.md',
                'best-time-buy-sell-stock-iii.md',
                'binary-tree-maximum-path-sum.md',
                'valid-palindrome.md',
                'single-number.md',
                'single-number-ii.md',
                'copy-list-random-pointer.md',
                'word-break.md',
                'word-break-ii.md',
                'linked-list-cycle.md',
                'linked-list-cycle-ii.md',
                'reorder-list.md',
                'binary-tree-preorder.md',
                'binary-tree-postorder.md',
                'lru-cache.md',
                'insertion-sort-list.md',
                'sort-list.md',
                'max-points-line.md',
                'evaluate-reverse-polish.md',
                'reverse-words-string.md',
                'maximum-product-subarray.md',
                'find-minimum-rotated-sorted-array.md',
                'find-minimum-rotated-sorted-array-ii.md',
                'min-stack.md',
                'binary-tree-upside-down.md',
                'read-n-characters-given-read4.md',
                'read-n-characters-given-read4-ii.md',
                'longest-substring-at-most-two.md',
                'excel-sheet-column-title.md',
                'majority-element.md',
                'excel-sheet-column-number.md',
                'factorial-trailing-zeroes.md',
                'binary-search-tree-iterator.md',
                'reverse-bits.md',
                'number-1-bits.md',
                'happy-number.md',
                'remove-linked-list-elements.md',
                'count-primes.md',
                'isomorphic-strings.md',
                'reverse-linked-list.md',
                'course-schedule.md',
                'implement-trie.md',
                'course-schedule-ii.md',
                'add-search-word.md',
                'word-search-ii.md',
                'house-robber.md',
                'binary-tree-right-side-view.md',
                'number-islands.md',
                'bitwise-and-numbers-range.md',
                'happy-number.md',
                'remove-linked-list-elements.md',
                'count-primes.md',
                'isomorphic-strings.md',
                'contains-duplicate.md',
                'contains-duplicate-ii.md',
                'contains-duplicate-iii.md',
                'maximal-square.md',
                'count-complete-tree-nodes.md',
                'rectangle-area.md',
                'basic-calculator.md',
                'basic-calculator-ii.md',
                'summary-ranges.md',
                'majority-element-ii.md',
                'kth-smallest-element-bst.md',
                'power-of-two.md',
                'implement-queue-using-stacks.md',
                'implement-stack-using-queues.md',
                'palindromic-substrings.md',
                'longest-increasing-subsequence.md',
                'best-time-buy-sell-stock-iv.md',
                'best-time-buy-sell-stock-cooldown.md',
                'minimum-height-trees.md',
                'burst-balloons.md',
                'range-sum-query.md',
                'range-sum-query-2d.md',
                'range-sum-query-mutable.md',
                'additive-number.md',
                'range-addition.md',
                'coin-change.md',
                'wiggle-subsequence.md',
                'power-of-three.md',
                'power-of-four.md',
                'reverse-string.md',
                'reverse-vowels-string.md',
                'moving-average-data-stream.md',
                'top-k-frequent-elements.md',
                'intersection-two-arrays.md',
                'intersection-two-arrays-ii.md',
                'design-twitter.md',
                'data-stream-disjoint-intervals.md',
                'android-unlock-patterns.md',
                'design-snake-game.md',
                'line-reflection.md',
                'coin-change-2.md',
                'russian-doll-envelopes.md',
                'sum-root-leaf-numbers.md',
                'surrounded-regions.md',
                'palindrome-partitioning.md',
                'palindrome-partitioning-ii.md',
                'clone-graph.md',
                'gas-station.md',
                'candy.md',
                'word-ladder.md',
                'word-ladder-ii.md',
                'longest-consecutive-sequence.md'
            ]; for (const filename of knownFiles) {
                try {
                    const rawUrl = `https://raw.githubusercontent.com/sriox-cloud/codeer_problems/main/problems/${filename}`;
                    const response = await fetch(rawUrl);

                    if (response.ok) {
                        const content = await response.text();
                        const problem = parseMarkdownToProblem(content, filename);
                        if (problem) {
                            problems.push(problem);
                        }
                    }

                    // Small delay
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    // Silently continue if file doesn't exist
                    continue;
                }
            }
        }

        return problems;

    } catch (error) {
        console.error('❌ Error in direct fetching:', error);
        return [];
    }
}

// Scrape GitHub page to get list of .md files (NO API)
async function scrapeGitHubProblemsPage(): Promise<string[]> {
    try {
        const pageUrl = 'https://github.com/sriox-cloud/codeer_problems/tree/main/problems';

        console.log('🔍 Attempting to scrape GitHub page...');

        // Use a CORS proxy for client-side scraping
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Scraping failed: ${response.status}`);
        }

        const data = await response.json();
        const html = data.contents;

        console.log('📄 Scraped HTML length:', html.length);

        // Multiple patterns to extract .md files
        const patterns = [
            // Pattern 1: Standard GitHub file links in various formats
            /href="[^"]*\/([^"\/]*\.md)"/gi,
            // Pattern 2: File table entries with quotes
            /"([^"]*\.md)"/gi,
            // Pattern 3: File mentions without quotes  
            /([a-zA-Z0-9_-]+\.md)\b/gi,
            // Pattern 4: JSON-like structure file names
            /"name":"([^"]*\.md)"/gi,
            // Pattern 5: More specific href patterns
            /href="[^"]*\/blob\/[^"]*\/([^"\/]*\.md)"/gi,
            // Pattern 6: Tree view patterns
            /\/tree\/[^"]*\/([^"\/]*\.md)/gi
        ];

        const matches = new Set<string>();

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const filename = match[1];
                if (filename && filename.endsWith('.md') && !filename.includes('/')) {
                    matches.add(filename);
                }
            }
        }

        const fileList = Array.from(matches);

        return fileList;
    } catch (error) {
        console.error('❌ Scraping failed:', error);
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

                // Also try text-based difficulty
                const textMatch = line.toLowerCase();
                if (textMatch.includes('easy')) difficulty = 'easy';
                else if (textMatch.includes('medium')) difficulty = 'medium';
                else if (textMatch.includes('hard')) difficulty = 'hard';
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
                    const contentLine = lines[i].replace(/```/g, '').trim();
                    if (contentLine !== '') {
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
                while (i < lines.length && !lines[i].includes('**Explanation:**') && !lines[i].startsWith('### ') && !lines[i].startsWith('## ')) {
                    const contentLine = lines[i].replace(/```/g, '').trim();
                    if (contentLine !== '') {
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
            createdAt: new Date() // Add default creation date for GitHub problems
        };
    } catch (error) {
        console.error(`❌ Error parsing ${filename}:`, error);
        return null;
    }
}
