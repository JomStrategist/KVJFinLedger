import { requireAdmin } from "@/lib/auth-utils";
import { SettingsClient } from "./SettingsClient";

export const metadata = {
  title: "Settings - KVJ Analytics",
  description: "Manage company profile, GST configuration, financial year settings and preferences.",
};

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <SettingsClient />
    </div>
  );
}
