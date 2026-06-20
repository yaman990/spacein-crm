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
import { addMonths, bhd } from "@/lib/format";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  rank: z.string(),
  office: z.string(),
  joinDate: z.string(),
  status: z.enum(["pending", "sent", "paid", "overdue"]),
  invoiceType: z.enum(["subscription", "rent"]),
  amount: z.coerce.number().min(0),
  dueDate: z.string(),
  monthlyRent: z.coerce.number().min(0),
  rentStart: z.string(),
  rentMonths: z.coerce.number().min(1),
  rentedBy: z.string(),
  notes: z.string(),
  crExpiry: z.string(),
});

type FormState = z.infer<typeof schema>;

const emptyForm = (): FormState => ({
  name: "",
  company: "",
  phone: "",
  email: "",
  rank: "",
  office: "",
  joinDate: "",
  status: "pending",
  invoiceType: "subscription",
  amount: 0,
  dueDate: "",
  monthlyRent: 0,
  rentStart: "",
  rentMonths: 12,
  rentedBy: "",
  notes: "",
  crExpiry: "",
});

function clientToForm(client: Client): FormState {
  return {
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    rank: client.rank,
    office: client.office,
    joinDate: client.joinDate,
    status: client.status,
    invoiceType: client.invoiceType,
    amount: client.amount,
    dueDate: client.dueDate,
    monthlyRent: client.monthlyRent ?? 0,
    rentStart: client.rentStart ?? "",
    rentMonths: client.rentMonths ?? 12,
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

  const isRent = form.invoiceType === "rent";
  const rentPreview =
    isRent && form.monthlyRent && form.rentStart
      ? {
          end: addMonths(form.rentStart, form.rentMonths),
          total: form.monthlyRent * form.rentMonths,
        }
      : null;

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
    if (isRent && (!form.monthlyRent || !form.rentStart)) {
      toast.error("Enter monthly rent and start date");
      return;
    }

    const payload = buildClientFromForm(parsed.data);
    try {
      setSubmitting(true);
      if (isEdit && client) {
        await updateClient(client.id, payload);
        toast.success("Client updated");
      } else {
        await addClient(payload);
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
          <Field label="Office Number">
            <Input
              value={form.office}
              onChange={(e) => set("office", e.target.value)}
            />
          </Field>
          <Field label="Join Date">
            <Input
              type="date"
              value={form.joinDate}
              onChange={(e) => set("joinDate", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) =>
                set("status", v as FormState["status"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Invoice Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Invoice Type">
            <Select
              value={form.invoiceType}
              onValueChange={(v) =>
                set("invoiceType", v as FormState["invoiceType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {!isRent ? (
            <>
              <Field label="Amount (BHD) *">
                <Input
                  type="number"
                  step="0.001"
                  value={form.amount || ""}
                  onChange={(e) => set("amount", Number(e.target.value))}
                />
              </Field>
              <Field label="Due Date">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Monthly Rent (BHD) *">
                <Input
                  type="number"
                  step="0.001"
                  value={form.monthlyRent || ""}
                  onChange={(e) =>
                    set("monthlyRent", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Start Date *">
                <Input
                  type="date"
                  value={form.rentStart}
                  onChange={(e) => set("rentStart", e.target.value)}
                />
              </Field>
              <Field label="Duration (Months)">
                <Select
                  value={String(form.rentMonths)}
                  onValueChange={(v) => set("rentMonths", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 6, 12, 24].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} Month{m > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {rentPreview && (
                <div className="col-span-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Rent summary
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Total: <strong className="text-foreground">{bhd(rentPreview.total)}</strong>
                    {" · "}Due: {rentPreview.end}
                  </p>
                </div>
              )}
            </>
          )}

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

          <Field label="CR Expiry Date">
            <Input
              type="date"
              value={form.crExpiry}
              onChange={(e) => set("crExpiry", e.target.value)}
            />
          </Field>
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
