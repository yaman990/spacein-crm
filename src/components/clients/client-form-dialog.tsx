"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import {
  buildClientFromForm,
  useClients,
  useCrm,
} from "@/providers/crm-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// The client record holds identity data only. Everything financial (rent,
// invoices, due dates, payment status) lives on the client's contracts and is
// managed from the Offices page.
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string(),
  type: z.enum(["individual", "commercial"]),
  phone: z.string(),
  email: z.string(),
  rank: z.string(),
  office: z.string(),
  joinDate: z.string(),
  rentedBy: z.string(),
  notes: z.string(),
  crExpiry: z.string(),
});

type FormState = z.infer<typeof schema>;

const emptyForm = (): FormState => ({
  name: "",
  company: "",
  type: "commercial",
  phone: "",
  email: "",
  rank: "",
  office: "",
  joinDate: "",
  rentedBy: "",
  notes: "",
  crExpiry: "",
});

function clientToForm(client: Client): FormState {
  return {
    name: client.name,
    company: client.company,
    type: client.type ?? "commercial",
    phone: client.phone,
    email: client.email,
    rank: client.rank,
    office: client.office,
    joinDate: client.joinDate,
    rentedBy: client.rentedBy,
    notes: client.notes,
    crExpiry: client.crExpiry ?? "",
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}) {
  const { addClient } = useClients();
  const { updateClient } = useCrm();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!client;

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(client ? clientToForm(client) : emptyForm());
    }
    onOpenChange(next);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && client) {
        // identity fields only — billing comes from contracts, and the office
        // link is managed by the contract itself
        const v = parsed.data;
        await updateClient(client.id, {
          name: v.name.trim(),
          company: v.company.trim(),
          type: v.type,
          phone: v.phone.trim(),
          email: v.email.trim(),
          rank: v.rank.trim(),
          joinDate: v.joinDate,
          rentedBy: v.rentedBy.trim(),
          notes: v.notes.trim(),
          crExpiry: v.crExpiry,
        });
        toast.success("Client updated");
      } else {
        await addClient(buildClientFromForm(parsed.data));
        toast.success("Client added");
      }
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" layout="scroll">
        <DialogHeader className="space-y-1 border-b px-5 pt-5 pb-4 pr-12">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Client" : "Add New Client"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Identity details only — rent, invoices and payments are managed by
            the client&apos;s contracts on the Offices page.
          </p>
        </DialogHeader>
        <DialogBody>
          <form
            id="client-form"
            onSubmit={handleSubmit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Full Name *">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ahmed Al Mansouri"
              />
            </Field>
            <Field label="Company">
              <Input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.type}
                onValueChange={(v) =>
                  set("type", (v as FormState["type"]) ?? "commercial")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="CR Number">
              <Input
                value={form.rank}
                onChange={(e) => set("rank", e.target.value)}
              />
            </Field>
            <Field label="CR Expiry Date">
              <Input
                type="date"
                value={form.crExpiry}
                onChange={(e) => set("crExpiry", e.target.value)}
              />
            </Field>
            <Field label="Join Date">
              <Input
                type="date"
                value={form.joinDate}
                onChange={(e) => set("joinDate", e.target.value)}
              />
            </Field>
            <Field
              label={
                isEdit ? "Office (managed by contracts)" : "Office (optional)"
              }
            >
              <Input
                value={form.office}
                onChange={(e) => set("office", e.target.value)}
                disabled={isEdit}
                placeholder="Assigned via Offices → New contract"
              />
            </Field>
            <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rented By (Employee)
              </Label>
              <Input
                className="mt-1"
                value={form.rentedBy}
                onChange={(e) => set("rentedBy", e.target.value)}
                placeholder="Employee who handled this client"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Notes
              </Label>
              <Textarea
                className="mt-1"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
