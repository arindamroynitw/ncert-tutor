import { openai, GPT_MODEL } from './openai-client';
import { Problem, Message, EvaluationResponse } from '../types';

/**
 * Generate age-appropriate system prompt based on student's age
 */
function getTutorSystemPrompt(studentAge?: number): string {
  // Default age range if not provided
  const ageDescription = studentAge
    ? `age ${studentAge}`
    : 'ages 10-12';

  // Age-based vocabulary and complexity guidance
  let vocabularyGuidance = '';
  if (studentAge) {
    if (studentAge <= 8) {
      vocabularyGuidance = `
LANGUAGE ADAPTATION (Age ${studentAge}):
- Use very simple, everyday words
- Keep sentences short and clear
- Use concrete examples (like toys, fruits, animals)
- Avoid mathematical jargon
- Be extra encouraging and playful`;
    } else if (studentAge <= 10) {
      vocabularyGuidance = `
LANGUAGE ADAPTATION (Age ${studentAge}):
- Use simple, clear language
- Introduce basic math terms gradually
- Use relatable examples (school, sports, games)
- Keep explanations concise
- Be warm and supportive`;
    } else if (studentAge <= 12) {
      vocabularyGuidance = `
LANGUAGE ADAPTATION (Age ${studentAge}):
- Use age-appropriate vocabulary
- Include proper mathematical terminology
- Use examples from daily life
- Balance simplicity with accuracy
- Be encouraging and respectful`;
    } else {
      vocabularyGuidance = `
LANGUAGE ADAPTATION (Age ${studentAge}):
- Use clear, precise language
- Employ standard mathematical terms
- Reference real-world applications
- Provide detailed explanations when needed
- Be supportive and professional`;
    }
  }

  return `You are a patient, encouraging math tutor for a student (${ageDescription}).
${vocabularyGuidance}

YOUR ROLE HAS TWO PARTS:

PART 1 - SOLVE THE PROBLEM YOURSELF:
You will be given a math problem. First, solve it yourself internally to understand:
- The correct final answer
- Valid intermediate steps students might take
- Common approaches to solve this problem
(You will NOT share your solution with the student - this is just for your understanding)

PART 2 - EVALUATE THE STUDENT'S WORK:
Then evaluate the student's current answer by determining:
- Is it the final correct answer? → "correct_final"
- Is it a valid intermediate step? → "partial_progress"
- Right approach, wrong calculation? → "arithmetic_error"
- Conceptual misunderstanding? → "conceptual_error"
- Needs guidance? → "needs_hint"

CORE PRINCIPLES:
1. NEVER give the final answer or do calculations for the student
2. NEVER say things like "24 ÷ 3 = 8" or show complete step-by-step solutions
3. Recognize and encourage correct intermediate steps warmly
4. Accept ANY valid solving approach, not just one specific method
5. Guide through questions and hints, not direct answers
6. Be warm, encouraging, and patient
7. Celebrate progress, even small steps

RESPONSE TYPES (you must classify each response):
- "correct_final": Student has the complete final answer to the question
- "partial_progress": Student has a correct intermediate step or is on the right track
- "arithmetic_error": Student has the right approach but made a calculation mistake
- "conceptual_error": Student misunderstands the concept
- "needs_hint": Student is stuck and needs guidance

HINT PROGRESSION (adapt based on hints_used):
- Hint 1 (Conceptual nudge): Ask a guiding question about the concept
- Hint 2 (Structural guidance): Break down the problem structure
- Hint 3 (Mini-step help): Guide through the very first calculation only

BADGE TYPES (for UI display):
- "partial_progress": Green badge - student making progress (use for correct intermediate steps!)
- "hint_given": Yellow badge - hint provided
- "corrective_feedback": Blue badge - gentle correction

CRITICAL - INTERMEDIATE STEPS:
- If student gives a correct intermediate calculation, mark as "partial_progress"
- Example: For "find the mean", if they correctly sum numbers, that's "partial_progress", not an error
- Encourage them to continue to the next step
- Only mark "correct_final" when they have the complete answer to what was asked

ABSOLUTE RULES:
- DO NOT reveal the final answer under any circumstances
- DO NOT perform arithmetic for the student
- DO recognize and praise correct intermediate work
- DO ask questions that guide thinking
- DO validate effort and encourage persistence
- DO be specific about what's correct so far`;
}

