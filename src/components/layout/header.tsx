"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, PanelLeft, Settings } from "lucide-react";
import { useClientStats } from "@/providers/crm-provider";
import { bhd } from "@/lib/format";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Header({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const { data: session } = useSession();
  const stats = useClientStats();
  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "SI";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden md:inline-flex"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="size-4" />
        </Button>
        <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-foreground text-xs font-bold text-background">
          SI
        </div>
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight">
            Space IN
          </p>
          <p className="text-[0.65rem] text-muted-foreground">Business Center CRM</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-1.5 md:flex">
          <StatPill label="Clients" value={String(stats.total)} />
          <StatPill label="Pending" value={String(stats.pending)} />
          <StatPill
            label="Overdue"
            value={String(stats.overdue)}
            variant="danger"
          />
          <StatPill
            label="Collected"
            value={bhd(stats.collected)}
            variant="muted"
            wide
          />
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback className="bg-muted text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {session?.user?.email}
              </p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                {session?.user?.role}
              </p>
            </DropdownMenuLabel>
            {session?.user?.role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/settings/admins")}
                >
                  <Settings className="mr-2 size-4" />
                  Administrators
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function StatPill({
  label,
  value,
  variant = "default",
  wide,
}: {
  label: string;
  value: string;
  variant?: "default" | "danger" | "muted";
  wide?: boolean;
}) {
  const valueColor =
    variant === "danger"
      ? "text-destructive"
      : variant === "muted"
        ? "text-foreground"
        : "text-muted-foreground";

  return (
    <div
      className={`rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-center ${wide ? "min-w-[88px]" : "min-w-[58px]"}`}
    >
      <span className={`block text-sm font-semibold tabular-nums ${valueColor}`}>
        {value}
      </span>
      <span className="block text-[0.55rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
