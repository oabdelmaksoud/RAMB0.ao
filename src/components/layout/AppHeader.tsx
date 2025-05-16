'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes'; // Assuming next-themes is or will be installed for dark mode
import { useEffect, useState } from 'react';

// Placeholder for useTheme if not installed. You might need to add `next-themes`.
// If next-themes is not part of the project, remove theme toggle functionality.
const useThemeFallback = () => {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return { theme: 'light', setTheme: () => {}, resolvedTheme: 'light' };
  return { theme, setTheme, resolvedTheme: theme };
};

export default function AppHeader() {
  // Check if useTheme is available, otherwise use fallback to prevent errors if next-themes isn't set up
  let themeToggle;
  try {
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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

  } catch (e) {
    // Fallback if useTheme is not available (e.g. next-themes not installed)
    const { setTheme, theme } = useThemeFallback();
     themeToggle = (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      );
  }


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        {/* Breadcrumbs or page title could go here */}
      </div>
      <div className="flex items-center gap-4">
        {themeToggle}
        {/* User Menu Placeholder */}
      </div>
    </header>
  );
}

// Add next-themes to package.json if it's not there:
// "dependencies": { ... "next-themes": "^0.3.0", ... }
// And create src/components/ThemeProvider.tsx and wrap layout with it if you want full theme persistence.
// For now, this basic toggle will work if next-themes is setup, or fallback gracefully.
