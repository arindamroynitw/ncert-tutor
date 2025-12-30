import { openai, GPT_MODEL } from './openai-client';
import { Problem } from '../types';

/**
 * System prompt for problem generation
 */
const GENERATOR_SYSTEM_PROMPT = `You are an expert elementary math textbook author creating practice problems for students ages 10-12.

Your task is to generate similar math problems that:
1. Test the SAME mathematical concept as the original
2. Match the complexity level (easy/medium/hard)
3. Use similar problem structure and wording
4. Use different numbers and context to avoid memorization
5. Are age-appropriate and relatable for Indian students

IMPORTANT:
- Generate problems that are genuinely solvable
- Use realistic numbers appropriate for the grade level
- Keep language clear and simple
- Avoid cultural bias or complex scenarios
- Each problem should have ONE correct answer`;

/**
 * Difficulty adjustment instructions
 */
const DIFFICULTY_ADJUSTMENTS = {
  easier: `Make this problem SLIGHTLY EASIER by:
- Using smaller, rounder numbers
- Simplifying the scenario
- Removing one step if multi-step`,

  same: `Keep the SAME difficulty level by:
- Using similar number ranges
- Maintaining the same number of steps
- Using comparable complexity`,

  harder: `Make this problem SLIGHTLY HARDER by:
- Using larger or less round numbers
- Adding one small complication
- Requiring one additional step`
};

export interface GenerateSimilarRequest {
  original_problem: Problem;
  count: number;
  difficulty_adjustment?: 'easier' | 'same' | 'harder';
}

export interface GeneratedProblem {
  text: string;
  expected_answer: string;
  explanation: string;
  complexity: 'easy' | 'medium' | 'hard';
}

/**
 * Generate similar problems using GPT-4o
 */
export async function generateSimilarProblems(
  request: GenerateSimilarRequest
): Promise<GeneratedProblem[]> {
  const { original_problem, count, difficulty_adjustment = 'same' } = request;

  const userPrompt = `ORIGINAL PROBLEM:
Class: ${original_problem.class}
Chapter: ${original_problem.chapter}
Complexity: ${original_problem.complexity}
Multi-step: ${original_problem.requires_multi_step}

"${original_problem.text}"

TASK:
Generate ${count} similar practice problems that test the same mathematical concept.

${DIFFICULTY_ADJUSTMENTS[difficulty_adjustment]}

Return ONLY a JSON object with this exact structure:
{
  "problems": [
    {
      "text": "The complete problem text",
      "expected_answer": "The numerical answer (just the number or simple expression)",
      "explanation": "Brief 2-3 sentence explanation of how to solve it",
      "complexity": "easy" | "medium" | "hard"
    }
  ]
}

GUIDELINES:
- Use different contexts and numbers from the original
- Ensure problems are solvable and have clear answers
- Keep language appropriate for Class ${original_problem.class} students
- Match the mathematical concept exactly
- Each problem should be self-contained and clear`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: GENERATOR_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Higher temperature for more variety
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse response - GPT always wraps in object when using json_object mode
    const parsed = JSON.parse(responseText);

    // GPT-4o with json_object mode wraps arrays in objects
    // Try different possible keys
    let problemsArray: any[] | null = null;

    if (Array.isArray(parsed)) {
      problemsArray = parsed;
    } else if (typeof parsed === 'object') {
      // Try common keys GPT might use
      const possibleKeys = ['problems', 'similar_problems', 'generated_problems', 'items', 'data'];
      for (const key of possibleKeys) {
        if (parsed[key] && Array.isArray(parsed[key])) {
          problemsArray = parsed[key];
          break;
        }
      }

      // If still not found, take the first array value
      if (!problemsArray) {
        const values = Object.values(parsed);
        const firstArray = values.find(v => Array.isArray(v));
        if (firstArray) {
          problemsArray = firstArray as any[];
        }
      }
    }

    if (!problemsArray || problemsArray.length === 0) {
      console.error('Unable to parse GPT response:', JSON.stringify(parsed, null, 2));
      throw new Error('Response does not contain an array of problems');
    }

    const problems = problemsArray as GeneratedProblem[];

    // Validate each problem
    for (const problem of problems) {
      if (!problem.text || !problem.expected_answer || !problem.explanation) {
        throw new Error('Invalid problem structure in response');
      }
    }

    return problems.slice(0, count); // Ensure we return exactly count problems

  } catch (error) {
    console.error('Error generating similar problems:', error);
    throw new Error(`Failed to generate similar problems: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate a generated problem by checking if it's solvable
 */
export async function validateGeneratedProblem(problem: GeneratedProblem): Promise<boolean> {
  const validationPrompt = `Is this math problem clearly stated and solvable?

"${problem.text}"

Claimed answer: ${problem.expected_answer}

Respond with ONLY "valid" or "invalid". A problem is valid if:
1. The question is clear
2. All necessary information is provided
3. The claimed answer is mathematically correct
4. An elementary student could understand it`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: 'You are a math problem validator.' },
        { role: 'user', content: validationPrompt }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const response = completion.choices[0].message.content?.toLowerCase() || '';
    return response.includes('valid') && !response.includes('invalid');

  } catch (error) {
    console.error('Error validating problem:', error);
    return false; // Assume invalid if validation fails
  }
}
