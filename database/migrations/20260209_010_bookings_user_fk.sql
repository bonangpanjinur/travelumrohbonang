-- Add foreign key from bookings.user_id to profiles.id
-- This allows joining bookings with profiles data
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;