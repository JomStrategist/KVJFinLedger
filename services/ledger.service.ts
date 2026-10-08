import { AccountingEngine, AccountDescriptor, LedgerEntry, LedgerStatement } from "./accounting-engine.service";

export type { AccountDescriptor, LedgerEntry, LedgerStatement };

export class LedgerService {
  /**
   * Fetch list of all selectable Ledger Accounts with real-time double-entry balances
   */
  static async getAccountList(): Promise<AccountDescriptor[]> {
    return await AccountingEngine.getAccountList();
  }

  /**
   * Generate complete CA Account Ledger Statement
   */
  static async getLedgerStatement(accountId: string, fromDateStr?: string, toDateStr?: string): Promise<LedgerStatement> {
    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr + "T23:59:59.999Z") : undefined;

    return await AccountingEngine.getLedgerStatement(accountId, fromDate, toDate);
  }
}
