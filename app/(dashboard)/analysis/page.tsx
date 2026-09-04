import { AnalysisService } from "@/services/analysis.service";
import { prisma } from "@/lib/prisma";
import AnalysisClient from "./AnalysisClient";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    financialYear?: string;
    period?: string;
    fromDate?: string;
    toDate?: string;
    comparisonType?: string;
    comparisonFromDate?: string;
    comparisonToDate?: string;
    customerId?: string;
    vendorId?: string;
    categoryId?: string;
    financialType?: string;
    paymentStatus?: string;
  }>;
}) {
  const params = await searchParams;

  const filters = {
    financialYear: params.financialYear || "FY 2026–27",
    period: params.period || "ALL",
    fromDate: params.fromDate,
    toDate: params.toDate,
    comparisonType: (params.comparisonType as any) || "PREV_FY",
    comparisonFromDate: params.comparisonFromDate,
    comparisonToDate: params.comparisonToDate,
    customerId: params.customerId,
    vendorId: params.vendorId,
    categoryId: params.categoryId,
    financialType: params.financialType,
    paymentStatus: params.paymentStatus,
  };

  const [analysisData, customers, vendors, categories] = await Promise.all([
    AnalysisService.getFullAnalysis(filters),
    prisma.customer.findMany({ select: { id: true, legalName: true }, orderBy: { legalName: "asc" } }),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.expenseCategory.findMany({ select: { id: true, name: true, financialType: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AnalysisClient
      initialData={analysisData}
      initialFilters={filters}
      customers={customers}
      vendors={vendors}
      categories={categories}
    />
  );
}
