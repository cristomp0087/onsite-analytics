import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// PERSONA: PhD CONVERSACIONAL
// ============================================

const ANALYST_PERSONA = `
# Quem você é

Você é o Dr. André, um cientista de dados com PhD por Stanford, especializado em workforce analytics e construção civil. Você trabalha como consultor da OnSite Club.

# Como você conversa

- **Natural e humano**: Você conversa como um colega de trabalho, não como um robô
- **Direto**: Vai ao ponto sem enrolação
- **Acessível**: Explica conceitos complexos de forma simples
- **Curioso**: Faz perguntas de volta quando faz sentido
- **Opinativo**: Tem opiniões baseadas em dados e experiência
- **Brasileiro**: Fala português natural, pode usar expressões coloquiais

# O que você NÃO faz (a menos que peçam)

- NÃO use headers markdown (###) em conversas normais
- NÃO liste frameworks e metodologias sem necessidade
- NÃO formate como relatório toda resposta
- NÃO seja excessivamente formal
- NÃO repita "como cientista de dados" toda hora

# O que você FAZ

- Responde de forma conversacional e natural
- Dá sua opinião quando perguntado
- Explica dados de forma simples
- Usa analogias do dia a dia
- Faz perguntas para entender melhor o contexto
- SÓ gera relatórios/listas estruturadas quando o usuário PEDIR explicitamente

# Seu conhecimento técnico (use naturalmente, não liste)

Você domina: análise de cohort, behavioral economics, workforce analytics, time series, 
estatística, tendências de mercado em data science e AI. Mas você menciona isso 
naturalmente na conversa, como qualquer especialista faria - não fica listando.

# Exemplos de como responder

RUIM (robótico):
"### Análise
Baseado nos dados, identifico que...
### Metodologia
Utilizando o framework CRISP-DM...
### Recomendações
1. Implemente X
2. Monitore Y"

BOM (humano):
"Olha, analisando os números aqui, você tem 45 usuários e uma taxa de automação de 67% - 
isso é bem sólido pra um app novo. O que me chama atenção é que a galera tá usando mais 
no começo da semana. Já pensou por que isso acontece?"

# Quando SIM formatar estruturado

- Quando pedirem: "gera um relatório", "faz uma lista", "formato estruturado"
- Quando pedirem tabelas ou exports
- Quando for uma análise complexa que precisa de organização

# Seu tom

Imagine que você tá tomando um café com o Cris e ele te pergunta algo sobre os dados.
Como você responderia? Assim mesmo.
`;

const DATABASE_CONTEXT = `
# Dados que você tem acesso

Você consegue ver os dados do OnSite Club:
- **profiles**: usuários cadastrados (email, nome, ofício, plataforma)
- **registros**: sessões de trabalho (entrada, saída, local, tipo automático/manual)
- **locais**: job sites cadastrados
- **app_events**: eventos de uso (login, logout, etc)
- **timekeeper_telemetry_daily**: métricas agregadas por dia
`;

// ============================================
// DATABASE HELPERS
// ============================================

async function queryDB(table: string, options: {
  select?: string;
  limit?: number;
  orderBy?: string;
  desc?: boolean;
} = {}) {
  const supabase = createAdminClient();
  
  let query = supabase.from(table).select(options.select || '*');
  
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: !options.desc });
  }
  
  query = query.limit(options.limit || 100);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getMetrics() {
  const supabase = createAdminClient();
  
  const [users, sessions, locais] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('registros').select('*', { count: 'exact', head: true }),
    supabase.from('locais').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  // Automation rate
  const { data: allSessions } = await supabase
    .from('registros')
    .select('tipo')
    .limit(1000);

  const auto = allSessions?.filter(s => s.tipo === 'automatico').length || 0;
  const total = allSessions?.length || 1;
  const automationRate = Math.round((auto / total) * 100);

  // Today's activity
  const today = new Date().toISOString().split('T')[0];
  const { count: todayLogins } = await supabase
    .from('app_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'login')
    .gte('created_at', today);

  return {
    users: users.count || 0,
    sessions: sessions.count || 0,
    locais: locais.count || 0,
    automationRate,
    todayLogins: todayLogins || 0,
  };
}

async function getCohortData() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .order('created_at', { ascending: true });

  const cohorts: Record<string, number> = {};
  data?.forEach(u => {
    const month = u.created_at.slice(0, 7);
    cohorts[month] = (cohorts[month] || 0) + 1;
  });

  return Object.entries(cohorts).map(([month, count]) => ({ name: month, value: count }));
}

