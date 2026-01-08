'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface Registro {
  id: string;
  local_nome: string | null;
  entrada: string;
  saida: string | null;
  tipo: string | null;
  editado_manualmente: boolean | null;
  pausa_minutos: number | null;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<(Registro & { duracao: number })[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      const supabase = createClient();
      
      const { data } = await supabase
        .from('registros')
        .select('*')
        .order('entrada', { ascending: false })
        .limit(100);

      const withDuration = (data || []).map(s => {
        let duracao = 0;
        if (s.entrada && s.saida) {
          duracao = Math.round((new Date(s.saida).getTime() - new Date(s.entrada).getTime()) / 60000);
        } else if (s.entrada) {
          duracao = Math.round((Date.now() - new Date(s.entrada).getTime()) / 60000);
        }
        return { ...s, duracao };
      });

      setSessions(withDuration);
      setOpenCount(withDuration.filter(s => !s.saida).length);
      setLoading(false);
    }

    loadSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Sessões" description="Carregando..." />
        <div className="flex-1 p-6">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Sessões" 
        description={`${sessions.length} sessões de trabalho`}
      />

      <div className="flex-1 p-6 space-y-6">
        {openCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-600">
                {openCount} sessão(ões) ainda aberta(s)
              </p>
              <p className="text-sm text-muted-foreground">
                Sessões sem clock-out podem indicar problemas com geofence ou heartbeat.
              </p>
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Local</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Entrada</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Saída</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Duração</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Tipo</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Editado</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-muted/50">
                  <td className="p-3 border-b">
                    <div>
                      <p className="font-medium">{session.local_nome || 'Local desconhecido'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{session.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="p-3 border-b">{formatDate(session.entrada, 'dd/MM HH:mm')}</td>
                  <td className="p-3 border-b">
                    {session.saida ? (
                      formatDate(session.saida, 'dd/MM HH:mm')
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/50">
                        Em andamento
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 border-b">
                    {formatDuration(session.duracao - (session.pausa_minutos || 0))}
                  </td>
                  <td className="p-3 border-b">
                    <Badge variant={session.tipo === 'automatico' ? 'default' : 'secondary'}>
                      {session.tipo || 'manual'}
                    </Badge>
                  </td>
                  <td className="p-3 border-b">
                    {session.editado_manualmente ? (
                      <Badge variant="outline">Sim</Badge>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
