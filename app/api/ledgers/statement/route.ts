import { NextResponse } from "next/server";
import { LedgerService } from "@/services/ledger.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    if (!accountId) {
      return NextResponse.json({ error: "accountId parameter is required" }, { status: 400 });
    }

    const statement = await LedgerService.getLedgerStatement(accountId, fromDate, toDate);
    return NextResponse.json(statement);
  } catch (error: any) {
    console.error("Error fetching ledger statement:", error);
    return NextResponse.json({ error: "Failed to fetch statement" }, { status: 500 });
  }
}
