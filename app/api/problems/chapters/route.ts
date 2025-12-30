import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/problems/chapters
 * Get list of available chapters for a class
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classLevel = searchParams.get('class');

    if (!classLevel) {
      return NextResponse.json(
        { error: 'Class parameter is required' },
        { status: 400 }
      );
    }

    // Get distinct chapters for this class
    const { data, error } = await supabase
      .from('problems')
      .select('chapter')
      .eq('class', parseInt(classLevel))
      .order('chapter', { ascending: true });

    if (error) {
      console.error('Chapters query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chapters' },
        { status: 500 }
      );
    }

    // Extract unique chapters
    const chapters = [...new Set(data.map(item => item.chapter))].sort((a, b) => a - b);

    return NextResponse.json({ chapters });

  } catch (error) {
    console.error('Chapters API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
