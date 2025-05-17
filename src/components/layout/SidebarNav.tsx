
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  SlidersHorizontal,
  Lightbulb,
  UserCircle,
  Settings, 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Briefcase },
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
                    <span className="ml-2 lg:inline hidden">{item.label}</span> {/* Label hidden until lg */}
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
