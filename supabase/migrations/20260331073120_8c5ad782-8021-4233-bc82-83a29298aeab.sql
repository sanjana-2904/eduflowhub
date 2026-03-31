
-- Create lesson_progress table for tracking student completion
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view progress for their courses" ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id
      WHERE l.id = lesson_progress.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all progress" ON public.lesson_progress
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Update handle_new_user to also save phone, middle_name, qualification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, middle_name, phone, qualification, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'middle_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'qualification', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  RETURN NEW;
END;
$$;
