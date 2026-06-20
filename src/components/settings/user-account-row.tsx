"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { deleteUserAccount, updateUserAccount } from "@/actions/users";
import type { PublicCrmUser } from "@/lib/crm-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UserAccountRow({
  user,
  roleLabel,
  onUpdated,
  onDeleted,
}: {
  user: PublicCrmUser;
  roleLabel: string;
  onUpdated: (user: PublicCrmUser) => void;
  onDeleted: (id: string) => void;
}) {
  const { data: session } = useSession();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: "",
  });

  const isSelf = session?.user?.id === user.id;
  const canDelete = !user.isRoot && !isSelf;

  function openEdit() {
    setForm({ name: user.name, email: user.email, password: "" });
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await updateUserAccount({
        id: user.id,
        name: form.name,
        email: form.email,
        password: form.password.trim() || undefined,
      });
      onUpdated(updated);
      setEditOpen(false);
      toast.success("Account updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteUserAccount(user.id);
      onDeleted(user.id);
      setDeleteOpen(false);
      toast.success("Account deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{user.name}</p>
            {user.isRoot && (
              <Badge variant="secondary" className="text-[0.65rem]">
                Root
              </Badge>
            )}
            {isSelf && (
              <Badge variant="outline" className="text-[0.65rem]">
                You
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{roleLabel}</Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2"
            disabled={busy}
            onClick={openEdit}
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-destructive hover:text-destructive"
            disabled={busy || !canDelete}
            title={
              user.isRoot
                ? "Root account cannot be deleted"
                : isSelf
                  ? "You cannot delete your own account"
                  : "Delete account"
            }
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              Update name, email, or set a new password. Leave password blank to
              keep the current one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${user.id}`}>Name</Label>
              <Input
                id={`edit-name-${user.id}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-email-${user.id}`}>Email</Label>
              <Input
                id={`edit-email-${user.id}`}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-password-${user.id}`}>New password</Label>
              <Input
                id={`edit-password-${user.id}`}
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                minLength={8}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              Delete <strong>{user.name}</strong> ({user.email})? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              {busy ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
