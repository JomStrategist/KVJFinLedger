/**
 * Converts a numeric Indian Rupee amount into formal words.
 * Handles Crores, Lakhs, Thousands, Hundreds, and Paise.
 */
export function convertNumberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o > 0 ? " " + ones[o] : ""}`;
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (h > 0) {
      res += `${ones[h]} Hundred`;
    }
    if (rem > 0) {
      if (res) res += " ";
      res += convertTwoDigits(rem);
    }
    return res;
  }

  const absAmount = Math.abs(amount);
  let rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let parts: string[] = [];

  // Crores (>= 1,00,00,000)
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    parts.push(`${convertThreeDigits(crores)} Crore`);
  }

  // Lakhs (>= 1,00,000)
  if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    rupees %= 100000;
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
  }

  // Thousands (>= 1,000)
  if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    rupees %= 1000;
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
  }

  // Hundreds & Remaining
  if (rupees > 0) {
    parts.push(convertThreeDigits(rupees));
  }

  let words = parts.filter(Boolean).join(" ");
  if (words) {
    words = `${words} Rupees`;
  } else {
    words = "Zero Rupees";
  }

  if (paise > 0) {
    words += ` and ${convertTwoDigits(paise)} Paise`;
  }

  return `${words} Only`;
}
