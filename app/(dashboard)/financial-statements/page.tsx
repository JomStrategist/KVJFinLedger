import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FinancialStatementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const params = (await searchParams) || {};
  const queryParams = new URLSearchParams();
  queryParams.set('category', 'statements');
  
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'category' && value) {
      queryParams.set(key, value);
    }
  }

  redirect(`/reports?${queryParams.toString()}`);
}
