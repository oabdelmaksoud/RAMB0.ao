
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  // Settings2, // Removed
  // Workflow, // Removed
  // SlidersHorizontal, // Removed
  UserCircle,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  // { href: '/ai-suggestions', label: 'AI Suggestions', icon: Settings2 }, // Removed
  // { href: '/workflow-designer', label: 'Workflow Designer', icon: Workflow }, // Removed
  // { href: '/agent-management', label: 'Agent Management', icon: SlidersHorizontal }, // Removed
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={{ children: item.label, className: "capitalize"}}
              className={cn(
                "justify-start",
                pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              )}
            >
              <a> {/* This <a> tag is important when asChild is true with Link */}
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
