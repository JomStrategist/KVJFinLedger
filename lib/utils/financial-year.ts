/**
 * Utility functions for Indian Financial Year (FY) management
 * Financial Year in India runs from April 1st of Year N to March 31st of Year N+1.
 */

export interface FyDateRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Returns the active Financial Year string based on a given date (default: today)
 * e.g., Date in Sept 2026 -> "FY 2026–27"
 * e.g., Date in Feb 2026  -> "FY 2025–26"
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0 = Jan, 3 = Apr, 11 = Dec
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `FY ${startYear}–${endYearShort}`;
}

/**
 * Returns standard available Financial Year options
 */
export function getAvailableFinancialYears(): { value: string; label: string }[] {
  const current = getCurrentFinancialYear();
  const match = current.match(/\d{4}/);
  const startYr = match ? parseInt(match[0], 10) : new Date().getFullYear();

  return [
    { value: `FY ${startYr}–${String(startYr + 1).slice(-2)}`, label: `FY ${startYr}–${String(startYr + 1).slice(-2)} (Current)` },
    { value: `FY ${startYr - 1}–${String(startYr).slice(-2)}`, label: `FY ${startYr - 1}–${String(startYr).slice(-2)} (Previous)` },
    { value: `FY ${startYr - 2}–${String(startYr - 1).slice(-2)}`, label: `FY ${startYr - 2}–${String(startYr - 1).slice(-2)}` },
    { value: "ALL", label: "All Financial Years" }
  ];
}

/**
 * Resolves exact start and end Date objects for an FY string (or "ALL")
 */
export function getFyDateRange(fyString?: string): { start?: Date; end?: Date } {
  if (!fyString || fyString === "ALL") {
    return { start: undefined, end: undefined };
  }

  // Matches 4-digit start year from "FY 2026–27" or "FY 2026-27" or "2026"
  const match = fyString.match(/\d{4}/);
  if (!match) {
    return { start: undefined, end: undefined };
  }

  const startYear = parseInt(match[0], 10);
  const start = new Date(startYear, 3, 1, 0, 0, 0, 0); // 01-Apr 00:00:00
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // 31-Mar 23:59:59.999

  return { start, end };
}
