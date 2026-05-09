import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, Application, UserProfile } from '@/lib/supabase';
import { HARDCODED_SERVICES } from '@/constants/services';

const getServiceById = (serviceId: string) => {
  return HARDCODED_SERVICES.find(s => s.id === serviceId) || null;
};

const getServiceByName = (serviceName?: string | null) => {
  if (!serviceName) return null;

  const normalizedName = serviceName.trim().toLowerCase();
  return HARDCODED_SERVICES.find((service) =>
    service.name.trim().toLowerCase() === normalizedName ||
    service.name_en?.trim().toLowerCase() === normalizedName
  ) || null;
};

const resolveService = (serviceId: string, serviceName?: string | null, formData?: Record<string, any>) => {
  return (
    getServiceById(serviceId) ||
    getServiceByName(serviceName) ||
    {
      name: serviceName || 'Service',
      fee: formData?.service_fee || 0,
    }
  );
};

const getLocalDrafts = (user: UserProfile) => {
  const userDrafts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`draft_${user.id}_`)) {
      try {
        const draft = JSON.parse(localStorage.getItem(key)!);
        const service = resolveService(draft.service_id, draft.service_name, draft.form_data);

        userDrafts.push({
          ...draft,
          services: service,
          users: user
        });
      } catch (err) {
        console.error('Error parsing draft:', err);
      }
    }
  }
  return userDrafts;
};

export function useApplications(user: UserProfile | null) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<any[]>([]);

  // Fetch drafts from localStorage (sync, no network needed)
  useEffect(() => {
    if (user) setDrafts(getLocalDrafts(user));
    else setDrafts([]);
  }, [user]);

  const queryKey = ['applications', user?.id] as const;

  const { data: applications = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 2,   // 2 min — data is fresh, skip refetch
    gcTime: 1000 * 60 * 10,     // 10 min in cache
    queryFn: async () => {
      if (!user || !user.id) return [];

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isConfigured = supabaseUrl && !supabaseUrl.includes('YOUR_SUPABASE_URL') && !supabaseUrl.includes('bqxevbmjqvogebmlbidx');

      if (!isConfigured || user.id.startsWith('demo-')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const demoApps = JSON.parse(localStorage.getItem('demo_applications') || '[]');
        return demoApps
          .filter((app: any) => app.user_id === user.id)
          .map((app: any) => ({
            ...app,
            services: getServiceById(app.service_id) || { name: app.service_name || 'Service', fee: 0 },
            users: user,
          }));
      }

      const { data, error: fetchError } = await supabase
        .from('applications')
        .select('id, user_id, service_id, service_name, application_number, form_data, status, region, district, ward, street, created_at, updated_at, paid_at, payment_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return (data ?? []).map((app: any) => ({
        ...app,
        services: resolveService(app.service_id, app.service_name, app.form_data),
        users: user,
      })) as Application[];
    },
  });

  const refreshApplications = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['applications', user?.id] });
    if (user) setDrafts(getLocalDrafts(user));
  }, [queryClient, user]);

  const setApplicationsDirectly = useCallback((apps: Application[]) => {
    queryClient.setQueryData(queryKey, apps);
  }, [queryClient, queryKey]);

  return {
    applications,
    drafts,
    loading,
    error: queryError ? String((queryError as Error).message) : null,
    fetchApplications: refetch,
    refreshApplications,
    setApplications: setApplicationsDirectly,
  };
}
