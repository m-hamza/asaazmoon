-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing permissive RLS policies and create secure ones

-- Students table
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.students;

CREATE POLICY "Authenticated staff can view students"
ON public.students FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  )
);

CREATE POLICY "Admins can manage students"
ON public.students FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Answer keys table - CRITICAL: Only teachers and admins, NEVER students
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.answer_keys;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.answer_keys;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.answer_keys;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.answer_keys;

CREATE POLICY "Teachers and admins can view answer keys"
ON public.answer_keys FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Admins can manage answer keys"
ON public.answer_keys FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Exam results table
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.exam_results;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.exam_results;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.exam_results;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.exam_results;

CREATE POLICY "Users can view relevant exam results"
ON public.exam_results FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'teacher') OR
  (public.has_role(auth.uid(), 'student') AND 
   EXISTS (SELECT 1 FROM students WHERE id = exam_results.student_id AND student_id = auth.uid()::text))
);

CREATE POLICY "Authenticated users can create exam results"
ON public.exam_results FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete exam results"
ON public.exam_results FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Schools table
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.schools;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.schools;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schools;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.schools;

CREATE POLICY "Authenticated users can view schools"
ON public.schools FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage schools"
ON public.schools FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Classes table
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.classes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.classes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.classes;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.classes;

CREATE POLICY "Authenticated users can view classes"
ON public.classes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage classes"
ON public.classes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));