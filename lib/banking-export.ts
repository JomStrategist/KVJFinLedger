/**
 * Corporate Banking Batch Payout Files Generator
 * Supports HDFC Bank CMS, ICICI Bank CIB, SBI CMP, Federal Bank FedCorp, and Standard RBI NEFT.
 */

export interface BankingPayoutRecord {
  employeeCode: string;
  employeeName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  reference?: string;
  remarks?: string;
  email?: string;
  phone?: string;
}

export type BankPortalType = "HDFC" | "ICICI" | "SBI" | "FEDERAL" | "STANDARD_NEFT";

export interface BankPortalOption {
  id: BankPortalType;
  name: string;
  description: string;
  extension: "csv" | "txt";
}

export const BANK_PORTALS: BankPortalOption[] = [
  {
    id: "HDFC",
    name: "HDFC Bank CMS / Enet",
    description: "Standard HDFC Corporate Net Banking bulk upload format (CSV).",
    extension: "csv",
  },
  {
    id: "ICICI",
    name: "ICICI Bank CIB",
    description: "ICICI Corporate Internet Banking batch payment upload format (CSV).",
    extension: "csv",
  },
  {
    id: "SBI",
    name: "State Bank of India (CMP)",
    description: "SBI Corporate portal Cash Management Product upload format (CSV).",
    extension: "csv",
  },
  {
    id: "FEDERAL",
    name: "Federal Bank (FedCorp)",
    description: "Federal Bank Corporate Net Banking batch payment template (CSV).",
    extension: "csv",
  },
  {
    id: "STANDARD_NEFT",
    name: "Standard RBI NEFT / NACH",
    description: "Standard Indian interbank NEFT direct payment file (CSV).",
    extension: "csv",
  },
];

function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function escapeCsv(val: any): string {
  const str = String(val ?? "").trim();
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCorporateBankBatchFile(
  records: BankingPayoutRecord[],
  portal: BankPortalType,
  debitAccountNo: string = "000123456789"
): { filename: string; content: string; mimeType: string } {
  const dateStr = new Date().toISOString().split("T")[0];
  let filename = `Payroll_Batch_${portal}_${dateStr}`;
  let lines: string[] = [];

  switch (portal) {
    case "HDFC": {
      filename += ".csv";
      // HDFC CMS: Transaction Type (N/R), Ben Code, Ben Acc, Amount, Ben Name, Drawee Loc, Print Loc, Ben Email, Ben Mobile, Address, Date, IFSC, Debit Acc
      lines.push("Transaction Type,Beneficiary Code,Beneficiary Account No,Instrument Amount,Beneficiary Name,Drawee Location,Print Location,Beneficiary Email,Beneficiary Mobile,Beneficiary Address,Payment Date,IFSC Code,Debit Account No");
      for (const r of records) {
        const row = [
          "N", // NEFT
          escapeCsv(r.employeeCode || "EMP"),
          escapeCsv(r.accountNumber || "0000000000"),
          Number(r.amount).toFixed(2),
          escapeCsv(r.employeeName),
          "",
          "",
          escapeCsv(r.email || ""),
          escapeCsv(r.phone || ""),
          "",
          formatDateDDMMYYYY(r.paymentDate),
          escapeCsv((r.ifscCode || "HDFC0000001").toUpperCase()),
          escapeCsv(debitAccountNo),
        ];
        lines.push(row.join(","));
      }
      break;
    }

    case "ICICI": {
      filename += ".csv";
      // ICICI CIB: Payment Type, Ben Account No, Amount, Ben Name, Drawee Location, IFSC, Date, Remarks
      lines.push("Payment Type,Beneficiary Account Number,Amount,Beneficiary Name,Drawee Location,IFSC Code,Payment Date,Remarks");
      for (const r of records) {
        const row = [
          "N", // NEFT
          escapeCsv(r.accountNumber || "0000000000"),
          Number(r.amount).toFixed(2),
          escapeCsv(r.employeeName),
          "",
          escapeCsv((r.ifscCode || "ICIC0000001").toUpperCase()),
          formatDateDDMMYYYY(r.paymentDate),
          escapeCsv(r.remarks || `Salary Payout ${r.employeeCode}`),
        ];
        lines.push(row.join(","));
      }
      break;
    }

    case "SBI": {
      filename += ".csv";
      // SBI CMP: Debit Account Number, Amount, Beneficiary Name, Beneficiary Account Number, IFSC Code, Remarks, Customer Reference Number
      lines.push("Debit Account Number,Amount,Beneficiary Name,Beneficiary Account Number,IFSC Code,Remarks,Customer Reference Number");
      for (const r of records) {
        const row = [
          escapeCsv(debitAccountNo),
          Number(r.amount).toFixed(2),
          escapeCsv(r.employeeName),
          escapeCsv(r.accountNumber || "0000000000"),
          escapeCsv((r.ifscCode || "SBIN0000001").toUpperCase()),
          escapeCsv(r.remarks || `Salary Payout ${r.employeeCode}`),
          escapeCsv(r.reference || `REF-${r.employeeCode}-${Date.now().toString().slice(-4)}`),
        ];
        lines.push(row.join(","));
      }
      break;
    }

    case "FEDERAL": {
      filename += ".csv";
      // Federal FedCorp: Source Acc No, Ben Acc No, Ben Name, Amount, IFSC, Pmt Details
      lines.push("Source Acc No,Ben Acc No,Ben Name,Amount,IFSC,Pmt Details");
      for (const r of records) {
        const row = [
          escapeCsv(debitAccountNo),
          escapeCsv(r.accountNumber || "0000000000"),
          escapeCsv(r.employeeName),
          Number(r.amount).toFixed(2),
          escapeCsv((r.ifscCode || "FDRL0000001").toUpperCase()),
          escapeCsv(r.remarks || `Salary Payout ${r.employeeCode}`),
        ];
        lines.push(row.join(","));
      }
      break;
    }

    case "STANDARD_NEFT":
    default: {
      filename += ".csv";
      lines.push("Sr No,Employee Code,Beneficiary Name,Beneficiary Account Number,IFSC Code,Amount,Payment Date,Debit Account Number,Narration");
      records.forEach((r, idx) => {
        const row = [
          idx + 1,
          escapeCsv(r.employeeCode),
          escapeCsv(r.employeeName),
          escapeCsv(r.accountNumber || "0000000000"),
          escapeCsv((r.ifscCode || "").toUpperCase()),
          Number(r.amount).toFixed(2),
          formatDateDDMMYYYY(r.paymentDate),
          escapeCsv(debitAccountNo),
          escapeCsv(r.remarks || `Salary Payout`),
        ];
        lines.push(row.join(","));
      });
      break;
    }
  }

  return {
    filename,
    content: lines.join("\r\n"),
    mimeType: "text/csv;charset=utf-8;",
  };
}
