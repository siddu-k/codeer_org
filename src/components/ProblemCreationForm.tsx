"use client";

import { useState } from 'react';
import { useToast } from '@/components/toast-provider';

interface TestCase {
    input: string;
    expected_output: string;
    explanation: string;
    is_hidden: boolean;
}

interface ProblemFormData {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    time_limit: number;
    memory_limit: number;
    boilerplate_code: string;
    solution: string;
    hints: string[];
    test_cases: TestCase[];
}

interface ProblemCreationFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const CATEGORIES = [
    'algorithms',
    'data-structures',
    'dynamic-programming',
    'graph',
    'tree',
    'array',
    'string',
    'math',
    'sorting',
    'searching'
];

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'c', name: 'C' },
    { id: 'csharp', name: 'C#' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' }
];

export function ProblemCreationForm({ onSuccess, onCancel }: ProblemCreationFormProps) {
    const [formData, setFormData] = useState<ProblemFormData>({
        title: '',
        description: '',
        difficulty: 'easy',
        category: 'algorithms',
        tags: [],
        time_limit: 2000,
        memory_limit: 256,
        boilerplate_code: '',
        solution: '',
        hints: [],
        test_cases: [
            { input: '', expected_output: '', explanation: '', is_hidden: false }
        ]
    });

    const [currentTag, setCurrentTag] = useState('');
    const [currentHint, setCurrentHint] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleInputChange = (field: keyof ProblemFormData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addTag = () => {
        if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, currentTag.trim()]
            }));
            setCurrentTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const addHint = () => {
        if (currentHint.trim()) {
            setFormData(prev => ({
                ...prev,
                hints: [...prev.hints, currentHint.trim()]
            }));
            setCurrentHint('');
        }
    };

    const removeHint = (index: number) => {
        setFormData(prev => ({
            ...prev,
            hints: prev.hints.filter((_, i) => i !== index)
        }));
    };

    const addTestCase = () => {
        setFormData(prev => ({
            ...prev,
            test_cases: [...prev.test_cases, { input: '', expected_output: '', explanation: '', is_hidden: false }]
        }));
    };

    const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
        setFormData(prev => ({
            ...prev,
            test_cases: prev.test_cases.map((tc, i) => 
                i === index ? { ...tc, [field]: value } : tc
            )
        }));
    };

    const removeTestCase = (index: number) => {
        if (formData.test_cases.length > 1) {
            setFormData(prev => ({
                ...prev,
                test_cases: prev.test_cases.filter((_, i) => i !== index)
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.title.trim() || !formData.description.trim()) {
            showToast('Title and description are required', 'error');
            return;
        }

        if (formData.test_cases.length === 0 || formData.test_cases.every(tc => !tc.input.trim() || !tc.expected_output.trim())) {
            showToast('At least one complete test case is required', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/problems/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                showToast('Problem created successfully!', 'success');
                onSuccess?.();
            } else {
                showToast(data.error || 'Failed to create problem', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-[#1a1a1a] border border-[#333] rounded-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Problem</h2>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Problem Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="e.g., Two Sum"
                            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Difficulty *
                        </label>
                        <select
                            value={formData.difficulty}
                            onChange={(e) => handleInputChange('difficulty', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="easy">🟢 Easy (50 XP)</option>
                            <option value="medium">🟡 Medium (100 XP)</option>
                            <option value="hard">🔴 Hard (150 XP)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Category *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Time Limit (ms)
                        </label>
                        <input
                            type="number"
                            value={formData.time_limit}
                            onChange={(e) => handleInputChange('time_limit', parseInt(e.target.value) || 2000)}
                            min="1000"
                            max="10000"
                            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Memory Limit (MB)
                        </label>
                        <input
                            type="number"
                            value={formData.memory_limit}
                            onChange={(e) => handleInputChange('memory_limit', parseInt(e.target.value) || 256)}
                            min="64"
                            max="1024"
                            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Problem Description *
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe the problem clearly..."
                        rows={6}
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map(tag => (
                            <span
                                key={tag}
                                className="bg-blue-600 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="text-blue-200 hover:text-white"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={currentTag}
                            onChange={(e) => setCurrentTag(e.target.value)}
                            placeholder="Add a tag..."
                            className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <button
                            type="button"
                            onClick={addTag}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Boilerplate Code */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Boilerplate Code
                    </label>
                    <textarea
                        value={formData.boilerplate_code}
                        onChange={(e) => handleInputChange('boilerplate_code', e.target.value)}
                        placeholder="function twoSum(nums, target) {&#10;    // Your code here&#10;    return [];&#10;}"
                        rows={8}
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Test Cases */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-white">
                            Test Cases * (At least 1 required)
                        </label>
                        <button
                            type="button"
                            onClick={addTestCase}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                            + Add Test Case
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.test_cases.map((testCase, index) => (
                            <div key={index} className="border border-[#333] rounded-lg p-4 bg-[#0a0a0a]">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-white font-medium">Test Case {index + 1}</h4>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center text-sm text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={testCase.is_hidden}
                                                onChange={(e) => updateTestCase(index, 'is_hidden', e.target.checked)}
                                                className="mr-1"
                                            />
                                            Hidden Test Case
                                        </label>
                                        {formData.test_cases.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeTestCase(index)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Input</label>
                                        <textarea
                                            value={testCase.input}
                                            onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                                            placeholder="Input data..."
                                            rows={3}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Expected Output</label>
                                        <textarea
                                            value={testCase.expected_output}
                                            onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                                            placeholder="Expected output..."
                                            rows={3}
                                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <label className="block text-sm text-gray-300 mb-1">Explanation (Optional)</label>
                                    <input
                                        type="text"
                                        value={testCase.explanation}
                                        onChange={(e) => updateTestCase(index, 'explanation', e.target.value)}
                                        placeholder="Explain why this output is correct..."
                                        className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hints */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Hints (Optional)
                    </label>
                    <div className="space-y-2 mb-3">
                        {formData.hints.map((hint, index) => (
                            <div key={index} className="flex items-center gap-2 bg-[#0a0a0a] border border-[#333] rounded-md p-2">
                                <span className="text-gray-300 text-sm flex-1">{hint}</span>
                                <button
                                    type="button"
                                    onClick={() => removeHint(index)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={currentHint}
                            onChange={(e) => setCurrentHint(e.target.value)}
                            placeholder="Add a hint..."
                            className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHint())}
                        />
                        <button
                            type="button"
                            onClick={addHint}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add Hint
                        </button>
                    </div>
                </div>

                {/* Solution */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Reference Solution (Optional)
                    </label>
                    <textarea
                        value={formData.solution}
                        onChange={(e) => handleInputChange('solution', e.target.value)}
                        placeholder="Provide a reference solution with explanation..."
                        rows={8}
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-[#333] text-gray-300 rounded-md hover:bg-[#1a1a1a] transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Creating...' : 'Create Problem'}
                    </button>
                </div>
            </form>
        </div>
    );
}