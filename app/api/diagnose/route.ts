import { NextRequest, NextResponse } from 'next/server';
import { diagnoseStudent, getRecommendedPractice, DiagnosticRequest } from '@/lib/llm/diagnose';
import { getProblemById } from '@/lib/db/problems';
import { Message } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/diagnose
 * Analyzes student's work to identify misconceptions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      problem_id: string;
      conversation_history: Message[];
      student_answers: string[];
      hints_given?: number;
      get_practice_recommendations?: boolean;
    };

    // Validate input
    if (!body.problem_id || !body.student_answers || body.student_answers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: problem_id, student_answers' },
        { status: 400 }
      );
    }

    // Get problem from database
    const problem = await getProblemById(body.problem_id);
    if (!problem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    // Prepare diagnostic request
    const diagnosticRequest: DiagnosticRequest = {
      problem,
      conversation_history: body.conversation_history || [],
      student_answers: body.student_answers,
      hints_given: body.hints_given || 0,
      attempts_count: body.student_answers.length
    };

    // Run diagnostic analysis
    const diagnostic = await diagnoseStudent(diagnosticRequest);

    // Optionally get practice recommendations
    let practiceRecommendations: string[] | undefined;
    if (body.get_practice_recommendations) {
      practiceRecommendations = await getRecommendedPractice(diagnostic, problem);
    }

    return NextResponse.json({
      problem_id: body.problem_id,
      attempts_analyzed: body.student_answers.length,
      diagnostic,
      practice_recommendations: practiceRecommendations
    });

  } catch (error) {
    console.error('Diagnose API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
