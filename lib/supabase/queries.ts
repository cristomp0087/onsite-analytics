/**
 * Database Queries - OnSite Analytics
 * 
 * Funções para buscar dados do Supabase
 * Usar em Server Components ou API Routes
 */

import { createAdminClient } from './server';
import type {
  Profile,
  AppEvent,
  Local,
  Registro,
  TelemetryDaily,
  DashboardStats,
  UserActivitySummary,
  DailyMetrics,
  QueryFilters,
  PaginatedResult,
} from '@/types/database';

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
  const monthAgo = new Date(now.setDate(now.getDate() - 23)).toISOString();

  // Total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Active users today
  const { count: activeToday } = await supabase
    .from('app_events')
    .select('user_id', { count: 'exact', head: true })
    .eq('event_type', 'login')
    .gte('created_at', today);

  // Active users this week
  const { count: activeWeek } = await supabase
    .from('app_events')
    .select('user_id', { count: 'exact', head: true })
    .eq('event_type', 'login')
    .gte('created_at', weekAgo);

  // Total sessions
  const { count: totalSessions } = await supabase
    .from('registros')
    .select('*', { count: 'exact', head: true })
    .not('saida', 'is', null);

  // Total hours worked (approximate)
  const { data: hoursData } = await supabase
    .from('registros')
    .select('entrada, saida')
    .not('saida', 'is', null)
    .limit(1000);

  let totalMinutes = 0;
  hoursData?.forEach(r => {
    if (r.entrada && r.saida) {
      const diff = new Date(r.saida).getTime() - new Date(r.entrada).getTime();
      totalMinutes += diff / 60000;
    }
  });

  return {
    totalUsers: totalUsers || 0,
    activeUsersToday: activeToday || 0,
    activeUsersWeek: activeWeek || 0,
    activeUsersMonth: 0, // TODO
    totalSessions: totalSessions || 0,
    totalHoursWorked: Math.round(totalMinutes / 60),
    avgSessionDuration: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
  };
}

// ============================================
// USERS
// ============================================

export async function getUsers(filters?: QueryFilters): Promise<PaginatedResult<Profile>> {
  const supabase = createAdminClient();
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getUserById(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserActivity(userId: string): Promise<UserActivitySummary | null> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: registros } = await supabase
    .from('registros')
    .select('entrada, saida')
    .eq('user_id', userId)
    .not('saida', 'is', null);

  const { count: locaisCount } = await supabase
    .from('locais')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  let totalMinutes = 0;
  registros?.forEach(r => {
    if (r.entrada && r.saida) {
      const diff = new Date(r.saida).getTime() - new Date(r.entrada).getTime();
      totalMinutes += diff / 60000;
    }
  });

  return {
    userId: profile.id,
    email: profile.email,
    nome: profile.nome,
    lastSeenAt: profile.updated_at,
    totalSessions: registros?.length || 0,
    totalHours: Math.round(totalMinutes / 60),
    avgSessionMinutes: registros?.length ? Math.round(totalMinutes / registros.length) : 0,
    locaisCount: locaisCount || 0,
  };
}

// ============================================
// SESSIONS (Registros)
// ============================================

export async function getSessions(filters?: QueryFilters): Promise<PaginatedResult<Registro>> {
  const supabase = createAdminClient();
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  let query = supabase
    .from('registros')
    .select('*', { count: 'exact' })
    .order('entrada', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.dateRange) {
    query = query
      .gte('entrada', filters.dateRange.from.toISOString())
      .lte('entrada', filters.dateRange.to.toISOString());
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getOpenSessions(): Promise<Registro[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .is('saida', null)
    .order('entrada', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// EVENTS
// ============================================

export async function getEvents(filters?: QueryFilters): Promise<PaginatedResult<AppEvent>> {
  const supabase = createAdminClient();
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  let query = supabase
    .from('app_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }

  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.from.toISOString())
      .lte('created_at', filters.dateRange.to.toISOString());
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getEventTypes(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('app_events')
    .select('event_type')
    .limit(1000);

  const types = new Set(data?.map(e => e.event_type) || []);
  return Array.from(types).sort();
}

// ============================================
// TELEMETRY
// ============================================

export async function getTelemetry(filters?: QueryFilters): Promise<TelemetryDaily[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('timekeeper_telemetry_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(filters?.limit || 30);

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.dateRange) {
    query = query
      .gte('date', filters.dateRange.from.toISOString().split('T')[0])
      .lte('date', filters.dateRange.to.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('timekeeper_telemetry_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);

  // Aggregate by date
  const byDate = new Map<string, DailyMetrics>();

  data?.forEach(row => {
    const existing = byDate.get(row.date);
    if (existing) {
      existing.users += 1;
      existing.sessions += row.manual_entries_count + row.geofence_entries_count;
      existing.syncSuccessRate = row.sync_attempts > 0
        ? (1 - row.sync_failures / row.sync_attempts) * 100
        : 100;
    } else {
      byDate.set(row.date, {
        date: row.date,
        users: 1,
        sessions: row.manual_entries_count + row.geofence_entries_count,
        totalMinutes: 0,
        avgAccuracy: row.geofence_accuracy_avg,
        syncSuccessRate: row.sync_attempts > 0
          ? (1 - row.sync_failures / row.sync_attempts) * 100
          : 100,
      });
    }
  });

  return Array.from(byDate.values());
}

// ============================================
// LOCAIS
// ============================================

export async function getLocais(filters?: QueryFilters): Promise<Local[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('locais')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit || 100);

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================
// RAW QUERY (for Queries page)
// ============================================

export async function executeRawQuery(sql: string): Promise<{ data: any[]; error: string | null }> {
  const supabase = createAdminClient();

  try {
    // SECURITY: Only allow SELECT queries
    const normalizedSql = sql.trim().toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      return { data: [], error: 'Only SELECT queries are allowed' };
    }

    const { data, error } = await supabase.rpc('execute_sql', { query: sql });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}
