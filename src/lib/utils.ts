// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for combining Tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tanzanian Government Branding Constants
 * Centralized for consistency across the entire application
 */
export const TanzanianBranding = {
  colors: {
    gold: '#FCD34D',
    green: '#10B981',
    blue: '#3B82F6',
    cream: '#FDF5E6',
    brown: '#8B4513',
    black: '#000000',
    tzGreen: '#10B981',
    tzBlue: '#3B82F6',
    tzGold: '#FCD34D',
  },
  text: {
    republic: 'JAMHURI YA MUUNGANO WA TANZANIA',
    office: 'OFISI YA RAIS - TAMISEMI',
    portal: 'E-MTAA',
    motto: 'Huduma kwa Wote',
  },
  // Helper functions for consistent styling
  getGovBorder: () => 'border-4 border-[#FCD34D]',
  getHeroGradient: () => 'bg-gradient-to-br from-[#10B981] via-[#3B82F6] to-[#1E40AF]',
  getGoldGradient: () => 'bg-gradient-to-r from-[#FCD34D] to-[#F59E0B]',
} as const;

/**
 * Date & Time Utilities
 */
export const formatDate = (
  date: string | Date, 
  locale: 'sw' | 'en' = 'sw',
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
) => {
  return new Intl.DateTimeFormat(
    locale === 'sw' ? 'sw-TZ' : 'en-US', 
    options
  ).format(new Date(date));
};

export const formatTimeAgo = (date: string | Date, lang: 'sw' | 'en' = 'sw'): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return lang === 'sw' ? 'sasa hivi' : 'just now';
  if (diffMins < 60) return `${diffMins} ${lang === 'sw' ? 'dakika' : 'min'} ${lang === 'sw' ? 'zilizopita' : 'ago'}`;
  if (diffHours < 24) return `${diffHours} ${lang === 'sw' ? 'saa' : 'hour'}${diffHours > 1 ? 's' : ''} ${lang === 'sw' ? 'zilizopita' : 'ago'}`;
  
  return `${diffDays} ${lang === 'sw' ? 'siku' : 'day'}${diffDays > 1 ? 's' : ''} ${lang === 'sw' ? 'zilizopita' : 'ago'}`;
};

/**
 * Number & Currency Helpers
 */
export const formatNumber = (num: number | string, locale: 'sw' | 'en' = 'sw'): string => {
  return new Intl.NumberFormat(locale === 'sw' ? 'sw-TZ' : 'en-US').format(Number(num));
};

/**
 * String Utilities
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number = 50, suffix: string = '...'): string => {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

/**
 * Debounce utility (useful for search inputs)
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Safe localStorage access with fallback
 */
export const safeLocalStorage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};

export default {
  cn,
  TanzanianBranding,
  formatDate,
  formatTimeAgo,
  formatNumber,
  capitalize,
  truncate,
  debounce,
  safeLocalStorage,
};