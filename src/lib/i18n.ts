// src/lib/i18n.ts
export type Language = 'sw' | 'en';

export const translations = {
  sw: {
    appName: "E-MTAA",
    tagline: "Serikali ya Mtaa Kidijitali",
    heroTitle: "Huduma za Serikali",
    heroSubtitle: "Mkononi Mwako",
    // ... (keep all your existing translations)
    processing: "Tunachakata...",
    submit: "Tuma",
    logout: "Ondoka",
    // Add any missing keys here
  },
  en: {
    appName: "E-MTAA",
    tagline: "Digital Local Government",
    heroTitle: "Government Services",
    heroSubtitle: "In Your Hands",
    // ... existing
    processing: "Processing...",
    submit: "Submit",
    logout: "Logout",
  }
} as const;

export const t = (key: keyof typeof translations['sw'], lang: Language = 'sw') => {
  return translations[lang][key] || key;
};

// Optional: React hook version (recommended for components)
export const useTranslation = (lang: Language) => {
  return (key: keyof typeof translations['sw']) => translations[lang][key] || key;
};