'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatRelative } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  email: string;
  nome: string | null;
  trade: string | null;
  subscription_status: string | null;
  device_platform: string | null;
  device_model: string | null;
  is_admin: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setUsers(data || []);
      setLoading(false);
    }

    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Usuários" description="Carregando..." />
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
        title="Usuários" 
        description={`${users.length} usuários cadastrados`}
      />

      <div className="flex-1 p-6">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Email</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Ofício</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Plano</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Dispositivo</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Cadastro</th>
                <th className="text-left font-medium text-muted-foreground p-3 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="p-3 border-b">
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.nome || '-'}</p>
                    </div>
                  </td>
                  <td className="p-3 border-b">{user.trade || '-'}</td>
                  <td className="p-3 border-b">
                    <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {user.subscription_status || 'free'}
                    </Badge>
                  </td>
                  <td className="p-3 border-b">
                    <div className="text-sm">
                      <p>{user.device_platform || '-'}</p>
                      <p className="text-xs text-muted-foreground">{user.device_model || ''}</p>
                    </div>
                  </td>
                  <td className="p-3 border-b">
                    <div className="text-sm">
                      <p>{formatDate(user.created_at, 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(user.created_at)}</p>
                    </div>
                  </td>
                  <td className="p-3 border-b">
                    <div className="flex gap-1">
                      {user.is_admin && <Badge>Admin</Badge>}
                      {user.is_suspended && <Badge variant="destructive">Suspenso</Badge>}
                      {!user.is_admin && !user.is_suspended && <Badge variant="outline">Usuário</Badge>}
                    </div>
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
