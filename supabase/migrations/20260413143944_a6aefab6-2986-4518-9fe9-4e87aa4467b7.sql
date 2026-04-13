CREATE POLICY "Instructors can view payments for their courses"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = payments.course_id
      AND c.instructor_id = auth.uid()
  )
);