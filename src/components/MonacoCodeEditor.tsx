"use client";

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useToast } from '@/components/toast-provider';

interface MonacoCodeEditorProps {
    problem: {
        id: string;
        title: string;
        boilerplate_code: string;
        examples: Array<{
            input: string;
            expected_output: string;
            explanation: string;
        }>;
        time_limit: number;
        memory_limit: number;
        marks: number;
    };
    onSubmissionResult?: (result: any) => void;
}

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', monacoId: 'javascript' },
    { id: 'python', name: 'Python', monacoId: 'python' },
    { id: 'java', name: 'Java', monacoId: 'java' },
    { id: 'cpp', name: 'C++', monacoId: 'cpp' },
    { id: 'c', name: 'C', monacoId: 'c' }
];

const DEFAULT_CODE = {
    javascript: `function solution() {
    // Your code here
    return null;
}`,
    python: `def solution():
    # Your code here
    return None`,
    java: `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
    cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
    c: `#include <stdio.h>

int main() {
    // Your code here
    return 0;
}`
};

export function MonacoCodeEditor({ problem, onSubmissionResult }: MonacoCodeEditorProps) {
    const [code, setCode] = useState(problem.boilerplate_code || DEFAULT_CODE.javascript);
    const [language, setLanguage] = useState('javascript');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [showSolution, setShowSolution] = useState(false);
    const [solution, setSolution] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        const defaultCode = problem.boilerplate_code || DEFAULT_CODE[language as keyof typeof DEFAULT_CODE];
        setCode(defaultCode);
    }, [language, problem.boilerplate_code]);

    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
        const defaultCode = problem.boilerplate_code || DEFAULT_CODE[newLanguage as keyof typeof DEFAULT_CODE];
        setCode(defaultCode);
    };

    const handleRun = async () => {
        if (!code.trim()) {
            showToast('Please write some code first', 'error');
            return;
        }

        setIsRunning(true);
        setResults(null);

        try {
            const response = await fetch('/api/judge0/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    problem_id: problem.id,
                    code,
                    language
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResults(data);
                onSubmissionResult?.(data);
                
                if (data.status === 'Accepted') {
                    showToast(`🎉 All test cases passed! +${problem.marks} XP`, 'success');
                } else {
                    showToast(`${data.status} - ${data.passed_count}/${data.total_count} test cases passed`, 'error');
                }
            } else {
                showToast(data.error || 'Submission failed', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await handleRun();
        setIsSubmitting(false);
    };

    const handleViewSolution = async () => {
        try {
            const response = await fetch(`/api/problems/${problem.id}/solution`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                setSolution(data.solution);
                setShowSolution(true);
                
                if (data.xp_penalty > 0) {
                    showToast(`Solution unlocked! Note: Future XP for this problem reduced by ${data.xp_penalty} points.`, 'info');
                } else {
                    showToast('Solution unlocked!', 'success');
                }
            } else {
                showToast(data.error || 'Failed to load solution', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        }
    };

    return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333]">
                <div className="flex items-center gap-4">
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="px-3 py-1 bg-[#0a0a0a] border border-[#333] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id}>
                                {lang.name}
                            </option>
                        ))}
                    </select>
                    
                    <div className="text-sm text-gray-400">
                        {problem.title} • {problem.time_limit}ms • {problem.memory_limit}MB
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleViewSolution}
                        className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm transition-colors"
                    >
                        💡 Solution
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isRunning || isSubmitting}
                        className="px-4 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-sm transition-colors"
                    >
                        {isRunning ? 'Running...' : '▶ Run'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isRunning || isSubmitting}
                        className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-sm transition-colors"
                    >
                        {isSubmitting ? 'Submitting...' : '✓ Submit'}
                    </button>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="h-96">
                <Editor
                    height="100%"
                    language={LANGUAGES.find(l => l.id === language)?.monacoId || 'javascript'}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        insertSpaces: true,
                        wordWrap: 'on',
                        contextmenu: false,
                        selectOnLineNumbers: true
                    }}
                />
            </div>

            {/* Results */}
            {results && (
                <div className="border-t border-[#333] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-medium">Execution Results</h3>
                        <div className={`px-3 py-1 rounded-md text-sm font-medium ${
                            results.status === 'Accepted' 
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-red-900/30 text-red-400'
                        }`}>
                            {results.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-gray-400 text-xs">Test Cases</div>
                            <div className="text-white font-medium">
                                {results.passed_count}/{results.total_count}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-400 text-xs">Runtime</div>
                            <div className="text-white font-medium">
                                {results.runtime ? `${results.runtime}ms` : 'N/A'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-400 text-xs">Memory</div>
                            <div className="text-white font-medium">
                                {results.memory ? `${results.memory}KB` : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Test Case Results */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {results.test_case_results?.map((result: any, index: number) => (
                            <div key={index} className={`p-3 rounded-md border ${
                                result.passed 
                                    ? 'border-green-700 bg-green-900/20'
                                    : 'border-red-700 bg-red-900/20'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white text-sm font-medium">
                                        Test Case {index + 1} {result.is_hidden ? '(Hidden)' : ''}
                                    </span>
                                    <span className={`text-sm ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.passed ? '✓ Passed' : '✗ Failed'}
                                    </span>
                                </div>
                                
                                {!result.is_hidden && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <div className="text-gray-400 mb-1">Input:</div>
                                            <div className="bg-[#0a0a0a] p-2 rounded border border-[#444] text-gray-300 font-mono">
                                                {problem.examples[index]?.input || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 mb-1">Expected vs Actual:</div>
                                            <div className="bg-[#0a0a0a] p-2 rounded border border-[#444] text-gray-300 font-mono">
                                                <div className="text-green-400">Expected: {result.expected_output || 'N/A'}</div>
                                                <div className="text-blue-400">Actual: {result.stdout || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Compilation/Runtime Errors */}
                    {results.compile_output && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
                            <div className="text-red-400 text-sm font-medium mb-2">Compilation Error:</div>
                            <pre className="text-red-300 text-xs font-mono whitespace-pre-wrap">
                                {results.compile_output}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Solution Modal */}
            {showSolution && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">Solution</h3>
                                <button
                                    onClick={() => setShowSolution(false)}
                                    className="text-gray-400 hover:text-gray-300"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="bg-[#0a0a0a] border border-[#333] rounded-md overflow-hidden">
                                <Editor
                                    height="400px"
                                    language="javascript"
                                    value={solution || 'No solution available for this problem.'}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}