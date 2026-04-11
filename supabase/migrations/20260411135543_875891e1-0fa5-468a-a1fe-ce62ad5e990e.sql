
-- Recreate view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.instructor_public
WITH (security_invoker = true) AS
SELECT user_id, first_name, last_name
FROM public.profiles
WHERE role = 'instructor';
