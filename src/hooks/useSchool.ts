import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface School {
  id: string;
  name: string;
  address?: string;
  principal?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Class {
  id: string;
  school_id: string | null;
  name: string;
  grade: string;
  created_at?: string;
  updated_at?: string;
}

export const useSchool = () => {
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSchool(data);
      return data;
    } catch (error) {
      console.error('Error fetching school:', error);
      toast.error('خطا در دریافت اطلاعات مدرسه');
      return null;
    }
  };

  const fetchClasses = async (schoolId?: string) => {
    try {
      let query = supabase.from('classes').select('*');
      
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClasses(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('خطا در دریافت کلاس‌ها');
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const schoolData = await fetchSchool();
      if (schoolData) {
        await fetchClasses(schoolData.id);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  const saveSchool = async (schoolData: Omit<School, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (school?.id) {
        const { data, error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', school.id)
          .select()
          .single();

        if (error) throw error;
        setSchool(data);
        toast.success('اطلاعات مدرسه با موفقیت به‌روز شد');
        return data;
      } else {
        const { data, error } = await supabase
          .from('schools')
          .insert(schoolData)
          .select()
          .single();

        if (error) throw error;
        setSchool(data);
        toast.success('اطلاعات مدرسه با موفقیت ثبت شد');
        return data;
      }
    } catch (error) {
      console.error('Error saving school:', error);
      toast.error('خطا در ذخیره اطلاعات مدرسه');
      throw error;
    }
  };

  const addClass = async (classData: Omit<Class, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert(classData)
        .select()
        .single();

      if (error) throw error;
      setClasses([...classes, data]);
      toast.success('کلاس با موفقیت اضافه شد');
      return data;
    } catch (error) {
      console.error('Error adding class:', error);
      toast.error('خطا در افزودن کلاس');
      throw error;
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      setClasses(classes.filter(c => c.id !== classId));
      toast.success('کلاس با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('خطا در حذف کلاس');
      throw error;
    }
  };

  return {
    school,
    classes,
    loading,
    saveSchool,
    addClass,
    deleteClass,
    refreshClasses: fetchClasses
  };
};
