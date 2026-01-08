'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';
import { LineChart } from '@/components/charts/line-chart';
import { formatDate, formatPercent } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface TelemetryDaily {
  id: string;
  date: string;
  app_opens: number;
  manual_entries_count: number;
  geofence_entries_count: number;
  geofence_triggers: number;
  geofence_accuracy_avg: number | null;
  sync_attempts: number;
  sync_failures: number;
  battery_level_avg: number | null;
}

export default function TelemetryPage() {
  const [telemetry, setTelemetry] = useState<TelemetryDaily[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTelemetry() {
      const supabase = createClient();
      
      const { data } = await supabase
        .from('timekeeper_telemetry_daily')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      const telemetryData = data || [];
      setTelemetry(telemetryData);

      // Chart data
      const formatted = [...telemetryData].reverse().map(t => ({
        date: t.date.split('-').slice(1).join('/'),
        app_opens: t.app_opens || 0,
        entries: (t.manual_entries_count || 0) + (t.geofence_entries_count || 0),
        sync_rate: t.sync_attempts > 0
          ? Math.round((1 - t.sync_failures / t.sync_attempts) * 100)
          : 100,
      }));
      setChartData(formatted);

      setLoading(false);
    }

    loadTelemetry();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Telemetria" description="Carregando..." />
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Telemetria" 
        description="Métricas agregadas por dia"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart
              title="Uso do App"
              data={chartData}
              xKey="date"
              lines={[
                { key: 'app_opens', name: 'App Opens' },
                { key: 'entries', name: 'Entradas' },
              ]}
              height={250}
            />
            <LineChart
              title="Taxa de Sync (%)"
              data={chartData}
              xKey="date"
              lines={[
                { key: 'sync_rate', name: 'Sucesso', color: '#10b981' },
              ]}
              height={250}
            />
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Data</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">App Opens</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Entradas</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Geofence</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Sync</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Bateria</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.map((row) => {
                const syncRate = row.sync_attempts > 0
                  ? (1 - row.sync_failures / row.sync_attempts) * 100
                  : 100;

                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="p-3 border-b">{formatDate(row.date, 'dd/MM/yyyy')}</td>
                    <td className="p-3 border-b">{row.app_opens}</td>
                    <td className="p-3 border-b">
                      <div className="text-sm">
                        <span className="font-medium">
                          {row.geofence_entries_count + row.manual_entries_count}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">
                          ({row.geofence_entries_count} auto / {row.manual_entries_count} manual)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 border-b">
                      <div className="text-sm">
                        <p>{row.geofence_triggers} triggers</p>
                        {row.geofence_accuracy_avg && (
                          <p className="text-xs text-muted-foreground">
                            ~{Math.round(row.geofence_accuracy_avg)}m precisão
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-b">
                      <div className="text-sm">
                        <p className={syncRate < 90 ? 'text-destructive' : 'text-green-500'}>
                          {formatPercent(syncRate, 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.sync_attempts} tentativas
                        </p>
                      </div>
                    </td>
                    <td className="p-3 border-b">
                      {row.battery_level_avg ? `${Math.round(row.battery_level_avg)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
