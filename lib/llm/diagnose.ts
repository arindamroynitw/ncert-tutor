import { openai, GPT_MODEL } from './openai-client';
import { Problem, Message } from '../types';

/**
 * System prompt for diagnostic analysis
 */
const DIAGNOSTIC_SYSTEM_PROMPT = `You are an expert math education researcher specializing in identifying student misconceptions in elementary mathematics.

Your role is to analyze patterns in student errors and conversations to:
1. Identify specific misconceptions or knowledge gaps
2. Determine if errors are conceptual, procedural, or careless
3. Recommend targeted interventions
4. Assess student's current understanding level

MISCONCEPTION CATEGORIES:
- **Conceptual**: Fundamental misunderstanding of mathematical concepts
- **Procedural**: Errors in applying steps or algorithms correctly
- **Arithmetic**: Simple calculation mistakes
- **Reading Comprehension**: Misunderstanding the problem statement
- **Incomplete Knowledge**: Missing prerequisite concepts
- **Careless Error**: One-time slip, not a pattern

ANALYSIS FRAMEWORK:
1. Look for patterns across multiple attempts
2. Consider the conversation history for evidence
3. Identify the root cause, not just the symptom
4. Be specific about what the student understands vs. doesn't
5. Recommend concrete next steps`;

export interface DiagnosticRequest {
  problem: Problem;
  conversation_history: Message[];
  student_answers: string[];
  hints_given: number;
  attempts_count: number;
}

export interface DiagnosticResult {
  misconception_type: 'conceptual' | 'procedural' | 'arithmetic' | 'reading_comprehension' | 'incomplete_knowledge' | 'careless_error' | 'none';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  evidence: string[];
  recommendations: string[];
  prerequisite_concepts?: string[];
}

/**
 * Analyze student's work to identify misconceptions
 */
export async function diagnoseStudent(
  request: DiagnosticRequest
): Promise<DiagnosticResult> {
  const { problem, conversation_history, student_answers, hints_given, attempts_count } = request;

  // Build conversation context
  const conversationText = conversation_history
    .map(msg => `${msg.role === 'student' ? 'Student' : 'Tutor'}: ${msg.text}`)
    .join('\n');

  const userPrompt = `PROBLEM:
"${problem.text}"

Class: ${problem.class}
Complexity: ${problem.complexity}
Requires multiple steps: ${problem.requires_multi_step}

STUDENT ATTEMPTS (${attempts_count} total):
${student_answers.map((ans, i) => `Attempt ${i + 1}: "${ans}"`).join('\n')}

CONVERSATION HISTORY:
${conversationText || 'No conversation yet'}

HINTS PROVIDED: ${hints_given}/3

TASK:
Analyze this student's work to identify any misconceptions or learning gaps. Return ONLY a JSON object with this structure:

{
  "misconception_type": "conceptual" | "procedural" | "arithmetic" | "reading_comprehension" | "incomplete_knowledge" | "careless_error" | "none",
  "confidence": "high" | "medium" | "low",
  "description": "Clear 1-2 sentence description of the identified misconception or pattern",
  "evidence": ["Specific examples from student's attempts that support this diagnosis"],
  "recommendations": ["Specific, actionable teaching interventions (2-3 items)"],
  "prerequisite_concepts": ["Optional: Concepts student needs to learn first"]
}

GUIDELINES:
- If only 1 attempt and it's close or shows partial understanding → "careless_error" or "incomplete_knowledge"
- If multiple attempts show same error pattern → likely "conceptual" or "procedural"
- If student can't parse the problem → "reading_comprehension"
- If calculations wrong but approach right → "arithmetic"
- Be specific in recommendations (e.g., "Practice breaking multi-step problems into single steps")
- Only list prerequisite_concepts if truly necessary`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: DIAGNOSTIC_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    const diagnostic = JSON.parse(responseText) as DiagnosticResult;

    // Validate response structure
    if (!diagnostic.misconception_type || !diagnostic.confidence || !diagnostic.description) {
      throw new Error('Invalid diagnostic response structure');
    }

    return diagnostic;

  } catch (error) {
    console.error('Error diagnosing student:', error);

    // Fallback response
    return {
      misconception_type: 'none',
      confidence: 'low',
      description: 'Unable to determine specific misconception from available data.',
      evidence: ['Insufficient data for analysis'],
      recommendations: [
        'Continue working with the student to gather more information',
        'Provide additional practice problems to identify patterns'
      ]
    };
  }
}

/**
 * Get recommended practice problems based on diagnosed misconception
 */
export async function getRecommendedPractice(
  diagnostic: DiagnosticResult,
  originalProblem: Problem
): Promise<string[]> {
  if (diagnostic.misconception_type === 'none' || diagnostic.misconception_type === 'careless_error') {
    return [
      'Continue with similar problems to build confidence',
      'Try slightly harder problems to advance'
    ];
  }

  const prompt = `A student has been diagnosed with the following misconception:

Type: ${diagnostic.misconception_type}
Description: ${diagnostic.description}

Original problem context:
- Class: ${originalProblem.class}
- Chapter: ${originalProblem.chapter}
- Complexity: ${originalProblem.complexity}

Provide 3-5 specific, actionable practice recommendations to address this misconception. Return ONLY a JSON object:

{
  "recommendations": [
    "Specific practice recommendation 1",
    "Specific practice recommendation 2",
    ...
  ]
}

Make recommendations concrete and focused on the specific misconception.`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: 'You are a math education expert providing targeted practice recommendations.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 300
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      return diagnostic.recommendations;
    }

    const parsed = JSON.parse(responseText);
    return parsed.recommendations || diagnostic.recommendations;

  } catch (error) {
    console.error('Error getting practice recommendations:', error);
    return diagnostic.recommendations;
  }
}
