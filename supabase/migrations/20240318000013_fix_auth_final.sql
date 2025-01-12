-- Drop existing policies
DROP POLICY IF EXISTS "Admins and club admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins and club admins can manage events" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;

-- Update profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update existing admin users
UPDATE profiles 
SET 
  is_admin = true,
  role = 'admin'
WHERE email = 'hsharif701@gmail.com';

UPDATE profiles 
SET 
  role = 'club_admin',
  is_admin = false
WHERE email = 'ttnt745@gmail.com';

-- Create proper RLS policies
CREATE POLICY "Anyone can view announcements" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "Admins and club admins can manage announcements" ON announcements
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE is_admin = true 
      OR (role = 'club_admin' AND club_id = announcements.club_id)
    )
  );

CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Admins and club admins can manage events" ON events
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE is_admin = true 
      OR (role = 'club_admin' AND club_id = events.club_id)
    )
  );

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  matching_club clubs%ROWTYPE;
BEGIN
  -- Set email from auth.users
  NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  
  -- Check if user should be main admin
  IF NEW.email = 'hsharif701@gmail.com' THEN
    NEW.role := 'admin';
    NEW.is_admin := true;
    RETURN NEW;
  END IF;
  
  -- Check if user should be club admin
  SELECT * INTO matching_club FROM clubs 
  WHERE admin_email = NEW.email;
  
  IF matching_club.id IS NOT NULL THEN
    NEW.role := 'club_admin';
    NEW.club_id := matching_club.id;
    NEW.username := matching_club.name;
    NEW.is_admin := false;
    RETURN NEW;
  END IF;
  
  -- Default to regular user
  NEW.role := 'user';
  NEW.is_admin := false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON profiles;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update storage policies
CREATE POLICY "Anyone can view uploaded files"
ON storage.objects FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IN (
    SELECT id FROM profiles 
    WHERE is_admin = true 
    OR role = 'club_admin'
  )
);

CREATE POLICY "Users can manage their own files"
ON storage.objects FOR UPDATE OR DELETE
USING (
  auth.uid() = owner
  AND auth.uid() IN (
    SELECT id FROM profiles 
    WHERE is_admin = true 
    OR role = 'club_admin'
  )
);