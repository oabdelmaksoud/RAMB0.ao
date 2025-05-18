
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, // Changed from LayoutDashboard for the main dashboard/project overview
  Briefcase,
  Activity,
  Users,
  Mail,
  // Settings and UserCircle are handled directly in AppHeader
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

// Updated navItems to reflect current page structure
// '/' is the main dashboard/project list page
// '/projects' redirects to '/' but kept for direct access if needed (could be removed if strictly /)
const navItems = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/projects', label: 'Projects List', icon: Briefcase }, // Explicitly for the /projects redirector page
  { href: '/agent-monitoring', label: 'Monitoring', icon: Activity },
  { href: '/resource-allocation', label: 'Resources', icon: Users },
  { href: '/personal-assistant', label: 'Assistant', icon: Mail },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <nav className="flex flex-row items-center gap-1 sm:gap-2">
        {navItems.map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link href={item.href} passHref asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium",
                    // Highlight '/' for both '/' and '/projects' due to redirect
                    (pathname === item.href || (item.href === '/' && pathname === '/projects') || (item.href !== '/' && pathname.startsWith(item.href)))
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  aria-label={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="ml-2 hidden lg:inline">{item.label}</span>
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
