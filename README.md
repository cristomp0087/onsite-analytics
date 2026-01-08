# OnSite Analytics - Assistente IA

## Setup

### 1. Instalar dependência do OpenAI

```bash
npm install openai
```

### 2. Adicionar API Key no .env.local

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Criar os arquivos

Copiar os arquivos para os destinos:

| Arquivo | Destino |
|---------|---------|
| `assistant-page.tsx` | `app/dashboard/assistant/page.tsx` |
| `chat-route.ts` | `app/api/ai/chat/route.ts` |
| `sidebar.tsx` | `components/layout/sidebar.tsx` |

### 4. Criar a pasta da API

```bash
mkdir -p app/api/ai/chat
```

### 5. Reiniciar o servidor

```bash
npm run dev
```

---

## Funcionalidades

### O que o Assistente pode fazer:

1. **Consultas em linguagem natural**
   - "Quantos usuários temos?"
   - "Quais os locais mais usados?"

2. **Gerar gráficos**
   - "Mostre um gráfico de sessões por dia"
   - "Compare entradas automáticas vs manuais"

3. **Criar tabelas**
   - "Liste os últimos 10 registros"
   - "Mostre os usuários mais ativos"

4. **Exportar dados**
   - Botão de download CSV em todas as visualizações

5. **Análise contextual**
   - "Qual a tendência de uso?"
   - "O sync está funcionando bem?"

---

## Exemplos de Perguntas

### Métricas Gerais
- "Quantos usuários se cadastraram esse mês?"
- "Qual a média de duração das sessões?"
- "Quantas sessões foram feitas essa semana?"

### Gráficos
- "Crie um gráfico de barras com usuários por mês"
- "Mostre a evolução de sessões nos últimos 30 dias"
- "Faça um gráfico de pizza comparando tipos de entrada"

### Tabelas e Dados
- "Liste os 20 usuários mais recentes"
- "Mostre todas as sessões abertas"
- "Quais locais têm mais registros?"

### Análise
- "Como está a taxa de sucesso do sync?"
- "Qual horário os usuários mais usam o app?"
- "Identifique padrões de uso"

---

## Custos

O assistente usa GPT-4 Turbo. Custo aproximado:
- ~$0.01 por pergunta simples
- ~$0.05 por análise complexa com múltiplas queries

Para controlar custos:
- Limite de tokens configurado em 2000
- Dados retornados limitados a 100 rows
- Cache pode ser implementado para perguntas repetidas

---

## Troubleshooting

### "API da OpenAI não configurada"
→ Verifique se `OPENAI_API_KEY` está no `.env.local`

### Erro de CORS
→ A API route deve estar em `app/api/ai/chat/route.ts`

### Dados não aparecem
→ Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada

### Gráficos vazios
→ O modelo pode não ter encontrado dados. Tente reformular a pergunta.
