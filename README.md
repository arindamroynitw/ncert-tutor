# NCERT Math Tutor - Production Application

AI-powered conversational math tutor for NCERT Class 5 & 6 students using GPT-4o.

## Project Status

**Week 1 Day 1-2: Foundation Setup** ✅ COMPLETED

- Next.js 14 project initialized with TypeScript, Tailwind CSS, App Router
- Dependencies installed: @supabase/supabase-js, openai, zod, date-fns
- Project structure created
- TypeScript types defined (lib/types/index.ts)
- Environment configuration ready
- NCERT problem data copied (1,772 problems)

**Week 1 Day 3-4: Database Setup** ✅ READY (awaiting your Supabase setup)

- Database schema created (supabase/schema.sql)
- CRUD helper functions implemented (lib/db/)
- Migration script ready (scripts/migrate-problems.ts)
- Setup instructions documented (supabase/SETUP.md)

**Week 1 Day 5-7: Data Migration** ⏳ PENDING (will run after Supabase setup)

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Supabase account (for Week 1 Day 3-4)

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env.local
```

2. Fill in your credentials in `.env.local`:
- `OPENAI_API_KEY`: Your OpenAI API key
- Supabase credentials (to be added in Week 1 Day 3-4)

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
/app
  /api
    /evaluate         # POST: Evaluate student answer
    /generate-similar # POST: Generate mastery check problem
    /diagnostic       # POST: Analyze misconceptions
  /tutor/[problemId]  # Main tutoring interface
  /summary/[sessionId] # Session summary for parents
  /picker             # Problem picker interface
/components
  /chat               # Chat UI components
  /summary            # Summary display components
  /picker             # Problem picker components
/lib
  /db                 # Supabase client (supabase.ts)
  /llm                # OpenAI wrapper (openai-client.ts)
  /types              # TypeScript interfaces (index.ts)
/data
  /ncert              # all_problems.json (1,772 problems)
```

## Development Plan

Following the 8-week plan in `/Users/arindamroy/coding/ai-math-helper/DEVELOPMENT_PLAN.md`

**Next Steps (Week 1 Day 3-4):**
- Create Supabase project
- Design and deploy database schema
- Set up CRUD helper functions

## Data

- **Total Problems**: 1,772
- **Classes**: 5 & 6
- **Source**: NCERT PDFs extracted using GPT-4o Vision API
- **Location**: `data/ncert/all_problems.json`

## Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **LLM**: GPT-4o via OpenAI API
- **Validation**: Zod

## Design Principles (from Prototype)

1. **Full Conversational LLM**: Send entire chat history to GPT-4o for contextual responses
2. **Client-side Hint Counting**: Track hints on frontend to prevent LLM inconsistency
3. **Never Give Solutions**: Strict prompting to prevent answer leakage
4. **5 Response Types**: correct_final, partial_progress, arithmetic_error, conceptual_error, needs_hint
5. **Visual Feedback**: 3 badge types (partial/green, hint/yellow, feedback/blue)
6. **Mastery Check**: Generate similar problem after correct answer
7. **Parent Summary**: Show conversation, hints used, problems mastered

## Documentation

- **Final Spec**: `/Users/arindamroy/coding/ai-math-helper/final_spec.md`
- **Development Plan**: `/Users/arindamroy/coding/ai-math-helper/DEVELOPMENT_PLAN.md`
- **Prototype**: `/Users/arindamroy/coding/ai-math-helper/prototype.html`
