import { listCrmUsersByRole } from "@/lib/crm-users";
import { StaffAccountsManager } from "@/components/settings/staff-accounts-manager";

export default async function StaffSettingsPage() {
  const staff = await listCrmUsersByRole("staff").catch(() => []);

  return <StaffAccountsManager initialStaff={staff} />;
}
