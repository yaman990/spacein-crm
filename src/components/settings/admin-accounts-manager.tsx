"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createAdminAccount } from "@/actions/users";
import type { PublicCrmUser } from "@/lib/crm-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsNav } from "@/components/settings/settings-nav";
import { UserAccountRow } from "@/components/settings/user-account-row";
import { PageHeader } from "@/components/layout/page-header";

export function AdminAccountsManager({
  initialAdmins,
}: {
  initialAdmins: PublicCrmUser[];
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await createAdminAccount(form);
      setAdmins((prev) => [...prev, user]);
      setForm({ name: "", email: "", password: "" });
      toast.success("Administrator created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create administrator",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage who can access the CRM"
      />
      <SettingsNav />

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Administrator accounts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All administrators have the same full access. Edit name, email, or
            password anytime. The root account cannot be deleted.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No administrators found. Run{" "}
              <code className="rounded bg-muted px-1 text-xs">npm run db:seed</code>{" "}
              to create the root admin.
            </p>
          ) : (
            admins.map((user) => (
              <UserAccountRow
                key={user.id}
                user={user}
                roleLabel="Admin"
                onUpdated={(updated) =>
                  setAdmins((prev) =>
                    prev.map((u) => (u.id === updated.id ? updated : u)),
                  )
                }
                onDeleted={(id) =>
                  setAdmins((prev) => prev.filter((u) => u.id !== id))
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Add administrator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                minLength={8}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create administrator"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
