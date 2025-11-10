/**
 * Type definitions for OMR (Optical Mark Recognition) processing
 */

export interface Point {
  x: number;
  y: number;
}

export interface BubbleRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface DetectedBubble {
  region: BubbleRegion;
  questionNumber: number;
  option: string; // 'A', 'B', 'C', 'D' or 'الف', 'ب', 'ج', 'د'
  darkness: number; // 0-1, how filled the bubble is
  isFilled: boolean;
}

export interface DetectedAnswer {
  questionNumber: number;
  answer: string;
  confidence: number; // 0-1
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
  answers: string[];
  detectedBubbles?: DetectedBubble[];
  processingTime?: number;
}

export interface AnswerSheetConfig {
  numQuestions: number;
  optionsPerQuestion: number; // Usually 4 for A, B, C, D
  bubbleRadius: number; // Expected bubble radius in pixels
  columnsPerPage: number; // Number of question columns (usually 2-3)
  bubbleFillThreshold: number; // 0-1, threshold for considering a bubble as filled
  options: string[]; // ['A', 'B', 'C', 'D'] or ['الف', 'ب', 'ج', 'د']
}

export interface ImageProcessingConfig {
  gaussianBlurRadius: number;
  adaptiveThresholdBlockSize: number;
  morphologyKernelSize: number;
  minBubbleArea: number;
  maxBubbleArea: number;
}
