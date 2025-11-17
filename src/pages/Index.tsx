import { useState, useEffect } from "react";
import { AnswerKeySetup } from "@/components/AnswerKeySetup";
import { CameraCapture } from "@/components/CameraCapture";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { StudentManagement } from "@/components/StudentManagement";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Camera, BarChart3, Users, LogOut } from "lucide-react";
import { toast } from "sonner";
import { OMRProcessor, StudentInfo } from "@/utils/imageProcessing";
import { useAnswerKeys } from "@/hooks/useAnswerKeys";
import { useExamResults } from "@/hooks/useExamResults";
import { useStudents } from "@/hooks/useStudents";
import { useAuth } from "@/contexts/AuthContext";

interface GradedSheet {
  id: string;
  studentInfo: StudentInfo | null;
  studentAnswers: string[];
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  timestamp: Date;
}

const Index = () => {
  const [answerKey, setAnswerKey] = useState<string[]>([]);
  const [currentAnswerKeyId, setCurrentAnswerKeyId] = useState<string>("");
  const [gradedSheets, setGradedSheets] = useState<GradedSheet[]>([]);
  const [activeTab, setActiveTab] = useState("students");
  const [isProcessing, setIsProcessing] = useState(false);
  const [omrProcessor] = useState(() => new OMRProcessor());
  
  const { addAnswerKey } = useAnswerKeys();
  const { examResults, addExamResult, refreshExamResults } = useExamResults();
  const { getAllStudents } = useStudents();
  const { signOut, user } = useAuth();

  // Load exam results on mount
  useEffect(() => {
    const loadResults = async () => {
      const results = await refreshExamResults();
      // Map to GradedSheet format if needed
      const mapped = results.map((r: any) => ({
        id: r.id,
        studentInfo: {
          studentId: r.students?.student_id || 'unknown',
          studentName: `${r.students?.first_name || ''} ${r.students?.last_name || ''}`.trim() || 'نامشخص',
          testId: r.answer_key_id,
          testDate: r.exam_date,
          grade: r.students?.class_id
        },
        studentAnswers: r.answers,
        correctCount: r.correct_count,
        incorrectCount: r.incorrect_count,
        percentage: r.percentage,
        timestamp: new Date(r.exam_date || r.created_at)
      }));
      setGradedSheets(mapped);
    };
    loadResults();
  }, []);

  const handleAnswerKeySet = async (key: string[]) => {
    try {
      const answerKeyData = await addAnswerKey({
        name: `کلید پاسخ ${new Date().toLocaleDateString('fa-IR')}`,
        answers: key,
        num_questions: key.length
      });
      
      setAnswerKey(key);
      setCurrentAnswerKeyId(answerKeyData.id);
      setActiveTab("scan");
    } catch (error) {
      console.error("Error saving answer key:", error);
    }
  };

  const handleImageCapture = async (imageData: string) => {
    if (answerKey.length === 0) {
      toast.error("ابتدا کلید پاسخ را تنظیم کنید");
      return;
    }

    setIsProcessing(true);

    try {
      // Process the image using OMR detection with QR code detection
      const result = await omrProcessor.processWithContours(
        imageData,
        answerKey.length
      );

      console.log("Detected QR info:", result.studentInfo);
      console.log("Detected answers:", result.answers);

      // Grade the answers
      let correctCount = 0;
      let incorrectCount = 0;

      result.answers.forEach((answer, index) => {
        if (answer === answerKey[index]) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });

      const percentage = (correctCount / answerKey.length) * 100;

      const newSheet: GradedSheet = {
        id: Date.now().toString(),
        studentInfo: result.studentInfo,
        studentAnswers: result.answers,
        correctCount,
        incorrectCount,
        percentage,
        timestamp: new Date(),
      };

      // Find student in database by student_id from QR
      let studentDbId = '';
      if (result.studentInfo?.studentId) {
        const allStudents = await getAllStudents();
        const foundStudent = allStudents.find(s => s.student_id === result.studentInfo.studentId);
        if (foundStudent) {
          studentDbId = foundStudent.id;
        }
      }

      // Save to database if we found the student
      if (studentDbId && currentAnswerKeyId) {
        try {
          await addExamResult({
            student_id: studentDbId,
            answer_key_id: currentAnswerKeyId,
            answers: result.answers,
            correct_count: correctCount,
            incorrect_count: incorrectCount,
            percentage: parseFloat(percentage.toFixed(2)),
            exam_date: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error saving result to database:", error);
        }
      }

      setGradedSheets([newSheet, ...gradedSheets]);
      setActiveTab("results");
      
      if (result.studentInfo) {
        toast.success(
          `✅ ${result.studentInfo.studentName}\nنمره: ${percentage.toFixed(0)}% (${correctCount}/${answerKey.length})`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `✅ اصلاح انجام شد!\nنمره: ${percentage.toFixed(0)}% (${correctCount}/${answerKey.length})`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("خطا در پردازش تصویر. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6 relative">
          <div className="absolute left-4 top-6">
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 ml-2" />
              خروج
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-primary text-center">
            سیستم اصلاح پاسخنامه تستی
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            اصلاح خودکار پاسخنامه‌های چهارگزینه‌ای با دوربین
          </p>
          {user && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              کاربر: {user.email}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="students" className="gap-2">
              <Users className="h-4 w-4" />
              اطلاعات داوطلبین
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              کلید پاسخ
            </TabsTrigger>
            <TabsTrigger value="scan" className="gap-2" disabled={answerKey.length === 0}>
              <Camera className="h-4 w-4" />
              اسکن
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              نتایج
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <StudentManagement />
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <AnswerKeySetup onAnswerKeySet={handleAnswerKeySet} />
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <CameraCapture 
              onCapture={handleImageCapture}
              onProcessing={setIsProcessing}
            />
            {answerKey.length > 0 && !isProcessing && (
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  آماده اصلاح: کلید پاسخ برای {answerKey.length} سوال تنظیم شده
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  تعداد پاسخنامه‌های اصلاح شده: {gradedSheets.length}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <ResultsDisplay results={gradedSheets} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
