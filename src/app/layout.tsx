import type { Metadata } from "next";
import { Geist, Geist_Mono, Gugi } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gugi = Gugi({
  variable: "--font-gugi",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black" style={{ background: 'black' }}>
      <head>
        <meta name="emotion-insertion-point" content="" />
        <link href="https://fonts.googleapis.com/css2?family=Gugi&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${gugi.variable} antialiased bg-black`}
        style={{ background: 'black' }}
      >
        <AuthProvider>
          <ToastProvider>
            <Providers>
              {children}
            </Providers>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
