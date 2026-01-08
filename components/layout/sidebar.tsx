'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Clock,
  Activity,
  BarChart3,
  Database,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard/overview',
    icon: LayoutDashboard,
  },
  {
    title: 'Usuários',
    href: '/dashboard/users',
    icon: Users,
  },
  {
    title: 'Sessões',
    href: '/dashboard/sessions',
    icon: Clock,
  },
  {
    title: 'Eventos',
    href: '/dashboard/events',
    icon: Activity,
  },
  {
    title: 'Telemetria',
    href: '/dashboard/telemetry',
    icon: BarChart3,
  },
  {
    title: 'Queries',
    href: '/dashboard/queries',
    icon: Database,
  },
  {
    title: 'Assistente IA',
    href: '/dashboard/assistant',
    icon: Sparkles,
    highlight: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <Link href="/dashboard/overview" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OS</span>
            </div>
            <span className="font-semibold">OnSite Analytics</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : item.highlight 
                    ? 'text-primary hover:bg-primary/10 font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center'
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0",
                item.highlight && !isActive && "text-primary"
              )} />
              {!collapsed && (
                <span className="flex items-center gap-2">
                  {item.title}
                  {item.highlight && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Configurações</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors w-full',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
