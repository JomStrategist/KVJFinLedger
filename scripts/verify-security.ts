/**
 * FinLedger Security & Authentication Hardening Verification Script
 * Validates Phase 1 through Phase 5 requirements without mutating production records.
 */

import "dotenv/config";
import { getAuthSecret } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Import Server Actions to verify server-side authorization enforcement
import {
  createTaxInvoiceAction,
  cancelTaxInvoiceAction,
  deleteTaxInvoiceAction,
  recordInvoicePaymentAction,
} from "@/app/(dashboard)/invoices/actions";
import { createProformaInvoiceAction } from "@/app/(dashboard)/invoices/proforma-actions";
import {
  createExpenseAction,
  deleteExpenseAction,
  approveExpenseAction,
  recordSalaryPayoutAction,
} from "@/app/(dashboard)/expenses/actions";
import {
  createBankTransferAction,
  deleteBankTransferAction,
} from "@/app/(dashboard)/bank-transfers/actions";
import { createUserAction } from "@/app/(dashboard)/users/actions";
import { GET as testDbGET } from "@/app/api/test-db/route";
import { GET as ledgerStatementGET } from "@/app/api/ledgers/statement/route";

interface TestResult {
  id: string;
  description: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(id: string, description: string, passed: boolean, details?: string) {
  results.push({ id, description, passed, details });
  const icon = passed ? "PASS" : "FAIL";
  console.log(`[${icon}] ${id}: ${description}${details ? ` -> ${details}` : ""}`);
}

async function runVerification() {
  console.log("\n========================================================");
  console.log(" FINLEDGER SECURITY & AUTHENTICATION VERIFICATION SUITE");
  console.log("========================================================\n");

  // 1. Missing AUTH_SECRET fails safely outside test mode
  try {
    const origAuthSecret = process.env.AUTH_SECRET;
    const origNextAuthSecret = process.env.NEXTAUTH_SECRET;
    const origNodeEnv = process.env.NODE_ENV;

    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    (process.env as any).NODE_ENV = "production";

    let errorThrown = false;
    let errorMessage = "";
    try {
      getAuthSecret();
    } catch (err: any) {
      errorThrown = true;
      errorMessage = err.message;
    }

    const passed = errorThrown && errorMessage.includes("Configuration Error: AUTH_SECRET or NEXTAUTH_SECRET environment variable is required.");
    record(
      "TEST-1",
      "Missing AUTH_SECRET fails safely with non-sensitive error outside test mode",
      passed,
      errorMessage
    );

    // Restore environment
    (process.env as any).NODE_ENV = "test";
    const testSecret = getAuthSecret();
    record(
      "TEST-1b",
      "Isolated test secret provided when NODE_ENV === 'test'",
      testSecret === "finledger-isolated-test-secret-do-not-use-in-production",
      "Safe isolated fallback verified"
    );

    if (origAuthSecret) process.env.AUTH_SECRET = origAuthSecret;
    if (origNextAuthSecret) process.env.NEXTAUTH_SECRET = origNextAuthSecret;
    if (origNodeEnv) (process.env as any).NODE_ENV = origNodeEnv;
  } catch (err: any) {
    record("TEST-1", "Missing AUTH_SECRET handling", false, err.message);
  }

  // 2. Verify no hardcoded fallback secret in codebase
  const rootDir = process.cwd();
  const authTsContent = fs.readFileSync(path.join(rootDir, "auth.ts"), "utf-8");
  const authConfigTsContent = fs.readFileSync(path.join(rootDir, "auth.config.ts"), "utf-8");
  const legacySecret = "ATG7kBWRrKlZnzMiJ8wYXjFt5O2eQc3p";
  const noHardcodedSecret =
    !authTsContent.includes(legacySecret) &&
    !authConfigTsContent.includes(legacySecret);

  record(
    "TEST-2",
    "No hardcoded fallback secret exists in auth.ts or auth.config.ts",
    noHardcodedSecret,
    noHardcodedSecret ? "Legacy secret completely purged" : "Hardcoded secret still detected!"
  );

  // 3. Verify no backdoor login credentials exist in auth.ts
  const hasBackdoorEmail1 = authTsContent.includes("mail@thestrategist.co.in");
  const hasBackdoorPass1 = authTsContent.includes("admin123");
  const hasBackdoorPass2 = authTsContent.includes("user123");
  const noBackdoors = !hasBackdoorEmail1 && !hasBackdoorPass1 && !hasBackdoorPass2;

  record(
    "TEST-3",
    "No backdoor credential bypasses remain in auth.ts",
    noBackdoors,
    noBackdoors ? "All static email/password bypass branches eliminated" : "Backdoor code found in auth.ts"
  );

  // 4. Valid database-backed user authentication
  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: { equals: "info@thestrategist.co.in", mode: "insensitive" } },
    });

    const hasUser = !!adminUser && adminUser.isActive && adminUser.role === "ADMIN";
    const validPasswordMatch = adminUser ? await bcrypt.compare("AjayThomas@1", adminUser.password) : false;

    record(
      "TEST-4",
      "Legitimate administrator exists in DB and verifies against bcrypt password hash",
      hasUser && validPasswordMatch,
      `User: ${adminUser?.email}, Role: ${adminUser?.role}, Hash verified: ${validPasswordMatch}`
    );
  } catch (err: any) {
    record("TEST-4", "Legitimate user verification", false, err.message);
  }

  // 5. Invalid credentials rejected
  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: { equals: "info@thestrategist.co.in", mode: "insensitive" } },
    });
    const invalidPasswordMatch = adminUser ? await bcrypt.compare("WrongPassword@123", adminUser.password) : false;
    const backdoorOldMatch = adminUser ? await bcrypt.compare("admin123", adminUser.password) : false;

    record(
      "TEST-5",
      "Invalid passwords and retired backdoor passwords rejected by DB hash",
      !invalidPasswordMatch && !backdoorOldMatch,
      `WrongPassword match: ${invalidPasswordMatch}, admin123 match: ${backdoorOldMatch}`
    );
  } catch (err: any) {
    record("TEST-5", "Invalid credentials rejection", false, err.message);
  }

  // 6. Unauthenticated Server Action protection (Invoices)
  try {
    const resCreateTax = await createTaxInvoiceAction({ customerId: "test" });
    const resCancelTax = await cancelTaxInvoiceAction("dummy-id", "test");
    const resCreateProforma = await createProformaInvoiceAction({ customerId: "test" });
    const resRecordPayment = await recordInvoicePaymentAction("dummy-id", {
      paymentDate: "2026-04-01",
      paymentAmount: 1000,
      isTdsDeducted: false,
      tdsRate: 0,
      tdsAmount: 0,
      bankReceipt: 1000,
    });

    const allRejected =
      resCreateTax.success === false &&
      resCreateTax.error?.includes("Unauthorized") &&
      resCancelTax.success === false &&
      resCancelTax.error?.includes("Unauthorized") &&
      resCreateProforma.success === false &&
      resCreateProforma.error?.includes("Unauthorized") &&
      resRecordPayment.success === false &&
      resRecordPayment.error?.includes("Unauthorized");

    record(
      "TEST-6",
      "Unauthenticated invoice mutations are rejected inside Server Actions",
      allRejected,
      `CreateTax: ${resCreateTax.error}, Cancel: ${resCancelTax.error}`
    );
  } catch (err: any) {
    record("TEST-6", "Invoice actions auth", false, err.message);
  }

  // 7. Unauthenticated Server Action protection (Expenses & Bank Transfers)
  try {
    const resCreateExpense = await createExpenseAction({ description: "test" });
    const resApproveExpense = await approveExpenseAction("dummy-id");
    const resCreateTransfer = await createBankTransferAction({
      date: "2026-04-01",
      fromAccount: "acc1",
      toAccount: "acc2",
      amount: 500,
    });

    const expensesRejected =
      resCreateExpense.success === false &&
      resCreateExpense.error?.includes("Unauthorized") &&
      resApproveExpense.success === false &&
      resApproveExpense.error?.includes("Unauthorized") &&
      resCreateTransfer.success === false &&
      resCreateTransfer.error?.includes("Unauthorized");

    record(
      "TEST-7",
      "Unauthenticated expense and bank transfer mutations are rejected inside Server Actions",
      expensesRejected,
      `CreateExpense: ${resCreateExpense.error}, Transfer: ${resCreateTransfer.error}`
    );
  } catch (err: any) {
    record("TEST-7", "Expenses and transfer auth", false, err.message);
  }

  // 8. Admin-only actions reject unauthenticated / unauthorized calls
  try {
    const resDeleteInvoice = await deleteTaxInvoiceAction("dummy-id");
    const resDeleteExpense = await deleteExpenseAction("dummy-id");
    const resDeleteTransfer = await deleteBankTransferAction("dummy-id");
    const resCreateUser = await createUserAction({
      name: "Attacker",
      email: "attacker@example.com",
      roleName: "ADMIN",
    });
    const resSalaryPayout = await recordSalaryPayoutAction({
      employeeId: "emp-dummy",
      paymentDate: "2026-04-01",
      periodMonth: "April 2026",
      grossAmount: 50000,
    });

    const adminActionsProtected =
      resDeleteInvoice.success === false &&
      resDeleteExpense.success === false &&
      resDeleteTransfer.success === false &&
      resCreateUser.success === false &&
      resSalaryPayout.success === false;

    record(
      "TEST-8",
      "Critical deletions and administrative actions reject unauthenticated callers",
      adminActionsProtected,
      `DeleteInvoice: ${resDeleteInvoice.error}, CreateUser: ${resCreateUser.error}`
    );
  } catch (err: any) {
    record("TEST-8", "Admin-only protection", false, err.message);
  }

  // 9. Private Diagnostic API (/api/test-db) rejects unauthenticated requests and sanitizes data
  try {
    const res = await testDbGET();
    const status = res.status;
    const body = await res.json();

    const isSecure = status === 401 && body.error === "Unauthorized";
    const noLeaks =
      body.adminEmail === undefined &&
      body.databaseUrlLength === undefined &&
      body.authSecretLength === undefined &&
      body.userCount === undefined &&
      body.stack === undefined;

    record(
      "TEST-9",
      "Diagnostic /api/test-db rejects unauthenticated access (401) with zero sensitive leaks",
      isSecure && noLeaks,
      `HTTP Status: ${status}, Response: ${JSON.stringify(body)}`
    );
  } catch (err: any) {
    record("TEST-9", "test-db security", false, err.message);
  }

  // 10. Private Ledger API (/api/ledgers/statement) rejects unauthenticated requests
  try {
    const dummyReq = new Request("http://localhost:3000/api/ledgers/statement?accountId=acc123");
    const res = await ledgerStatementGET(dummyReq);
    const status = res.status;
    const body = await res.json();

    const isSecure = status === 401 && body.error === "Unauthorized";
    record(
      "TEST-10",
      "Financial API /api/ledgers/statement rejects unauthenticated callers (401)",
      isSecure,
      `HTTP Status: ${status}, Response: ${JSON.stringify(body)}`
    );
  } catch (err: any) {
    record("TEST-10", "Ledger statement security", false, err.message);
  }

  // 11. Next.js 16 proxy.ts convention exists and is configured
  const proxyPath = path.join(rootDir, "proxy.ts");
  const proxyExists = fs.existsSync(proxyPath);
  const proxyContent = proxyExists ? fs.readFileSync(proxyPath, "utf-8") : "";
  const hasProxyExport = proxyContent.includes("export const proxy") || proxyContent.includes("export default");
  const hasMatcher = proxyContent.includes("matcher:");

  record(
    "TEST-11",
    "Next.js 16 proxy.ts route protection created with valid matcher and NextAuth proxy export",
    proxyExists && hasProxyExport && hasMatcher,
    `proxy.ts exists: ${proxyExists}, exports proxy: ${hasProxyExport}, matcher defined: ${hasMatcher}`
  );

  // 12. Dashboard Layout Server-side protection
  const layoutPath = path.join(rootDir, "app/(dashboard)/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  const hasRequireAuth = layoutContent.includes("await requireAuth()");

  record(
    "TEST-12",
    "app/(dashboard)/layout.tsx enforces server-side requireAuth()",
    hasRequireAuth,
    "Unauthenticated page rendering blocked at dashboard layout boundary"
  );

  console.log("\n========================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(` SUMMARY: ${passedCount} / ${results.length} TESTS PASSED`);
  console.log("========================================================\n");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error("Test Suite Execution Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
