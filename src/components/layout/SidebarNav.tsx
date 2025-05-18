
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  Users,
  Mail,
  PieChart, // Changed from LayoutGrid
  Settings, // Added for Admin Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: PieChart }, // Points to Portfolio Dashboard
  { href: '/projects', label: 'Projects', icon: Briefcase }, // Points to Project Management
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
              <Link href={item.href} passHref> {/* No asChild here */}
                <Button
                  variant="ghost"
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium",
                    // Adjusted active check for root path specifically
                    (pathname === item.href || (item.href === '/' && pathname === '/'))
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
