'use client';

import { Button } from '@/components/ui/button';
import { Sun, Moon, UserCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/icons/Logo';
import SidebarNav from './SidebarNav'; // This is our horizontal nav

export default function AppHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  let themeToggle;
  if (mounted) {
    themeToggle = (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    );
  } else {
    themeToggle = <Button variant="ghost" size="icon" disabled aria-label="Toggle theme"><Sun className="h-5 w-5" /></Button>;
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground hidden sm:block">RamBo Agent</h1>
        </Link>
        {/* SidebarNav is now used as a horizontal navigation component */}
        <nav className="flex items-center"> 
          <SidebarNav />
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {themeToggle}
        <Link href="/profile" passHref legacyBehavior>
          <Button variant="ghost" size="icon" aria-label="Profile" asChild>
            <a><UserCircle className="h-5 w-5" /></a>
          </Button>
        </Link>
      </div>
    </header>
  );
}
