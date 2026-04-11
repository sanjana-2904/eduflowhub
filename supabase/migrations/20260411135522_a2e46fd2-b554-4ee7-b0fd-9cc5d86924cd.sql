
-- 1. Fix profiles: remove public SELECT, add restricted policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a public view for instructor display names (used on course cards)
CREATE OR REPLACE VIEW public.instructor_public AS
SELECT user_id, first_name, last_name
FROM public.profiles
WHERE role = 'instructor';

-- Grant access to the view
GRANT SELECT ON public.instructor_public TO anon, authenticated;

-- 2. Fix enrollments: remove direct student INSERT
DROP POLICY IF EXISTS "Students can enroll" ON public.enrollments;

-- Add unique constraint to prevent duplicate enrollments
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_course_unique UNIQUE (student_id, course_id);

-- 3. Fix results: remove direct student INSERT
DROP POLICY IF EXISTS "Students can submit results" ON public.results;

-- Add unique constraint to prevent duplicate quiz submissions
ALTER TABLE public.results ADD CONSTRAINT results_student_quiz_unique UNIQUE (student_id, quiz_id);

-- 4. Fix user_roles: explicit deny for non-admin INSERT
-- The ALL policy for admins already covers admin access. We need to ensure no other INSERT is possible.
-- RLS is already enabled and there's no INSERT policy for non-admins, but let's be explicit:
-- No action needed since RLS is enabled and only the admin ALL policy allows writes.
