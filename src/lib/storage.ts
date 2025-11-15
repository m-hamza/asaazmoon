/**
 * Local Storage Management for OMR System
 * Stores students, answer keys, and graded results
 */

export interface StoredStudent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  className: string;
  grade?: string;
}

export interface StoredClass {
  id: string;
  name: string;
  grade: string;
  students: StoredStudent[];
}

export interface StoredSchool {
  name: string;
  address?: string;
  principal?: string;
  classes: StoredClass[];
}

export interface StoredAnswerKey {
  id: string;
  name: string;
  answers: string[];
  createdAt: string;
  subject?: string;
  grade?: string;
}

export interface StoredResult {
  id: string;
  studentId: string;
  studentName: string;
  answerKeyId: string;
  answers: string[];
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  timestamp: string;
  className?: string;
}

// Storage Keys
const STORAGE_KEYS = {
  SCHOOL: 'omr_school_data',
  ANSWER_KEYS: 'omr_answer_keys',
  RESULTS: 'omr_results'
};

// School Data Management
export const saveSchoolData = (school: StoredSchool): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(school));
  } catch (error) {
    console.error('Error saving school data:', error);
    throw new Error('خطا در ذخیره اطلاعات مدرسه');
  }
};

export const loadSchoolData = (): StoredSchool | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHOOL);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading school data:', error);
    return null;
  }
};

// Answer Keys Management
export const saveAnswerKey = (answerKey: StoredAnswerKey): void => {
  try {
    const keys = loadAnswerKeys();
    keys.push(answerKey);
    localStorage.setItem(STORAGE_KEYS.ANSWER_KEYS, JSON.stringify(keys));
  } catch (error) {
    console.error('Error saving answer key:', error);
    throw new Error('خطا در ذخیره کلید پاسخ');
  }
};

export const loadAnswerKeys = (): StoredAnswerKey[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ANSWER_KEYS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading answer keys:', error);
    return [];
  }
};

export const deleteAnswerKey = (id: string): void => {
  try {
    const keys = loadAnswerKeys().filter(k => k.id !== id);
    localStorage.setItem(STORAGE_KEYS.ANSWER_KEYS, JSON.stringify(keys));
  } catch (error) {
    console.error('Error deleting answer key:', error);
    throw new Error('خطا در حذف کلید پاسخ');
  }
};

// Results Management
export const saveResult = (result: StoredResult): void => {
  try {
    const results = loadResults();
    results.push(result);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  } catch (error) {
    console.error('Error saving result:', error);
    throw new Error('خطا در ذخیره نتیجه');
  }
};

export const loadResults = (): StoredResult[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading results:', error);
    return [];
  }
};

export const deleteResult = (id: string): void => {
  try {
    const results = loadResults().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  } catch (error) {
    console.error('Error deleting result:', error);
    throw new Error('خطا در حذف نتیجه');
  }
};

export const clearAllData = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    throw new Error('خطا در پاک کردن داده‌ها');
  }
};

// Export all data as JSON
export const exportAllData = () => {
  return {
    school: loadSchoolData(),
    answerKeys: loadAnswerKeys(),
    results: loadResults(),
    exportDate: new Date().toISOString()
  };
};

// Import data from JSON
export const importData = (data: any): void => {
  try {
    if (data.school) {
      saveSchoolData(data.school);
    }
    if (data.answerKeys) {
      localStorage.setItem(STORAGE_KEYS.ANSWER_KEYS, JSON.stringify(data.answerKeys));
    }
    if (data.results) {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(data.results));
    }
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('خطا در وارد کردن داده‌ها');
  }
};
