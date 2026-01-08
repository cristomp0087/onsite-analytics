/**
 * Database Types - OnSite Analytics
 * 
 * Tipos gerados a partir do schema do Supabase
 * Atualizar quando o schema mudar
 */

// ============================================
// AUTH & PROFILES
// ============================================

export interface Profile {
  id: string;
  email: string;
  nome: string;
  first_name: string | null;
  last_name: string | null;
  cor_padrao: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  timezone: string | null;
  device_id: string | null;
  device_model: string | null;
  device_platform: string | null;
  trade: string | null;
  birthday: string | null;
  gender: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  is_admin: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
  updated_at: string | null;
}

export interface AdminUser {
  id: string;
  user_id: string;
  role: 'admin' | 'analyst' | 'viewer';
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

// ============================================
// APP EVENTS (Auth & Activity)
// ============================================

export interface AppEvent {
  id: string;
  user_id: string | null;
  device_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  app_version: string | null;
  os_version: string | null;
  created_at: string;
}

export type AuthEventType = 
  | 'signup'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'session_restored'
  | 'password_reset_requested';

// ============================================
// LOCAIS (Job Sites)
// ============================================

export interface Local {
  id: string;
  user_id: string;
  nome: string;
  latitude: number;
  longitude: number;
  raio: number;
  cor: string;
  status: 'active' | 'deleted';
  deleted_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// ============================================
// REGISTROS (Time Entries)
// ============================================

export interface Registro {
  id: string;
  user_id: string;
  local_id: string;
  local_nome: string | null;
  entrada: string;
  saida: string | null;
  tipo: 'automatico' | 'manual';
  editado_manualmente: boolean | null;
  motivo_edicao: string | null;
  pausa_minutos: number | null;
  cor: string | null;
  device_id: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface RegistroComDuracao extends Registro {
  duracao_minutos: number;
  duracao_formatada: string;
}

// ============================================
// TELEMETRY
// ============================================

export interface TelemetryDaily {
  id: string;
  user_id: string;
  date: string;
  app_opens: number;
  manual_entries_count: number;
  geofence_entries_count: number;
  geofence_triggers: number;
  geofence_accuracy_avg: number | null;
  background_location_checks: number;
  battery_level_avg: number | null;
  offline_entries_count: number;
  sync_attempts: number;
  sync_failures: number;
  created_at: string;
}

// ============================================
// CALCULATOR (se precisar)
// ============================================

export interface CalculatorSession {
  id: string;
  user_id: string;
  session_data: Record<string, unknown>;
  created_at: string;
}

export interface CalculatorHistory {
  id: string;
  user_id: string;
  expression: string;
  result: string;
  created_at: string;
}

// ============================================
// DASHBOARD AGGREGATES
// ============================================

export interface DashboardStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  totalSessions: number;
  totalHoursWorked: number;
  avgSessionDuration: number;
}

export interface UserActivitySummary {
  userId: string;
  email: string;
  nome: string;
  lastSeenAt: string | null;
  totalSessions: number;
  totalHours: number;
  avgSessionMinutes: number;
  locaisCount: number;
}

export interface DailyMetrics {
  date: string;
  users: number;
  sessions: number;
  totalMinutes: number;
  avgAccuracy: number | null;
  syncSuccessRate: number;
}

// ============================================
// FILTERS & QUERIES
// ============================================

export interface DateRange {
  from: Date;
  to: Date;
}

export interface QueryFilters {
  userId?: string;
  dateRange?: DateRange;
  eventType?: string;
  app?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// EXPORT
// ============================================

export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportRequest {
  table: string;
  filters?: QueryFilters;
  format: ExportFormat;
  columns?: string[];
}
