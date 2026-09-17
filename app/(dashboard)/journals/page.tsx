import { JournalService } from "@/services/journal.service";
import { JournalsClient } from "./JournalsClient";

export const dynamic = "force-dynamic";

function getCurrentMonthBounds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    fromDate: fmt(start),
    toDate: fmt(end),
  };
}

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const currentMonth = getCurrentMonthBounds();

  const fromDate = params.fromDate !== undefined ? params.fromDate : currentMonth.fromDate;
  const toDate = params.toDate !== undefined ? params.toDate : currentMonth.toDate;
  const voucherType = params.voucherType || "ALL";
  const search = params.search || "";

  const { vouchers, totalDebit, totalCredit } = await JournalService.getJournalVouchers({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    voucherType: voucherType !== "ALL" ? voucherType : undefined,
    search: search || undefined,
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <JournalsClient
        initialVouchers={JSON.parse(JSON.stringify(vouchers))}
        initialTotalDebit={totalDebit}
        initialTotalCredit={totalCredit}
        initialFromDate={fromDate}
        initialToDate={toDate}
        initialType={voucherType}
      />
    </div>
  );
}
