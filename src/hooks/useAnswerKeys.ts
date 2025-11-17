import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AnswerKey {
  id: string;
  name: string;
  subject?: string;
  grade?: string;
  answers: string[];
  num_questions: number;
  created_at?: string;
  updated_at?: string;
}

export const useAnswerKeys = () => {
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnswerKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('answer_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typedData = (data || []).map(item => ({
        ...item,
        answers: item.answers as unknown as string[]
      }));
      setAnswerKeys(typedData);
      return typedData;
    } catch (error) {
      console.error('Error fetching answer keys:', error);
      toast.error('خطا در دریافت کلیدهای پاسخ');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnswerKeys();
  }, []);

  const addAnswerKey = async (answerKeyData: Omit<AnswerKey, 'id' | 'created_at' | 'updated_at'>) => {
    const { answerKeySchema } = await import('@/lib/validation');
    const validation = answerKeySchema.safeParse(answerKeyData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('answer_keys')
        .insert({
          ...answerKeyData,
          answers: answerKeyData.answers as any
        })
        .select()
        .single();

      if (error) throw error;
      const typedData = {
        ...data,
        answers: data.answers as unknown as string[]
      };
      setAnswerKeys([typedData, ...answerKeys]);
      toast.success('کلید پاسخ با موفقیت ذخیره شد');
      return typedData;
    } catch (error) {
      console.error('Error adding answer key:', error);
      toast.error('خطا در ذخیره کلید پاسخ');
      throw error;
    }
  };

  const deleteAnswerKey = async (answerKeyId: string) => {
    try {
      const { error } = await supabase
        .from('answer_keys')
        .delete()
        .eq('id', answerKeyId);

      if (error) throw error;
      setAnswerKeys(answerKeys.filter(ak => ak.id !== answerKeyId));
      toast.success('کلید پاسخ با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting answer key:', error);
      toast.error('خطا در حذف کلید پاسخ');
      throw error;
    }
  };

  return {
    answerKeys,
    loading,
    addAnswerKey,
    deleteAnswerKey,
    refreshAnswerKeys: fetchAnswerKeys
  };
};
