import { requireAuth } from "@/lib/auth-utils";
import { OpeningClosingService } from "@/services/opening-closing.service";
import { OpeningClosingClient } from "./OpeningClosingClient";

export default async function OpeningClosingPage() {
  await requireAuth();

  const initialBalances = await OpeningClosingService.getOpeningBalances("FY 2026–27");

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <OpeningClosingClient initialBalances={JSON.parse(JSON.stringify(initialBalances))} />
    </div>
  );
}
