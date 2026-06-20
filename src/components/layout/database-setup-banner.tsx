"use client";

import { AlertTriangle } from "lucide-react";

export function DatabaseSetupBanner({ message }: { message?: string }) {
  return (
    <div className="mb-6 flex gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium">Database setup required</p>
        <p className="mt-1 text-muted-foreground">
          {message ??
            "Run the SQL migration in Supabase, then npm run db:seed"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          See{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            supabase/migrations/001_initial.sql
          </code>
        </p>
      </div>
    </div>
  );
}
