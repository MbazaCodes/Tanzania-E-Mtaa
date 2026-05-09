import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Search, Filter, Download, Clock, X, ChevronLeft, ChevronRight,
  RefreshCw, Copy, Eye, Loader2 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { cn, debounce } from '@/lib/utils';

interface ActivityLog { /* your existing interface */ }

const LOGS_QUERY_KEY = 'admin-logs';

export function AdminLogs() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    severity: [] as string[],
    actionType: [] as string[],
    userRole: [] as string[],
    dateRange: { start: null as Date | null, end: null as Date | null },
    status: [] as string[],
    // add more if needed
  });

  // Debounced search
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setFilters(prev => ({ ...prev, search: value }));
      setCurrentPage(1);
    }, 400),
    []
  );

  // Main query with TanStack Query
  const {
    data: logsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      LOGS_QUERY_KEY,
      currentPage,
      itemsPerPage,
      filters.search,
      filters.severity,
      filters.actionType,
      filters.userRole,
      filters.status,
      filters.dateRange.start,
      filters.dateRange.end,
    ],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          users:user_id (id, first_name, last_name, email, role)
        `, { count: 'exact' });

      // Apply filters (server-side where possible)
      if (filters.search) {
        query = query.or(`
          action.ilike.%${filters.search}%,
          details.ilike.%${filters.search}%,
          users.first_name.ilike.%${filters.search}%,
          users.last_name.ilike.%${filters.search}%,
          users.email.ilike.%${filters.search}%
        `);
      }

      if (filters.severity.length) query = query.in('severity', filters.severity);
      if (filters.actionType.length) query = query.in('action_type', filters.actionType);
      if (filters.status.length) query = query.in('status', filters.status);

      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end.toISOString());
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        logs: data as ActivityLog[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    staleTime: 1000 * 20,        // 20 seconds
    gcTime: 1000 * 60 * 5,       // 5 minutes
  });

  const logs = logsData?.logs || [];
  const totalPages = logsData?.totalPages || 1;
  const totalCount = logsData?.totalCount || 0;

  // Real-time subscription (triggers invalidation)
  useEffect(() => {
    const channel = supabase
      .channel('realtime-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => {
          // Invalidate and refetch first page when new log arrives
          queryClient.invalidateQueries({ 
            queryKey: [LOGS_QUERY_KEY] 
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  // Auto-refresh
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        refetch();
      }, 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, refetch]);

  // Filter handlers
  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleArrayFilter = (key: 'severity' | 'actionType' | 'userRole' | 'status', value: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      severity: [],
      actionType: [],
      userRole: [],
      dateRange: { start: null, end: null },
      status: [],
    });
    setCurrentPage(1);
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    // For large exports, you can create a separate mutation or server function
    showToast('Export started...', 'success');
    // Implement export logic (same as before or use a background job)
  };

  const copyLogToClipboard = (log: ActivityLog) => {
    // your existing function
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {lang === 'sw' ? 'Kumbukumbu za Mfumo' : 'System Activity Logs'}
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn("h-12 px-4 rounded-xl flex items-center gap-2", 
              autoRefresh ? "bg-emerald-50 text-emerald-600" : "bg-white border"
            )}
          >
            <RefreshCw size={18} className={cn(autoRefresh && "animate-spin")} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>

          <button onClick={() => refetch()} disabled={isFetching} className="h-12 px-4 bg-white border rounded-xl flex items-center gap-2">
            <RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
            Refresh
          </button>

          <button onClick={() => setShowFilters(!showFilters)} className="h-12 px-4 bg-white border rounded-xl flex items-center gap-2">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border">
          <p className="text-xs uppercase tracking-widest text-stone-400">Total Logs</p>
          <p className="text-3xl font-black">{totalCount.toLocaleString()}</p>
        </div>
        {/* Add severity cards using logs if needed */}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Your existing filter UI here */}
            {/* Use updateFilter and toggleArrayFilter */}
            <input
              type="text"
              placeholder="Search logs..."
              onChange={(e) => debouncedSetSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-stone-50 border rounded-xl"
            />
            {/* ... other filters ... */}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={clearFilters} className="px-6 h-12 border rounded-xl">Clear</button>
              <button onClick={() => refetch()} className="px-6 h-12 bg-stone-900 text-white rounded-xl">Apply</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading / Table */}
      <div className="bg-white rounded-4xl border shadow-xl overflow-hidden">
        {(isLoading || isFetching) && !logs.length ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto text-emerald-600" size={40} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">No logs found</div>
        ) : (
          <>
            {/* Your table or mobile cards here - use `logs` */}
            {/* Example row onClick={() => setSelectedLog(log)} */}

            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                title="Items per page"
                aria-label="Items per page"
                className="border rounded-lg px-3 py-1"
              >
                {[25, 50, 100, 250].map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal - unchanged */}
    </motion.div>
  );
}