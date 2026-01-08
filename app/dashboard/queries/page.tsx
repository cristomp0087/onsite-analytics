'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/tables/data-table';
import { Play, Copy, Download, Loader2 } from 'lucide-react';
import { useCopyToClipboard } from '@/lib/hooks';
import { toCSV, downloadFile } from '@/lib/utils';

const SAMPLE_QUERIES = [
  {
    name: 'Usuários recentes',
    sql: `SELECT email, nome, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10`,
  },
  {
    name: 'Eventos de hoje',
    sql: `SELECT event_type, event_data, created_at 
FROM app_events 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC`,
  },
  {
    name: 'Sessões abertas',
    sql: `SELECT local_nome, entrada, user_id 
FROM registros 
WHERE saida IS NULL
ORDER BY entrada DESC`,
  },
  {
    name: 'Telemetria da semana',
    sql: `SELECT date, app_opens, sync_attempts, sync_failures 
FROM timekeeper_telemetry_daily 
WHERE date > CURRENT_DATE - 7
ORDER BY date DESC`,
  },
];

export default function QueriesPage() {
  const [sql, setSql] = useState(SAMPLE_QUERIES[0].sql);
  const [results, setResults] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Erro desconhecido');
      } else {
        setResults(data.data || []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (results.length === 0) return;
    const csv = toCSV(results);
    downloadFile(csv, 'query-results.csv', 'text/csv');
  };

  // Generate columns from results
  const columns = results.length > 0
    ? Object.keys(results[0]).map(key => ({
        key,
        header: key,
        render: (row: Record<string, any>) => {
          const val = row[key];
          if (val === null) return <span className="text-muted-foreground">null</span>;
          if (typeof val === 'object') return <pre className="text-xs">{JSON.stringify(val, null, 2)}</pre>;
          return String(val);
        },
      }))
    : [];

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Queries" 
        description="Execute consultas SQL personalizadas"
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SQL Editor */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Editor SQL</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copy(sql)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={executeQuery}
                      disabled={loading || !sql.trim()}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Executar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  className="w-full h-40 p-3 font-mono text-sm bg-muted rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="SELECT * FROM ..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Apenas queries SELECT são permitidas
                </p>
              </CardContent>
            </Card>

            {/* Results */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
                <p className="text-destructive font-medium">Erro</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            )}

            {results.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Resultados ({results.length} rows)
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={exportResults}>
                      <Download className="h-4 w-4 mr-1" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={results}
                    columns={columns}
                    pageSize={10}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sample Queries */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Exemplos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SAMPLE_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setSql(q.sql)}
                    className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors"
                  >
                    {q.name}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tabelas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm font-mono">
                <p>profiles</p>
                <p>app_events</p>
                <p>locais</p>
                <p>registros</p>
                <p>timekeeper_telemetry_daily</p>
                <p>calculator_history</p>
                <p>calculator_sessions</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
