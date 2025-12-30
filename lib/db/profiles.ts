import { createClient } from '@supabase/supabase-js';
import { Profile } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CreateProfileData {
  child_name: string;
  parent_name?: string;
  birthdate: string; // ISO date string (YYYY-MM-DD)
}

export interface UpdateProfileData {
  child_name?: string;
  parent_name?: string;
  birthdate?: string;
}

/**
 * Create a new profile for a user
 */
export async function createProfile(
  userId: string,
  data: CreateProfileData
): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      child_name: data.child_name,
      parent_name: data.parent_name || null,
      birthdate: data.birthdate
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return profile as Profile;
}

/**
 * Get profile by user ID
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null;
    }
    console.error('Error fetching profile:', error);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return profile as Profile;
}

/**
 * Update an existing profile
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<Profile> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (data.child_name !== undefined) updateData.child_name = data.child_name;
  if (data.parent_name !== undefined) updateData.parent_name = data.parent_name;
  if (data.birthdate !== undefined) updateData.birthdate = data.birthdate;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return profile as Profile;
}

/**
 * Delete a profile (used when user account is deleted)
 */
export async function deleteProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting profile:', error);
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
}
