'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, // Kept icon for "Projects" as it often serves as a dashboard
  Briefcase,       // Briefcase icon for Projects
  Activity,
  SlidersHorizontal,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Projects', icon: LayoutDashboard }, // Changed Dashboard to Projects, href to /
  // { href: '/projects', label: 'Projects', icon: Briefcase }, // This line is removed
  { href: '/agent-monitoring', label: 'Monitoring', icon: Activity },
  { href: '/agent-management', label: 'Agents', icon: SlidersHorizontal },
  { href: '/ai-suggestions', label: 'AI Suggestions', icon: Lightbulb },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <nav className="flex flex-row items-center gap-1 sm:gap-2">
        {navItems.map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link href={item.href} passHref legacyBehavior>
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <a> {/* Link's child */}
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
