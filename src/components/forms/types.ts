/**
 * Shared Types for Service Forms
 */
import { UserProfile } from '@/lib/supabase';

export interface FormProps {
  onSubmit: (data: any, attachments?: string[], applicantType?: string, representativeName?: string) => void | Promise<void>;
  lang?: 'sw' | 'en';
  userProfile?: UserProfile | null;
  isLoading?: boolean;
  draftId?: string;
}

export type ApplicantType = 'self' | 'minor' | 'representative';

export const labels = {
  sw: {
    submit: 'Wasilisha Maombi',
    submitting: 'Inawasilisha...',
    next: 'Endelea',
    back: 'Rudi',
    required: 'Inahitajika',
    optional: 'Si lazima',
    yes: 'Ndiyo',
    no: 'Hapana',
    select: 'Chagua',
    selectOption: 'Chagua chaguo',
    loading: 'Inapakia...',
    error: 'Kosa',
    success: 'Imefanikiwa',
    cancel: 'Ghairi',
    save: 'Hifadhi',
    review: 'Hakiki',
    confirm: 'Thibitisha',
    step: 'Hatua',
    of: 'kati ya',
    personalInfo: 'Taarifa Binafsi',
    contactInfo: 'Mawasiliano',
    addressInfo: 'Anwani',
    documents: 'Nyaraka',
    declaration: 'Tamko',
    terms: 'Masharti',
    fee: 'Ada ya Huduma',
  },
  en: {
    submit: 'Submit Application',
    submitting: 'Submitting...',
    next: 'Continue',
    back: 'Back',
    required: 'Required',
    optional: 'Optional',
    yes: 'Yes',
    no: 'No',
    select: 'Select',
    selectOption: 'Select an option',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    review: 'Review',
    confirm: 'Confirm',
    step: 'Step',
    of: 'of',
    personalInfo: 'Personal Information',
    contactInfo: 'Contact Information',
    addressInfo: 'Address',
    documents: 'Documents',
    declaration: 'Declaration',
    terms: 'Terms',
    fee: 'Service Fee',
  }
} as const;