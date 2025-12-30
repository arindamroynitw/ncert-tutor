/**
 * Test script for the diagnostic/misconception analysis API
 * Tests GPT-4o's ability to identify student misconceptions
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = 'http://localhost:3000/api/diagnose';

interface TestScenario {
  name: string;
  description: string;
  student_answers: string[];
  conversation_history: Array<{ role: 'student' | 'tutor'; text: string }>;
  hints_given: number;
  expected_misconception?: string;
}

async function testDiagnoseAPI() {
  console.log('🧪 Testing Diagnostic/Misconception Analysis API\n');

  const problemId = 'problem_00001'; // Pattern problem: 456, 567, 678, ___

  const testScenarios: TestScenario[] = [
    {
      name: 'Conceptual Error - Pattern Misunderstanding',
      description: 'Student doesn\'t understand the pattern increment',
      student_answers: ['680', '681', '700'],
      conversation_history: [
        { role: 'student', text: '680' },
        { role: 'tutor', text: 'Look at how much each number increases. What do you notice?' },
        { role: 'student', text: 'They go up by... 2?' },
        { role: 'tutor', text: 'Let\'s check: 567 - 456 = ?' },
        { role: 'student', text: '681' }
      ],
      hints_given: 2,
      expected_misconception: 'conceptual'
    },
    {
      name: 'Arithmetic Error Only',
      description: 'Student understands pattern but makes calculation mistake',
      student_answers: ['788', '790'],
      conversation_history: [
        { role: 'student', text: '788' },
        { role: 'tutor', text: 'You\'re on the right track! Double-check your addition.' },
        { role: 'student', text: '790' }
      ],
      hints_given: 1,
      expected_misconception: 'arithmetic'
    },
    {
      name: 'Careless Error - Single Attempt',
      description: 'Student makes one small mistake on first try',
      student_answers: ['780'],
      conversation_history: [],
      hints_given: 0,
      expected_misconception: 'careless_error'
    },
    {
      name: 'Reading Comprehension Issue',
      description: 'Student doesn\'t understand what is being asked',
      student_answers: ['123', 'abc', 'I don\'t get it'],
      conversation_history: [
        { role: 'student', text: '123' },
        { role: 'tutor', text: 'What pattern do you see in the numbers?' },
        { role: 'student', text: 'I don\'t know, maybe abc?' }
      ],
      hints_given: 1,
      expected_misconception: 'reading_comprehension'
    }
  ];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Test ${i + 1}: ${scenario.name}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Student answers: ${scenario.student_answers.join(', ')}`);
    console.log(`Conversation exchanges: ${scenario.conversation_history.length}`);

    try {
      const startTime = Date.now();

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem_id: problemId,
          student_answers: scenario.student_answers,
          conversation_history: scenario.conversation_history,
          hints_given: scenario.hints_given,
          get_practice_recommendations: true
        })
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.json();
        console.log(`❌ API Error: ${error.error || response.statusText}`);
        continue;
      }

      const result = await response.json();

      console.log(`\n✓ Analysis completed in ${elapsed}ms`);
      console.log(`✓ Attempts analyzed: ${result.attempts_analyzed}\n`);

      // Display diagnostic results
      console.log(`${'─'.repeat(70)}`);
      console.log(`DIAGNOSTIC RESULTS:`);
      console.log(`${'─'.repeat(70)}`);
      console.log(`Misconception Type: ${result.diagnostic.misconception_type}`);
      console.log(`Confidence: ${result.diagnostic.confidence}`);
      console.log(`\nDescription:\n  "${result.diagnostic.description}"`);

      console.log(`\nEvidence:`);
      result.diagnostic.evidence.forEach((evidence: string, idx: number) => {
        console.log(`  ${idx + 1}. ${evidence}`);
      });

      console.log(`\nRecommendations:`);
      result.diagnostic.recommendations.forEach((rec: string, idx: number) => {
        console.log(`  ${idx + 1}. ${rec}`);
      });

      if (result.diagnostic.prerequisite_concepts && result.diagnostic.prerequisite_concepts.length > 0) {
        console.log(`\nPrerequisite Concepts Needed:`);
        result.diagnostic.prerequisite_concepts.forEach((concept: string) => {
          console.log(`  - ${concept}`);
        });
      }

      if (result.practice_recommendations) {
        console.log(`\nPractice Recommendations:`);
        result.practice_recommendations.forEach((rec: string, idx: number) => {
          console.log(`  ${idx + 1}. ${rec}`);
        });
      }

      // Validate expected misconception type
      if (scenario.expected_misconception) {
        if (result.diagnostic.misconception_type === scenario.expected_misconception) {
          console.log(`\n✅ Correctly identified as "${scenario.expected_misconception}"`);
        } else {
          console.log(`\n⚠️  Expected "${scenario.expected_misconception}", got "${result.diagnostic.misconception_type}"`);
        }
      }

    } catch (error: any) {
      console.log(`❌ Request failed: ${error.message}`);
    }

    // Delay between tests
    if (i < testScenarios.length - 1) {
      console.log(`\n⏳ Waiting 2 seconds before next test...\n`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✨ Testing complete!`);
  console.log(`${'='.repeat(70)}\n`);
}

// Run tests
testDiagnoseAPI().catch(console.error);
