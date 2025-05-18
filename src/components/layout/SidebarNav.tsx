
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase, // For Projects
  Activity,  // For Monitoring
  Users,     // For Resources
  Mail,      // For Assistant
  // LayoutDashboard, Settings, UserCircle are no longer used here
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Projects', icon: Briefcase },
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
              {/* Using Link asChild and Button as direct child for modern Next.js Link behavior */}
              <Link href={item.href} passHref asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium",
                    // Highlight '/' for both '/' and if pathname starts with /projects (due to potential redirects)
                    (pathname === item.href || (item.href === '/' && pathname.startsWith('/projects')))
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
