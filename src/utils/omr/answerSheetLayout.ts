/**
 * Answer sheet layout configuration
 * Defines the structure of Iranian standard answer sheets
 */

import { AnswerSheetConfig, BubbleRegion } from './types';

export class AnswerSheetLayout {
  private config: AnswerSheetConfig;

  constructor(config: Partial<AnswerSheetConfig>) {
    this.config = {
      numQuestions: config.numQuestions || 120,
      optionsPerQuestion: config.optionsPerQuestion || 4,
      bubbleRadius: config.bubbleRadius || 15,
      columnsPerPage: config.columnsPerPage || 4, // 4 columns for 120 questions
      bubbleFillThreshold: config.bubbleFillThreshold || 0.3,
      options: config.options || ['الف', 'ب', 'ج', 'د'], // Persian options
      ...config,
    };
  }

  /**
   * Generate expected bubble positions for a standard answer sheet
   * Iranian sheets typically have 2-3 columns with bubbles arranged vertically
   */
  generateBubbleLayout(imageWidth: number, imageHeight: number): BubbleRegion[][] {
    const { numQuestions, optionsPerQuestion, columnsPerPage } = this.config;
    
    // Calculate layout dimensions
    const questionsPerColumn = Math.ceil(numQuestions / columnsPerPage);
    const columnWidth = imageWidth / columnsPerPage;
    
    // Margins and spacing - adjusted for 4 column layout with 120 questions
    const topMargin = imageHeight * 0.18; // Account for header/QR code/student info area
    const bottomMargin = imageHeight * 0.12; // Account for footer with instructions
    const leftMargin = columnWidth * 0.12;
    const rightMargin = columnWidth * 0.08;
    
    const availableHeight = imageHeight - topMargin - bottomMargin;
    const rowHeight = availableHeight / questionsPerColumn;
    
    const bubbleSpacing = (columnWidth - leftMargin - rightMargin) / (optionsPerQuestion + 1);
    const bubbleSize = Math.min(bubbleSpacing * 0.65, rowHeight * 0.65, 32);
    
    const layout: BubbleRegion[][] = [];
    
    for (let q = 0; q < numQuestions; q++) {
      const questionBubbles: BubbleRegion[] = [];
      
      const columnIndex = Math.floor(q / questionsPerColumn);
      const rowIndex = q % questionsPerColumn;
      
      const baseX = columnIndex * columnWidth + leftMargin;
      const baseY = topMargin + rowIndex * rowHeight;
      
      for (let opt = 0; opt < optionsPerQuestion; opt++) {
        const x = baseX + opt * bubbleSpacing;
        const y = baseY + rowHeight / 2 - bubbleSize / 2;
        
        questionBubbles.push({
          x: Math.floor(x),
          y: Math.floor(y),
          width: Math.floor(bubbleSize),
          height: Math.floor(bubbleSize),
          centerX: Math.floor(x + bubbleSize / 2),
          centerY: Math.floor(y + bubbleSize / 2),
        });
      }
      
      layout.push(questionBubbles);
    }
    
    return layout;
  }

  /**
   * Get QR code search regions (adjusted for new layout)
   */
  getQRCodeRegions(imageWidth: number, imageHeight: number): Array<{x: number, y: number, width: number, height: number}> {
    const qrSize = Math.min(imageWidth, imageHeight) * 0.12;
    
    return [
      // Left side in student info box
      {
        x: Math.floor(imageWidth * 0.05),
        y: Math.floor(imageHeight * 0.12),
        width: Math.floor(qrSize),
        height: Math.floor(qrSize),
      },
      // Top-left corner (fallback)
      {
        x: 15,
        y: 15,
        width: Math.floor(qrSize * 0.8),
        height: Math.floor(qrSize * 0.8),
      },
      // Top-right corner (fallback)
      {
        x: Math.floor(imageWidth - qrSize * 0.8 - 15),
        y: 15,
        width: Math.floor(qrSize * 0.8),
        height: Math.floor(qrSize * 0.8),
      },
    ];
  }

  getConfig(): AnswerSheetConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AnswerSheetConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
