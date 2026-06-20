import { redirect } from "next/navigation";

export default function LegacyAccountsPage() {
  redirect("/settings/admins");
}
