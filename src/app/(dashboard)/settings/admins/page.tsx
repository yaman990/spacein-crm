import { listCrmUsersByRole } from "@/lib/crm-users";
import { AdminAccountsManager } from "@/components/settings/admin-accounts-manager";

export default async function AdminsSettingsPage() {
  const admins = await listCrmUsersByRole("admin").catch(() => []);

  return <AdminAccountsManager initialAdmins={admins} />;
}
