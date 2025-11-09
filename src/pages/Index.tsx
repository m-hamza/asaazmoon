import { useState } from "react";
import { AnswerKeySetup } from "@/components/AnswerKeySetup";
import { CameraCapture } from "@/components/CameraCapture";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Camera, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface GradedSheet {
  id: string;
  studentAnswers: string[];
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  timestamp: Date;
}

const Index = () => {
  const [answerKey, setAnswerKey] = useState<string[]>([]);
  const [gradedSheets, setGradedSheets] = useState<GradedSheet[]>([]);
  const [activeTab, setActiveTab] = useState("setup");

  const handleAnswerKeySet = (key: string[]) => {
    setAnswerKey(key);
    setActiveTab("scan");
  };

  const simulateAnswerDetection = (imageData: string): string[] => {
    // This is a simulation. In a real app, you would use image processing
    // to detect marked answers from the captured image
    return answerKey.map(() => 
      ["A", "B", "C", "D"][Math.floor(Math.random() * 4)]
    );
  };

  const handleImageCapture = (imageData: string) => {
    if (answerKey.length === 0) {
      toast.error("ابتدا کلید پاسخ را تنظیم کنید");
      return;
    }

    // Simulate answer detection from image
    const studentAnswers = simulateAnswerDetection(imageData);

    // Grade the answers
    let correctCount = 0;
    let incorrectCount = 0;

    studentAnswers.forEach((answer, index) => {
      if (answer === answerKey[index]) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const percentage = (correctCount / answerKey.length) * 100;

    const newSheet: GradedSheet = {
      id: `${gradedSheets.length + 1}`,
      studentAnswers,
      correctCount,
      incorrectCount,
      percentage,
      timestamp: new Date(),
    };

    setGradedSheets([newSheet, ...gradedSheets]);
    setActiveTab("results");
    toast.success(`نمره: ${percentage.toFixed(0)}% - ${correctCount} از ${answerKey.length} صحیح`);
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
          <TabsList className="grid w-full grid-cols-3 mb-8">
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

          <TabsContent value="setup" className="space-y-4">
            <AnswerKeySetup onAnswerKeySet={handleAnswerKeySet} />
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <CameraCapture onCapture={handleImageCapture} />
            {answerKey.length > 0 && (
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  کلید پاسخ برای {answerKey.length} سوال تنظیم شده است
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
