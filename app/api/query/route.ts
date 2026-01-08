import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();

    // Security: Only allow SELECT queries
    const normalizedSql = sql.trim().toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      return NextResponse.json(
        { error: 'Apenas queries SELECT são permitidas' },
        { status: 400 }
      );
    }

    // Block dangerous patterns
    const dangerousPatterns = [
      'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE',
      'TRUNCATE', 'GRANT', 'REVOKE', '--', ';--', '/*'
    ];

    for (const pattern of dangerousPatterns) {
      if (normalizedSql.includes(pattern)) {
        return NextResponse.json(
          { error: `Operação não permitida: ${pattern}` },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Execute using RPC (requires function in Supabase)
    // For now, we'll parse the query and use Supabase client
    
    // Simple parser to extract table name
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) {
      return NextResponse.json(
        { error: 'Não foi possível identificar a tabela' },
        { status: 400 }
      );
    }

    const tableName = tableMatch[1];
    
    // Extract columns
    const columnsMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    const columns = columnsMatch ? columnsMatch[1].trim() : '*';

    // Extract limit
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;

    // Extract order by
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);

    // Build query
    let query = supabase.from(tableName).select(columns === '*' ? '*' : columns);

    if (orderMatch) {
      const ascending = orderMatch[2]?.toUpperCase() !== 'DESC';
      query = query.order(orderMatch[1], { ascending });
    }

    query = query.limit(Math.min(limit, 1000)); // Max 1000 rows

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
