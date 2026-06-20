"use server";

import { auth } from "@/lib/auth";
import {
  createCrmUserRecord,
  deleteCrmUserRecord,
  listCrmUsers,
  listCrmUsersByRole,
  updateCrmUserRecord,
  type PublicCrmUser,
} from "@/lib/crm-users";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "admin") throw new Error("Admin only");
  return session;
}

export async function fetchCrmUsers(): Promise<PublicCrmUser[]> {
  await requireAdmin();
  return listCrmUsers();
}

export async function fetchAdminUsers(): Promise<PublicCrmUser[]> {
  await requireAdmin();
  return listCrmUsersByRole("admin");
}

export async function fetchStaffUsers(): Promise<PublicCrmUser[]> {
  await requireAdmin();
  return listCrmUsersByRole("staff");
}

export async function createAdminAccount(input: {
  email: string;
  password: string;
  name: string;
}): Promise<PublicCrmUser> {
  await requireAdmin();
  return createCrmUserRecord({
    ...input,
    role: "admin",
    isRoot: false,
  });
}

export async function createStaffAccount(input: {
  email: string;
  password: string;
  name: string;
}): Promise<PublicCrmUser> {
  await requireAdmin();
  return createCrmUserRecord({
    ...input,
    role: "staff",
    isRoot: false,
  });
}

export async function updateUserAccount(input: {
  id: string;
  name: string;
  email: string;
  password?: string;
}): Promise<PublicCrmUser> {
  await requireAdmin();
  return updateCrmUserRecord(input);
}

export async function deleteUserAccount(id: string): Promise<void> {
  const session = await requireAdmin();
  if (session.user.id === id) {
    throw new Error("You cannot delete your own account");
  }
  await deleteCrmUserRecord(id);
}

/** @deprecated Use createAdminAccount or createStaffAccount */
export async function createCrmUser(input: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "staff";
}): Promise<PublicCrmUser> {
  await requireAdmin();
  if (input.role === "admin") {
    return createAdminAccount(input);
  }
  return createStaffAccount(input);
}