async function getSessionsPerDay(days: number = 14) {
  const supabase = createAdminClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data } = await supabase
    .from('registros')
    .select('created_at')
    .gte('created_at', startDate.toISOString());
  
  const byDay: Record<string, number> = {};
  data?.forEach(r => {
    const day = r.created_at.split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });
  
  return Object.entries(byDay).map(([date, count]) => ({
    name: date.split('-').slice(1).join('/'),
    value: count,
  }));
}

async function getEntryTypes() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('registros').select('tipo');
  
  const auto = data?.filter(r => r.tipo === 'automatico').length || 0;
  const manual = data?.filter(r => r.tipo === 'manual').length || 0;
  
  return [
    { name: 'Automático', value: auto },
    { name: 'Manual', value: manual },
  ];
}

async function getLoginsPerUser() {
  const supabase = createAdminClient();
  
  const { data: events } = await supabase
    .from('app_events')
    .select('user_id')
    .eq('event_type', 'login');
  
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, nome');
  
  const counts: Record<string, number> = {};
  events?.forEach(e => {
    if (e.user_id) counts[e.user_id] = (counts[e.user_id] || 0) + 1;
  });
  
  return users?.map(u => ({
    name: u.nome || u.email?.split('@')[0] || '?',
    value: counts[u.id] || 0,
  })).filter(u => u.value > 0).sort((a, b) => b.value - a.value).slice(0, 10) || [];
}

// ============================================
// DETECT IF USER WANTS VISUALIZATION
// ============================================

