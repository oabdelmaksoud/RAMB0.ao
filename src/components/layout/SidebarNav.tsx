
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase, // Changed from LayoutDashboard for "Projects"
  Activity,
  // Other icons removed as their global pages were integrated into project details
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

// Updated navItems: "Dashboard" becomes "Projects" pointing to `/`, "Monitoring" remains.
const navItems = [
  { href: '/', label: 'Projects', icon: Briefcase },
  { href: '/agent-monitoring', label: 'Monitoring', icon: Activity },
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
                    // Exact match for root, startsWith for others to handle nested project routes
                    (item.href === '/' && pathname === '/') || (item.href !== '/' && pathname.startsWith(item.href))
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
