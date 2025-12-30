/**
 * Data Migration Script: Load NCERT problems into Supabase
 *
 * This script reads all_problems.json and loads 1,772 problems into the database.
 * It includes complexity estimation based on problem characteristics.
 *
 * Usage: npx tsx scripts/migrate-problems.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Problem } from '../lib/types';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RawBook {
  book_id: string;
  class: number;
  title: string;
  chapters: Array<{
    chapter_number: number;
    chapter_name: string;
    problems: Array<{
      id: string;
      class: number;
      chapter: number;
      problem_number: string;
      problem_text: string;
      difficulty?: string;
    }>;
  }>;
}

/**
 * Estimate problem complexity based on text characteristics
 */
function estimateComplexity(text: string, answer: string): 'easy' | 'medium' | 'hard' {
  const length = text.length;
  const hasMultipleSteps = text.includes('then') || text.includes('and then') || text.includes('after that');
  const hasComplexWords = /division|multiplication|fraction|decimal|percentage/.test(text.toLowerCase());
  const answerIsComplex = answer.length > 10 || /[\/\\.]/.test(answer);

  if (length > 300 || (hasMultipleSteps && hasComplexWords)) {
    return 'hard';
  } else if (length > 150 || hasMultipleSteps || hasComplexWords || answerIsComplex) {
    return 'medium';
  }
  return 'easy';
}

/**
 * Detect if problem requires multiple steps
 */
function requiresMultiStep(text: string): boolean {
  const multiStepIndicators = [
    'then',
    'after that',
    'next',
    'and then',
    'in total',
    'altogether',
    'how many more',
    'how many less',
    'difference',
    'remaining'
  ];

  return multiStepIndicators.some(indicator =>
    text.toLowerCase().includes(indicator)
  );
}

/**
 * Main migration function
 */
async function migrateProblems() {
  console.log('🚀 Starting NCERT Problems Migration\n');

  // Read the JSON file
  const dataPath = path.join(process.cwd(), 'data/ncert/all_problems.json');
  console.log(`📂 Reading data from: ${dataPath}`);

  if (!fs.existsSync(dataPath)) {
    console.error('❌ File not found: data/ncert/all_problems.json');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as RawBook[];
  console.log(`✓ Loaded ${rawData.length} source books\n`);

  // Flatten all problems with metadata
  const allProblems: Problem[] = [];
  let counter = 1;

  for (const book of rawData) {
    for (const chapter of book.chapters) {
      for (const problem of chapter.problems) {
        // Generate truly unique ID using counter
        const uniqueId = `problem_${counter.toString().padStart(5, '0')}`;
        counter++;

        const enrichedProblem: Problem = {
          id: uniqueId,
          source_book: book.book_id,
          class: problem.class,
          chapter: problem.chapter,
          problem_number: parseInt(problem.problem_number) || 0,
          text: problem.problem_text,
          expected_answer: '', // Not available in this format
          complexity: (problem.difficulty as 'easy' | 'medium' | 'hard') || estimateComplexity(problem.problem_text, ''),
          requires_multi_step: requiresMultiStep(problem.problem_text)
        };

        allProblems.push(enrichedProblem);
      }
    }
  }

  console.log(`📊 Total problems to migrate: ${allProblems.length}`);
  console.log(`   - Class 5: ${allProblems.filter(p => p.class === 5).length}`);
  console.log(`   - Class 6: ${allProblems.filter(p => p.class === 6).length}`);
  console.log(`   - Easy: ${allProblems.filter(p => p.complexity === 'easy').length}`);
  console.log(`   - Medium: ${allProblems.filter(p => p.complexity === 'medium').length}`);
  console.log(`   - Hard: ${allProblems.filter(p => p.complexity === 'hard').length}`);
  console.log(`   - Multi-step: ${allProblems.filter(p => p.requires_multi_step).length}\n`);

  // Check if problems already exist
  console.log('🔍 Checking existing data...');
  const { count: existingCount } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true });

  if (existingCount && existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing problems in database`);
    console.log('This will delete existing data and reimport. Continue? (Ctrl+C to cancel)\n');

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Deleting existing problems...');
    const { error: deleteError } = await supabase
      .from('problems')
      .delete()
      .neq('id', ''); // Delete all

    if (deleteError) {
      console.error('❌ Error deleting existing problems:', deleteError);
      process.exit(1);
    }
    console.log('✓ Existing data cleared\n');
  }

  // Batch insert (Supabase has a limit, so we'll do 500 at a time)
  const batchSize = 500;
  let inserted = 0;
  let failed = 0;

  console.log(`📥 Inserting problems in batches of ${batchSize}...\n`);

  for (let i = 0; i < allProblems.length; i += batchSize) {
    const batch = allProblems.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allProblems.length / batchSize);

    process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${batch.length} problems)... `);

    const { data, error } = await supabase
      .from('problems')
      .insert(batch)
      .select();

    if (error) {
      console.log('❌ FAILED');
      console.error('   Error:', error.message);
      failed += batch.length;
    } else {
      console.log(`✓ Inserted ${data.length}`);
      inserted += data.length;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✓ Successfully inserted: ${inserted}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log('='.repeat(60));

  // Verify
  console.log('\n🔍 Verifying data...');
  const { count: finalCount } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true });

  console.log(`✓ Total problems in database: ${finalCount}`);

  if (finalCount === allProblems.length) {
    console.log('\n✅ Migration completed successfully!\n');
  } else {
    console.log(`\n⚠️  Warning: Expected ${allProblems.length} but found ${finalCount}\n`);
  }

  // Sample query
  console.log('📋 Sample problems:');
  const { data: samples } = await supabase
    .from('problems')
    .select('id, class, chapter, complexity, text')
    .limit(3);

  samples?.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.id} (Class ${p.class}, Ch ${p.chapter}, ${p.complexity})`);
    console.log(`   ${p.text.substring(0, 80)}...`);
  });

  console.log('\n✨ Done!\n');
}

// Run migration
migrateProblems().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
