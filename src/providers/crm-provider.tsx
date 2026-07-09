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
import {
  closeContractAction,
  createContractAction,
  getReceiptUrlAction,
  markInvoicePaidAction,
  renewContractAction,
  runContractChecksAction,
  saveBuildingAction,
  saveOfficeDetailsAction,
  updateContractAction,
  type ChecksSummary,
  type CreateContractInput,
  type UpdateContractInput,
} from "@/actions/contracts";
import { statusOf } from "@/lib/client-status";
import type { ActivityLogEntry } from "@/types/activity";
import type { Client, ClientInput, ClientType } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";
import type {
  Building,
  Contract,
  Invoice,
  OfficeDetails,
} from "@/types/contract";

export interface CrmSnapshot {
  clients: Client[];
  activityLog: ActivityLogEntry[];
  officeOverrides: OfficeOverrides;
  floors: FloorsMap;
  contracts: Contract[];
  invoices: Invoice[];
  officeDetails: OfficeDetails[];
  building: Building | null;
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
  createContract: (input: CreateContractInput) => Promise<Contract>;
  saveOfficeDetails: (details: OfficeDetails) => Promise<void>;
  saveBuilding: (building: Omit<Building, "id"> & { id?: string }) => Promise<void>;
  markInvoicePaid: (invoiceId: string, receipt: File) => Promise<void>;
  getReceiptUrl: (invoiceId: string) => Promise<string | null>;
  renewContract: (contractId: string) => Promise<void>;
  closeContract: (contractId: string) => Promise<void>;
  updateContract: (input: UpdateContractInput) => Promise<void>;
  runContractChecks: () => Promise<ChecksSummary>;
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
  const [contracts, setContracts] = useState(initialData.contracts);
  const [invoices, setInvoices] = useState(initialData.invoices);
  const [officeDetails, setOfficeDetails] = useState(initialData.officeDetails);
  const [building, setBuilding] = useState(initialData.building);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await fetchCrmData();
      setClients(data.clients);
      setActivityLog(data.activityLog);
      setOfficeOverrides(data.officeOverrides);
      setFloors(data.floors);
      setContracts(data.contracts);
      setInvoices(data.invoices);
      setOfficeDetails(data.officeDetails);
      setBuilding(data.building);
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

  const createContract = useCallback(
    async (input: CreateContractInput): Promise<Contract> => {
      const contract = await createContractAction(input);
      await refresh();
      return contract;
    },
    [refresh],
  );

  const saveOfficeDetails = useCallback(
    async (details: OfficeDetails) => {
      await saveOfficeDetailsAction(details);
      await refresh();
    },
    [refresh],
  );

  const saveBuilding = useCallback(
    async (b: Omit<Building, "id"> & { id?: string }) => {
      await saveBuildingAction(b);
      await refresh();
    },
    [refresh],
  );

  const markInvoicePaid = useCallback(
    async (invoiceId: string, receipt: File) => {
      const fd = new FormData();
      fd.set("invoiceId", invoiceId);
      fd.set("receipt", receipt);
      await markInvoicePaidAction(fd);
      await refresh();
    },
    [refresh],
  );

  const getReceiptUrl = useCallback(
    (invoiceId: string) => getReceiptUrlAction(invoiceId),
    [],
  );

  const renewContract = useCallback(
    async (contractId: string) => {
      await renewContractAction(contractId);
      await refresh();
    },
    [refresh],
  );

  const closeContract = useCallback(
    async (contractId: string) => {
      await closeContractAction(contractId);
      await refresh();
    },
    [refresh],
  );

  const updateContract = useCallback(
    async (input: UpdateContractInput) => {
      await updateContractAction(input);
      await refresh();
    },
    [refresh],
  );

  const runContractChecks = useCallback(async () => {
    const s = await runContractChecksAction();
    await refresh();
    return s;
  }, [refresh]);

  const value = useMemo<CrmContextValue>(
    () => ({
      clients,
      activityLog,
      officeOverrides,
      floors,
      contracts,
      invoices,
      officeDetails,
      building,
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
      createContract,
      saveOfficeDetails,
      saveBuilding,
      markInvoicePaid,
      getReceiptUrl,
      renewContract,
      closeContract,
      updateContract,
      runContractChecks,
    }),
    [
      clients,
      activityLog,
      officeOverrides,
      floors,
      contracts,
      invoices,
      officeDetails,
      building,
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
      createContract,
      saveOfficeDetails,
      saveBuilding,
      markInvoicePaid,
      getReceiptUrl,
      renewContract,
      closeContract,
      updateContract,
      runContractChecks,
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
    contracts,
    invoices,
    officeDetails,
    building,
    isHydrated,
    isSyncing,
    setOfficeOverride,
    clearOfficeOverride,
    saveFloors,
    saveOfficeEdit,
    createContract,
    saveOfficeDetails,
    saveBuilding,
    markInvoicePaid,
    getReceiptUrl,
    renewContract,
    closeContract,
    updateContract,
    runContractChecks,
  } = useCrm();
  return {
    clients,
    floors,
    officeOverrides,
    contracts,
    invoices,
    officeDetails,
    building,
    isHydrated,
    isSyncing,
    setOfficeOverride,
    clearOfficeOverride,
    saveFloors,
    saveOfficeEdit,
    createContract,
    saveOfficeDetails,
    saveBuilding,
    markInvoicePaid,
    getReceiptUrl,
    renewContract,
    closeContract,
    updateContract,
    runContractChecks,
  };
}

export function useContracts() {
  const { contracts, invoices, clients, isHydrated, isSyncing } = useCrm();
  return { contracts, invoices, clients, isHydrated, isSyncing };
}

/**
 * Builds a new-client payload from the identity-only form. Financial fields
 * get neutral defaults — they are owned by the client's contracts and are
 * overlaid from contract data whenever the client has one.
 */
export function buildClientFromForm(values: {
  name: string;
  company: string;
  type: ClientType;
  authorizedName: string;
  authorizedCpr: string;
  authorizedNationality: string;
  phone: string;
  email: string;
  rank: string;
  office: string;
  joinDate: string;
  rentedBy: string;
  notes: string;
  crExpiry: string;
}): ClientInput {
  return {
    name: values.name.trim(),
    company: values.company.trim(),
    type: values.type,
    authorizedName: values.authorizedName.trim(),
    authorizedCpr: values.authorizedCpr.trim(),
    authorizedNationality: values.authorizedNationality.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    rank: values.rank.trim(),
    office: values.office.trim(),
    joinDate: values.joinDate,
    status: "pending",
    invoiceType: "subscription",
    amount: 0,
    dueDate: "",
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
