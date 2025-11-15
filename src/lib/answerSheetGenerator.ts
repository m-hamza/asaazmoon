/**
 * Answer Sheet PDF Generator
 * Creates printable answer sheets with QR codes for student identification
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { StoredStudent } from './storage';

export interface AnswerSheetConfig {
  numQuestions: number;
  questionsPerColumn: number;
  optionsPerQuestion: number;
  schoolName?: string;
  examTitle?: string;
  subject?: string;
  date?: string;
}

const DEFAULT_CONFIG: AnswerSheetConfig = {
  numQuestions: 50,
  questionsPerColumn: 25,
  optionsPerQuestion: 4,
};

export class AnswerSheetGenerator {
  private config: AnswerSheetConfig;

  constructor(config: Partial<AnswerSheetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateForStudent(student: StoredStudent): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    await this.drawAnswerSheet(pdf, student);
    return pdf.output('blob');
  }

  async generateForMultipleStudents(students: StoredStudent[]): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < students.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      await this.drawAnswerSheet(pdf, students[i]);
    }

    return pdf.output('blob');
  }

  private async drawAnswerSheet(pdf: jsPDF, student: StoredStudent): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Header Section
    this.drawHeader(pdf, pageWidth);
    
    // Student Info with QR Code
    await this.drawStudentInfo(pdf, student, pageWidth);
    
    // Answer Bubbles Grid
    this.drawAnswerGrid(pdf, pageWidth, pageHeight);
    
    // Footer
    this.drawFooter(pdf, pageWidth, pageHeight);
  }

  private drawHeader(pdf: jsPDF, pageWidth: number): void {
    // School Name
    if (this.config.schoolName) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.config.schoolName, pageWidth / 2, 15, { align: 'center' });
    }

    // Exam Title
    if (this.config.examTitle) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.config.examTitle, pageWidth / 2, 22, { align: 'center' });
    }

    // Subject and Date
    pdf.setFontSize(10);
    const y = 28;
    if (this.config.subject) {
      pdf.text(`درس: ${this.config.subject}`, 15, y);
    }
    if (this.config.date) {
      pdf.text(`تاریخ: ${this.config.date}`, pageWidth - 15, y, { align: 'right' });
    }

    // Border line
    pdf.setLineWidth(0.5);
    pdf.line(10, 32, pageWidth - 10, 32);
  }

  private async drawStudentInfo(pdf: jsPDF, student: StoredStudent, pageWidth: number): Promise<void> {
    const startY = 38;
    
    // Generate QR Code with student data
    const qrData = JSON.stringify({
      id: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      class: student.className
    });
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1
      });
      
      // Draw QR Code on the right
      pdf.addImage(qrCodeDataUrl, 'PNG', pageWidth - 35, startY, 25, 25);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Student Info on the left
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`کد داوطلب: ${student.studentId}`, 15, startY + 5);
    pdf.text(`نام و نام خانوادگی: ${student.firstName} ${student.lastName}`, 15, startY + 12);
    pdf.text(`کلاس: ${student.className}`, 15, startY + 19);

    // Border around student info
    pdf.setLineWidth(0.3);
    pdf.rect(10, startY - 2, pageWidth - 20, 30);
  }

  private drawAnswerGrid(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    const startY = 75;
    const bubbleRadius = 2.5;
    const questionSpacing = 8;
    const optionSpacing = 7;
    const columnWidth = 45;
    const numColumns = Math.ceil(this.config.numQuestions / this.config.questionsPerColumn);
    
    const options = ['الف', 'ب', 'ج', 'د'];
    
    // Calculate starting X to center the grid
    const totalWidth = numColumns * columnWidth;
    let startX = (pageWidth - totalWidth) / 2;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    for (let col = 0; col < numColumns; col++) {
      const colStartX = startX + (col * columnWidth);
      
      for (let q = 0; q < this.config.questionsPerColumn; q++) {
        const questionNum = (col * this.config.questionsPerColumn) + q + 1;
        
        if (questionNum > this.config.numQuestions) break;
        
        const y = startY + (q * questionSpacing);
        
        // Question number
        pdf.text(`${questionNum}`, colStartX, y + 1.5);
        
        // Draw bubbles for options
        for (let opt = 0; opt < this.config.optionsPerQuestion; opt++) {
          const bubbleX = colStartX + 8 + (opt * optionSpacing);
          
          // Option label
          pdf.setFontSize(7);
          pdf.text(options[opt], bubbleX - 1, y - 2);
          
          // Bubble circle
          pdf.setLineWidth(0.3);
          pdf.circle(bubbleX, y, bubbleRadius);
        }
      }
      
      // Column separator
      if (col < numColumns - 1) {
        pdf.setLineWidth(0.1);
        pdf.setDrawColor(200);
        pdf.line(colStartX + columnWidth - 2, startY - 5, colStartX + columnWidth - 2, startY + (this.config.questionsPerColumn * questionSpacing));
        pdf.setDrawColor(0);
      }
    }

    // Grid border
    pdf.setLineWidth(0.5);
    pdf.rect(startX - 5, startY - 8, totalWidth + 10, (this.config.questionsPerColumn * questionSpacing) + 5);
  }

  private drawFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100);
    pdf.text('لطفاً حباب‌ها را کاملاً پر کنید', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.setTextColor(0);
  }
}

// Helper function to download PDF
export const downloadPDF = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
