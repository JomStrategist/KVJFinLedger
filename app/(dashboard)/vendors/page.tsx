import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VendorsRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = (await searchParams) || {};
  const query = new URLSearchParams();
  query.set("tab", "vendors");
  for (const [key, val] of Object.entries(resolved)) {
    if (key !== "tab" && typeof val === "string") {
      query.set(key, val);
    }
  }
  redirect(`/expenses?${query.toString()}`);
}

