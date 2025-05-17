
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/AppHeader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RamBo Agent - Project Management Platform',
  description: 'Automate and manage your projects with intelligent agents.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AppHeader />
        <main className="flex-1 bg-background overflow-y-auto pt-20 px-4 pb-4 sm:px-6 sm:pb-6 md:px-8 md:pb-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
