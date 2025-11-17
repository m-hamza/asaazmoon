import { z } from 'zod';

export const studentSchema = z.object({
  first_name: z.string().trim().min(1, 'نام الزامی است').max(100, 'نام نباید بیش از ۱۰۰ کاراکتر باشد'),
  last_name: z.string().trim().min(1, 'نام خانوادگی الزامی است').max(100, 'نام خانوادگی نباید بیش از ۱۰۰ کاراکتر باشد'),
  student_id: z.string().trim().min(1, 'شماره دانش‌آموزی الزامی است').max(50, 'شماره دانش‌آموزی نباید بیش از ۵۰ کاراکتر باشد'),
  class_id: z.string().uuid('شناسه کلاس معتبر نیست')
});

export const schoolSchema = z.object({
  name: z.string().trim().min(1, 'نام مدرسه الزامی است').max(200, 'نام مدرسه نباید بیش از ۲۰۰ کاراکتر باشد'),
  address: z.string().trim().max(500, 'آدرس نباید بیش از ۵۰۰ کاراکتر باشد').optional(),
  principal: z.string().trim().max(100, 'نام مدیر نباید بیش از ۱۰۰ کاراکتر باشد').optional()
});

export const classSchema = z.object({
  name: z.string().trim().min(1, 'نام کلاس الزامی است').max(100, 'نام کلاس نباید بیش از ۱۰۰ کاراکتر باشد'),
  grade: z.string().trim().min(1, 'پایه تحصیلی الزامی است').max(50, 'پایه تحصیلی نباید بیش از ۵۰ کاراکتر باشد'),
  school_id: z.string().uuid('شناسه مدرسه معتبر نیست').optional()
});

export const answerKeySchema = z.object({
  name: z.string().trim().min(1, 'نام کلید پاسخ الزامی است').max(200, 'نام کلید پاسخ نباید بیش از ۲۰۰ کاراکتر باشد'),
  num_questions: z.number().int('تعداد سوالات باید عدد صحیح باشد').min(1, 'حداقل یک سوال لازم است').max(150, 'حداکثر ۱۵۰ سوال مجاز است'),
  answers: z.array(z.enum(['A', 'B', 'C', 'D'])).min(1, 'حداقل یک پاسخ لازم است').max(150, 'حداکثر ۱۵۰ پاسخ مجاز است'),
  grade: z.string().trim().max(50).optional(),
  subject: z.string().trim().max(100).optional()
});

export const examResultSchema = z.object({
  student_id: z.string().uuid('شناسه دانش‌آموز معتبر نیست'),
  answer_key_id: z.string().uuid('شناسه کلید پاسخ معتبر نیست'),
  answers: z.array(z.string()).min(1, 'حداقل یک پاسخ لازم است').max(150, 'حداکثر ۱۵۰ پاسخ مجاز است'),
  correct_count: z.number().int().min(0),
  incorrect_count: z.number().int().min(0),
  percentage: z.number().min(0).max(100)
});
