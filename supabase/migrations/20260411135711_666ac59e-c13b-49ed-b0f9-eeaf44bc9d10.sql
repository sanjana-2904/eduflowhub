
-- Allow public viewing of instructor profiles (they are public-facing)
CREATE POLICY "Anyone can view instructor profiles"
ON public.profiles FOR SELECT
USING (role = 'instructor');
