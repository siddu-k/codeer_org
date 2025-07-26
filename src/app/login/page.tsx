import Link from 'next/link';
import { ArrowLeftIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import { GitHubSignInButton } from '../../components/github-signin-button';

export default function LoginPage() {
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
                {/* Left side - GitHub login (smaller section on desktop, full width on mobile) */}
                <div className="w-full md:w-2/5 flex flex-col justify-center items-center px-4 md:px-8 py-8 md:py-0 min-h-[50vh] md:min-h-0">
                    <div className="text-center space-y-6 md:space-y-8 max-w-xs md:max-w-sm">
                        {/* Welcome text */}
                        <div className="space-y-3 md:space-y-4">
                            <h2 className="text-white text-2xl md:text-3xl font-semibold">
                                Welcome to Codeer
                            </h2>
                            <p className="text-gray-500 text-sm">
                                Sign in with your GitHub account to get started
                            </p>
                        </div>

                        {/* GitHub login button */}
                        <GitHubSignInButton />

                        {/* Quote section */}
                        <div className="space-y-3 md:space-y-4 pt-4 md:pt-6">
                            <blockquote className="text-gray-300 text-base md:text-lg italic font-light leading-relaxed">
                                "Why only GitHub? Because you are a codeer"
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
                                    code • create • collaborate
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
