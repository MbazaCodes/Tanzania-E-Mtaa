/**
 * Forms Index
 * 
 * Central export for all service-specific forms
 */

export * from './types';

// Individual Forms
export { UtambulishoMkaziForm } from './UtambulishoMkaziForm';
export { BaruaUtambulishoForm } from './BaruaUtambulishoForm';
export { KibariMazishiForm } from './KibariMazishiForm';
export { KibariShereheForm } from './KibariShereheForm';

// Form mapping - matches exact service names from HARDCODED_SERVICES
import { UtambulishoMkaziForm } from './UtambulishoMkaziForm';
import { BaruaUtambulishoForm } from './BaruaUtambulishoForm';
import { KibariMazishiForm } from './KibariMazishiForm';
import { KibariShereheForm } from './KibariShereheForm';
import { FormProps } from './types';

export const SERVICE_FORMS: Record<string, React.FC<FormProps>> = {
  'Cheti cha Mkazi': UtambulishoMkaziForm,
  'Barua ya Utambulisho': BaruaUtambulishoForm,
  'Kibali cha Mazishi': KibariMazishiForm,
  'Kibali cha Tukio': KibariShereheForm,
};

// Helper functions
export const getServiceForm = (serviceName: string): React.FC<FormProps> | null => {
  return SERVICE_FORMS[serviceName] || null;
};

export const hasServiceForm = (serviceName: string): boolean => {
  return serviceName in SERVICE_FORMS;
};