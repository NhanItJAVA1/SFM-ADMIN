import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { adminApi, type AdminMonitoringEndpoints, type AdminMonitoringOverview, type AdminMonitoringRequests, type MonitoringRange } from '@/api/adminApi';
import { getAuthAccessToken, getAuthUser } from '@/stores/authSession';
import { isAdminUser } from '@/utils/authRole';

export const MONITORING_REFRESH_MS = 20000;
type DashboardData = { overview: AdminMonitoringOverview; requests: AdminMonitoringRequests; endpoints: AdminMonitoringEndpoints };
export function useAdminMonitoringDashboard(range: MonitoringRange) {
  const [state, setState] = useState<{ range: MonitoringRange; data: DashboardData | null; loading: boolean; refreshing: boolean; error: string | null; status?: number }>({ range, data: null, loading: true, refreshing: false, error: null });
  const refreshRef = useRef<(() => void) | null>(null);
  useFocusEffect(useCallback(() => {
    let disposed = false, pending = false, forbidden = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let active = AppState.currentState === 'active';
    const visible = () => active && (Platform.OS !== 'web' || document.visibilityState !== 'hidden');
    const clear = () => { if (timer) clearTimeout(timer); timer = undefined; };
    async function load() {
      if (disposed || pending || !visible()) return;
      clear();
      if (!getAuthAccessToken() || !isAdminUser(getAuthUser())) {
        setState({ range, data: null, loading: false, refreshing: false, error: 'Phiên quản trị không còn hợp lệ.', status: 403 }); return;
      }
      pending = true; controller = new AbortController();
      setState(old => ({ range, data: old.range === range ? old.data : null, loading: old.range !== range && !old.data, refreshing: true, error: null }));
      try {
        const [overview, requests, endpoints] = await Promise.all([
          adminApi.monitoringOverview(controller.signal),
          adminApi.monitoringRequests(range as Exclude<MonitoringRange, '7d'>, controller.signal),
          adminApi.monitoringEndpoints(range as Exclude<MonitoringRange, '7d'>, controller.signal),
        ]);
        if (!disposed) { forbidden = false; setState({ range, data: { overview: overview.data, requests: requests.data, endpoints: endpoints.data }, loading: false, refreshing: false, error: null }); }
      } catch (error) {
        if (!disposed) {
          const status = (error as { response?: { status?: number } } | null)?.response?.status;
          forbidden = status === 401 || status === 403;
          setState(old => ({ range, data: forbidden || old.range !== range ? null : old.data, loading: false, refreshing: false, status, error: forbidden ? 'Không có quyền truy cập dữ liệu giám sát.' : 'Không tải được dữ liệu giám sát. Vui lòng kiểm tra kết nối dịch vụ và thử lại.' }));
        }
      } finally {
        pending = false; controller = null;
        if (!disposed && !forbidden && visible()) timer = setTimeout(() => void load(), MONITORING_REFRESH_MS);
      }
    }
    const visibility = () => { clear(); if (visible() && !forbidden) void load(); };
    refreshRef.current = () => void load();
    const sub = AppState.addEventListener('change', value => { active = value === 'active'; visibility(); });
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    void load();
    return () => { disposed = true; clear(); controller?.abort(); refreshRef.current = null; sub.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility); };
  }, [range]));
  return { ...state, data: state.range === range ? state.data : null, loading: state.range !== range || state.loading, refresh: useCallback(() => refreshRef.current?.(), []) };
}
