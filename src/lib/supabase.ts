// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables (Vercel dashboard or .env file).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 20, // Limit for high-traffic tables like activity_logs
    },
  },
});

// Global auth state listener (useful for token issues)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
    console.warn(`Auth event: ${event}`);
    // You can clear query cache here if needed via QueryClient
  }
});

// ==================== TYPES ====================

export type UserRole = 'citizen' | 'staff' | 'admin' | 'system';

export interface UserProfile {
  id: string;
  citizen_id?: string;
  birth_date?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: 'male' | 'female';
  nida_number?: string;
  id_type?: string;
  id_number?: string;
  passport_number?: string;
  phone: string;
  email: string;
  photo_url?: string;
  role: UserRole;
  is_verified: boolean;
  is_diaspora?: boolean;
  region?: string;
  district?: string;
  assigned_region?: string;
  assigned_district?: string;
  ward?: string;
  street?: string;
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  form_schema: any;
  diaspora_form_schema?: any;
  document_template?: {
    document_type?: string;
    [key: string]: any;
  };
  fee: number;
  active: boolean;
  validity_months?: number;
  extra_address_fee?: number;
  created_at?: string;
}

export interface Application {
  id: string;
  user_id: string;
  service_id: string;
  service_name?: string;
  application_number: string;
  form_data: Record<string, any>;
  status: 
    | 'submitted' 
    | 'pending_payment'
    | 'paid' 
    | 'verified' 
    | 'pending_review' 
    | 'approved' 
    | 'processing'
    | 'issued' 
    | 'rejected' 
    | 'refunded'
    | 'returned';
  assigned_staff_id?: string;
  payment_data?: {
    transaction_id?: string;
    amount?: number;
    payment_method?: string;
    paid_at?: string;
    payment_reference?: string;
    payment_status?: 'pending' | 'pending_confirmation' | 'completed';
    provider?: string;
    phone_number?: string;
    payment_channel?: 'push' | 'reference';
    initiated_at?: string;
  };
  users?: Partial<UserProfile>;
  services?: Partial<Service> & {
    name?: string;
    name_en?: string;
  };
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  created_at: string;
  paid_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  action_type?: string;
  details: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  status?: 'success' | 'pending' | 'failed';
  ip_address?: string;
  user_agent?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  resource_type?: string;
  resource_id?: string;
  created_at: string;
  users?: UserProfile;
}
