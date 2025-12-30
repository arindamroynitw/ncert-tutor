import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { evaluateAnswer, getSolutionExplanation } from '@/lib/llm/evaluate';
import { getProblemById } from '@/lib/db/problems';
import { EvaluationRequest, EvaluationResponse, Message, calculateAge } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/evaluate
 * Evaluates a student's answer using GPT-4o
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      problem_id: string;
      student_answer: string;
      conversation_history: Array<{ role: 'student' | 'tutor'; text: string; timestamp?: string }>;
      hints_used: number;
      request_solution?: boolean;
    };

    // Validate input
    if (!body.problem_id || !body.student_answer) {
      return NextResponse.json(
        { error: 'Missing required fields: problem_id, student_answer' },
        { status: 400 }
      );
    }

    // Get user session to extract age
    const session = await getServerSession(authOptions);
    let studentAge: number | undefined;

    if (session?.user?.profile?.birthdate) {
      studentAge = calculateAge(session.user.profile.birthdate);
    }

    // Get problem from database
    const problem = await getProblemById(body.problem_id);
    if (!problem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    // If student requested solution explanation
    if (body.request_solution) {
      const explanation = await getSolutionExplanation(problem);
      return NextResponse.json({
        response_type: 'correct_final',
        tutor_message: 'Here\'s how to solve this problem:',
        badge_type: 'hint_given',
        show_solution_button: false,
        explanation
      });
    }

    // Transform conversation history to include timestamps
    const conversationHistory: Message[] = (body.conversation_history || []).map(msg => ({
      role: msg.role,
      text: msg.text,
      timestamp: msg.timestamp || new Date().toISOString()
    }));

    // Evaluate the answer with age-appropriate tone
    const evaluation: EvaluationResponse = await evaluateAnswer(
      problem,
      conversationHistory,
      body.student_answer,
      body.hints_used || 0,
      studentAge
    );

    return NextResponse.json(evaluation);

  } catch (error) {
    console.error('Evaluation API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
