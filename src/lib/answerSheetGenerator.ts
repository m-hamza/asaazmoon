/**
 * Answer Sheet PDF Generator
 * Creates printable answer sheets with QR codes for student identification
 * Optimized for Persian language support and OMR detection
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { StoredStudent } from './storage';
import { loadVazirmFontBase64 } from './fonts/vazirmatn-base64';

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
  numQuestions: 120,
  questionsPerColumn: 30,
  optionsPerQuestion: 4,
};

export class AnswerSheetGenerator {
  private config: AnswerSheetConfig;
  private fontLoaded: boolean = false;

  constructor(config: Partial<AnswerSheetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load Persian font into jsPDF
   */
  private async loadPersianFont(pdf: jsPDF): Promise<void> {
    if (this.fontLoaded) return;
    
    try {
      const fontBase64 = await loadVazirmFontBase64();
      pdf.addFileToVFS('Vazirmatn-Regular.ttf', fontBase64);
      pdf.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
      pdf.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'bold');
      this.fontLoaded = true;
    } catch (error) {
      console.error('Failed to load Persian font:', error);
      throw new Error('فونت فارسی بارگذاری نشد');
    }
  }

  async generateForStudent(student: StoredStudent): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Load Persian font first
    await this.loadPersianFont(pdf);
    pdf.setFont('Vazirmatn', 'normal');
    
    await this.drawAnswerSheet(pdf, student);
    return pdf.output('blob');
  }

  async generateForMultipleStudents(students: StoredStudent[]): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Load Persian font once for all pages
    await this.loadPersianFont(pdf);
    pdf.setFont('Vazirmatn', 'normal');

    for (let i = 0; i < students.length; i++) {
      if (i > 0) {
        pdf.addPage();
        pdf.setFont('Vazirmatn', 'normal');
      }
      await this.drawAnswerSheet(pdf, students[i]);
    }

    return pdf.output('blob');
  }

  private async drawAnswerSheet(pdf: jsPDF, student: StoredStudent): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add border around entire page
    pdf.setLineWidth(0.8);
    pdf.rect(8, 8, pageWidth - 16, pageHeight - 16);
    
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
    const headerStartY = 15;
    
    // School Name - centered and bold
    if (this.config.schoolName) {
      pdf.setFontSize(18);
      pdf.setFont('Vazirmatn', 'bold');
      this.drawPersianText(pdf, this.config.schoolName, pageWidth / 2, headerStartY, 'center');
    }

    // Exam Title
    if (this.config.examTitle) {
      pdf.setFontSize(14);
      pdf.setFont('Vazirmatn', 'bold');
      this.drawPersianText(pdf, this.config.examTitle, pageWidth / 2, headerStartY + 7, 'center');
    }

    // Subject and Date on same line
    pdf.setFontSize(11);
    pdf.setFont('Vazirmatn', 'normal');
    const infoY = headerStartY + 14;
    
    if (this.config.subject) {
      this.drawPersianText(pdf, `درس: ${this.config.subject}`, pageWidth - 15, infoY, 'right');
    }
    if (this.config.date) {
      this.drawPersianText(pdf, `تاریخ: ${this.config.date}`, 15, infoY, 'left');
    }

    // Separator line
    pdf.setLineWidth(0.5);
    pdf.line(12, infoY + 3, pageWidth - 12, infoY + 3);
  }

  private async drawStudentInfo(pdf: jsPDF, student: StoredStudent, pageWidth: number): Promise<void> {
    const startY = 38;
    const boxHeight = 30;
    
    // Draw info box border
    pdf.setLineWidth(0.5);
    pdf.rect(12, startY, pageWidth - 24, boxHeight);
    
    // Generate QR Code with student data
    const qrData = JSON.stringify({
      id: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      class: student.className
    });
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: 'H'
      });
      
      // Draw QR Code on the left side
      const qrSize = 24;
      pdf.addImage(qrCodeDataUrl, 'PNG', 15, startY + 3, qrSize, qrSize);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Student Info on the right side - RTL layout
    pdf.setFontSize(12);
    pdf.setFont('Vazirmatn', 'bold');
    
    const infoX = pageWidth - 15;
    let infoY = startY + 8;
    
    this.drawPersianText(pdf, `کد داوطلب: ${student.studentId}`, infoX, infoY, 'right');
    infoY += 7;
    
    this.drawPersianText(pdf, `نام: ${student.firstName}`, infoX, infoY, 'right');
    infoY += 7;
    
    this.drawPersianText(pdf, `نام خانوادگی: ${student.lastName}`, infoX, infoY, 'right');
    infoY += 7;
    
    this.drawPersianText(pdf, `کلاس: ${student.className}`, infoX, infoY, 'right');
  }

  private drawAnswerGrid(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    const startY = 75;
    const bubbleRadius = 2.2;
    const questionSpacing = 6;
    const optionSpacing = 8;
    const numColumns = 4; // Fixed 4 columns for 120 questions
    const columnWidth = 45;
    
    // Persian option labels - clearly visible
    const options = ['الف', 'ب', 'ج', 'د'];
    
    // Center the grid
    const totalWidth = numColumns * columnWidth;
    const startX = (pageWidth - totalWidth) / 2;

    // Draw column headers
    pdf.setFontSize(9);
    pdf.setFont('Vazirmatn', 'bold');
    
    for (let col = 0; col < numColumns; col++) {
      const colStartX = startX + (col * columnWidth);
      
      // Column header with option labels
      let headerX = colStartX + 12;
      for (let opt = 0; opt < this.config.optionsPerQuestion; opt++) {
        const optX = headerX + (opt * optionSpacing);
        this.drawPersianText(pdf, options[opt], optX, startY - 3, 'center');
      }
    }

    // Draw grid
    pdf.setFont('Vazirmatn', 'normal');
    
    for (let col = 0; col < numColumns; col++) {
      const colStartX = startX + (col * columnWidth);
      
      for (let q = 0; q < this.config.questionsPerColumn; q++) {
        const questionNum = (col * this.config.questionsPerColumn) + q + 1;
        
        if (questionNum > this.config.numQuestions) break;
        
        const y = startY + 2 + (q * questionSpacing);
        
        // Question number - larger and clearer
        pdf.setFontSize(8);
        pdf.setFont('Vazirmatn', 'bold');
        pdf.text(`${questionNum}`, colStartX + 2, y + 1.5);
        
        // Draw bubbles for options
        pdf.setFont('Vazirmatn', 'normal');
        for (let opt = 0; opt < this.config.optionsPerQuestion; opt++) {
          const bubbleX = colStartX + 12 + (opt * optionSpacing);
          
          // Bubble circle - thicker for better detection
          pdf.setLineWidth(0.4);
          pdf.setDrawColor(0);
          pdf.circle(bubbleX, y, bubbleRadius);
        }
      }
      
      // Column separator line
      if (col < numColumns - 1) {
        pdf.setLineWidth(0.2);
        pdf.setDrawColor(150);
        const sepX = colStartX + columnWidth - 2;
        pdf.line(sepX, startY - 6, sepX, startY + (this.config.questionsPerColumn * questionSpacing) + 2);
        pdf.setDrawColor(0);
      }
    }

    // Grid border
    pdf.setLineWidth(0.6);
    pdf.setDrawColor(0);
    pdf.rect(
      startX - 3, 
      startY - 8, 
      totalWidth + 6, 
      (this.config.questionsPerColumn * questionSpacing) + 8
    );
  }

  private drawFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    pdf.setFontSize(9);
    pdf.setFont('Vazirmatn', 'bold');
    pdf.setTextColor(50);
    
    this.drawPersianText(
      pdf,
      'لطفاً حباب‌ها را به صورت کامل و با دقت پر کنید',
      pageWidth / 2,
      pageHeight - 12,
      'center'
    );
    
    pdf.setTextColor(0);
  }

  /**
   * Helper method to draw Persian text with better rendering
   * Handles RTL text direction and proper character spacing
   */
  private drawPersianText(
    pdf: jsPDF, 
    text: string, 
    x: number, 
    y: number, 
    align: 'left' | 'center' | 'right' = 'left'
  ): void {
    // Clean the text and ensure proper encoding
    const cleanText = text.trim();
    
    try {
      pdf.text(cleanText, x, y, { 
        align: align,
        charSpace: 0.2,
        renderingMode: 'fill'
      });
    } catch (error) {
      // Fallback to basic text rendering if advanced options fail
      pdf.text(cleanText, x, y, { align: align });
    }
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
