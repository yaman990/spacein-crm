import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CrmUserRow } from "@/lib/supabase/mappers";

export const ROOT_ADMIN_EMAIL = "admin@spacein.bh";

export interface PublicCrmUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isRoot: boolean;
  createdAt: string;
}

export function toPublicUser(row: CrmUserRow & { is_root?: boolean }): PublicCrmUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isRoot: Boolean(row.is_root),
    createdAt: row.created_at,
  };
}

export async function verifyCrmUser(
  email: string,
  password: string,
): Promise<PublicCrmUser | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  const row = data as CrmUserRow & { is_root?: boolean };
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  return toPublicUser(row);
}

export async function listCrmUsers(): Promise<PublicCrmUser[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_users")
    .select("id, email, name, role, is_root, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    toPublicUser(row as unknown as CrmUserRow & { is_root?: boolean }),
  );
}

export async function listCrmUsersByRole(
  role: "admin" | "staff",
): Promise<PublicCrmUser[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_users")
    .select("id, email, name, role, is_root, created_at")
    .eq("role", role)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    toPublicUser(row as unknown as CrmUserRow & { is_root?: boolean }),
  );
}

export async function createCrmUserRecord(input: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "staff";
  isRoot?: boolean;
}): Promise<PublicCrmUser> {
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const supabase = createAdminClient();
  const password_hash = await bcrypt.hash(input.password, 12);
  const { data, error } = await supabase
    .from("crm_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      password_hash,
      name: input.name.trim(),
      role: input.role,
      is_root: input.isRoot ?? false,
    })
    .select("id, email, name, role, is_root, created_at")
    .single();
  if (error) throw new Error(error.message);
  return toPublicUser(data as unknown as CrmUserRow & { is_root?: boolean });
}

export async function getCrmUserById(id: string): Promise<PublicCrmUser | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("crm_users")
    .select("id, email, name, role, is_root, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toPublicUser(data as unknown as CrmUserRow & { is_root?: boolean });
}

export async function updateCrmUserRecord(input: {
  id: string;
  name: string;
  email: string;
  password?: string;
}): Promise<PublicCrmUser> {
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (input.password !== undefined && input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await getCrmUserById(input.id);
  if (!existing) throw new Error("Account not found");

  const supabase = createAdminClient();
  const updates: Record<string, string> = { name, email };
  if (input.password) {
    updates.password_hash = await bcrypt.hash(input.password, 12);
  }

  const { data, error } = await supabase
    .from("crm_users")
    .update(updates)
    .eq("id", input.id)
    .select("id, email, name, role, is_root, created_at")
    .single();
  if (error) throw new Error(error.message);
  return toPublicUser(data as unknown as CrmUserRow & { is_root?: boolean });
}

export async function deleteCrmUserRecord(id: string): Promise<void> {
  const existing = await getCrmUserById(id);
  if (!existing) throw new Error("Account not found");
  if (existing.isRoot) throw new Error("The root account cannot be deleted");

  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function ensureRootAdminRecord(input: {
  email: string;
  password: string;
  name: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const email = input.email.toLowerCase().trim();
  const { data: existing } = await supabase
    .from("crm_users")
    .select("id, is_root")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("crm_users")
      .update({ is_root: true, role: "admin" })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const password_hash = await bcrypt.hash(input.password, 12);
  const { error } = await supabase.from("crm_users").insert({
    email,
    password_hash,
    name: input.name.trim(),
    role: "admin",
    is_root: true,
  });
  if (error) throw new Error(error.message);
}
