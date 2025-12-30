import { supabase } from './supabase';
import { Problem, PickerFilters } from '../types';

/**
 * Get a problem by ID
 */
export async function getProblemById(id: string): Promise<Problem | null> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching problem:', error);
    return null;
  }

  return data as Problem;
}

/**
 * Get problems with filters (for problem picker)
 */
export async function getProblems(filters: PickerFilters): Promise<Problem[]> {
  let query = supabase
    .from('problems')
    .select('*')
    .eq('class', filters.class);

  if (filters.chapter) {
    query = query.eq('chapter', filters.chapter);
  }

  if (filters.complexity) {
    query = query.eq('complexity', filters.complexity);
  }

  if (filters.source_book) {
    query = query.eq('source_book', filters.source_book);
  }

  const { data, error } = await query.order('chapter', { ascending: true });

  if (error) {
    console.error('Error fetching problems:', error);
    return [];
  }

  return data as Problem[];
}

/**
 * Get a random problem matching filters
 */
export async function getRandomProblem(filters: PickerFilters): Promise<Problem | null> {
  const problems = await getProblems(filters);

  if (problems.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * problems.length);
  return problems[randomIndex];
}

/**
 * Get similar problems for mastery check
 * Uses the database function for efficiency
 */
export async function getSimilarProblems(
  originalProblem: Problem,
  count: number = 5
): Promise<Problem[]> {
  const { data, error } = await supabase.rpc('get_similar_problems', {
    p_class: originalProblem.class,
    p_chapter: originalProblem.chapter,
    p_exclude_id: originalProblem.id,
    p_limit: count
  });

  if (error) {
    console.error('Error fetching similar problems:', error);
    return [];
  }

  return data as Problem[];
}

/**
 * Insert a new problem (used during data migration)
 */
export async function insertProblem(problem: Problem): Promise<boolean> {
  const { error } = await supabase
    .from('problems')
    .insert(problem);

  if (error) {
    console.error('Error inserting problem:', error);
    return false;
  }

  return true;
}

/**
 * Bulk insert problems (used during data migration)
 */
export async function insertProblems(problems: Problem[]): Promise<number> {
  const { data, error } = await supabase
    .from('problems')
    .insert(problems)
    .select();

  if (error) {
    console.error('Error bulk inserting problems:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get all unique chapters for a class
 */
export async function getChaptersByClass(classNum: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('chapter')
    .eq('class', classNum)
    .order('chapter', { ascending: true });

  if (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }

  // Get unique chapters
  const chapters = [...new Set(data.map(d => d.chapter))];
  return chapters;
}
