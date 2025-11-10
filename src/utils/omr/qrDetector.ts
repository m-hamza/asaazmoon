/**
 * QR Code detection for student identification
 */

import jsQR from 'jsqr';
import { StudentInfo } from './types';

export class QRDetector {
  /**
   * Detect and decode QR code from image
   */
  detectQRCode(imageData: ImageData): StudentInfo | null {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code && code.data) {
        return this.parseQRData(code.data);
      }
    } catch (error) {
      console.error('QR detection error:', error);
    }
    
    return null;
  }

  /**
   * Parse QR code data into StudentInfo
   * Supports multiple formats:
   * 1. JSON format: {"studentId": "...", "studentName": "...", ...}
   * 2. Pipe-separated: "studentId|studentName|testId|testDate|grade"
   * 3. Comma-separated: "studentId,studentName,testId,testDate,grade"
   */
  private parseQRData(data: string): StudentInfo | null {
    try {
      // Try JSON format first
      if (data.trim().startsWith('{')) {
        const parsed = JSON.parse(data);
        return {
          studentId: parsed.studentId || parsed.id || parsed.student_id || 'Unknown',
          studentName: parsed.studentName || parsed.name || parsed.student_name || 'Unknown',
          testId: parsed.testId || parsed.test || parsed.test_id || 'Unknown',
          testDate: parsed.testDate || parsed.date || parsed.test_date,
          grade: parsed.grade || parsed.class || parsed.level,
        };
      }
      
      // Try pipe-separated format
      if (data.includes('|')) {
        const parts = data.split('|').map(p => p.trim());
        return {
          studentId: parts[0] || 'Unknown',
          studentName: parts[1] || 'Unknown',
          testId: parts[2] || 'Unknown',
          testDate: parts[3],
          grade: parts[4],
        };
      }
      
      // Try comma-separated format
      if (data.includes(',')) {
        const parts = data.split(',').map(p => p.trim());
        return {
          studentId: parts[0] || 'Unknown',
          studentName: parts[1] || 'Unknown',
          testId: parts[2] || 'Unknown',
          testDate: parts[3],
          grade: parts[4],
        };
      }
      
      // If no separator found, treat as student ID only
      return {
        studentId: data.trim(),
        studentName: 'Unknown',
        testId: 'Unknown',
      };
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return null;
    }
  }

  /**
   * Search for QR code in specific regions of the image
   * (typically top corners for Iranian answer sheets)
   */
  detectQRInRegions(imageData: ImageData, regions: Array<{x: number, y: number, width: number, height: number}>): StudentInfo | null {
    for (const region of regions) {
      const regionData = this.extractRegion(imageData, region);
      const result = this.detectQRCode(regionData);
      if (result) {
        return result;
      }
    }
    return null;
  }

  /**
   * Extract a region from the image
   */
  private extractRegion(
    imageData: ImageData,
    region: {x: number, y: number, width: number, height: number}
  ): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = region.width;
    canvas.height = region.height;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(
      tempCanvas,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );
    
    return ctx.getImageData(0, 0, region.width, region.height);
  }
}
