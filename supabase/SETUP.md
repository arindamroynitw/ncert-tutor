# Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: `ncert-math-tutor` (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is fine for development
5. Click "Create new project"
6. Wait ~2 minutes for project to initialize

## Step 2: Get API Credentials

Once your project is ready:

1. Go to **Settings** (gear icon in left sidebar)
2. Navigate to **API** section
3. Copy the following values:

   ```
   Project URL: https://[your-project-ref].supabase.co
   anon public key: eyJhbG... (long string)
   service_role key: eyJhbG... (long string - keep this secret!)
   ```

## Step 3: Update Local Environment

1. In the project root, create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   OPENAI_API_KEY=your_openai_key_here
   ```

## Step 4: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor** (in left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see: "Success. No rows returned"

## Step 5: Verify Schema

1. Go to **Table Editor** (in left sidebar)
2. You should see 4 tables:
   - `problems`
   - `sessions`
   - `problem_attempts`
   - `messages`

3. Click on each table to verify columns are created

## Step 6: Check Views and Functions

1. In SQL Editor, run:
   ```sql
   SELECT * FROM session_summaries LIMIT 1;
   SELECT * FROM problem_stats LIMIT 1;
   ```
   Should return empty results (no errors)

2. Test the functions:
   ```sql
   SELECT * FROM get_similar_problems(5, 1, 'test', 5);
   ```
   Should return empty results (no problems loaded yet)

## Step 7: Test Connection from App

1. In your project terminal, run:
   ```bash
   npm run dev
   ```

2. The app should start without Supabase connection errors

## Troubleshooting

### Error: "Failed to create extension uuid-ossp"
- This is usually auto-enabled. If you see this, go to **Database** > **Extensions** and enable `uuid-ossp`

### Error: "relation already exists"
- You've run the schema before. Either:
  - Drop tables manually in Table Editor
  - Create a new Supabase project
  - Or modify schema.sql to use `CREATE TABLE IF NOT EXISTS`

### Connection Errors
- Verify `.env.local` has correct credentials
- Ensure you're using `NEXT_PUBLIC_` prefix for client-side vars
- Restart dev server after changing `.env.local`

## Next Steps

After setup is complete:
- Week 1 Day 5-7: Data migration (load 1,772 problems into database)
- Create helper functions in `lib/db/` for CRUD operations
- Build API endpoints for evaluation and problem generation

## Database Schema Overview

**Tables:**
- `problems`: 1,772 NCERT math problems (to be loaded)
- `sessions`: Student tutoring sessions
- `problem_attempts`: Each problem attempt within a session
- `messages`: Full conversation history

**Views:**
- `session_summaries`: Aggregated session data for parent summaries
- `problem_stats`: Problem difficulty analytics

**Functions:**
- `complete_session()`: Mark session as complete and update metrics
- `get_similar_problems()`: Find similar problems for mastery checks