function detectVisualizationIntent(message: string): {
  wants: boolean;
  type: 'chart' | 'table' | 'number' | null;
  topic: string | null;
} {
  const lower = message.toLowerCase();
  
  // Explicit requests for visuals
  const wantsChart = /(gráfico|grafico|chart|visualiza|plota|desenha|mostra.*gráfico)/i.test(message);
  const wantsTable = /(tabela|lista|planilha|excel|csv|pdf|exporta|mostre.*dados|lista.*de)/i.test(message);
  const wantsNumber = /(quantos?|quantas?|total|número|numero)/i.test(message) && 
                      !/(gráfico|tabela|lista)/i.test(message);
  const wantsReport = /(relatório|relatorio|report|análise completa|analise completa)/i.test(message);

  if (!wantsChart && !wantsTable && !wantsNumber && !wantsReport) {
    return { wants: false, type: null, topic: null };
  }

  // Detect topic
  let topic = null;
  if (/(usuário|usuario|user|cadastro)/i.test(message)) topic = 'users';
  else if (/(sessão|sessões|sessoes|registro|trabalho)/i.test(message)) topic = 'sessions';
  else if (/(login|acesso|engajamento|ativo)/i.test(message)) topic = 'logins';
  else if (/(automático|automatico|manual|tipo|geofence)/i.test(message)) topic = 'entryTypes';
  else if (/(crescimento|cohort|evolução|mes)/i.test(message)) topic = 'cohort';
  else if (/(evento|event)/i.test(message)) topic = 'events';

  return {
    wants: true,
    type: wantsChart ? 'chart' : wantsTable ? 'table' : wantsNumber ? 'number' : 'chart',
    topic,
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: Request) {
  console.log('\n=== DR. ANDRÉ ===');
  
  try {
    const { message, history } = await request.json();
    console.log('User:', message);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        message: 'Opa, preciso da API key da OpenAI configurada no .env.local pra funcionar.',
        visualization: null,
      });
    }

    // Get base metrics
    const metrics = await getMetrics();
    
    // Check visualization intent
    const vizIntent = detectVisualizationIntent(message);
    let visualization = null;
    let dataContext = '';

    if (vizIntent.wants) {
      console.log('Viz intent:', vizIntent);

      // Generate appropriate visualization
      if (vizIntent.topic === 'users' || vizIntent.topic === 'cohort') {
        if (vizIntent.type === 'table') {
          const data = await queryDB('profiles', { limit: 30, orderBy: 'created_at', desc: true });
          visualization = { type: 'table', title: 'Usuários', data, columns: ['email', 'nome', 'trade', 'device_platform', 'created_at'], downloadable: true };
          dataContext = `\n[Tabela gerada com ${data.length} usuários]`;
        } else {
          const data = await getCohortData();
          visualization = { type: 'chart', chartType: 'bar', title: 'Usuários por Mês', data, downloadable: true };
          dataContext = `\n[Gráfico gerado: ${JSON.stringify(data)}]`;
        }
      }
      else if (vizIntent.topic === 'sessions') {
        if (vizIntent.type === 'table') {
          const data = await queryDB('registros', { limit: 30, orderBy: 'created_at', desc: true });
          visualization = { type: 'table', title: 'Sessões de Trabalho', data, columns: ['local_nome', 'entrada', 'saida', 'tipo', 'created_at'], downloadable: true };
          dataContext = `\n[Tabela gerada com ${data.length} sessões]`;
        } else {
          const data = await getSessionsPerDay(14);
          visualization = { type: 'chart', chartType: 'line', title: 'Sessões por Dia', data, downloadable: true };
          dataContext = `\n[Gráfico gerado: ${JSON.stringify(data)}]`;
        }
      }
      else if (vizIntent.topic === 'logins') {
        const data = await getLoginsPerUser();
        visualization = { type: 'chart', chartType: 'bar', title: 'Logins por Usuário', data, downloadable: true };
        dataContext = `\n[Gráfico gerado: ${JSON.stringify(data)}]`;
      }
      else if (vizIntent.topic === 'entryTypes') {
        const data = await getEntryTypes();
        visualization = { type: 'chart', chartType: 'pie', title: 'Automático vs Manual', data, downloadable: true };
        dataContext = `\n[Gráfico gerado: ${JSON.stringify(data)}]`;
      }
      else if (vizIntent.topic === 'events') {
        const data = await queryDB('app_events', { limit: 30, orderBy: 'created_at', desc: true });
        visualization = { type: 'table', title: 'Eventos', data, columns: ['event_type', 'user_id', 'app_version', 'created_at'], downloadable: true };
        dataContext = `\n[Tabela gerada com ${data.length} eventos]`;
      }
      else if (vizIntent.type === 'number') {
        // Default to user count
        visualization = { type: 'number', value: metrics.users.toString(), title: 'Total de Usuários' };
      }
      else {
        // Default chart: sessions per day
        const data = await getSessionsPerDay(14);
        visualization = { type: 'chart', chartType: 'line', title: 'Atividade Recente', data, downloadable: true };
        dataContext = `\n[Gráfico gerado: ${JSON.stringify(data)}]`;
      }
    }

    // Build conversational prompt
    const systemPrompt = `${ANALYST_PERSONA}

${DATABASE_CONTEXT}

# Números atuais (use naturalmente na conversa)
- Usuários: ${metrics.users}
- Sessões: ${metrics.sessions}
- Locais ativos: ${metrics.locais}
- Taxa de automação: ${metrics.automationRate}%
- Logins hoje: ${metrics.todayLogins}
${dataContext}

${visualization ? `\nO usuário pediu uma visualização e ela foi gerada. Comente brevemente sobre o que os dados mostram, de forma natural.` : ''}

Lembre-se: converse naturalmente, como um colega. Só estruture em formato de relatório se pedirem explicitamente.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((m: any) => ({ 
        role: m.role as 'user' | 'assistant', 
        content: m.content 
      })),
      { role: 'user', content: message },
    ];

    console.log('Calling GPT-4o...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8, // Mais criativo/humano
      max_tokens: 1500,
    });

    const aiMessage = response.choices[0].message.content || 'Hmm, não consegui processar isso. Pode reformular?';
    console.log('Response OK');
    console.log('=== END ===\n');

    return NextResponse.json({
      message: aiMessage,
      visualization,
    });

  } catch (error: any) {
    console.error('Error:', error.message);
    
    return NextResponse.json({
      message: `Eita, deu um erro aqui: ${error.message}`,
      visualization: null,
    }, { status: 500 });
  }
}
