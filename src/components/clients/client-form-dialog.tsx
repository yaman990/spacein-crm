"use client";

import { useEffect, useState } from "react";
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
import { CrStatusBadge } from "@/components/clients/cr-status-badge";
import { retrieveCrAction } from "@/actions/sijilat";

// The client record holds identity data only. Everything financial (rent,
// invoices, due dates, payment status) lives on the client's contracts and is
// managed from the Offices page.
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string(),
  type: z.enum(["individual", "commercial"]),
  authorizedName: z.string(),
  authorizedCpr: z.string(),
  authorizedNationality: z.string(),
  phone: z.string(),
  email: z.string(),
  rank: z.string(),
  office: z.string(),
  joinDate: z.string(),
  rentedBy: z.string(),
  notes: z.string(),
  crExpiry: z.string(),
  crStatus: z.string(),
});

type FormState = z.infer<typeof schema>;

const emptyForm = (): FormState => ({
  name: "",
  company: "",
  type: "commercial",
  authorizedName: "",
  authorizedCpr: "",
  authorizedNationality: "",
  phone: "",
  email: "",
  rank: "",
  office: "",
  joinDate: "",
  rentedBy: "",
  notes: "",
  crExpiry: "",
  crStatus: "",
});

function clientToForm(client: Client): FormState {
  return {
    name: client.name,
    company: client.company,
    type: client.type ?? "commercial",
    authorizedName: client.authorizedName ?? "",
    authorizedCpr: client.authorizedCpr ?? "",
    authorizedNationality: client.authorizedNationality ?? "",
    phone: client.phone,
    email: client.email,
    rank: client.rank,
    office: client.office,
    joinDate: client.joinDate,
    rentedBy: client.rentedBy,
    notes: client.notes,
    crExpiry: client.crExpiry ?? "",
    crStatus: client.crStatus ?? "",
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
  const [retrieving, setRetrieving] = useState(false);
  const isEdit = !!client;

  // Re-fill the form each time the dialog opens. This runs even when the parent
  // controls `open` (the Edit button), which doesn't trigger the dialog's own
  // onOpenChange — without it, editing a client showed an empty "Add" form.
  useEffect(() => {
    if (open) setForm(client ? clientToForm(client) : emptyForm());
  }, [open, client]);

  async function handleRetrieve() {
    if (!form.rank.trim()) {
      toast.error("Enter the CR number first");
      return;
    }
    try {
      setRetrieving(true);
      const r = await retrieveCrAction(form.rank);
      if (!r) {
        toast.error("No commercial registration found for that number");
        return;
      }
      setForm((prev) => ({
        ...prev,
        company: r.nameEnglish || prev.company,
        rank: r.branchNumber ? `${r.crNumber}-${r.branchNumber}` : r.crNumber,
        crExpiry: r.expiry || prev.crExpiry,
        crStatus: r.status || prev.crStatus,
      }));
      toast.success(`Loaded ${r.nameEnglish || r.crNumber} from Sijilat`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CR lookup failed");
    } finally {
      setRetrieving(false);
    }
  }

  function handleOpenChange(next: boolean) {
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
    if (parsed.data.type === "commercial" && !parsed.data.company.trim()) {
      toast.error("CR Name is required for commercial clients");
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
          authorizedName: v.authorizedName.trim(),
          authorizedCpr: v.authorizedCpr.trim(),
          authorizedNationality: v.authorizedNationality.trim(),
          phone: v.phone.trim(),
          email: v.email.trim(),
          rank: v.rank.trim(),
          joinDate: v.joinDate,
          rentedBy: v.rentedBy.trim(),
          notes: v.notes.trim(),
          crExpiry: v.crExpiry,
          crStatus: v.crStatus,
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
            <Field label="Full Name (contact person) *">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ahmed Al Mansouri"
              />
            </Field>
            <Field
              label={
                form.type === "commercial"
                  ? "CR Name (registered company) *"
                  : "Company (optional)"
              }
            >
              <Input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder={
                  form.type === "commercial"
                    ? "As written on the Commercial Registration"
                    : ""
                }
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
              <div className="flex gap-2">
                <Input
                  value={form.rank}
                  onChange={(e) => set("rank", e.target.value)}
                  placeholder="e.g. 158007"
                />
                {form.type === "commercial" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={retrieving || !form.rank.trim()}
                    onClick={handleRetrieve}
                    className="shrink-0"
                  >
                    {retrieving ? "Retrieving…" : "Retrieve"}
                  </Button>
                )}
              </div>
              {form.type === "commercial" && (
                <p className="text-[0.7rem] text-muted-foreground">
                  Fills CR name, expiry &amp; status from Sijilat.
                </p>
              )}
            </Field>
            <Field label="CR Expiry Date">
              <Input
                type="date"
                value={form.crExpiry}
                onChange={(e) => set("crExpiry", e.target.value)}
              />
            </Field>
            <Field label="CR Status">
              <Input
                value={form.crStatus}
                onChange={(e) => set("crStatus", e.target.value)}
                placeholder="Filled from Sijilat"
              />
              {form.crStatus && (
                <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                  Registry status:
                  <CrStatusBadge
                    client={{
                      crExpiry: form.crExpiry,
                      crStatus: form.crStatus,
                    }}
                    hideNone
                  />
                </p>
              )}
            </Field>
            {form.type === "commercial" && (
              <div className="col-span-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Authorized signatory — signs the contract on behalf of the CR
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name">
                    <Input
                      value={form.authorizedName}
                      onChange={(e) => set("authorizedName", e.target.value)}
                      placeholder="e.g. Bilal Mohamed Adem"
                    />
                  </Field>
                  <Field label="CPR No.">
                    <Input
                      value={form.authorizedCpr}
                      onChange={(e) => set("authorizedCpr", e.target.value)}
                    />
                  </Field>
                  <Field label="Nationality">
                    <Input
                      value={form.authorizedNationality}
                      onChange={(e) =>
                        set("authorizedNationality", e.target.value)
                      }
                      placeholder="e.g. Bahraini"
                    />
                  </Field>
                </div>
              </div>
            )}
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
