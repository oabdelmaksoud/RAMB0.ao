'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  Users,
  Mail,
  Settings, // Added Settings for consistency with AppHeader if needed later
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Projects', icon: Briefcase }, // Root path for projects
  { href: '/portfolio-dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
              <Link href={item.href} passHref legacyBehavior>
                <Button
                  variant="ghost"
                  asChild // Button will use its child <a> as the render target
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium",
                    // Highlight '/' if it's the exact path OR if it's a project detail page (starts with /projects/)
                    (pathname === item.href || (item.href === '/' && pathname.startsWith('/projects/') && pathname.length > 1) || (item.href === '/' && pathname === '/'))
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  aria-label={item.label}
                >
                  <a> {/* This <a> tag is essential for legacyBehavior Link when Button is asChild */}
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
