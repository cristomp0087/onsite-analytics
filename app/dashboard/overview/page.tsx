'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/layout/stats-card';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { createClient } from '@/lib/supabase/client';
import { Users, Clock, Activity, TrendingUp } from 'lucide-react';
import { formatNumber, formatDuration } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  totalSessions: number;
  totalHoursWorked: number;
  avgSessionDuration: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Get stats
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: activeToday } = await supabase
        .from('app_events')
        .select('user_id', { count: 'exact', head: true })
        .eq('event_type', 'login')
        .gte('created_at', today);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: activeWeek } = await supabase
        .from('app_events')
        .select('user_id', { count: 'exact', head: true })
        .eq('event_type', 'login')
        .gte('created_at', weekAgo);

      const { count: totalSessions } = await supabase
        .from('registros')
        .select('*', { count: 'exact', head: true })
        .not('saida', 'is', null);

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

      setStats({
        totalUsers: totalUsers || 0,
        activeUsersToday: activeToday || 0,
        activeUsersWeek: activeWeek || 0,
        totalSessions: totalSessions || 0,
        totalHoursWorked: Math.round(totalMinutes / 60),
        avgSessionDuration: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
      });

      // Get telemetry for charts
      const { data: telemetry } = await supabase
        .from('timekeeper_telemetry_daily')
        .select('*')
        .order('date', { ascending: false })
        .limit(14);

      if (telemetry) {
        const formatted = [...telemetry].reverse().map(t => ({
          date: t.date.split('-').slice(1).join('/'),
          sessions: (t.manual_entries_count || 0) + (t.geofence_entries_count || 0),
          users: 1,
          syncRate: t.sync_attempts > 0
            ? Math.round((1 - t.sync_failures / t.sync_attempts) * 100)
            : 100,
        }));
        setChartData(formatted);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" description="Carregando..." />
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Dashboard" 
        description="Visão geral do ecossistema OnSite"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Usuários"
            value={formatNumber(stats?.totalUsers || 0)}
            description={`${stats?.activeUsersToday || 0} ativos hoje`}
            icon={Users}
          />
          <StatsCard
            title="Sessões de Trabalho"
            value={formatNumber(stats?.totalSessions || 0)}
            description={`${formatDuration(stats?.avgSessionDuration || 0)} média`}
            icon={Clock}
          />
          <StatsCard
            title="Horas Trabalhadas"
            value={formatNumber(stats?.totalHoursWorked || 0)}
            description="Total registrado"
            icon={TrendingUp}
          />
          <StatsCard
            title="Usuários Ativos (7d)"
            value={formatNumber(stats?.activeUsersWeek || 0)}
            description="Última semana"
            icon={Activity}
          />
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart
              title="Sessões por Dia"
              data={chartData}
              xKey="date"
              lines={[
                { key: 'sessions', name: 'Sessões' },
              ]}
            />
            <BarChart
              title="Taxa de Sync (%)"
              data={chartData}
              xKey="date"
              bars={[
                { key: 'syncRate', name: 'Sucesso', color: '#10b981' },
              ]}
            />
          </div>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium mb-2">Apps Monitorados</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timekeeper</span>
                <span className="font-medium">Ativo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculator</span>
                <span className="font-medium">Ativo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dashboard Hub</span>
                <span className="font-medium">Ativo</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium mb-2">Tabelas Principais</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">profiles</span>
                <span className="font-mono text-xs">{stats?.totalUsers || 0} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">registros</span>
                <span className="font-mono text-xs">{stats?.totalSessions || 0} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">app_events</span>
                <span className="font-mono text-xs">--</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium mb-2">Links Rápidos</h3>
            <div className="space-y-2 text-sm">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline"
              >
                Supabase Dashboard →
              </a>
              <a 
                href="https://vercel.com/dashboard" 
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline"
              >
                Vercel Dashboard →
              </a>
              <a 
                href="https://stripe.com/dashboard" 
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline"
              >
                Stripe Dashboard →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
