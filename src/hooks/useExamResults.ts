import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExamResult {
  id: string;
  student_id: string;
  answer_key_id: string;
  answers: string[];
  correct_count: number;
  incorrect_count: number;
  percentage: number;
  exam_date?: string;
  created_at?: string;
}

export const useExamResults = () => {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExamResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          students(id, student_id, first_name, last_name, class_id),
          answer_keys(id, name, subject)
        `)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      const typedData = (data || []).map(item => ({
        ...item,
        answers: item.answers as unknown as string[]
      }));
      setExamResults(typedData);
      return typedData;
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast.error('خطا در دریافت نتایج آزمون');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamResults();
  }, []);

  const addExamResult = async (resultData: Omit<ExamResult, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .insert({
          ...resultData,
          answers: resultData.answers as any
        })
        .select()
        .single();

      if (error) throw error;
      await fetchExamResults(); // Refresh to get joined data
      toast.success('نتیجه آزمون با موفقیت ذخیره شد');
      return data;
    } catch (error) {
      console.error('Error adding exam result:', error);
      toast.error('خطا در ذخیره نتیجه آزمون');
      throw error;
    }
  };

  const deleteExamResult = async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .eq('id', resultId);

      if (error) throw error;
      setExamResults(examResults.filter(r => r.id !== resultId));
      toast.success('نتیجه آزمون با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting exam result:', error);
      toast.error('خطا در حذف نتیجه آزمون');
      throw error;
    }
  };

  const getStudentResults = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching student results:', error);
      return [];
    }
  };

  return {
    examResults,
    loading,
    addExamResult,
    deleteExamResult,
    getStudentResults,
    refreshExamResults: fetchExamResults
  };
};
