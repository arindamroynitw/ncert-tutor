import { NextRequest, NextResponse } from 'next/server';
import { generateSimilarProblems, GenerateSimilarRequest } from '@/lib/llm/generate-similar';
import { getProblemById } from '@/lib/db/problems';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/generate-similar
 * Generates similar problems for mastery checks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      problem_id: string;
      count?: number;
      difficulty_adjustment?: 'easier' | 'same' | 'harder';
    };

    // Validate input
    if (!body.problem_id) {
      return NextResponse.json(
        { error: 'Missing required field: problem_id' },
        { status: 400 }
      );
    }

    const count = body.count || 3; // Default to 3 similar problems
    if (count < 1 || count > 5) {
      return NextResponse.json(
        { error: 'count must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get original problem from database
    const originalProblem = await getProblemById(body.problem_id);
    if (!originalProblem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    // Generate similar problems
    const generationRequest: GenerateSimilarRequest = {
      original_problem: originalProblem,
      count,
      difficulty_adjustment: body.difficulty_adjustment || 'same'
    };

    const generatedProblems = await generateSimilarProblems(generationRequest);

    return NextResponse.json({
      original_problem_id: body.problem_id,
      count: generatedProblems.length,
      difficulty_adjustment: body.difficulty_adjustment || 'same',
      problems: generatedProblems
    });

  } catch (error) {
    console.error('Generate similar API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
