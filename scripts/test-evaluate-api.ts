/**
 * Test script for the evaluation API
 * Tests the core tutoring logic with various student answers
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = 'http://localhost:3000/api/evaluate';

interface TestCase {
  name: string;
  student_answer: string;
  expectedType?: string;
}

async function testEvaluationAPI() {
  console.log('🧪 Testing Evaluation API\n');

  // Get a sample problem from the database
  const problemId = 'problem_00001'; // First problem in our database

  const testCases: TestCase[] = [
    {
      name: 'Correct answer',
      student_answer: '789',
      expectedType: 'correct_final'
    },
    {
      name: 'Wrong answer (needs guidance)',
      student_answer: '500',
      expectedType: 'needs_hint'
    },
    {
      name: 'Partial answer (on right track)',
      student_answer: 'I think we need to add 111',
      expectedType: 'partial_progress'
    },
    {
      name: 'Random gibberish',
      student_answer: 'banana',
      expectedType: 'conceptual_error'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Student answer: "${testCase.student_answer}"`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem_id: problemId,
          student_answer: testCase.student_answer,
          conversation_history: [],
          hints_used: 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(`❌ API Error: ${error.error || response.statusText}`);
        continue;
      }

      const result = await response.json();

      console.log(`\n✓ Response type: ${result.response_type}`);
      console.log(`✓ Badge type: ${result.badge_type}`);
      console.log(`✓ Tutor message: "${result.tutor_message}"`);
      console.log(`✓ Show solution button: ${result.show_solution_button}`);

      if (testCase.expectedType && result.response_type !== testCase.expectedType) {
        console.log(`⚠️  Warning: Expected "${testCase.expectedType}", got "${result.response_type}"`);
      } else if (testCase.expectedType) {
        console.log(`✅ Response type matches expectation!`);
      }

    } catch (error: any) {
      console.log(`❌ Request failed: ${error.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test solution request
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: Request Solution`);
  console.log(`${'='.repeat(60)}`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problem_id: problemId,
        student_answer: 'show me',
        conversation_history: [],
        hints_used: 3,
        request_solution: true
      })
    });

    const result = await response.json();
    console.log(`\n✓ Solution explanation received:`);
    console.log(result.explanation?.substring(0, 200) + '...');

  } catch (error: any) {
    console.log(`❌ Request failed: ${error.message}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ Testing complete!`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
testEvaluationAPI().catch(console.error);
