/**
 * Main OMR Processor
 * Coordinates all OMR processing components
 */

import { ProcessingResult, AnswerSheetConfig } from './types';
import { ImagePreprocessor } from './imagePreprocessor';
import { QRDetector } from './qrDetector';
import { BubbleDetector } from './bubbleDetector';
import { AnswerSheetLayout } from './answerSheetLayout';

export class OMRProcessor {
  private preprocessor: ImagePreprocessor;
  private qrDetector: QRDetector;
  private layout: AnswerSheetLayout;
  private bubbleDetector: BubbleDetector;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(config?: Partial<AnswerSheetConfig>) {
    this.preprocessor = new ImagePreprocessor();
    this.qrDetector = new QRDetector();
    this.layout = new AnswerSheetLayout(config || {});
    this.bubbleDetector = new BubbleDetector(this.layout.getConfig());
    
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Process answer sheet image and extract student info + answers
   */
  async processAnswerSheet(
    imageData: string,
    numQuestions: number
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Setup canvas
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);

          // Get image data
          const imgData = this.ctx.getImageData(0, 0, img.width, img.height);
          
          // Update configuration
          this.layout.updateConfig({ numQuestions });
          this.bubbleDetector = new BubbleDetector(this.layout.getConfig());
          
          // Detect QR code from original image
          const qrRegions = this.layout.getQRCodeRegions(img.width, img.height);
          const studentInfo = this.qrDetector.detectQRInRegions(imgData, qrRegions);
          
          // Preprocess image for bubble detection
          const processed = this.preprocessor.preprocess(imgData);
          
          // Generate bubble layout
          const bubbleLayout = this.layout.generateBubbleLayout(img.width, img.height);
          
          // Detect filled bubbles
          const detectedBubbles = this.bubbleDetector.detectFilledBubbles(
            processed,
            bubbleLayout
          );
          
          // Determine answers
          const answers = this.bubbleDetector.determineAnswers(
            detectedBubbles,
            numQuestions
          );
          
          const processingTime = performance.now() - startTime;
          
          resolve({
            studentInfo,
            answers,
            detectedBubbles,
            processingTime,
          });
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  }

  /**
   * Alternative processing method with enhanced contour detection
   */
  async processWithContours(
    imageData: string,
    numQuestions: number
  ): Promise<{ studentInfo: any; answers: string[] }> {
    const result = await this.processAnswerSheet(imageData, numQuestions);
    
    return {
      studentInfo: result.studentInfo,
      answers: result.answers,
    };
  }

  /**
   * Update processor configuration
   */
  updateConfig(config: Partial<AnswerSheetConfig>): void {
    this.layout.updateConfig(config);
    this.bubbleDetector = new BubbleDetector(this.layout.getConfig());
  }

  /**
   * Get current configuration
   */
  getConfig(): AnswerSheetConfig {
    return this.layout.getConfig();
  }
}
