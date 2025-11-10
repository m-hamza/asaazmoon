/**
 * Bubble detection and analysis for OMR answer sheets
 */

import { DetectedBubble, BubbleRegion, AnswerSheetConfig } from './types';

export class BubbleDetector {
  private config: AnswerSheetConfig;

  constructor(config: AnswerSheetConfig) {
    this.config = config;
  }

  /**
   * Detect filled bubbles in predefined regions
   */
  detectFilledBubbles(
    binaryImage: ImageData,
    bubbleLayout: BubbleRegion[][],
  ): DetectedBubble[] {
    const detectedBubbles: DetectedBubble[] = [];
    const { width, data } = binaryImage;
    
    bubbleLayout.forEach((questionBubbles, questionIndex) => {
      questionBubbles.forEach((bubbleRegion, optionIndex) => {
        const darkness = this.calculateBubbleDarkness(data, width, bubbleRegion);
        const isFilled = darkness > this.config.bubbleFillThreshold;
        
        detectedBubbles.push({
          region: bubbleRegion,
          questionNumber: questionIndex + 1,
          option: this.config.options[optionIndex],
          darkness,
          isFilled,
        });
      });
    });
    
    return detectedBubbles;
  }

  /**
   * Calculate darkness/fill level of a bubble region
   * Returns value between 0 (empty) and 1 (completely filled)
   */
  private calculateBubbleDarkness(
    data: Uint8ClampedArray,
    imageWidth: number,
    region: BubbleRegion
  ): number {
    let darkPixels = 0;
    let totalPixels = 0;
    
    // Sample the center 70% of the bubble to avoid edge artifacts
    const padding = 0.15;
    const startX = Math.floor(region.x + region.width * padding);
    const endX = Math.floor(region.x + region.width * (1 - padding));
    const startY = Math.floor(region.y + region.height * padding);
    const endY = Math.floor(region.y + region.height * (1 - padding));
    
    // Use circular sampling for better bubble detection
    const centerX = region.centerX;
    const centerY = region.centerY;
    const radius = Math.min(region.width, region.height) * (1 - padding) / 2;
    const radiusSquared = radius * radius;
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        // Check if pixel is within circular region
        const dx = x - centerX;
        const dy = y - centerY;
        
        if (dx * dx + dy * dy <= radiusSquared) {
          const index = (y * imageWidth + x) * 4;
          const brightness = data[index];
          
          // Dark pixels (filled areas) have low brightness in binary image
          if (brightness < 128) {
            darkPixels++;
          }
          totalPixels++;
        }
      }
    }
    
    return totalPixels > 0 ? darkPixels / totalPixels : 0;
  }

  /**
   * Determine selected answer for each question
   * Returns the option with highest darkness if above threshold
   */
  determineAnswers(detectedBubbles: DetectedBubble[], numQuestions: number): string[] {
    const answers: string[] = [];
    
    for (let q = 0; q < numQuestions; q++) {
      const questionNumber = q + 1;
      const questionBubbles = detectedBubbles.filter(
        b => b.questionNumber === questionNumber
      );
      
      if (questionBubbles.length === 0) {
        answers.push('A'); // Default fallback
        continue;
      }
      
      // Find the darkest (most filled) bubble
      const sortedBubbles = [...questionBubbles].sort((a, b) => b.darkness - a.darkness);
      const darkestBubble = sortedBubbles[0];
      
      // Check if the darkest bubble is actually filled
      if (darkestBubble.isFilled) {
        answers.push(darkestBubble.option);
      } else {
        // No bubble filled - use default or the darkest one anyway
        answers.push(darkestBubble.option);
      }
    }
    
    return answers;
  }

  /**
   * Detect bubbles using contour detection (alternative method)
   * Useful when bubble positions are not precisely known
   */
  detectBubblesUsingContours(
    binaryImage: ImageData,
    expectedCount: number
  ): BubbleRegion[] {
    // This is a simplified contour detection
    // In production, you might want to use a more sophisticated algorithm
    const regions: BubbleRegion[] = [];
    const { width, height, data } = binaryImage;
    const visited = new Set<string>();
    
    const minArea = this.config.bubbleRadius * this.config.bubbleRadius * Math.PI * 0.5;
    const maxArea = minArea * 4;
    
    // Scan for blob regions
    for (let y = 0; y < height; y += 5) {
      for (let x = 0; x < width; x += 5) {
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        
        const idx = (y * width + x) * 4;
        if (data[idx] < 128) { // Dark pixel
          const blob = this.floodFill(data, width, height, x, y, visited);
          
          if (blob.area >= minArea && blob.area <= maxArea) {
            const region: BubbleRegion = {
              x: blob.minX,
              y: blob.minY,
              width: blob.maxX - blob.minX,
              height: blob.maxY - blob.minY,
              centerX: Math.floor((blob.minX + blob.maxX) / 2),
              centerY: Math.floor((blob.minY + blob.maxY) / 2),
            };
            regions.push(region);
            
            if (regions.length >= expectedCount) {
              return regions;
            }
          }
        }
      }
    }
    
    return regions;
  }

  /**
   * Simple flood fill to detect blob regions
   */
  private floodFill(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<string>
  ): { area: number; minX: number; maxX: number; minY: number; maxY: number } {
    const stack: Array<[number, number]> = [[startX, startY]];
    let area = 0;
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;
    
    const maxIterations = 1000; // Prevent infinite loops
    let iterations = 0;
    
    while (stack.length > 0 && iterations < maxIterations) {
      iterations++;
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const idx = (y * width + x) * 4;
      if (data[idx] >= 128) continue; // Not a dark pixel
      
      visited.add(key);
      area++;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Add neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    return { area, minX, maxX, minY, maxY };
  }
}
