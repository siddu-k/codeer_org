"use client";

import Link from 'next/link';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useToast } from '@/components/toast-provider';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) {
            showToast('Email is required', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                setSent(true);
                showToast(data.message, 'success');
            } else {
                showToast(data.error || 'Failed to send reset email', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-black relative" style={{ background: 'black' }}>
            {/* Back button */}
            <Link
                href="/login"
                className="absolute top-4 left-4 hover:bg-gray-800 text-gray-400 hover:text-gray-300 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                back to login
            </Link>

            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-3">
                        <h2 className="text-white text-2xl md:text-3xl font-semibold">
                            Reset Password
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Enter your email address and we'll send you a link to reset your password
                        </p>
                    </div>

                    {!sent ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-green-600 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-white text-lg font-medium">Check Your Email</h3>
                            <p className="text-gray-400 text-sm">
                                We've sent a password reset link to <strong>{email}</strong>
                            </p>
                            <p className="text-gray-500 text-xs">
                                Didn't receive the email? Check your spam folder or try again.
                            </p>
                        </div>
                    )}

                    <div className="text-center">
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}