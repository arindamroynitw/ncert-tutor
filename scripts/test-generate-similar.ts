/**
 * Test script for the similar problem generation API
 * Tests GPT-4o's ability to create similar practice problems
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = 'http://localhost:3000/api/generate-similar';

async function testGenerateSimilarAPI() {
  console.log('🧪 Testing Similar Problem Generation API\n');

  const problemId = 'problem_00001'; // First problem in database

  const testCases = [
    {
      name: 'Generate 3 similar problems (same difficulty)',
      body: {
        problem_id: problemId,
        count: 3,
        difficulty_adjustment: 'same' as const
      }
    },
    {
      name: 'Generate 2 easier problems',
      body: {
        problem_id: problemId,
        count: 2,
        difficulty_adjustment: 'easier' as const
      }
    },
    {
      name: 'Generate 2 harder problems',
      body: {
        problem_id: problemId,
        count: 2,
        difficulty_adjustment: 'harder' as const
      }
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const startTime = Date.now();

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.body)
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.json();
        console.log(`❌ API Error: ${error.error || response.statusText}`);
        continue;
      }

      const result = await response.json();

      console.log(`\n✓ Generated ${result.count} problems in ${elapsed}ms`);
      console.log(`✓ Difficulty adjustment: ${result.difficulty_adjustment}`);
      console.log(`✓ Original problem: ${result.original_problem_id}\n`);

      // Display each generated problem
      result.problems.forEach((problem: any, idx: number) => {
        console.log(`${'-'.repeat(60)}`);
        console.log(`Problem ${idx + 1}:`);
        console.log(`Complexity: ${problem.complexity}`);
        console.log(`\nText: "${problem.text}"`);
        console.log(`\nExpected Answer: ${problem.expected_answer}`);
        console.log(`\nExplanation: ${problem.explanation}`);
        console.log();
      });

      // Validate structure
      const allValid = result.problems.every((p: any) =>
        p.text &&
        p.expected_answer &&
        p.explanation &&
        p.complexity &&
        ['easy', 'medium', 'hard'].includes(p.complexity)
      );

      if (allValid) {
        console.log('✅ All problems have valid structure!');
      } else {
        console.log('⚠️  Warning: Some problems have invalid structure');
      }

    } catch (error: any) {
      console.log(`❌ Request failed: ${error.message}`);
    }

    // Small delay between requests
    if (i < testCases.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ Testing complete!`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
testGenerateSimilarAPI().catch(console.error);
