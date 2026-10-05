import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { DepreciationService } from "@/services/depreciation.service";
import { SettingsClient } from "./SettingsClient";

export const metadata = {
  title: "Settings - KVJ Analytics",
  description: "Manage company profile, GST configuration, financial year settings and preferences.",
};

export default async function SettingsPage() {
  await requireAdmin();

  const [fixedAssets, categories, assetDepreciations] = await Promise.all([
    prisma.expense.findMany({
      where: {
        OR: [
          { isAsset: true },
          { category: { name: { contains: "Asset", mode: "insensitive" } } },
          { category: { financialType: "CAPEX" } },
        ],
      },
      include: { vendor: true, category: true, depreciations: true },
      orderBy: { expenseDate: "desc" },
    }).catch(() => []),
    prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
    }).catch(() => []),
    DepreciationService.getAllDepreciations().catch(() => []),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <SettingsClient
        initialFixedAssets={JSON.parse(JSON.stringify(fixedAssets))}
        categories={JSON.parse(JSON.stringify(categories))}
        assetDepreciations={JSON.parse(JSON.stringify(assetDepreciations))}
      />
    </div>
  );
}

