import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createProfile } from '@/lib/db/profiles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SignupRequest {
  email: string;
  password: string;
  child_name: string;
  parent_name?: string;
  birthdate: string; // YYYY-MM-DD format
}

/**
 * Validates name fields (child_name and parent_name)
 * Only allows letters, spaces, hyphens, and apostrophes
 */
function validateName(name: string): boolean {
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name) && name.trim().length > 0;
}

/**
 * Validates birthdate is in YYYY-MM-DD format and is a valid date
 */
function validateBirthdate(birthdate: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(birthdate)) return false;

  const date = new Date(birthdate);
  return date instanceof Date && !isNaN(date.getTime());
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json();
    const { email, password, child_name, parent_name, birthdate } = body;

    // Validation
    if (!email || !password || !child_name || !birthdate) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, child_name, and birthdate are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate child_name
    if (!validateName(child_name)) {
      return NextResponse.json(
        { error: 'Child name can only contain letters, spaces, hyphens, and apostrophes' },
        { status: 400 }
      );
    }

    // Validate parent_name if provided
    if (parent_name && !validateName(parent_name)) {
      return NextResponse.json(
        { error: 'Parent name can only contain letters, spaces, hyphens, and apostrophes' },
        { status: 400 }
      );
    }

    // Validate birthdate
    if (!validateBirthdate(birthdate)) {
      return NextResponse.json(
        { error: 'Invalid birthdate. Must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Check if birthdate is not in the future
    const birthdateObj = new Date(birthdate);
    const today = new Date();
    if (birthdateObj > today) {
      return NextResponse.json(
        { error: 'Birthdate cannot be in the future' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Skip email verification for MVP
    });

    if (authError) {
      // Handle duplicate email error
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Step 2: Create profile in profiles table
    try {
      const profile = await createProfile(authData.user.id, {
        child_name: child_name.trim(),
        parent_name: parent_name?.trim(),
        birthdate
      });

      return NextResponse.json(
        {
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email,
            profile
          }
        },
        { status: 201 }
      );

    } catch (profileError: any) {
      // If profile creation fails, we should delete the auth user to maintain consistency
      console.error('Error creating profile:', profileError);

      // Attempt to clean up the auth user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user after profile creation failure:', cleanupError);
      }

      return NextResponse.json(
        { error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
