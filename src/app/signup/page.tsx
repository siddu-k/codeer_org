"use client";

import Link from 'next/link';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast-provider';

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: ''
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (formData.password.length < 6) {
            showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    displayName: formData.displayName
                }),
            });

            const data = await response.json();

            if (data.success) {
                showToast(data.message, 'success');
                router.push('/login');
            } else {
                showToast(data.error || 'Signup failed', 'error');
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

            <div className="flex flex-col md:flex-row min-h-screen pt-16 md:pt-0">
                {/* Left side - Sign up form */}
                <div className="w-full md:w-2/5 flex flex-col justify-center items-center px-4 md:px-8 py-8 md:py-0 min-h-[50vh] md:min-h-0">
                    <div className="w-full max-w-sm space-y-6">
                        <div className="text-center space-y-3">
                            <h2 className="text-white text-2xl md:text-3xl font-semibold">
                                Create Account
                            </h2>
                            <p className="text-gray-500 text-sm">
                                Join Codeer and start your coding journey
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                                    Display Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="displayName"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                    placeholder="Your display name"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="your@email.com"
                                    required
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm your password"
                                    required
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="text-center">
                            <p className="text-gray-500 text-sm">
                                Already have an account?{' '}
                                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-gray-500 text-xs">
                                By creating an account, you agree to our Terms of Service
                            </p>
                        </div>
                    </div>
                </div>

                {/* Vertical divider */}
                <div className="hidden md:block w-px bg-gray-800"></div>

                {/* Right side - Codeer branding */}
                <div className="w-full md:w-3/5 flex flex-col justify-center items-center px-4 md:px-8 py-8 md:py-0 relative overflow-hidden min-h-[50vh] md:min-h-0">
                    {/* Grid background */}
                    <div className="absolute inset-0">
                        <div className="absolute w-full h-px bg-gray-600 opacity-30" style={{ top: '25%' }}></div>
                        <div className="absolute w-full h-px bg-gray-600 opacity-30" style={{ top: '50%' }}></div>
                        <div className="absolute w-full h-px bg-gray-600 opacity-30" style={{ top: '75%' }}></div>
                        <div className="absolute h-full w-px bg-gray-600 opacity-30" style={{ left: '25%' }}></div>
                        <div className="absolute h-full w-px bg-gray-600 opacity-30" style={{ left: '50%' }}></div>
                        <div className="absolute h-full w-px bg-gray-600 opacity-30" style={{ left: '75%' }}></div>
                    </div>

                    <div className="relative z-10 text-center">
                        <div className="relative inline-block p-8 md:p-16 rounded-lg md:rounded-xl border-2 md:border-4 border-gray-600 bg-gray-600/30 backdrop-blur-sm shadow-2xl">
                            <div
                                className="absolute bg-black rounded-lg md:rounded-xl"
                                style={{
                                    top: '-30px',
                                    left: '-30px',
                                    right: '-30px',
                                    bottom: '-30px',
                                    zIndex: -2
                                }}
                            ></div>

                            <div className="relative z-20">
                                <h1
                                    className="text-white text-4xl sm:text-5xl md:text-7xl lg:text-8xl tracking-wide uppercase select-none font-normal"
                                    style={{ fontFamily: 'Gugi, sans-serif' }}
                                >
                                    codeer
                                </h1>
                                <p className="text-gray-500 text-xs md:text-sm mt-3 md:mt-6 tracking-widest uppercase font-light">
                                    solve • learn • grow
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}