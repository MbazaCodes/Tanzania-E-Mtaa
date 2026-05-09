import { useState, useEffect, useCallback } from 'react';
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
  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user || !user.id) {
      setApplications([]);
      setDrafts([]);
      return;
    }
    
    setLoading(true);
    setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const isConfigured = supabaseUrl && !supabaseUrl.includes('YOUR_SUPABASE_URL') && !supabaseUrl.includes('bqxevbmjqvogebmlbidx');

    if (!isConfigured || (user.id && user.id.startsWith('demo-'))) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const demoApps = JSON.parse(localStorage.getItem('demo_applications') || '[]');
      const userApps = demoApps
        .filter((app: any) => app.user_id === user.id)
        .map((app: any) => ({
          ...app,
          services: getServiceById(app.service_id) || { name: app.service_name || 'Service', fee: 0 },
          users: user
        }));
      setApplications(userApps);

      setDrafts(getLocalDrafts(user));
      setLoading(false);
      return;
    }

    console.log('Fetching applications for user:', user.id);
    
    const { data, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching applications:', fetchError);
      setError(fetchError.message);
    }
    
    if (data) {
      const appsWithServices = data.map((app: any) => ({
        ...app,
        services: resolveService(app.service_id, app.service_name, app.form_data),
        users: user
      }));
      setApplications(appsWithServices);
    }

    setDrafts(getLocalDrafts(user));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const refreshApplications = useCallback(() => {
    fetchApplications();
  }, [fetchApplications]);

  const setApplicationsDirectly = useCallback((apps: Application[]) => {
    setApplications(apps);
  }, []);

  return { 
    applications, 
    drafts, 
    loading, 
    error,
    fetchApplications, 
    refreshApplications,
    setApplications: setApplicationsDirectly 
  };
}
