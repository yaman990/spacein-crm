"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const MOBILE_SHORT_LABELS: Record<string, string> = {
  "/": "Home",
  "/clients": "Clients",
  "/analytics": "Analytics",
  "/alerts": "Alerts",
  "/offices": "Offices",
  "/contracts": "Contracts",
  "/history": "History",
  "/settings/admins": "Admin",
};

const navFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "All Clients", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/alerts", label: "Reminders", icon: Bell },
  { href: "/offices", label: "Offices", icon: Building2 },
  { href: "/contracts", label: "CR & Contracts", icon: Calendar },
  { href: "/history", label: "Activity Log", icon: History },
  {
    href: "/settings/admins",
    label: "Administrators",
    icon: Shield,
    adminOnly: true,
  },
];

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)]",
        collapsed ? "w-[4.25rem]" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-border py-3",
          collapsed ? "justify-center px-2" : "justify-between px-3",
        )}
      >
        {!collapsed && (
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Navigation
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                navFocusClass,
                collapsed ? "justify-center px-2" : "gap-2.5 px-3",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex gap-0.5 overflow-x-auto px-1 py-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = MOBILE_SHORT_LABELS[item.href] ?? item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[0.65rem] font-medium transition-colors",
                navFocusClass,
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
