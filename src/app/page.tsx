"use client";

import Link from 'next/link';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/home");
    }
  }, [status, router]);

  return (
    <div className="w-full h-screen bg-black relative">
      {/* Login with GitHub button in top right corner */}
      <Link
        href="/login"
        className="absolute top-4 right-4 bg-white hover:bg-gray-50 text-black px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 text-xs md:text-sm font-medium"
      >
        <GitHubLogoIcon className="w-3 md:w-4 h-3 md:h-4" />
        <span className="hidden sm:inline">Login with GitHub</span>
        <span className="sm:hidden">Login</span>
      </Link>
    </div>
  );
}