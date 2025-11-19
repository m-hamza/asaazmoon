-- Fix: Allow teachers to manage students (not just admins)
-- This makes sense for a school management system where teachers need to add their students

DROP POLICY IF EXISTS "Admins can manage students" ON students;

-- Create separate policies for better control
CREATE POLICY "Staff can insert students"
ON students FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Staff can update students"
ON students FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Staff can delete students"
ON students FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

-- Fix other tables to allow teachers to manage them too

-- Schools: Allow teachers to view and manage
DROP POLICY IF EXISTS "Admins can manage schools" ON schools;
DROP POLICY IF EXISTS "Authenticated users can view schools" ON schools;

CREATE POLICY "Staff can view schools"
ON schools FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Staff can manage schools"
ON schools FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

-- Classes: Allow teachers to manage
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Authenticated users can view classes" ON classes;

CREATE POLICY "Staff can view classes"
ON classes FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Staff can manage classes"
ON classes FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'teacher'::app_role)
);