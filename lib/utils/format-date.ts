/**
 * Standardized Date Formatter for KVJ Analytics ERP System.
 * Formats any Date object, ISO string, or YYYY-MM-DD input string to DD-MM-YYYY (e.g. 02-09-2026).
 */
export function formatDate(dateInput?: Date | string | number | null): string {
  if (!dateInput) return "";

  // Handle YYYY-MM-DD string directly from HTML5 date inputs
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [yyyy, mm, dd] = dateInput.trim().split("-");
    return `${dd}-${mm}-${yyyy}`;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
}
