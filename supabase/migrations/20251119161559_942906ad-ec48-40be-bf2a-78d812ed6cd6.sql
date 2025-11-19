-- Fix 1: Allow first user to become admin (bootstrap fix)
DROP POLICY IF EXISTS "Only admins can assign roles" ON user_roles;

CREATE POLICY "Admins can assign roles or first user becomes admin"
ON user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin'::app_role)
);

-- Fix 2: Add user_id column to students table for proper auth linkage
ALTER TABLE students 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_students_user_id ON students(user_id);

-- Fix 3: Update exam_results RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view relevant exam results" ON exam_results;
DROP POLICY IF EXISTS "Authenticated users can create exam results" ON exam_results;

-- Create new SELECT policy with proper student linkage
CREATE POLICY "Users can view relevant exam results"
ON exam_results FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role) OR
  (has_role(auth.uid(), 'student'::app_role) AND 
   EXISTS (SELECT 1 FROM students 
     WHERE students.id = exam_results.student_id 
     AND students.user_id = auth.uid()))
);

-- Create restrictive INSERT policy - only staff can create exam results
CREATE POLICY "Only staff can create exam results"
ON exam_results FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

-- Allow students to view their own student record
DROP POLICY IF EXISTS "Authenticated staff can view students" ON students;

CREATE POLICY "Staff can view all students"
ON students FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Students can view their own record"
ON students FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) AND 
  user_id = auth.uid()
);