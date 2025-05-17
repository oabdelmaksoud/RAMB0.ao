
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  // UserCircle, // Profile is handled in AppHeader directly
  // SlidersHorizontal, // For global Agent Management (removed)
  // Lightbulb, // For global AI Suggestions (removed)
  // Workflow as WorkflowIcon, // For global Workflow Designer (removed)
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  // { href: '/agent-management', label: 'Agents', icon: SlidersHorizontal }, // Global page removed
  // { href: '/workflow-designer', label: 'Designer', icon: WorkflowIcon }, // Global page removed
  // { href: '/ai-suggestions', label: 'AI Config', icon: Lightbulb }, // Global page removed
  // { href: '/profile', label: 'Profile', icon: UserCircle, hideInNav: true }, // Profile is handled directly in AppHeader
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <nav className="flex flex-row items-center gap-1 sm:gap-2">
        {navItems.filter(item => !item.hideInNav).map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link href={item.href} passHref legacyBehavior>
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium", 
                    pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span className="ml-2 hidden lg:inline">{item.label}</span>
                  </a>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="lg:hidden">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </TooltipProvider>
  );
}
