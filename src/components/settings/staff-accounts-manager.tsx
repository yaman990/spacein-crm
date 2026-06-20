"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createStaffAccount } from "@/actions/users";
import type { PublicCrmUser } from "@/lib/crm-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsNav } from "@/components/settings/settings-nav";
import { UserAccountRow } from "@/components/settings/user-account-row";
import { PageHeader } from "@/components/layout/page-header";

export function StaffAccountsManager({
  initialStaff,
}: {
  initialStaff: PublicCrmUser[];
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await createStaffAccount(form);
      setStaff((prev) => [...prev, user]);
      setForm({ name: "", email: "", password: "" });
      toast.success("Staff account created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create staff account",
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
          <CardTitle className="text-base font-semibold">Staff accounts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Staff can use the CRM but cannot manage user accounts. Edit or remove
            staff members here.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff accounts yet.</p>
          ) : (
            staff.map((user) => (
              <UserAccountRow
                key={user.id}
                user={user}
                roleLabel="Staff"
                onUpdated={(updated) =>
                  setStaff((prev) =>
                    prev.map((u) => (u.id === updated.id ? updated : u)),
                  )
                }
                onDeleted={(id) =>
                  setStaff((prev) => prev.filter((u) => u.id !== id))
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Add staff member</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                minLength={8}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create staff account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
