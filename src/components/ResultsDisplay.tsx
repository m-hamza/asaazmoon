import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, TrendingUp } from "lucide-react";

interface GradedSheet {
  id: string;
  studentAnswers: string[];
  correctCount: number;
  incorrectCount: number;
  percentage: number;
  timestamp: Date;
}

interface ResultsDisplayProps {
  results: GradedSheet[];
}

export const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  if (results.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            هنوز پاسخنامه‌ای اصلاح نشده است
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.id} className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                پاسخنامه شماره {result.id}
              </CardTitle>
              <Badge
                variant={result.percentage >= 50 ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {result.percentage.toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">پاسخ‌های صحیح</p>
                  <p className="text-2xl font-bold text-success">
                    {result.correctCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">پاسخ‌های نادرست</p>
                  <p className="text-2xl font-bold text-destructive">
                    {result.incorrectCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              زمان اصلاح: {result.timestamp.toLocaleString("fa-IR")}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
