import React from 'react';
import { prisma } from '@/lib/prisma';
import { BankReconciliationClient } from './BankReconciliationClient';

export const metadata = {
  title: 'Bank Reconciliation | FinLedger',
  description: 'Upload bank statements, match against FinLedger transactions, and track unreconciled items.',
};

export default async function BankReconciliationPage() {
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    select: {
      id: true,
      accountName: true,
      accountNumber: true,
      bankName: true,
    },
    orderBy: { accountName: 'asc' },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bank Reconciliation (BRS)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile external bank statements with FinLedger cash & bank ledgers. Non-destructive control mechanism.
          </p>
        </div>
      </div>

      <BankReconciliationClient bankAccounts={bankAccounts} />
    </div>
  );
}
