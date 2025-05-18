'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  Users,
  Mail,
  Settings,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Projects', icon: Briefcase }, // Changed Dashboard to Projects, points to root
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
              <Link href={item.href} passHref>
                <Button
                  variant="ghost"
                  className={cn(
                    "items-center px-3 py-2 text-sm font-medium",
                    (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
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
