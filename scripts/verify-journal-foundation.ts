import { PrismaClient } from "@prisma/client";
import { JournalPostingService, IdempotencyConflictError, InvalidReversalError } from "../services/journal-posting.service";
import { JournalValidator } from "../services/journal-validator.service";
import { AtomicNumberingService } from "../services/atomic-numbering.service";
import { TaxEngine } from "../lib/tax";
import { toPaise, fromPaise, roundToPaisa } from "../lib/utils/currency";

// Ensure tests execute against an isolated test database, preserving production data 100%
const originalDbUrl = process.env.DATABASE_URL;
if (!originalDbUrl) {
  console.error("FATAL: DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

const isolatedTestDbUrl = originalDbUrl.includes("/billing_erp?")
  ? originalDbUrl.replace("/billing_erp?", "/billing_erp_test?")
  : originalDbUrl.includes("/billing_erp")
  ? originalDbUrl.replace("/billing_erp", "/billing_erp_test")
  : `${originalDbUrl}_test`;

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: isolatedTestDbUrl,
    },
  },
});

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedTests++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`AssertionFailed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 4: GENERAL LEDGER FOUNDATION TEST SUITE");
  console.log("================================================================================");
  console.log(`Target Isolated Database: ${isolatedTestDbUrl.replace(/\/\/[^@]+@/, "//***:***@")}`);
  console.log("Ensuring complete isolation from primary production database.\n");

  try {
    // Clean up test collections in isolated database before starting
    await testPrisma.journalLine.deleteMany({});
    await testPrisma.journalEntry.updateMany({ data: { reversalOfId: null } });
    await testPrisma.journalEntry.deleteMany({});
    await testPrisma.auditLog.deleteMany({});
    await testPrisma.fiscalPeriod.deleteMany({});
    await testPrisma.counter.deleteMany({});

    console.log("--- 1. Valid Balanced Journal Persistence ---");
    {
      const validEntryInput = {
        entryType: "SALES" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "TAX_INVOICE" as const,
        sourceId: "inv_test_001",
        sourceNumber: "KVJ/B2B/26-27/001",
        narration: "Test sales invoice confirmation for Client A",
        idempotencyKey: "TEST_INV_CONFIRM_001",
        lines: [
          {
            lineNumber: 1,
            accountId: "cust_test_101",
            accountName: "Client A (Trade Receivables)",
            financialType: "ASSET",
            statementGroup: "Trade Receivables",
            normalBalance: "DEBIT",
            debit: 11800.00,
            credit: 0,
            particulars: "Invoice Gross Total",
            entityType: "CUSTOMER",
            entityId: "cust_test_101",
          },
          {
            lineNumber: 2,
            accountId: "cat_rev_001",
            accountName: "Data Analytics Services",
            financialType: "INCOME",
            statementGroup: "Revenue from Operations",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 10000.00,
            particulars: "Taxable turnover",
          },
          {
            lineNumber: 3,
            accountId: "stat_output_cgst",
            accountName: "Output CGST Payable",
            financialType: "LIABILITY",
            statementGroup: "Statutory Tax Liabilities",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 900.00,
            particulars: "Output CGST 9%",
          },
          {
            lineNumber: 4,
            accountId: "stat_output_sgst",
            accountName: "Output SGST Payable",
            financialType: "LIABILITY",
            statementGroup: "Statutory Tax Liabilities",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 900.00,
            particulars: "Output SGST 9%",
          },
        ],
      };

      const posted = await JournalPostingService.postJournalEntry(
        validEntryInput,
        { id: "user_test_admin", name: "Ajay Thomas", email: "ajay@kvj.local" },
        testPrisma
      );

      assert(posted.status === "POSTED", "Journal voucher status is POSTED");
      assert(posted.isBalanced === true, "Journal voucher is balanced");
      assert(posted.totalDebit === 11800.00, "Journal totalDebit is 11,800.00");
      assert(posted.totalCredit === 11800.00, "Journal totalCredit is 11,800.00");
      assert(posted.lines.length === 4, "Persisted exactly 4 balanced journal lines");

      // Verify AuditLog record was atomically committed
      const auditLog = await testPrisma.auditLog.findFirst({
        where: { entityId: posted.id },
      });
      assert(auditLog !== null, "AuditLog record was committed atomically with journal entry");
      assert(auditLog?.action === "POST_JOURNAL", "AuditLog action is POST_JOURNAL");
    }

    console.log("\n--- 2. Unbalanced Journal Rejection ---");
    {
      const unbalancedInput = {
        entryType: "SALES" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "TAX_INVOICE" as const,
        sourceId: "inv_unbalanced_001",
        narration: "Unbalanced test invoice",
        idempotencyKey: "TEST_UNBALANCED_001",
        lines: [
          {
            lineNumber: 1,
            accountId: "cust_test_101",
            accountName: "Client A",
            financialType: "ASSET",
            statementGroup: "Trade Receivables",
            normalBalance: "DEBIT",
            debit: 5000.00,
            credit: 0,
          },
          {
            lineNumber: 2,
            accountId: "cat_rev_001",
            accountName: "Revenue",
            financialType: "INCOME",
            statementGroup: "Revenue from Operations",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 4999.00, // Discrepancy of 100 paise (₹1.00)
          },
        ],
      };

      let threw = false;
      try {
        await JournalPostingService.postJournalEntry(unbalancedInput, undefined, testPrisma);
      } catch (e: any) {
        threw = true;
        assert(e.message.includes("Unbalanced Journal"), "Unbalanced journal rejected with descriptive error message");
      }
      assert(threw, "Unbalanced journal was rejected by validation engine");

      const inDb = await testPrisma.journalEntry.findUnique({
        where: { idempotencyKey: "TEST_UNBALANCED_001" },
      });
      assert(inDb === null, "Zero records committed for unbalanced journal");
    }

    console.log("\n--- 3. Invalid or Missing Account Reference Rejection ---");
    {
      const invalidAccountInput = {
        entryType: "JOURNAL" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "MANUAL_ADJUSTMENT" as const,
        sourceId: "adj_test_001",
        narration: "Missing account reference test",
        idempotencyKey: "TEST_INVALID_ACC_001",
        lines: [
          {
            accountId: "", // Empty account reference
            accountName: "Cash",
            financialType: "ASSET",
            statementGroup: "Cash",
            normalBalance: "DEBIT",
            debit: 100,
            credit: 0,
          },
          {
            accountId: "eq_capital",
            accountName: "Owner Capital",
            financialType: "EQUITY",
            statementGroup: "Capital",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 100,
          },
        ],
      };

      const validation = JournalValidator.validate(invalidAccountInput);
      assert(!validation.isValid, "Validation flags empty accountId as invalid");
      assert(
        validation.errors.some((err) => err.includes("accountId")),
        "Error message mentions accountId is required"
      );
    }

    console.log("\n--- 4. Negative, Non-Finite, and Invalid Monetary Amounts Rejection ---");
    {
      // 4a. Negative amount
      const negativeLine = {
        entryType: "JOURNAL" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "MANUAL_ADJUSTMENT" as const,
        sourceId: "neg_001",
        narration: "Negative amount test",
        idempotencyKey: "TEST_NEG_001",
        lines: [
          {
            accountId: "acc_1",
            accountName: "A",
            financialType: "ASSET",
            statementGroup: "A",
            normalBalance: "DEBIT",
            debit: -500,
            credit: 0,
          },
          {
            accountId: "acc_2",
            accountName: "B",
            financialType: "LIABILITY",
            statementGroup: "B",
            normalBalance: "CREDIT",
            debit: 0,
            credit: -500,
          },
        ],
      };
      const negVal = JournalValidator.validate(negativeLine);
      assert(!negVal.isValid, "Negative amount rejected");
      assert(negVal.errors.some((e) => e.includes("cannot be negative")), "Error explains amount cannot be negative");

      // 4b. Non-finite amount (NaN)
      const nanLine = {
        ...negativeLine,
        idempotencyKey: "TEST_NAN_001",
        lines: [
          {
            accountId: "acc_1",
            accountName: "A",
            financialType: "ASSET",
            statementGroup: "A",
            normalBalance: "DEBIT",
            debit: NaN,
            credit: 0,
          },
          {
            accountId: "acc_2",
            accountName: "B",
            financialType: "LIABILITY",
            statementGroup: "B",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 100,
          },
        ],
      };
      const nanVal = JournalValidator.validate(nanLine);
      assert(!nanVal.isValid, "NaN amount rejected");

      // 4c. Line with both debit and credit > 0
      const dualSidedLine = {
        ...negativeLine,
        idempotencyKey: "TEST_DUAL_001",
        lines: [
          {
            accountId: "acc_1",
            accountName: "A",
            financialType: "ASSET",
            statementGroup: "A",
            normalBalance: "DEBIT",
            debit: 100,
            credit: 100,
          },
          {
            accountId: "acc_2",
            accountName: "B",
            financialType: "LIABILITY",
            statementGroup: "B",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 200,
          },
        ],
      };
      const dualVal = JournalValidator.validate(dualSidedLine);
      assert(!dualVal.isValid, "Line with both debit and credit simultaneously rejected");
    }

    console.log("\n--- 5. Paise-Level Debit/Credit Equality & Floating Point Drift ---");
    {
      // Odd-paise test: ₹15.25 GST split into ₹7.62 and ₹7.63
      const oddPaiseInput = {
        entryType: "SALES" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "TAX_INVOICE" as const,
        sourceId: "inv_odd_paise",
        narration: "Odd paise GST test",
        idempotencyKey: "TEST_ODD_PAISE_001",
        lines: [
          {
            accountId: "cust_1",
            accountName: "Client",
            financialType: "ASSET",
            statementGroup: "Trade Receivables",
            normalBalance: "DEBIT",
            debit: 15.25,
            credit: 0,
          },
          {
            accountId: "cgst_1",
            accountName: "Output CGST",
            financialType: "LIABILITY",
            statementGroup: "Taxes",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 7.62,
          },
          {
            accountId: "sgst_1",
            accountName: "Output SGST",
            financialType: "LIABILITY",
            statementGroup: "Taxes",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 7.63,
          },
        ],
      };

      const oddVal = JournalValidator.validateOrThrow(oddPaiseInput);
      assert(oddVal.isBalanced === true, "Exact integer paise splitting (7.62 + 7.63 = 15.25) validates with 0 paise diff");
      assert(oddVal.totalDebitPaise === 1525 && oddVal.totalCreditPaise === 1525, "Paise representations equal 1525 exactly");

      // IEEE 754 precision drift test (0.1 + 0.2)
      const p1 = toPaise(0.1); // 10 paise
      const p2 = toPaise(0.2); // 20 paise
      const p3 = toPaise(0.3); // 30 paise
      assert(p1 + p2 === p3, "Integer paise math resolves IEEE 754 float drift (10 + 20 === 30 paise)");
      assert(roundToPaisa(0.1 + 0.2) === 0.3, "roundToPaisa eliminates 0.30000000000000004 drift");
    }

    console.log("\n--- 6. Duplicate Idempotency Keys Enforcement ---");
    {
      const idemInput = {
        entryType: "JOURNAL" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "MANUAL_ADJUSTMENT" as const,
        sourceId: "idemp_src_001",
        narration: "First submission",
        idempotencyKey: "IDEMP_UNIQUE_TEST_KEY_888",
        lines: [
          {
            accountId: "bank_acc_1",
            accountName: "Federal Bank",
            financialType: "ASSET",
            statementGroup: "Bank",
            normalBalance: "DEBIT",
            debit: 2500,
            credit: 0,
          },
          {
            accountId: "cat_rev_001",
            accountName: "Revenue",
            financialType: "INCOME",
            statementGroup: "Revenue",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 2500,
          },
        ],
      };

      // 1st Post: creates record
      const post1 = await JournalPostingService.postJournalEntry(idemInput, undefined, testPrisma);
      assert(post1 !== null, "First posting with unique idempotency key succeeds");

      // 2nd Post (identical): returns existing entry without creating duplicate
      const post2 = await JournalPostingService.postJournalEntry(idemInput, undefined, testPrisma);
      assert(post1.id === post2.id, "Second posting with identical idempotency key safely returns existing entry");

      // 3rd Post (conflicting payload): throws IdempotencyConflictError
      const conflictingInput = {
        ...idemInput,
        sourceId: "different_source_999",
      };

      let conflictThrew = false;
      try {
        await JournalPostingService.postJournalEntry(conflictingInput, undefined, testPrisma);
      } catch (e: any) {
        conflictThrew = e instanceof IdempotencyConflictError;
      }
      assert(conflictThrew, "Reusing idempotency key with conflicting source payload throws IdempotencyConflictError");
    }

    console.log("\n--- 7. Concurrent Posting Attempts with Same Key ---");
    {
      const concurrentKey = "CONCURRENT_IDEMP_TEST_999";
      const concurrentInput = {
        entryType: "RECEIPT" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "INVOICE_PAYMENT" as const,
        sourceId: "pay_concur_001",
        narration: "Concurrent payment recording test",
        idempotencyKey: concurrentKey,
        lines: [
          {
            accountId: "bank_1",
            accountName: "Bank",
            financialType: "ASSET",
            statementGroup: "Bank",
            normalBalance: "DEBIT",
            debit: 1500,
            credit: 0,
          },
          {
            accountId: "cust_1",
            accountName: "Customer",
            financialType: "ASSET",
            statementGroup: "Receivables",
            normalBalance: "DEBIT",
            debit: 0,
            credit: 1500,
          },
        ],
      };

      // Fire 5 concurrent requests with the exact same idempotency key simultaneously
      const results = await Promise.all([
        JournalPostingService.postJournalEntry(concurrentInput, undefined, testPrisma),
        JournalPostingService.postJournalEntry(concurrentInput, undefined, testPrisma),
        JournalPostingService.postJournalEntry(concurrentInput, undefined, testPrisma),
        JournalPostingService.postJournalEntry(concurrentInput, undefined, testPrisma),
        JournalPostingService.postJournalEntry(concurrentInput, undefined, testPrisma),
      ]);

      const firstId = results[0].id;
      const allSame = results.every((r) => r.id === firstId);
      assert(allSame, "All 5 concurrent requests resolved to the exact same JournalEntry ID");

      const countInDb = await testPrisma.journalEntry.count({
        where: { idempotencyKey: concurrentKey },
      });
      assert(countInDb === 1, "Exactly one entry committed to MongoDB Atlas despite 5 concurrent requests");
    }

    console.log("\n--- 8. Atomic Rollback on Mid-Transaction Failure ---");
    {
      const failingIdempKey = "ATOMIC_FAIL_TEST_KEY_777";
      let txError = false;

      try {
        await testPrisma.$transaction(async (tx) => {
          // 1. Create a journal entry
          await tx.journalEntry.create({
            data: {
              entryNumber: "TEST-FAIL-001",
              entryType: "JOURNAL",
              accountingDate: new Date(),
              financialYear: "2026-27",
              sourceType: "MANUAL_ADJUSTMENT",
              sourceId: "src_fail",
              narration: "Failing transaction test",
              totalDebit: 1000,
              totalCredit: 1000,
              idempotencyKey: failingIdempKey,
            },
          });

          // 2. Create audit log
          await tx.auditLog.create({
            data: {
              actorName: "Test",
              actorEmail: "test@kvj.local",
              action: "POST_JOURNAL",
              entity: "JournalEntry",
              entityId: "fake_id_123",
            },
          });

          // 3. Force artificial exception inside transaction
          throw new Error("Simulated downstream system failure triggering rollback");
        });
      } catch {
        txError = true;
      }

      assert(txError, "Transaction caught simulated failure");

      // Verify that no orphaned records persisted in either table
      const orphanEntry = await testPrisma.journalEntry.findUnique({
        where: { idempotencyKey: failingIdempKey },
      });
      const orphanAudit = await testPrisma.auditLog.findFirst({
        where: { entityId: "fake_id_123" },
      });

      assert(orphanEntry === null, "Transaction rollback cleanly purged JournalEntry");
      assert(orphanAudit === null, "Transaction rollback cleanly purged AuditLog record");
    }

    console.log("\n--- 9. Reversal Links & Correction Rules ---");
    {
      // 9a. Post an original voucher
      const originalInput = {
        entryType: "PURCHASE" as const,
        accountingDate: new Date("2026-10-22"),
        financialYear: "2026-27",
        sourceType: "EXPENSE" as const,
        sourceId: "exp_to_reverse_001",
        sourceNumber: "EXP-2026-0042",
        narration: "Office Supplies Expense Bill",
        idempotencyKey: "EXP_REVERSAL_TEST_ORIG",
        lines: [
          {
            accountId: "cat_supplies",
            accountName: "Office Supplies",
            financialType: "EXPENSE",
            statementGroup: "Operating Expenses",
            normalBalance: "DEBIT",
            debit: 3500.00,
            credit: 0,
          },
          {
            accountId: "vendor_abc",
            accountName: "ABC Supplies Ltd",
            financialType: "LIABILITY",
            statementGroup: "Trade Payables",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 3500.00,
          },
        ],
      };

      const origEntry = await JournalPostingService.postJournalEntry(
        originalInput,
        { id: "admin_1", name: "Ajay", email: "ajay@kvj.local" },
        testPrisma
      );
      assert(origEntry.status === "POSTED", "Original entry posted successfully");

      // 9b. Reverse it
      const reversed = await JournalPostingService.reverseJournalEntry(
        {
          originalEntryId: origEntry.id,
          reason: "Vendor issued cancelled credit note",
          actor: { id: "admin_1", name: "Ajay", email: "ajay@kvj.local" },
        },
        testPrisma
      );

      assert(reversed.entryType === "REVERSAL", "Reversal voucher has entryType = REVERSAL");
      assert(reversed.reversalOfId === origEntry.id, "Reversal voucher references original entry ID");

      // Verify lines were inverted: Office Supplies now has CREDIT of 3500, Vendor now has DEBIT of 3500
      const suppliesLine = reversed.lines.find((l) => l.accountId === "cat_supplies");
      const vendorLine = reversed.lines.find((l) => l.accountId === "vendor_abc");
      assert(suppliesLine?.credit === 3500.00 && suppliesLine?.debit === 0, "Original debit line successfully inverted to credit");
      assert(vendorLine?.debit === 3500.00 && vendorLine?.credit === 0, "Original credit line successfully inverted to debit");

      // Verify original entry was updated to REVERSED
      const updatedOriginal = await testPrisma.journalEntry.findUnique({
        where: { id: origEntry.id },
      });
      assert(updatedOriginal?.status === "REVERSED", "Original entry status updated to REVERSED");
      assert(updatedOriginal?.reversedAt !== null, "Original entry recorded reversedAt timestamp");

      // 9c. Attempt to reverse again (double reversal prevention)
      let doubleRevThrew = false;
      try {
        await JournalPostingService.reverseJournalEntry(
          {
            originalEntryId: origEntry.id,
            reason: "Attempting duplicate reversal",
            actor: { id: "admin_1", name: "Ajay", email: "ajay@kvj.local" },
          },
          testPrisma
        );
      } catch (e: any) {
        doubleRevThrew = e instanceof InvalidReversalError;
      }
      assert(doubleRevThrew, "Attempting to reverse an already-reversed voucher throws InvalidReversalError");

      // 9d. Attempt to reverse a reversal entry
      let reverseReversalThrew = false;
      try {
        await JournalPostingService.reverseJournalEntry(
          {
            originalEntryId: reversed.id,
            reason: "Attempting to reverse reversal",
            actor: { id: "admin_1", name: "Ajay", email: "ajay@kvj.local" },
          },
          testPrisma
        );
      } catch (e: any) {
        reverseReversalThrew = e instanceof InvalidReversalError;
      }
      assert(reverseReversalThrew, "Attempting to reverse a reversal entry throws InvalidReversalError");
    }

    console.log("\n--- 10. Atomic Sequence Numbering Concurrency ---");
    {
      const prefix = `TEST-CONCUR-${Date.now().toString().slice(-4)}`;
      const requestCount = 10;

      const promises = Array.from({ length: requestCount }).map(() =>
        AtomicNumberingService.getNextSequence(testPrisma, prefix, 4)
      );

      const allocations = await Promise.all(promises);
      const allocatedSeqs = allocations.map((a) => a.sequence);
      const uniqueSeqs = new Set(allocatedSeqs);

      assert(uniqueSeqs.size === requestCount, "All 10 concurrent sequence allocations are strictly unique");
      assert(Math.min(...allocatedSeqs) === 1, "First sequence starts at 1");
      assert(Math.max(...allocatedSeqs) === 10, "Final sequence reaches 10 with zero gaps or duplicates");
    }

    console.log("\n--- 11. Fiscal Period Close Enforcement ---");
    {
      // Create a locked period
      const lockedPeriod = await testPrisma.fiscalPeriod.create({
        data: {
          financialYear: "2025-26",
          periodName: "FY 2025-26 Closed Audit",
          periodCode: "CLOSED-FY-2025-26",
          startDate: new Date("2025-04-01"),
          endDate: new Date("2026-03-31"),
          isLocked: true,
          lockedAt: new Date(),
          lockReason: "Statutory Tax Audit Completed",
        },
      });

      const entryInLockedPeriod = {
        entryType: "JOURNAL" as const,
        accountingDate: new Date("2025-08-15"), // Falls inside locked period
        financialYear: "2025-26",
        sourceType: "MANUAL_ADJUSTMENT" as const,
        sourceId: "adj_closed_period",
        narration: "Attempting to post in closed period",
        idempotencyKey: "TEST_CLOSED_PERIOD_POST_001",
        lines: [
          {
            accountId: "bank_1",
            accountName: "Bank",
            financialType: "ASSET",
            statementGroup: "Bank",
            normalBalance: "DEBIT",
            debit: 500,
            credit: 0,
          },
          {
            accountId: "rev_1",
            accountName: "Revenue",
            financialType: "INCOME",
            statementGroup: "Revenue",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 500,
          },
        ],
      };

      let periodLockedThrew = false;
      try {
        await JournalPostingService.postJournalEntry(entryInLockedPeriod, undefined, testPrisma);
      } catch (e: any) {
        periodLockedThrew = e.name === "FiscalPeriodLockedError";
      }
      assert(periodLockedThrew, "Posting into a locked fiscal period is rejected by FiscalPeriodLockedError");
    }

    console.log("\n--- 12. Approved Tax Invoice Calculation Preservation ---");
    {
      const sampleCalculation = TaxEngine.calculateInvoiceTaxes({
        items: [
          {
            grossAmount: 10000,
            discountAmount: 0,
            taxableAmount: 10000,
            gstRate: 18,
            isGstEnabled: true,
            isTdsEnabled: false,
          },
          {
            grossAmount: 5000,
            discountAmount: 500,
            taxableAmount: 4500,
            gstRate: 18,
            isGstEnabled: true,
            isTdsEnabled: true,
            tdsRate: 10,
          },
        ],
        businessState: "Kerala",
        customerState: "Kerala", // Intra-state (CGST + SGST)
      });

      assert(sampleCalculation.taxableAmount === 14500, "Taxable amount accurately computes to 14,500.00");
      assert(sampleCalculation.totalCGST === 1305, "Total CGST (9% on 14,500) accurately equals 1,305.00");
      assert(sampleCalculation.totalSGST === 1305, "Total SGST (9% on 14,500) accurately equals 1,305.00");
      assert(sampleCalculation.totalGST === 2610, "Total GST accurately equals 2,610.00");
      assert(sampleCalculation.tdsAmount === 450, "TDS under 194J accurately equals 450.00");
      assert(sampleCalculation.grossAmount === 17110, "Gross invoice total accurately equals 17,110.00");
      assert(sampleCalculation.netAmount === 16660, "Net receivable (Gross - TDS) accurately equals 16,660.00");
    }

    // Clean up test data in isolated test database
    await testPrisma.journalLine.deleteMany({});
    await testPrisma.journalEntry.updateMany({ data: { reversalOfId: null } });
    await testPrisma.journalEntry.deleteMany({});
    await testPrisma.auditLog.deleteMany({});
    await testPrisma.fiscalPeriod.deleteMany({});
    await testPrisma.counter.deleteMany({});

    console.log("\n================================================================================");
    console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("ALL 12 TEST SCENARIOS EXECUTED SUCCESSFULLY IN ISOLATED TEST DATABASE!");
    console.log("================================================================================");
  } catch (err) {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

runTests();
