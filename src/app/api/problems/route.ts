import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    examples: Array<{
        input: string;
        output: string;
        explanation: string;
    }>;
    solution?: string;
    createdBy?: string;
    createdAt: Date;
    filename: string;
}

// Function to parse markdown content and extract problem data
function parseProblemMarkdown(content: string, filename: string): Problem | null {
    try {
        const lines = content.split('\n');
        let currentSection = '';
        const problem: Partial<Problem> = {
            examples: [],
            tags: [],
            filename: filename
        };

        // Extract title from first line
        const titleMatch = lines[0].match(/^#\s+(.+)$/);
        if (titleMatch) {
            problem.title = titleMatch[1].trim();
        }
        // Always set the ID based on filename to ensure uniqueness
        problem.id = filename.replace('.md', '');

        let i = 1;
        while (i < lines.length) {
            const line = lines[i].trim();

            // Parse metadata
            if (line.startsWith('**Difficulty:**')) {
                const difficultyMatch = line.match(/\*\*Difficulty:\*\*\s*[🟢🟡🔴⚪]\s*(\w+)/);
                if (difficultyMatch) {
                    problem.difficulty = difficultyMatch[1].toLowerCase() as 'easy' | 'medium' | 'hard';
                }
            } else if (line.startsWith('**Category:**')) {
                const categoryMatch = line.match(/\*\*Category:\*\*\s*(.+)$/);
                if (categoryMatch) {
                    problem.category = categoryMatch[1].trim();
                }
            } else if (line.startsWith('**Tags:**')) {
                const tagsMatch = line.match(/\*\*Tags:\*\*\s*(.+)$/);
                if (tagsMatch) {
                    problem.tags = tagsMatch[1].split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                }
            }
            // Parse sections
            else if (line.startsWith('## Problem Description')) {
                currentSection = 'description';
                i++;
                let description = '';
                while (i < lines.length && !lines[i].startsWith('##')) {
                    if (lines[i].trim() !== '') {
                        description += lines[i] + '\n';
                    }
                    i++;
                }
                problem.description = description.trim();
                continue;
            } else if (line.startsWith('## Input Format')) {
                currentSection = 'inputFormat';
                i++;
                let inputFormat = '';
                while (i < lines.length && !lines[i].startsWith('##')) {
                    if (lines[i].trim() !== '') {
                        inputFormat += lines[i] + '\n';
                    }
                    i++;
                }
                problem.inputFormat = inputFormat.trim();
                continue;
            } else if (line.startsWith('## Output Format')) {
                currentSection = 'outputFormat';
                i++;
                let outputFormat = '';
                while (i < lines.length && !lines[i].startsWith('##')) {
                    if (lines[i].trim() !== '') {
                        outputFormat += lines[i] + '\n';
                    }
                    i++;
                }
                problem.outputFormat = outputFormat.trim();
                continue;
            } else if (line.startsWith('## Constraints')) {
                currentSection = 'constraints';
                i++;
                let constraints = '';
                while (i < lines.length && !lines[i].startsWith('##')) {
                    if (lines[i].trim() !== '') {
                        constraints += lines[i] + '\n';
                    }
                    i++;
                }
                problem.constraints = constraints.trim();
                continue;
            } else if (line.startsWith('## Examples')) {
                currentSection = 'examples';
                i++;
                while (i < lines.length && !lines[i].startsWith('##')) {
                    if (lines[i].startsWith('### Example')) {
                        // Parse example
                        const example = { input: '', output: '', explanation: '' };
                        i++;

                        // Look for Input
                        while (i < lines.length && !lines[i].startsWith('**Input:**') && !lines[i].startsWith('###') && !lines[i].startsWith('##')) {
                            i++;
                        }
                        if (lines[i] && lines[i].startsWith('**Input:**')) {
                            i++;
                            if (lines[i] && lines[i].startsWith('```')) {
                                i++;
                                while (i < lines.length && !lines[i].startsWith('```')) {
                                    example.input += lines[i] + '\n';
                                    i++;
                                }
                                example.input = example.input.trim();
                                i++; // Skip closing ```
                            }
                        }

                        // Look for Output
                        while (i < lines.length && !lines[i].startsWith('**Output:**') && !lines[i].startsWith('###') && !lines[i].startsWith('##')) {
                            i++;
                        }
                        if (lines[i] && lines[i].startsWith('**Output:**')) {
                            i++;
                            if (lines[i] && lines[i].startsWith('```')) {
                                i++;
                                while (i < lines.length && !lines[i].startsWith('```')) {
                                    example.output += lines[i] + '\n';
                                    i++;
                                }
                                example.output = example.output.trim();
                                i++; // Skip closing ```
                            }
                        }

                        // Look for Explanation
                        while (i < lines.length && !lines[i].startsWith('**Explanation:**') && !lines[i].startsWith('###') && !lines[i].startsWith('##')) {
                            i++;
                        }
                        if (lines[i] && lines[i].startsWith('**Explanation:**')) {
                            const explanationMatch = lines[i].match(/\*\*Explanation:\*\*\s*(.+)$/);
                            if (explanationMatch) {
                                example.explanation = explanationMatch[1].trim();
                            }
                        }

                        problem.examples!.push(example);
                    } else {
                        i++;
                    }
                }
                continue;
            } else if (line.startsWith('## Solution')) {
                currentSection = 'solution';
                i++;
                let solution = '';
                while (i < lines.length && !lines[i].startsWith('##') && !lines[i].startsWith('---')) {
                    if (lines[i].trim() !== '') {
                        solution += lines[i] + '\n';
                    }
                    i++;
                }
                problem.solution = solution.trim();
                continue;
            }
            // Parse created by
            else if (line.includes('*created by ') && line.includes('*')) {
                const createdByMatch = line.match(/\*created by ([^*]+)\*/);
                if (createdByMatch) {
                    problem.createdBy = createdByMatch[1].trim();
                }
            }

            i++;
        }

        // Set default values and creation date
        problem.createdAt = new Date(); // In a real app, you'd get this from file stats

        // Ensure required fields have default values
        if (!problem.difficulty) problem.difficulty = 'easy';
        if (!problem.category) problem.category = 'general';
        if (!problem.title) problem.title = filename.replace('.md', '');
        if (!problem.description) problem.description = 'No description provided';
        if (!problem.tags) problem.tags = [];

        return problem as Problem;
    } catch (error) {
        console.error(`Error parsing problem ${filename}:`, error);
        return null;
    }
}

export async function GET() {
    try {
        const problemsDir = path.join(process.cwd(), 'problems');

        // Check if problems directory exists
        if (!fs.existsSync(problemsDir)) {
            console.log('Problems directory does not exist');
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(problemsDir);
        const markdownFiles = files.filter(file => file.endsWith('.md') && file !== 'README.md');

        const problems: Problem[] = [];

        for (const file of markdownFiles) {
            try {
                const filePath = path.join(problemsDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const problem = parseProblemMarkdown(content, file);

                if (problem) {
                    // Get file stats for creation date
                    const stats = fs.statSync(filePath);
                    problem.createdAt = stats.mtime; // Modified time as creation time
                    problems.push(problem);
                }
            } catch (error) {
                console.error(`Error reading problem file ${file}:`, error);
            }
        }

        return NextResponse.json(problems);
    } catch (error) {
        console.error('Error loading problems:', error);
        return NextResponse.json({ error: 'Failed to load problems' }, { status: 500 });
    }
}
