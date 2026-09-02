import { prisma } from '../lib/prisma';

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate FinancialStatementGroups and AccountNatures...');
  
  // 1. Deduplicate FinancialStatementGroup
  const groups = await prisma.financialStatementGroup.findMany();
  const seenGroupKeys = new Set<string>();
  const duplicateGroupIds: string[] = [];

  for (const g of groups) {
    const key = `${g.financialTypeId}_${g.name.trim().toLowerCase()}`;
    if (seenGroupKeys.has(key)) {
      duplicateGroupIds.push(g.id);
    } else {
      seenGroupKeys.add(key);
    }
  }

  if (duplicateGroupIds.length > 0) {
    const res = await prisma.financialStatementGroup.deleteMany({
      where: { id: { in: duplicateGroupIds } }
    });
    console.log('Deleted duplicate FinancialStatementGroups:', res.count);
  }

  // 2. Deduplicate AccountNature
  const natures = await prisma.accountNature.findMany();
  const seenNatureKeys = new Set<string>();
  const duplicateNatureIds: string[] = [];

  for (const n of natures) {
    const key = `${n.financialTypeId}_${n.name.trim().toLowerCase()}`;
    if (seenNatureKeys.has(key)) {
      duplicateNatureIds.push(n.id);
    } else {
      seenNatureKeys.add(key);
    }
  }

  if (duplicateNatureIds.length > 0) {
    const res = await prisma.accountNature.deleteMany({
      where: { id: { in: duplicateNatureIds } }
    });
    console.log('Deleted duplicate AccountNatures:', res.count);
  }

  console.log('Database cleanup completed successfully!');
}

cleanupDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