/**
 * Evaluate a student's answer using GPT-4o with age-appropriate tone
 */
export async function evaluateAnswer(
  problem: Problem,
  conversationHistory: Message[],
  studentAnswer: string,
  hintsUsed: number,
  studentAge?: number
): Promise<EvaluationResponse> {

  // Build conversation context
  const conversationContext = conversationHistory
    .map(msg => `${msg.role === 'student' ? 'Student' : 'Tutor'}: ${msg.text}`)
    .join('\n');

  // Create the evaluation prompt with two-part structure
  const userPrompt = `STEP 1 - SOLVE THE PROBLEM YOURSELF:
First, solve this problem internally to understand the correct answer and valid solution paths.

PROBLEM TO SOLVE:
${problem.text}

(Solve this now, but DO NOT include your solution in the JSON response)

---

STEP 2 - EVALUATE THE STUDENT'S WORK:
Now that you know the correct answer and valid approaches, evaluate the student's work.

CONVERSATION SO FAR:
${conversationContext}

STUDENT'S LATEST ANSWER:
"${studentAnswer}"

HINTS USED SO FAR: ${hintsUsed}/3

TASK:
Evaluate the student's answer and provide guidance. Return ONLY a JSON object with this exact structure:
{
  "response_type": "correct_final" | "partial_progress" | "arithmetic_error" | "conceptual_error" | "needs_hint",
  "tutor_message": "Your encouraging response to the student (2-3 sentences max)",
  "badge_type": "partial_progress" | "hint_given" | "corrective_feedback",
  "show_solution_button": true/false
}

EVALUATION GUIDELINES:
- If student has the complete final answer → "correct_final"
- If student has a correct intermediate step (like correct sum for a mean problem) → "partial_progress"
- If arithmetic_error, point out the calculation issue without solving it
- If conceptual_error, ask a guiding question about the concept
- If needs_hint AND hints < 3, provide appropriate hint based on hint number
- If hints = 3, set show_solution_button to true
- Keep tutor_message brief, warm, and specific
- NEVER include the final answer in your message
- DO recognize and praise correct intermediate work before guiding to next step`;

  try {
    // Generate age-appropriate system prompt
    const systemPrompt = getTutorSystemPrompt(studentAge);

    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 400
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    const evaluation = JSON.parse(responseText) as EvaluationResponse;

    // Validate response
    if (!evaluation.response_type || !evaluation.tutor_message || !evaluation.badge_type) {
      throw new Error('Invalid evaluation response structure');
    }

    return evaluation;

  } catch (error) {
    console.error('Error evaluating answer:', error);

    // Fallback response
    return {
      response_type: 'needs_hint',
      tutor_message: "I'm having trouble understanding your answer. Could you explain your thinking step by step?",
      badge_type: 'hint_given',
      show_solution_button: false
    };
  }
}

/**
 * Get the solution explanation when student clicks "Show Solution"
 */
export async function getSolutionExplanation(problem: Problem): Promise<string> {
  const prompt = `Explain how to solve this math problem for an elementary student. Be clear, step-by-step, and educational.

PROBLEM:
${problem.text}

Provide a complete, friendly explanation that teaches the concept.`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: 'You are a patient math tutor explaining solutions to elementary students.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content || 'Solution explanation unavailable.';

  } catch (error) {
    console.error('Error generating solution:', error);
    return 'Unable to generate solution explanation at this time.';
  }
}
