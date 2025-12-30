import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/problems/random
 * Get a random problem based on filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classLevel = searchParams.get('class');
    const complexity = searchParams.get('complexity');

    // Build count query with same filters
    let countQuery = supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });

    // Apply filters to count query
    if (classLevel) {
      countQuery = countQuery.eq('class', parseInt(classLevel));
    }

    if (complexity && complexity !== 'any') {
      countQuery = countQuery.eq('complexity', complexity);
    }

    // Get total count for random selection
    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json(
        { error: 'Failed to count problems', details: countError.message },
        { status: 500 }
      );
    }

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'No problems found matching criteria' },
        { status: 404 }
      );
    }

    // Get a random offset
    const randomOffset = Math.floor(Math.random() * count);

    // Build data query with same filters
    let dataQuery = supabase
      .from('problems')
      .select('*');

    // Apply filters
    if (classLevel) {
      dataQuery = dataQuery.eq('class', parseInt(classLevel));
    }

    if (complexity && complexity !== 'any') {
      dataQuery = dataQuery.eq('complexity', complexity);
    }

    // Fetch one random problem using offset
    const { data, error } = await dataQuery
      .range(randomOffset, randomOffset)
      .limit(1);

    if (error) {
      console.error('Data fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch problem', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No problem found at offset' },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);

  } catch (error) {
    console.error('Random problem API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
