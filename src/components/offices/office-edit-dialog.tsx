"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OfficeStatus } from "@/types/office";

function OfficeEditForm({
  officeNo,
  status,
  company,
  linkedClientName,
  onSave,
  onClose,
}: {
  officeNo: string;
  status: OfficeStatus;
  company: string;
  linkedClientName?: string;
  onSave: (input: { status: OfficeStatus; company: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [editStatus, setEditStatus] = useState(status);
  const [editCompany, setEditCompany] = useState(company);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">Office #{officeNo}</DialogTitle>
      </DialogHeader>
      {linkedClientName ? (
        <p className="text-sm text-muted-foreground">
          Linked to client: <strong>{linkedClientName}</strong>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No linked client record</p>
      )}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={editStatus}
            onValueChange={(v) => setEditStatus(v as OfficeStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="unrented">Free</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Company name</Label>
          <Input
            value={editCompany}
            onChange={(e) => setEditCompany(e.target.value)}
            placeholder="Company occupying this office"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onSave({ status: editStatus, company: editCompany.trim() }).finally(
              () => setBusy(false),
            );
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export function OfficeEditDialog({
  open,
  onOpenChange,
  officeNo,
  status,
  company,
  linkedClientName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officeNo: string;
  status: OfficeStatus;
  company: string;
  linkedClientName?: string;
  onSave: (input: { status: OfficeStatus; company: string }) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        {open && (
          <OfficeEditForm
            key={`${officeNo}-${status}-${company}`}
            officeNo={officeNo}
            status={status}
            company={company}
            linkedClientName={linkedClientName}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
