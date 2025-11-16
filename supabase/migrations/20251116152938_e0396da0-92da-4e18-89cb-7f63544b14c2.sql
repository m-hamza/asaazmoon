-- Create schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  principal TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create answer_keys table
CREATE TABLE public.answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  answers JSONB NOT NULL,
  num_questions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exam_results table
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  answer_key_id UUID REFERENCES public.answer_keys(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  correct_count INTEGER NOT NULL,
  incorrect_count INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  exam_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a school management system)
-- Schools policies
CREATE POLICY "Enable read access for all users" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.schools FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.schools FOR DELETE USING (true);

-- Classes policies
CREATE POLICY "Enable read access for all users" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.classes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.classes FOR DELETE USING (true);

-- Students policies
CREATE POLICY "Enable read access for all users" ON public.students FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.students FOR DELETE USING (true);

-- Answer keys policies
CREATE POLICY "Enable read access for all users" ON public.answer_keys FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.answer_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.answer_keys FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.answer_keys FOR DELETE USING (true);

-- Exam results policies
CREATE POLICY "Enable read access for all users" ON public.exam_results FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.exam_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.exam_results FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.exam_results FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_students_class_id ON public.students(class_id);
CREATE INDEX idx_students_student_id ON public.students(student_id);
CREATE INDEX idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX idx_exam_results_answer_key_id ON public.exam_results(answer_key_id);
CREATE INDEX idx_exam_results_exam_date ON public.exam_results(exam_date);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_schools
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_classes
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_students
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_answer_keys
  BEFORE UPDATE ON public.answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();