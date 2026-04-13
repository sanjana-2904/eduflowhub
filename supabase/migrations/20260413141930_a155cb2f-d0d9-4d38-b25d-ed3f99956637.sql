-- Allow instructors to view profiles of students enrolled in their courses
CREATE POLICY "Instructors can view enrolled student profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = profiles.user_id
      AND c.instructor_id = auth.uid()
  )
);