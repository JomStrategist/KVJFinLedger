export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "29", name: "Karnataka" },
  { code: "27", name: "Maharashtra" },
  { code: "07", name: "Delhi" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "19", name: "West Bengal" },
  { code: "08", name: "Rajasthan" },
  { code: "06", name: "Haryana" },
  { code: "03", name: "Punjab" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "21", name: "Odisha" },
  { code: "18", name: "Assam" },
  { code: "20", name: "Jharkhand" },
  { code: "22", name: "Chhattisgarh" },
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "05", name: "Uttarakhand" },
  { code: "30", name: "Goa" },
  { code: "34", name: "Puducherry" },
  { code: "04", name: "Chandigarh" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "25", name: "Daman and Diu" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "31", name: "Lakshadweep" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
  { code: "96", name: "Outside India / Export" },
];

export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES.find((s) => s.code === code);
}

export function getStateByName(name: string): IndianState | undefined {
  if (!name) return undefined;
  const lower = name.trim().toLowerCase();
  return INDIAN_STATES.find((s) => s.name.toLowerCase() === lower);
}

export function extractGstinInfo(gstin: string): {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
} {
  const cleaned = (gstin || "").trim().toUpperCase();
  // Standard 15-char GST format: 2 digit state code + 10 char PAN + 1 entity num + 1 'Z' + 1 checksum char
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isValid = gstRegex.test(cleaned);

  if (cleaned.length >= 2) {
    const code = cleaned.slice(0, 2);
    const matchedState = getStateByCode(code);
    const pan = cleaned.length >= 12 ? cleaned.slice(2, 12) : undefined;

    return {
      isValid,
      stateCode: matchedState?.code,
      stateName: matchedState?.name,
      pan,
    };
  }

  return { isValid: false };
}
