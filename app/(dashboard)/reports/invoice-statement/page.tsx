import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { ProformaInvoiceStatus, TaxInvoiceStatus } from "@prisma/client";
import Link from "next/link";


export default async function InvoiceStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const typeFilter = typeof params.type === "string" ? params.type : "all";
  const statusFilter = typeof params.status === "string" ? params.status : "all";
  const customerFilter = typeof params.customerId === "string" ? params.customerId : "all";
  const fromFilter = typeof params.from === "string" ? params.from : "";
  const toFilter = typeof params.to === "string" ? params.to : "";

  // Fetch customers for filter
  const customers = await prisma.customer.findMany({
    orderBy: { legalName: "asc" },
  });

  // Base filters
  const dateFilter: any = {};
  if (fromFilter || toFilter) {
    if (fromFilter) dateFilter.gte = new Date(fromFilter);
    if (toFilter) {
      const toDate = new Date(toFilter);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
  }

  // Fetch Proforma Invoices
  let proformas: any[] = [];
  if (typeFilter === "all" || typeFilter === "proforma") {
    const pWhere: any = {};
    if (Object.keys(dateFilter).length > 0) pWhere.invoiceDate = dateFilter;
    if (customerFilter !== "all") pWhere.customerId = customerFilter;
    if (statusFilter !== "all") {
      // Best effort mapping of string to enum
      if (Object.values(ProformaInvoiceStatus).includes(statusFilter as any)) {
        pWhere.status = statusFilter;
      } else {
        // Force no results if status doesn't apply to proforma
        pWhere.status = "NON_EXISTENT"; 
      }
    }

    proformas = await prisma.proformaInvoice.findMany({
      where: pWhere,
      include: { customer: true },
      orderBy: { invoiceDate: "desc" },
    });
  }

  // Fetch Tax Invoices
  let taxes: any[] = [];
  if (typeFilter === "all" || typeFilter === "tax") {
    const tWhere: any = {};
    if (Object.keys(dateFilter).length > 0) tWhere.invoiceDate = dateFilter;
    if (customerFilter !== "all") tWhere.customerId = customerFilter;
    if (statusFilter !== "all") {
      if (Object.values(TaxInvoiceStatus).includes(statusFilter as any)) {
        tWhere.status = statusFilter;
      } else {
        tWhere.status = "NON_EXISTENT";
      }
    }

    taxes = await prisma.taxInvoice.findMany({
      where: tWhere,
      include: { customer: true },
      orderBy: { invoiceDate: "desc" },
    });
  }

  // Format into uniform shape
  const allInvoices = [
    ...proformas.map((p) => ({
      id: p.id,
      number: p.invoiceNumber,
      type: "Proforma Invoice",
      date: p.invoiceDate,
      customer: p.customer.legalName,
      status: p.status,
      amount: Number(p.totalAmount),
      link: `/proforma-invoices/${p.id}`,
    })),
    ...taxes.map((t) => ({
      id: t.id,
      number: t.invoiceNumber,
      type: "Tax Invoice",
      date: t.invoiceDate,
      customer: t.customer.legalName,
      status: t.status,
      amount: Number(t.netAmount),
      link: `/invoices/${t.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculations
  const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProforma = allInvoices.filter(i => i.type === "Proforma Invoice").reduce((sum, inv) => sum + inv.amount, 0);
  const totalTax = allInvoices.filter(i => i.type === "Tax Invoice").reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Invoice Statement</h1>
          <p className="text-theme-text-muted text-sm mt-1">Unified report of all Proforma and Tax Invoices.</p>
        </div>
        <Link
          href="/reports"
          className="px-4 py-2 bg-theme-surface text-theme-text border border-theme-border rounded-lg text-sm font-medium hover:bg-theme-surface-hover transition-colors"
        >
          Back to Reports
        </Link>
      </div>

      <form className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-theme-text mb-1">Customer</label>
          <select name="customerId" defaultValue={customerFilter} className="w-full border-theme-border rounded-md text-sm">
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legalName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-theme-text mb-1">Type</label>
          <select name="type" defaultValue={typeFilter} className="w-full border-theme-border rounded-md text-sm">
            <option value="all">All Types</option>
            <option value="proforma">Proforma Invoices</option>
            <option value="tax">Tax Invoices</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-theme-text mb-1">From Date</label>
          <input type="date" name="from" defaultValue={fromFilter} className="w-full border-theme-border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-theme-text mb-1">To Date</label>
          <input type="date" name="to" defaultValue={toFilter} className="w-full border-theme-border rounded-md text-sm" />
        </div>
        <div>
          <button type="submit" className="w-full bg-theme-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-theme-primary-dark">
            Apply Filters
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-sm font-medium text-theme-text-muted">Total Statements</p>
          <p className="text-2xl font-bold text-theme-text mt-1">{allInvoices.length}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-sm font-medium text-theme-text-muted">Total Overall Value</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">₹{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-sm font-medium text-theme-text-muted">Tax Invoices Value</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalTax.toFixed(2)}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-sm font-medium text-theme-text-muted">Proforma Value</p>
          <p className="text-2xl font-bold text-theme-primary mt-1">₹{totalProforma.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs font-medium text-theme-text-muted uppercase tracking-wider">
                <th className="p-4">Date</th>
                <th className="p-4">Number</th>
                <th className="p-4">Type</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {allInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-theme-surface-hover">
                  <td className="p-4 text-sm text-theme-text">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium text-theme-primary">
                    <Link href={inv.link} className="hover:underline">{inv.number}</Link>
                  </td>
                  <td className="p-4 text-sm text-theme-text-muted">{inv.type}</td>
                  <td className="p-4 text-sm text-theme-text">{inv.customer}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-theme-surface-hover text-theme-text">
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-theme-text font-medium text-right">{inv.amount.toFixed(2)}</td>
                </tr>
              ))}
              {allInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-theme-text-muted">
                    No invoices found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
