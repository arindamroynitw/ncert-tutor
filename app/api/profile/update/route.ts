import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateProfile } from '@/lib/db/profiles';

interface UpdateProfileRequest {
  child_name?: string;
  parent_name?: string;
  birthdate?: string;
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

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body: UpdateProfileRequest = await request.json();
    const { child_name, parent_name, birthdate } = body;

    // Validate child_name if provided
    if (child_name !== undefined && !validateName(child_name)) {
      return NextResponse.json(
        { error: 'Child name can only contain letters, spaces, hyphens, and apostrophes' },
        { status: 400 }
      );
    }

    // Validate parent_name if provided and not empty
    if (parent_name !== undefined && parent_name.trim() !== '' && !validateName(parent_name)) {
      return NextResponse.json(
        { error: 'Parent name can only contain letters, spaces, hyphens, and apostrophes' },
        { status: 400 }
      );
    }

    // Validate birthdate if provided
    if (birthdate !== undefined) {
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
    }

    // Update profile
    const updateData: UpdateProfileRequest = {};
    if (child_name !== undefined) updateData.child_name = child_name.trim();
    if (parent_name !== undefined) updateData.parent_name = parent_name.trim() || undefined;
    if (birthdate !== undefined) updateData.birthdate = birthdate;

    const updatedProfile = await updateProfile(session.user.id, updateData);

    return NextResponse.json(
      {
        success: true,
        profile: updatedProfile
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Profile update error:', error);

    // Check if it's a database error
    if (error.message?.includes('Failed to update profile')) {
      return NextResponse.json(
        { error: 'Failed to update profile. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
