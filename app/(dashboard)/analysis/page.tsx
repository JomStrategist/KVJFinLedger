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
  if (!query.has("tab")) {
    query.set("tab", "analysis");
  }
  const qs = query.toString();
  redirect(`/financial-statements?${qs}`);
}
