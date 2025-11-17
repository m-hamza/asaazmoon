import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Student {
  id: string;
  class_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  created_at?: string;
  updated_at?: string;
}

export const useStudents = (classId?: string) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async (targetClassId?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('students').select('*');

      if (targetClassId || classId) {
        query = query.eq('class_id', targetClassId || classId);
      }

      const { data, error } = await query.order('first_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('خطا در دریافت دانش‌آموزان');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    const { studentSchema } = await import('@/lib/validation');
    const validation = studentSchema.safeParse(studentData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single();

      if (error) throw error;
      setStudents([...students, data]);
      toast.success('دانش‌آموز با موفقیت اضافه شد');
      return data;
    } catch (error: any) {
      console.error('Error adding student:', error);
      if (error?.code === '23505') {
        toast.error('کد داوطلبی تکراری است');
      } else {
        toast.error('خطا در افزودن دانش‌آموز');
      }
      throw error;
    }
  };

  const addMultipleStudents = async (studentsData: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { studentSchema } = await import('@/lib/validation');
    
    for (const student of studentsData) {
      const validation = studentSchema.safeParse(student);
      if (!validation.success) {
        toast.error(`خطا در اعتبارسنجی: ${validation.error.errors[0].message}`);
        return;
      }
    }
    try {
      const { data, error } = await supabase
        .from('students')
        .insert(studentsData)
        .select();

      if (error) throw error;
      setStudents([...students, ...(data || [])]);
      toast.success(`${data?.length || 0} دانش‌آموز با موفقیت اضافه شدند`);
      return data;
    } catch (error: any) {
      console.error('Error adding students:', error);
      if (error?.code === '23505') {
        toast.error('برخی از کدهای داوطلبی تکراری هستند');
      } else {
        toast.error('خطا در افزودن دانش‌آموزان');
      }
      throw error;
    }
  };

  const deleteStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      setStudents(students.filter(s => s.id !== studentId));
      toast.success('دانش‌آموز با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('خطا در حذف دانش‌آموز');
      throw error;
    }
  };

  const getAllStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all students:', error);
      toast.error('خطا در دریافت دانش‌آموزان');
      return [];
    }
  };

  return {
    students,
    loading,
    addStudent,
    addMultipleStudents,
    deleteStudent,
    refreshStudents: fetchStudents,
    getAllStudents
  };
};
