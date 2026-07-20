import { listCrmUsersByRole } from "@/lib/crm-users";
import { AdminAccountsManager } from "@/components/settings/admin-accounts-manager";
import { DangerZone } from "@/components/settings/danger-zone";

export default async function AdminsSettingsPage() {
  const admins = await listCrmUsersByRole("admin").catch(() => []);

  return (
    <div className="space-y-8">
      <AdminAccountsManager initialAdmins={admins} />
      <DangerZone />
    </div>
  );
}
