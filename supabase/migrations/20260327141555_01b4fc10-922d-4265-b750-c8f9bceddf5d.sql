
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  middle_name TEXT DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  qualification TEXT DEFAULT '',
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'text')),
  content_url TEXT DEFAULT '',
  content_text TEXT DEFAULT '',
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  UNIQUE (student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'created' CHECK (payment_status IN ('created', 'paid', 'failed')),
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Results table
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, student_id)
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- courses
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Instructors can create courses" ON public.courses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'instructor') AND auth.uid() = instructor_id);
CREATE POLICY "Instructors can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = instructor_id);
CREATE POLICY "Instructors can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = instructor_id);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- lessons
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Instructors can manage lessons" ON public.lessons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Instructors can update lessons" ON public.lessons FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Instructors can delete lessons" ON public.lessons FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- enrollments
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Instructors can view enrollments for their courses" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Students can enroll" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- payments
CREATE POLICY "Students can view own payments" ON public.payments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- quizzes
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Instructors can manage quizzes" ON public.quizzes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id = l.course_id WHERE l.id = lesson_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Instructors can update quizzes" ON public.quizzes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id = l.course_id WHERE l.id = lesson_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Instructors can delete quizzes" ON public.quizzes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id = l.course_id WHERE l.id = lesson_id AND c.instructor_id = auth.uid())
);

-- quiz_questions
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Instructors can manage quiz questions" ON public.quiz_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id = q.lesson_id JOIN public.courses c ON c.id = l.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Instructors can update quiz questions" ON public.quiz_questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id = q.lesson_id JOIN public.courses c ON c.id = l.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Instructors can delete quiz questions" ON public.quiz_questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id = q.lesson_id JOIN public.courses c ON c.id = l.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- results
CREATE POLICY "Students can view own results" ON public.results FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can submit results" ON public.results FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Instructors can view results for their quizzes" ON public.results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON l.id = q.lesson_id JOIN public.courses c ON c.id = l.course_id WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Admins can view all results" ON public.results FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
