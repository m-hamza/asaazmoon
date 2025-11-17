/**
 * Answer Sheet PDF Generator
 * Creates printable answer sheets with QR codes for student identification
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  numQuestions: 120,
  questionsPerColumn: 40,
  optionsPerQuestion: 4,
};

export class AnswerSheetGenerator {
  private config: AnswerSheetConfig;

  constructor(config: Partial<AnswerSheetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateForStudent(student: StoredStudent): Promise<Blob> {
    return await this.generateHTMLToPDF([student]);
  }

  async generateForMultipleStudents(students: StoredStudent[]): Promise<Blob> {
    return await this.generateHTMLToPDF(students);
  }

  private async generateHTMLToPDF(students: StoredStudent[]): Promise<Blob> {
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.fontFamily = 'Vazirmatn, sans-serif';
    document.body.appendChild(container);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    try {
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
          id: student.studentId,
          name: `${student.firstName} ${student.lastName}`,
          class: student.className
        }), {
          width: 200,
          margin: 1
        });

        // Create HTML for answer sheet
        const html = this.createAnswerSheetHTML(student, qrCodeDataUrl);
        container.innerHTML = html;

        // Convert to canvas
        const canvas = await html2canvas(container.firstChild as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 794, // A4 width in pixels at 96 DPI
          height: 1123 // A4 height in pixels at 96 DPI
        });

        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Add image to PDF (A4 size: 210x297mm)
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      return pdf.output('blob');
    } finally {
      document.body.removeChild(container);
    }
  }

  private createAnswerSheetHTML(student: StoredStudent, qrCodeUrl: string): string {
    const options = ['الف', 'ب', 'ج', 'د'];
    const numColumns = Math.ceil(this.config.numQuestions / this.config.questionsPerColumn);
    
    // Create columns HTML
    let columnsHTML = '';
    for (let col = 0; col < numColumns; col++) {
      let questionsHTML = '';
      for (let q = 0; q < this.config.questionsPerColumn; q++) {
        const questionNum = (col * this.config.questionsPerColumn) + q + 1;
        if (questionNum > this.config.numQuestions) break;
        
        const optionsHTML = options.map(opt => 
          `<div style="display: flex; flex-direction: column; align-items: center; margin: 0 4px;">
            <span style="font-size: 9px; margin-bottom: 2px;">${opt}</span>
            <div style="width: 16px; height: 16px; border: 1.5px solid #000; border-radius: 50%;"></div>
          </div>`
        ).join('');
        
        questionsHTML += `
          <div style="display: flex; align-items: center; margin-bottom: 8px; direction: rtl;">
            <span style="font-size: 11px; font-weight: 600; margin-left: 8px; min-width: 25px;">${questionNum}</span>
            <div style="display: flex; gap: 2px;">
              ${optionsHTML}
            </div>
          </div>
        `;
      }
      
      columnsHTML += `
        <div style="flex: 1; padding: 0 15px; ${col < numColumns - 1 ? 'border-left: 1px solid #ddd;' : ''}">
          ${questionsHTML}
        </div>
      `;
    }

    return `
      <div style="width: 794px; height: 1123px; padding: 40px; background: white; font-family: 'Vazirmatn', sans-serif; direction: rtl;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
          ${this.config.schoolName ? `<h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0;">${this.config.schoolName}</h1>` : ''}
          ${this.config.examTitle ? `<h2 style="font-size: 18px; font-weight: normal; margin: 0 0 10px 0;">${this.config.examTitle}</h2>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 10px;">
            ${this.config.subject ? `<span>درس: ${this.config.subject}</span>` : '<span></span>'}
            ${this.config.date ? `<span>تاریخ: ${this.config.date}</span>` : '<span></span>'}
          </div>
        </div>

        <!-- Student Info -->
        <div style="border: 2px solid #000; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="font-size: 15px; margin-bottom: 8px;">کد داوطلب: <strong>${student.studentId}</strong></div>
            <div style="font-size: 15px; margin-bottom: 8px;">نام و نام خانوادگی: <strong>${student.firstName} ${student.lastName}</strong></div>
            <div style="font-size: 15px;">کلاس: <strong>${student.className}</strong></div>
          </div>
          <img src="${qrCodeUrl}" style="width: 100px; height: 100px;" alt="QR Code" />
        </div>

        <!-- Answer Grid -->
        <div style="border: 2px solid #000; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; direction: rtl;">
            ${columnsHTML}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; font-size: 12px; color: #666; font-style: italic;">
          لطفاً حباب‌ها را کاملاً پر کنید
        </div>
      </div>
    `;
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
