import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val) query.set(key, val);
  }
  const qs = query.toString();
  redirect(qs ? `/reports?${qs}` : "/reports");
}
