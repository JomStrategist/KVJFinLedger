/**
 * Accurately rounds a monetary amount to 2 decimal places (exact Indian Paise).
 * Utilizes Number.EPSILON to eliminate IEEE-754 floating-point representation drift.
 */
export function roundToPaisa(amount: number | null | undefined): number {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return 0;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Converts a rupee amount to integer paise (e.g. 100.50 -> 10050).
 * Safe integer representation prevents floating-point accumulator error.
 */
export function toPaise(rupees: number | null | undefined): number {
  if (rupees === null || rupees === undefined || isNaN(rupees) || !isFinite(rupees)) {
    return 0;
  }
  return Math.round((rupees + Number.EPSILON) * 100);
}

/**
 * Converts integer paise back to a 2-decimal rupee number.
 */
export function fromPaise(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount) || !isFinite(numericAmount)) return "₹0.00";

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

