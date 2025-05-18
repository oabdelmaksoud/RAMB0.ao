
'use client';

import { Button } from '@/components/ui/button';
import { Sun, Moon, UserCircle, Settings } from 'lucide-react'; // Removed LayoutDashboard as it's in SidebarNav now
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/icons/Logo';
import SidebarNav from './SidebarNav';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function AppHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  let themeToggle;
  if (mounted) {
    themeToggle = (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle theme</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else {
    themeToggle = <Button variant="ghost" size="icon" disabled aria-label="Toggle theme"><Sun className="h-5 w-5" /></Button>;
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/portfolio-dashboard" className="flex items-center gap-2"> {/* Points to Portfolio Dashboard */}
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground hidden sm:block">RamBo Agent</h1>
        </Link>
        <nav className="flex items-center">
            <SidebarNav />
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {themeToggle}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/settings" passHref> {/* No asChild */}
                <Button variant="ghost" size="icon" aria-label="Admin Settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Admin Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/profile" passHref> {/* No asChild */}
                <Button variant="ghost" size="icon" aria-label="Profile">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
