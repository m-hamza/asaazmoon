/**
 * Image processing utilities for OMR (Optical Mark Recognition)
 * Detects filled bubbles on answer sheets and QR codes for student identification
 */

import jsQR from 'jsqr';

interface Point {
  x: number;
  y: number;
}

interface DetectedAnswer {
  questionNumber: number;
  answer: string;
  confidence: number;
}

export interface StudentInfo {
  studentId: string;
  studentName: string;
  testId: string;
  testDate?: string;
  grade?: string;
}

export interface ProcessingResult {
  studentInfo: StudentInfo | null;
  answers: DetectedAnswer[];
}

export class OMRProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Detect QR code in image and extract student information
   */
  private detectQRCode(imageData: ImageData): StudentInfo | null {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        // Parse QR code data - expected format: JSON string
        try {
          const data = JSON.parse(code.data);
          return {
            studentId: data.studentId || data.id || 'Unknown',
            studentName: data.studentName || data.name || 'Unknown',
            testId: data.testId || data.test || 'Unknown',
            testDate: data.testDate || data.date,
            grade: data.grade || data.class,
          };
        } catch {
          // If not JSON, try parsing as key-value pairs
          const parts = code.data.split('|');
          return {
            studentId: parts[0] || 'Unknown',
            studentName: parts[1] || 'Unknown',
            testId: parts[2] || 'Unknown',
            testDate: parts[3],
            grade: parts[4],
          };
        }
      }
    } catch (error) {
      console.error('QR detection error:', error);
    }
    return null;
  }

  /**
   * Main processing function to detect QR code and answers from image
   */
  async processAnswerSheet(
    imageData: string,
    numQuestions: number
  ): Promise<ProcessingResult> {
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
          
          // Detect QR code first
          const studentInfo = this.detectQRCode(imgData);
          
          // Process image for answers
          const processed = this.preprocessImage(imgData);
          const answers = this.detectAnswers(processed, numQuestions);
          
          resolve({ studentInfo, answers });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  /**
   * Preprocess image: convert to grayscale and apply threshold
   */
  private preprocessImage(imageData: ImageData): ImageData {
    const data = imageData.data;
    const processed = new ImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Apply adaptive threshold
      const threshold = gray < 128 ? 0 : 255;
      
      processed.data[i] = threshold;
      processed.data[i + 1] = threshold;
      processed.data[i + 2] = threshold;
      processed.data[i + 3] = 255;
    }
    
    return processed;
  }

  /**
   * Detect filled bubbles and extract answers
   */
  private detectAnswers(
    imageData: ImageData,
    numQuestions: number
  ): DetectedAnswer[] {
    const answers: DetectedAnswer[] = [];
    const { width, height, data } = imageData;
    
    // Define answer sheet layout
    // Assuming 4 options (A, B, C, D) per question
    const optionsPerQuestion = 4;
    const expectedBubbles = numQuestions * optionsPerQuestion;
    
    // Detect bubble regions
    const bubbles = this.detectBubbleRegions(data, width, height, expectedBubbles);
    
    // Group bubbles by questions
    const questionsMap = this.groupBubblesByQuestion(bubbles, numQuestions);
    
    // Determine which bubble is filled for each question
    for (let q = 0; q < numQuestions; q++) {
      const questionBubbles = questionsMap.get(q) || [];
      
      if (questionBubbles.length === 0) {
        // No answer detected
        answers.push({
          questionNumber: q + 1,
          answer: 'A', // Default fallback
          confidence: 0,
        });
        continue;
      }
      
      // Find the darkest (most filled) bubble
      let darkestBubble = questionBubbles[0];
      let maxDarkness = this.calculateBubbleDarkness(
        data,
        width,
        darkestBubble.region
      );
      
      for (let i = 1; i < questionBubbles.length; i++) {
        const darkness = this.calculateBubbleDarkness(
          data,
          width,
          questionBubbles[i].region
        );
        if (darkness > maxDarkness) {
          maxDarkness = darkness;
          darkestBubble = questionBubbles[i];
        }
      }
      
      answers.push({
        questionNumber: q + 1,
        answer: darkestBubble.option,
        confidence: maxDarkness,
      });
    }
    
    return answers;
  }

  /**
   * Detect bubble regions in the image
   */
  private detectBubbleRegions(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    expectedCount: number
  ): Array<{ region: { x: number; y: number; width: number; height: number }; option: string }> {
    const bubbles: Array<{ region: { x: number; y: number; width: number; height: number }; option: string }> = [];
    
    // Simple grid-based detection
    // Divide image into grid and analyze each cell
    const cols = 4; // A, B, C, D
    const rows = Math.ceil(expectedCount / cols);
    
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    const options = ['A', 'B', 'C', 'D'];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.floor(col * cellWidth);
        const y = Math.floor(row * cellHeight);
        const w = Math.floor(cellWidth);
        const h = Math.floor(cellHeight);
        
        bubbles.push({
          region: { x, y, width: w, height: h },
          option: options[col],
        });
      }
    }
    
    return bubbles;
  }

  /**
   * Group bubbles by question number
   */
  private groupBubblesByQuestion(
    bubbles: Array<{ region: any; option: string }>,
    numQuestions: number
  ): Map<number, Array<{ region: any; option: string }>> {
    const questionsMap = new Map<number, Array<{ region: any; option: string }>>();
    
    const bubblesPerQuestion = 4;
    
    bubbles.forEach((bubble, index) => {
      const questionNum = Math.floor(index / bubblesPerQuestion);
      if (questionNum < numQuestions) {
        if (!questionsMap.has(questionNum)) {
          questionsMap.set(questionNum, []);
        }
        questionsMap.get(questionNum)!.push(bubble);
      }
    });
    
    return questionsMap;
  }

  /**
   * Calculate how dark/filled a bubble region is
   */
  private calculateBubbleDarkness(
    data: Uint8ClampedArray,
    width: number,
    region: { x: number; y: number; width: number; height: number }
  ): number {
    let totalDarkness = 0;
    let pixelCount = 0;
    
    // Sample center 60% of the region to avoid edges
    const padding = 0.2;
    const startX = Math.floor(region.x + region.width * padding);
    const endX = Math.floor(region.x + region.width * (1 - padding));
    const startY = Math.floor(region.y + region.height * padding);
    const endY = Math.floor(region.y + region.height * (1 - padding));
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const index = (y * width + x) * 4;
        // Count dark pixels (threshold-based detection)
        const brightness = data[index];
        if (brightness < 128) {
          totalDarkness += (255 - brightness);
        }
        pixelCount++;
      }
    }
    
    return pixelCount > 0 ? totalDarkness / pixelCount : 0;
  }

  /**
   * Enhanced processing with contour detection and QR code detection
   */
  async processWithContours(
    imageData: string,
    numQuestions: number
  ): Promise<{ studentInfo: StudentInfo | null; answers: string[] }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);

          const imgData = this.ctx.getImageData(0, 0, img.width, img.height);
          
          // Detect QR code first (on original image)
          const studentInfo = this.detectQRCode(imgData);
          
          // Apply image processing pipeline for bubble detection
          const grayscale = this.toGrayscale(imgData);
          const blurred = this.gaussianBlur(grayscale, 5);
          const binary = this.adaptiveThreshold(blurred);
          
          // Detect filled bubbles
          const detectedAnswers = this.detectFilledBubbles(
            binary,
            numQuestions,
            4 // options per question
          );
          
          resolve({ studentInfo, answers: detectedAnswers });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  private toGrayscale(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const gray = new ImageData(width, height);
    
    for (let i = 0; i < data.length; i += 4) {
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray.data[i] = gray.data[i + 1] = gray.data[i + 2] = avg;
      gray.data[i + 3] = 255;
    }
    
    return gray;
  }

  private gaussianBlur(imageData: ImageData, radius: number): ImageData {
    // Simple box blur approximation
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              sum += data[idx];
              count++;
            }
          }
        }
        
        const idx = (y * width + x) * 4;
        const avg = sum / count;
        output.data[idx] = output.data[idx + 1] = output.data[idx + 2] = avg;
        output.data[idx + 3] = 255;
      }
    }
    
    return output;
  }

  private adaptiveThreshold(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const blockSize = 35;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate local mean
        let sum = 0;
        let count = 0;
        
        for (let dy = -blockSize; dy <= blockSize; dy++) {
          for (let dx = -blockSize; dx <= blockSize; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += data[(ny * width + nx) * 4];
              count++;
            }
          }
        }
        
        const mean = sum / count;
        const idx = (y * width + x) * 4;
        const value = data[idx] < mean - 10 ? 0 : 255;
        
        output.data[idx] = output.data[idx + 1] = output.data[idx + 2] = value;
        output.data[idx + 3] = 255;
      }
    }
    
    return output;
  }

  private detectFilledBubbles(
    binary: ImageData,
    numQuestions: number,
    optionsPerQuestion: number
  ): string[] {
    const answers: string[] = [];
    const options = ['A', 'B', 'C', 'D'];
    const { width, height, data } = binary;
    
    // Divide image into question rows
    const rowHeight = height / numQuestions;
    const colWidth = width / optionsPerQuestion;
    
    for (let q = 0; q < numQuestions; q++) {
      const rowY = Math.floor(q * rowHeight);
      const rowEndY = Math.floor((q + 1) * rowHeight);
      
      let maxDarkness = 0;
      let selectedOption = 'A';
      
      // Check each option in this row
      for (let opt = 0; opt < optionsPerQuestion; opt++) {
        const colX = Math.floor(opt * colWidth);
        const colEndX = Math.floor((opt + 1) * colWidth);
        
        // Count dark pixels in this bubble region
        let darkPixels = 0;
        let totalPixels = 0;
        
        // Sample center 70% of region
        const padding = 0.15;
        const sampleStartX = Math.floor(colX + (colEndX - colX) * padding);
        const sampleEndX = Math.floor(colEndX - (colEndX - colX) * padding);
        const sampleStartY = Math.floor(rowY + (rowEndY - rowY) * padding);
        const sampleEndY = Math.floor(rowEndY - (rowEndY - rowY) * padding);
        
        for (let y = sampleStartY; y < sampleEndY; y++) {
          for (let x = sampleStartX; x < sampleEndX; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx] < 128) darkPixels++;
            totalPixels++;
          }
        }
        
        const darkness = totalPixels > 0 ? darkPixels / totalPixels : 0;
        
        if (darkness > maxDarkness) {
          maxDarkness = darkness;
          selectedOption = options[opt];
        }
      }
      
      answers.push(selectedOption);
    }
    
    return answers;
  }
}
