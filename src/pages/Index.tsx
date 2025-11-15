import { useState } from "react";
import { AnswerKeySetup } from "@/components/AnswerKeySetup";
import { CameraCapture } from "@/components/CameraCapture";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { StudentManagement } from "@/components/StudentManagement";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Camera, BarChart3, Users } from "lucide-react";
import { toast } from "sonner";
import { OMRProcessor, StudentInfo } from "@/utils/imageProcessing";

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
  const [gradedSheets, setGradedSheets] = useState<GradedSheet[]>([]);
  const [activeTab, setActiveTab] = useState("students");
  const [isProcessing, setIsProcessing] = useState(false);
  const [omrProcessor] = useState(() => new OMRProcessor());

  const handleAnswerKeySet = (key: string[]) => {
    setAnswerKey(key);
    setActiveTab("scan");
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
        id: `${gradedSheets.length + 1}`,
        studentInfo: result.studentInfo,
        studentAnswers: result.answers,
        correctCount,
        incorrectCount,
        percentage,
        timestamp: new Date(),
      };

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
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-primary">
            سیستم اصلاح پاسخنامه تستی
          </h1>
          <p className="text-muted-foreground mt-2">
            اصلاح خودکار پاسخنامه‌های چهارگزینه‌ای با دوربین
          </p>
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
