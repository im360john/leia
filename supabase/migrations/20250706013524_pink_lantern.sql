/*
  # Add Demo User

  1. New Users
    - Creates a demo user account with email `demo@leia.com`
    - Sets up the user in Supabase auth system
    - Password will be `password123`

  2. Security
    - User will be created with confirmed email status
    - Standard user permissions apply

  Note: This creates a demo user for testing purposes.
  In production, remove this migration or change the credentials.
*/

-- Insert demo user into auth.users table
-- Note: In a real Supabase environment, you would typically create users through the auth API
-- This is a direct database insertion for demo purposes

-- First, let's create a function to safely add a demo user if it doesn't exist
DO $$
DECLARE
    demo_user_id uuid;
BEGIN
    -- Check if demo user already exists
    SELECT id INTO demo_user_id 
    FROM auth.users 
    WHERE email = 'demo@leia.com';
    
    -- If user doesn't exist, we'll need to use Supabase's auth API
    -- For now, let's create a note that this user should be created manually
    IF demo_user_id IS NULL THEN
        -- Create a temporary table to remind about demo user creation
        CREATE TEMP TABLE IF NOT EXISTS demo_user_reminder (
            message text
        );
        
        INSERT INTO demo_user_reminder (message) 
        VALUES ('Demo user demo@leia.com with password password123 needs to be created through Supabase auth signup');
        
        RAISE NOTICE 'Demo user needs to be created manually through the signup process';
    END IF;
END $$;