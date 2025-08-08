import Link from 'next/link';
import { ArrowLeftIcon, GitHubLogoIcon, EyeOpenIcon, EyeClosedIcon } from '@radix-ui/react-icons';
import { GitHubSignInButton } from '../../components/github-signin-button';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast-provider';

export default function LoginPage() {
    const [loginMethod, setLoginMethod] = useState<'github' | 'email'>('email');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
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

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password) {
            showToast('Email and password are required', 'error');
            return;
        }

        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                showToast('Invalid email or password', 'error');
            } else if (result?.ok) {
                showToast('Login successful!', 'success');
                router.push('/home');
            }
        } catch (error) {
            showToast('Login failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-black relative" style={{ background: 'black' }}>
            {/* Back button in top left corner */}
            <Link
                href="/"
                className="absolute top-4 left-4 hover:bg-gray-800 text-gray-400 hover:text-gray-300 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                back
            </Link>

            {/* Main content - responsive layout */}
            <div className="flex flex-col md:flex-row min-h-screen pt-16 md:pt-0">
                {/* Left side - Login options */}
                <div className="w-full md:w-2/5 flex flex-col justify-center items-center px-4 md:px-8 py-8 md:py-0 min-h-[50vh] md:min-h-0">
                    <div className="w-full max-w-sm space-y-6">
                        {/* Welcome text */}
                        <div className="space-y-3 md:space-y-4">
                            <h2 className="text-white text-2xl md:text-3xl font-semibold">
                                Welcome Back
                            </h2>
                            <p className="text-gray-500 text-sm">
                                Sign in to continue your coding journey
                            </p>
                        </div>

                        {/* Login method toggle */}
                        <div className="flex bg-gray-900 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setLoginMethod('email')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                    loginMethod === 'email'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                Email
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginMethod('github')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                    loginMethod === 'github'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                GitHub
                            </button>
                        </div>

                        {/* Email login form */}
                        {loginMethod === 'email' && (
                            <form onSubmit={handleEmailLogin} className="space-y-4">
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
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter your password"
                                            required
                                            className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                                        >
                                            {showPassword ? <EyeClosedIcon className="w-4 h-4" /> : <EyeOpenIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                                        Forgot password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </form>
                        )}

                        {/* GitHub login */}
                        {loginMethod === 'github' && (
                            <div className="space-y-4">
                                <GitHubSignInButton />
                                <p className="text-gray-500 text-xs text-center">
                                    GitHub login provides access to Pages feature
                                </p>
                            </div>
                        )}

                        {/* Sign up link */}
                        <div className="text-center">
                            <p className="text-gray-500 text-sm">
                                Don't have an account?{' '}
                                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                                    Sign up
                                </Link>
                            </p>
                        </div>

                        {/* Quote section */}
                        <div className="space-y-3 md:space-y-4 pt-4 md:pt-6">
                            <blockquote className="text-gray-300 text-base md:text-lg italic font-light leading-relaxed">
                                "Code, solve, and grow with every challenge"
                            </blockquote>
                        </div>

                        {/* Additional info */}
                        <div className="space-y-2 md:space-y-3 pt-3 md:pt-4">
                            <p className="text-gray-500 text-xs md:text-sm">
                                By continuing, you agree to our Terms of Service
                            </p>
                            <div className="flex items-center justify-center space-x-3 md:space-x-4 text-gray-500 text-xs md:text-sm">
                                <span>Secure</span>
                                <span>•</span>
                                <span>Fast</span>
                                <span>•</span>
                                <span>Reliable</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vertical divider - hidden on mobile */}
                <div className="hidden md:block w-px bg-gray-800"></div>

                {/* Right side - Codeer branding (larger section on desktop, full width on mobile) */}
                <div className="w-full md:w-3/5 flex flex-col justify-center items-center px-4 md:px-8 py-8 md:py-0 relative overflow-hidden min-h-[50vh] md:min-h-0">
                    {/* Strategic Grid Lines - responsive */}
                    <div className="absolute inset-0">
                        {/* Horizontal lines */}
                        <div className="absolute w-full h-px bg-gray-600 opacity-30" style={{ top: '25%' }}></div>
                        <div className="absolute w-full h-px bg-gray-600 opacity-30" style={{ top: '50%' }}></div>
                        <div className="absolute w-full h-px bg-gray-600 opacity-30" style={{ top: '75%' }}></div>

                        {/* Vertical lines */}
                        <div className="absolute h-full w-px bg-gray-600 opacity-30" style={{ left: '25%' }}></div>
                        <div className="absolute h-full w-px bg-gray-600 opacity-30" style={{ left: '50%' }}></div>
                        <div className="absolute h-full w-px bg-gray-600 opacity-30" style={{ left: '75%' }}></div>
                    </div>

                    {/* Logo container with matching color box - responsive */}
                    <div className="relative z-10 text-center">
                        {/* Visible box around logo - responsive padding */}
                        <div className="relative inline-block p-8 md:p-16 rounded-lg md:rounded-xl border-2 md:border-4 border-gray-600 bg-gray-600/30 backdrop-blur-sm shadow-2xl">
                            {/* Grid gap area - responsive */}
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
                                {/* Optional: Add a subtle tagline - responsive */}
                                <p className="text-gray-500 text-xs md:text-sm mt-3 md:mt-6 tracking-widest uppercase font-light">
                                    solve • learn • compete
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
