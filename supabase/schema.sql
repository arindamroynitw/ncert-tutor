-- NCERT Math Tutor Database Schema
-- This schema supports the conversational tutoring system with sessions, problems, and messages

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Problems table: Stores all NCERT math problems
CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  source_book TEXT NOT NULL,
  class INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  problem_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  requires_multi_step BOOLEAN DEFAULT false,
  complexity TEXT CHECK (complexity IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_problems_class ON problems(class);
CREATE INDEX idx_problems_chapter ON problems(class, chapter);
CREATE INDEX idx_problems_complexity ON problems(complexity);
CREATE INDEX idx_problems_source_book ON problems(source_book);

-- Sessions table: Tracks student tutoring sessions
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Session metadata
  total_problems INTEGER DEFAULT 0,
  total_hints_used INTEGER DEFAULT 0
);

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_student_name ON sessions(student_name);

-- Problem attempts table: Tracks each problem attempt within a session
CREATE TABLE problem_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Metrics
  hints_used INTEGER DEFAULT 0,
  final_status TEXT CHECK (final_status IN ('mastered', 'incomplete', 'struggling')),
  mastery_check_passed BOOLEAN,

  -- Original or mastery check
  is_mastery_check BOOLEAN DEFAULT false,
  original_problem_id TEXT REFERENCES problems(id) ON DELETE SET NULL,

  CONSTRAINT unique_attempt UNIQUE (session_id, problem_id, started_at)
);

CREATE INDEX idx_attempts_session ON problem_attempts(session_id);
CREATE INDEX idx_attempts_problem ON problem_attempts(problem_id);
CREATE INDEX idx_attempts_started_at ON problem_attempts(started_at DESC);

-- Messages table: Stores all conversation messages
CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES problem_attempts(attempt_id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Tutor message metadata
  badge_type TEXT CHECK (badge_type IN ('partial_progress', 'hint_given', 'corrective_feedback')),
  response_type TEXT CHECK (response_type IN ('correct_final', 'partial_progress', 'arithmetic_error', 'conceptual_error', 'needs_hint'))
);

CREATE INDEX idx_messages_attempt ON messages(attempt_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Row Level Security (RLS) Policies
-- For now, we'll keep it simple and allow all operations
-- In production, you'd want to add authentication and proper policies

ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
-- TODO: Replace with proper auth policies in production
CREATE POLICY "Enable all operations for problems" ON problems FOR ALL USING (true);
CREATE POLICY "Enable all operations for sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Enable all operations for problem_attempts" ON problem_attempts FOR ALL USING (true);
CREATE POLICY "Enable all operations for messages" ON messages FOR ALL USING (true);

-- Useful views for analytics and summaries

-- Session summary view
CREATE VIEW session_summaries AS
SELECT
  s.session_id,
  s.student_name,
  s.created_at,
  s.completed_at,
  COUNT(DISTINCT pa.attempt_id) as total_attempts,
  COUNT(DISTINCT CASE WHEN pa.final_status = 'mastered' THEN pa.attempt_id END) as problems_mastered,
  COALESCE(SUM(pa.hints_used), 0) as total_hints,
  COALESCE(AVG(pa.hints_used), 0) as avg_hints_per_problem,
  EXTRACT(EPOCH FROM (s.completed_at - s.created_at)) / 60 as duration_minutes
FROM sessions s
LEFT JOIN problem_attempts pa ON s.session_id = pa.session_id
GROUP BY s.session_id;

-- Problem difficulty analysis view
CREATE VIEW problem_stats AS
SELECT
  p.id,
  p.text,
  p.class,
  p.chapter,
  p.complexity,
  COUNT(pa.attempt_id) as times_attempted,
  AVG(pa.hints_used) as avg_hints_needed,
  COUNT(CASE WHEN pa.final_status = 'mastered' THEN 1 END)::FLOAT / NULLIF(COUNT(pa.attempt_id), 0) as mastery_rate
FROM problems p
LEFT JOIN problem_attempts pa ON p.id = pa.problem_id
WHERE pa.is_mastery_check = false OR pa.is_mastery_check IS NULL
GROUP BY p.id;

-- Functions for common operations

-- Function to complete a session
CREATE OR REPLACE FUNCTION complete_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET
    completed_at = NOW(),
    total_problems = (
      SELECT COUNT(DISTINCT problem_id)
      FROM problem_attempts
      WHERE session_id = p_session_id
    ),
    total_hints_used = (
      SELECT COALESCE(SUM(hints_used), 0)
      FROM problem_attempts
      WHERE session_id = p_session_id
    )
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get similar problems for mastery check
CREATE OR REPLACE FUNCTION get_similar_problems(
  p_class INTEGER,
  p_chapter INTEGER,
  p_exclude_id TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  text TEXT,
  expected_answer TEXT,
  complexity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.text, p.expected_answer, p.complexity
  FROM problems p
  WHERE p.class = p_class
    AND p.chapter = p_chapter
    AND p.id != p_exclude_id
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE problems IS 'Stores all NCERT math problems extracted from PDFs';
COMMENT ON TABLE sessions IS 'Tracks student tutoring sessions from start to completion';
COMMENT ON TABLE problem_attempts IS 'Records each attempt at solving a problem, including hints used';
COMMENT ON TABLE messages IS 'Stores the full conversation history between student and tutor';
COMMENT ON VIEW session_summaries IS 'Aggregated session data for parent summaries';
COMMENT ON VIEW problem_stats IS 'Analytics on problem difficulty and success rates';
