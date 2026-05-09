// src/lib/currency.ts
export const EXCHANGE_RATES = {
  TZS: 1,
  USD: 0.00038,   // ≈ 1 USD = 2631 TZS (updated 2026 rate)
  EUR: 0.00035,
  GBP: 0.00030,
} as const;

export type CurrencyCode = keyof typeof EXCHANGE_RATES;

export const formatCurrency = (amount: number | string, code: CurrencyCode = 'TZS'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 'TZS 0';

  if (code === 'TZS') {
    return new Intl.NumberFormat('sw-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  }

  // For foreign currencies, convert and format
  const converted = numAmount * EXCHANGE_RATES[code];

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(converted);
};

/** Quick helper for TZS only (most common) */
export const formatTZS = (amount: number | string): string => 
  formatCurrency(amount, 'TZS');