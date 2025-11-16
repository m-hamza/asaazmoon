import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check } from "lucide-react";
import { toast } from "sonner";

interface AnswerKeySetupProps {
  onAnswerKeySet: (answerKey: string[]) => void;
}

export const AnswerKeySetup = ({ onAnswerKeySet }: AnswerKeySetupProps) => {
  const [numQuestions, setNumQuestions] = useState<number>(120);
  const [answers, setAnswers] = useState<string[]>(Array(120).fill("A"));

  const handleNumQuestionsChange = (value: string) => {
    const num = parseInt(value) || 0;
    if (num > 0 && num <= 150) {
      setNumQuestions(num);
      setAnswers(Array(num).fill("A"));
    }
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    onAnswerKeySet(answers);
    toast.success("کلید پاسخ با موفقیت ثبت شد");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-success" />
          تنظیم کلید پاسخ
        </CardTitle>
        <CardDescription>
          لطفاً تعداد سوالات و پاسخ‌های صحیح را وارد کنید
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="numQuestions">تعداد سوالات</Label>
          <Input
            id="numQuestions"
            type="number"
            min="1"
            max="150"
            value={numQuestions}
            onChange={(e) => handleNumQuestionsChange(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: numQuestions }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <span className="font-medium text-sm w-8">س{i + 1}</span>
              <RadioGroup
                value={answers[i]}
                onValueChange={(value) => handleAnswerChange(i, value)}
                className="flex gap-2"
              >
                {["A", "B", "C", "D"].map((option) => (
                  <div key={option} className="flex items-center gap-1">
                    <RadioGroupItem value={option} id={`q${i}-${option}`} />
                    <Label htmlFor={`q${i}-${option}`} className="text-sm cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>

        <Button onClick={handleSubmit} className="w-full" size="lg">
          ثبت کلید پاسخ
        </Button>
      </CardContent>
    </Card>
  );
};
