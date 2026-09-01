import { requireAuth } from "@/lib/auth-utils";
import { OpeningClosingClient } from "./OpeningClosingClient";

export default async function OpeningClosingPage() {
  await requireAuth();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <OpeningClosingClient />
    </div>
  );
}
