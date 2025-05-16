
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/AppHeader';
import SidebarNav from '@/components/layout/SidebarNav';
import Logo from '@/components/icons/Logo';
import { UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <SidebarProvider defaultOpen>
          <Sidebar className="border-r">
            <SidebarHeader className="p-4 flex items-center gap-3 border-b">
              <Link href="/" className="flex items-center gap-3">
                <Logo className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">RamBo Agent</h1>
              </Link>
            </SidebarHeader>
            <SidebarContent className="p-2">
              <SidebarNav />
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
              <Link href="/profile" passHref legacyBehavior className="w-full">
                <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                  <a>
                    <UserCircle className="h-5 w-5" />
                    <span className="font-medium">Profile</span>
                  </a>
                </Button>
              </Link>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background overflow-y-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
