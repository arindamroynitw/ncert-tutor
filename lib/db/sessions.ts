import { supabase, getServerSupabase } from './supabase';
import { Session, ProblemAttempt, Message, SummaryData } from '../types';

/**
 * Create a new tutoring session
 */
export async function createSession(studentName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ student_name: studentName })
    .select('session_id')
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return data.session_id;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  return data as Session;
}

/**
 * Complete a session (marks it as done and updates metrics)
 */
export async function completeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase.rpc('complete_session', {
    p_session_id: sessionId
  });

  if (error) {
    console.error('Error completing session:', error);
    return false;
  }

  return true;
}

/**
 * Create a new problem attempt
 */
export async function createProblemAttempt(
  sessionId: string,
  problemId: string,
  isMasteryCheck: boolean = false,
  originalProblemId?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('problem_attempts')
    .insert({
      session_id: sessionId,
      problem_id: problemId,
      is_mastery_check: isMasteryCheck,
      original_problem_id: originalProblemId
    })
    .select('attempt_id')
    .single();

  if (error) {
    console.error('Error creating problem attempt:', error);
    return null;
  }

  return data.attempt_id;
}

/**
 * Update problem attempt status
 */
export async function updateProblemAttempt(
  attemptId: string,
  updates: {
    completed_at?: string;
    hints_used?: number;
    final_status?: 'mastered' | 'incomplete' | 'struggling';
    mastery_check_passed?: boolean;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('problem_attempts')
    .update(updates)
    .eq('attempt_id', attemptId);

  if (error) {
    console.error('Error updating problem attempt:', error);
    return false;
  }

  return true;
}

/**
 * Add a message to the conversation
 */
export async function addMessage(
  attemptId: string,
  role: 'student' | 'tutor',
  text: string,
  metadata?: {
    badge_type?: 'partial_progress' | 'hint_given' | 'corrective_feedback';
    response_type?: 'correct_final' | 'partial_progress' | 'arithmetic_error' | 'conceptual_error' | 'needs_hint';
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .insert({
      attempt_id: attemptId,
      role,
      text,
      ...metadata
    });

  if (error) {
    console.error('Error adding message:', error);
    return false;
  }

  return true;
}

/**
 * Get all messages for a problem attempt
 */
export async function getMessages(attemptId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data as Message[];
}

/**
 * Get all problem attempts for a session
 */
export async function getSessionAttempts(sessionId: string): Promise<ProblemAttempt[]> {
  const { data, error } = await supabase
    .from('problem_attempts')
    .select('*')
    .eq('session_id', sessionId)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('Error fetching session attempts:', error);
    return [];
  }

  return data as ProblemAttempt[];
}

/**
 * Get full session summary for parent view
 */
export async function getSessionSummary(sessionId: string): Promise<SummaryData | null> {
  // Get session data
  const session = await getSession(sessionId);
  if (!session) return null;

  // Get all attempts
  const attempts = await getSessionAttempts(sessionId);

  // Get problem details for each attempt
  const problemDetails = await Promise.all(
    attempts.map(async (attempt) => {
      const messages = await getMessages(attempt.attempt_id!);
      const { data: problem } = await supabase
        .from('problems')
        .select('*')
        .eq('id', attempt.problem_id)
        .single();

      return {
        problem: problem!,
        hints_used: attempt.hints_used || 0,
        mastered: attempt.final_status === 'mastered',
        conversation_length: messages.length
      };
    })
  );

  // Calculate metrics
  const total_problems = attempts.length;
  const problems_mastered = attempts.filter(a => a.final_status === 'mastered').length;
  const total_hints_used = attempts.reduce((sum, a) => sum + (a.hints_used || 0), 0);
  const average_hints_per_problem = total_problems > 0 ? total_hints_used / total_problems : 0;

  return {
    session,
    total_problems,
    problems_mastered,
    total_hints_used,
    average_hints_per_problem,
    problem_details: problemDetails
  };
}

/**
 * Get current active attempt for a session (if any)
 */
export async function getCurrentAttempt(sessionId: string): Promise<ProblemAttempt | null> {
  const { data, error } = await supabase
    .from('problem_attempts')
    .select('*')
    .eq('session_id', sessionId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No current attempt is fine
    return null;
  }

  return data as ProblemAttempt;
}
