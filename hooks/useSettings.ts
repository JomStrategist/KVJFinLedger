import { useState, useEffect } from 'react';

export interface AppSettings {
  // 1. BUSINESS PROFILE
  businessName: string;
  legalName: string;
  businessAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;

  // 2. TAX INFORMATION
  gstin: string;
  pan: string;
  defaultGstState: string;
  defaultGstStateCode: string;

  // 3. INVOICE SETTINGS
  invoicePrefix: string;
  proformaPrefix: string;
  startingInvoiceNumber: string;
  startingProformaNumber: string;
  invoiceNumberFormat: string;
  defaultPaymentTerms: string;
  defaultCurrency: string;

  // 4. FINANCIAL YEAR SETTINGS
  currentFinancialYear: string;
  financialYearStartMonth: string;
  financialYearEndMonth: string;
  incomeTaxRates: Record<string, number>;

  // 5. BUSINESS PREFERENCES
  defaultCountry: string;
  defaultState: string;
  dateFormat: string;
  numberFormat: string;

  // 6. INVOICE DISPLAY SETTINGS
  businessLogo: string;
  invoiceHeader: string;
  invoiceFooter: string;
  termsAndConditions: string;
  bankDetails: string;
  upiId: string;
}

export const defaultSettings: AppSettings = {
  businessName: '',
  legalName: '',
  businessAddress: '',
  city: '',
  state: '',
  stateCode: '',
  pinCode: '',
  country: 'India',
  phone: '',
  email: '',
  website: '',
  
  gstin: '',
  pan: '',
  defaultGstState: 'Kerala',
  defaultGstStateCode: '32',

  invoicePrefix: 'INV',
  proformaPrefix: 'PI',
  startingInvoiceNumber: '001',
  startingProformaNumber: '001',
  invoiceNumberFormat: '{PREFIX}-{YYYY}-{NNN}',
  defaultPaymentTerms: 'Due on Receipt',
  defaultCurrency: 'INR',

  currentFinancialYear: 'FY 2026–27',
  financialYearStartMonth: 'April',
  financialYearEndMonth: 'March',
  incomeTaxRates: {
    'FY 2026–27': 25,
    'FY 2025–26': 25,
    'FY 2024–25': 25,
  },

  defaultCountry: 'India',
  defaultState: 'Kerala',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'en-IN',

  businessLogo: '',
  invoiceHeader: '',
  invoiceFooter: '',
  termsAndConditions: '',
  bankDetails: '',
  upiId: ''
};

const SETTINGS_KEY = 'billing_erp_settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from local storage
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveSettings = (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      setSettings(updated);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      return false;
    }
  };

  const resetSettings = () => {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      setSettings(defaultSettings);
      return true;
    } catch (err) {
      console.error('Failed to reset settings:', err);
      return false;
    }
  };

  return { settings, saveSettings, resetSettings, isLoaded };
}
