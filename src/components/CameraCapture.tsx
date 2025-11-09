import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
}

export const CameraCapture = ({ onCapture, onProcessing }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      toast.error("خطا در دسترسی به دوربین");
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(imageData);
        stopCamera();
        toast.success("تصویر ثبت شد - در حال پردازش...");
        processImage(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("لطفاً یک فایل تصویری انتخاب کنید");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        toast.success("تصویر بارگذاری شد - در حال پردازش...");
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = (imageData: string) => {
    setIsProcessing(true);
    onProcessing?.(true);
    
    // Add small delay to show processing state
    setTimeout(() => {
      onCapture(imageData);
      setIsProcessing(false);
      onProcessing?.(false);
      setCapturedImage(null);
    }, 1500);
  };

  const retakeImage = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          اسکن پاسخنامه
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">در حال پردازش تصویر و تشخیص پاسخ‌ها...</p>
          </div>
        ) : capturedImage ? (
          <>
            <div className="relative rounded-lg overflow-hidden border">
              <img src={capturedImage} alt="Captured" className="w-full h-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={retakeImage} variant="outline" size="lg">
                عکس مجدد
              </Button>
              <Button onClick={() => processImage(capturedImage)} size="lg">
                تایید و اصلاح
              </Button>
            </div>
          </>
        ) : !isStreaming ? (
          <div className="space-y-3">
            <Button onClick={startCamera} className="w-full" size="lg">
              <Camera className="mr-2 h-5 w-5" />
              باز کردن دوربین
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">یا</span>
              </div>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ImageIcon className="mr-2 h-5 w-5" />
              بارگذاری از گالری
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto"
              />
              <Button
                onClick={stopCamera}
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={captureImage} className="w-full" size="lg">
              ثبت تصویر
            </Button>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {!isProcessing && !capturedImage && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-2">نکات مهم:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• پاسخنامه را به صورت صاف و بدون چین روی سطح مسطح قرار دهید</li>
              <li>• نور کافی داشته باشید و سایه روی پاسخنامه نیفتد</li>
              <li>• دوربین را موازی با پاسخنامه نگه دارید</li>
              <li>• کل پاسخنامه در کادر قرار گیرد</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
