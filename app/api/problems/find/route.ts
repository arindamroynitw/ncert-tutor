import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/problems/find
 * Find a specific problem by class, chapter, and problem number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classLevel = searchParams.get('class');
    const chapter = searchParams.get('chapter');
    const problemNumber = searchParams.get('problem_number');

    if (!classLevel || !chapter || !problemNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters: class, chapter, problem_number' },
        { status: 400 }
      );
    }

    // Try to parse problem_number as integer
    const parsedNumber = parseInt(problemNumber);

    // Search for the problem - try exact match first
    let { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('class', parseInt(classLevel))
      .eq('chapter', parseInt(chapter))
      .eq('problem_number', parsedNumber)
      .limit(1);

    // If no exact match and we have a valid number, try to find problems in range
    if ((!data || data.length === 0) && !isNaN(parsedNumber)) {
      const { data: rangeData, error: rangeError } = await supabase
        .from('problems')
        .select('*')
        .eq('class', parseInt(classLevel))
        .eq('chapter', parseInt(chapter))
        .gte('problem_number', parsedNumber)
        .lte('problem_number', parsedNumber + 1)
        .limit(5);

      if (!rangeError && rangeData && rangeData.length > 0) {
        data = rangeData;
      }
    }

    if (error) {
      console.error('Problem search error:', error);
      return NextResponse.json(
        { error: 'Failed to search for problem' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: 'Problem not found',
          message: `No problem found for Class ${classLevel}, Chapter ${chapter}, Problem ${problemNumber}. Try checking the problem number in your textbook.`
        },
        { status: 404 }
      );
    }

    // If multiple results, return the first one
    return NextResponse.json(data[0]);

  } catch (error) {
    console.error('Find problem API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
