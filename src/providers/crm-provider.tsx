"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  createClientAction,
  deleteClientAction,
  fetchCrmData,
  markPaidAction,
  recordCommunicationAction,
  recordDocumentAction,
  saveFloorsAction,
  saveOfficeEditAction,
  saveOfficeOverridesAction,
  updateClientAction,
} from "@/actions/crm";
import { addMonths } from "@/lib/format";
import { statusOf } from "@/lib/client-status";
import type { ActivityLogEntry } from "@/types/activity";
import type { Client, ClientInput, ClientStatus } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";

export interface CrmSnapshot {
  clients: Client[];
  activityLog: ActivityLogEntry[];
  officeOverrides: OfficeOverrides;
  floors: FloorsMap;
}

interface CrmContextValue extends CrmSnapshot {
  isHydrated: boolean;
  isSyncing: boolean;
  refresh: () => Promise<void>;
  addClient: (input: ClientInput) => Promise<Client>;
  updateClient: (id: string, input: Partial<ClientInput>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  markPaid: (id: string) => Promise<void>;
  setOfficeOverride: (key: string, value: string) => Promise<void>;
  clearOfficeOverride: (prefix: string) => Promise<void>;
  saveFloors: (floors: FloorsMap) => Promise<void>;
  saveOfficeEdit: (input: {
    floorKey: string;
    officeNo: string;
    status: string;
    company: string;
  }) => Promise<void>;
  recordDocument: (id: string, type: "invoice" | "receipt") => Promise<void>;
  recordCommunication: (
    id: string,
    channel: "wa" | "email",
    messageType: string,
  ) => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: CrmSnapshot;
}) {
  const [clients, setClients] = useState(initialData.clients);
  const [activityLog, setActivityLog] = useState(initialData.activityLog);
  const [officeOverrides, setOfficeOverrides] = useState(
    initialData.officeOverrides,
  );
  const [floors, setFloors] = useState(initialData.floors);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await fetchCrmData();
      setClients(data.clients);
      setActivityLog(data.activityLog);
      setOfficeOverrides(data.officeOverrides);
      setFloors(data.floors);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load CRM data",
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addClient = useCallback(
    async (input: ClientInput): Promise<Client> => {
      const client = await createClientAction(input);
      await refresh();
      return client;
    },
    [refresh],
  );

  const updateClient = useCallback(
    async (id: string, input: Partial<ClientInput>) => {
      await updateClientAction(id, input);
      await refresh();
    },
    [refresh],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      await deleteClientAction(id);
      await refresh();
    },
    [refresh],
  );

  const markPaid = useCallback(
    async (id: string) => {
      await markPaidAction(id);
      await refresh();
    },
    [refresh],
  );

  const setOfficeOverride = useCallback(
    async (key: string, value: string) => {
      const next = { ...officeOverrides, [key]: value };
      await saveOfficeOverridesAction(next);
      setOfficeOverrides(next);
    },
    [officeOverrides],
  );

  const clearOfficeOverride = useCallback(
    async (prefix: string) => {
      const next = { ...officeOverrides };
      for (const key of Object.keys(next)) {
        if (key.startsWith(prefix)) delete next[key];
      }
      await saveOfficeOverridesAction(next);
      setOfficeOverrides(next);
    },
    [officeOverrides],
  );

  const saveFloors = useCallback(async (next: FloorsMap) => {
    await saveFloorsAction(next);
    setFloors(next);
  }, []);

  const saveOfficeEdit = useCallback(
    async (input: {
      floorKey: string;
      officeNo: string;
      status: string;
      company: string;
    }) => {
      await saveOfficeEditAction(input);
      await refresh();
    },
    [refresh],
  );

  const recordDocument = useCallback(
    async (id: string, type: "invoice" | "receipt") => {
      await recordDocumentAction(id, type);
      await refresh();
    },
    [refresh],
  );

  const recordCommunication = useCallback(
    async (id: string, channel: "wa" | "email", messageType: string) => {
      await recordCommunicationAction(id, channel, messageType);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<CrmContextValue>(
    () => ({
      clients,
      activityLog,
      officeOverrides,
      floors,
      isHydrated: true,
      isSyncing,
      refresh,
      addClient,
      updateClient,
      deleteClient,
      markPaid,
      setOfficeOverride,
      clearOfficeOverride,
      saveFloors,
      saveOfficeEdit,
      recordDocument,
      recordCommunication,
    }),
    [
      clients,
      activityLog,
      officeOverrides,
      floors,
      isSyncing,
      refresh,
      addClient,
      updateClient,
      deleteClient,
      markPaid,
      setOfficeOverride,
      clearOfficeOverride,
      saveFloors,
      saveOfficeEdit,
      recordDocument,
      recordCommunication,
    ],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
}

export function useClients() {
  const {
    clients,
    isHydrated,
    isSyncing,
    addClient,
    updateClient,
    deleteClient,
    markPaid,
  } = useCrm();
  return {
    clients,
    isHydrated,
    isSyncing,
    addClient,
    updateClient,
    deleteClient,
    markPaid,
  };
}

export function useActivityLog() {
  const { activityLog, isHydrated, isSyncing } = useCrm();
  return { activityLog, isHydrated, isSyncing };
}

export function useOffices() {
  const {
    clients,
    floors,
    officeOverrides,
    isHydrated,
    isSyncing,
    setOfficeOverride,
    clearOfficeOverride,
    saveFloors,
    saveOfficeEdit,
  } = useCrm();
  return {
    clients,
    floors,
    officeOverrides,
    isHydrated,
    isSyncing,
    setOfficeOverride,
    clearOfficeOverride,
    saveFloors,
    saveOfficeEdit,
  };
}

export function buildClientFromForm(values: {
  name: string;
  company: string;
  phone: string;
  email: string;
  rank: string;
  office: string;
  joinDate: string;
  status: ClientStatus;
  invoiceType: "subscription" | "rent";
  amount: number;
  dueDate: string;
  monthlyRent: number;
  rentStart: string;
  rentMonths: number;
  rentedBy: string;
  notes: string;
  crExpiry: string;
}): ClientInput {
  const isRent = values.invoiceType === "rent";
  let amount = values.amount;
  let dueDate = values.dueDate;
  let rentEnd = "";
  const monthlyRent = values.monthlyRent;
  const rentStart = values.rentStart;
  const rentMonths = values.rentMonths;

  if (isRent) {
    rentEnd = addMonths(rentStart, rentMonths);
    amount = monthlyRent * rentMonths;
    dueDate = rentEnd;
  }

  return {
    name: values.name.trim(),
    company: values.company.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    rank: values.rank.trim(),
    office: values.office.trim(),
    joinDate: values.joinDate,
    status: values.status,
    invoiceType: values.invoiceType,
    amount,
    dueDate,
    monthlyRent: isRent ? monthlyRent : undefined,
    rentStart: isRent ? rentStart : undefined,
    rentMonths: isRent ? rentMonths : undefined,
    rentEnd: isRent ? rentEnd : undefined,
    rentedBy: values.rentedBy.trim(),
    notes: values.notes.trim(),
    crExpiry: values.crExpiry,
  };
}

export function useClientStats() {
  const { clients } = useCrm();
  return useMemo(() => {
    const total = clients.length;
    const pending = clients.filter((c) =>
      ["pending", "sent"].includes(statusOf(c)),
    ).length;
    const overdue = clients.filter((c) => statusOf(c) === "overdue").length;
    const paid = clients.filter((c) => statusOf(c) === "paid").length;
    const collected = clients
      .filter((c) => statusOf(c) === "paid")
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const portfolio = clients.reduce((s, c) => s + Number(c.amount || 0), 0);
    const outstanding = clients
      .filter((c) => ["pending", "sent"].includes(statusOf(c)))
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const overdueAmount = clients
      .filter((c) => statusOf(c) === "overdue")
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    return {
      total,
      pending,
      overdue,
      paid,
      collected,
      portfolio,
      outstanding,
      overdueAmount,
    };
  }, [clients]);
}
