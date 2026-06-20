"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";

const SIDEBAR_STORAGE_KEY = "crm-sidebar-collapsed";

function readSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-[1400px] p-4 md:p-8">{children}</div>
        </main>
      </div>
      <MobileNav />
      <Button
        size="icon"
        className="fixed bottom-[4.5rem] right-4 z-50 size-12 rounded-full shadow-lg md:bottom-6"
        onClick={() => setAddOpen(true)}
        aria-label="Add client"
      >
        <Plus className="size-5" />
      </Button>
      <ClientFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
