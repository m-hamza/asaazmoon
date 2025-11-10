/**
 * Image preprocessing utilities for OMR
 * Handles grayscale conversion, noise reduction, thresholding
 */

import { ImageProcessingConfig } from './types';

export class ImagePreprocessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ImageProcessingConfig;

  constructor(config?: Partial<ImageProcessingConfig>) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    this.config = {
      gaussianBlurRadius: 3,
      adaptiveThresholdBlockSize: 35,
      morphologyKernelSize: 3,
      minBubbleArea: 100,
      maxBubbleArea: 5000,
      ...config,
    };
  }

  /**
   * Convert image to grayscale
   */
  toGrayscale(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const gray = new ImageData(width, height);
    
    for (let i = 0; i < data.length; i += 4) {
      // Use luminosity method for better grayscale conversion
      const gray_value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray.data[i] = gray.data[i + 1] = gray.data[i + 2] = gray_value;
      gray.data[i + 3] = 255;
    }
    
    return gray;
  }

  /**
   * Apply Gaussian blur to reduce noise
   */
  gaussianBlur(imageData: ImageData, radius?: number): ImageData {
    const blurRadius = radius || this.config.gaussianBlurRadius;
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    
    // Create Gaussian kernel
    const kernel = this.createGaussianKernel(blurRadius);
    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const nx = x + kx - halfKernel;
            const ny = y + ky - halfKernel;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              const weight = kernel[ky][kx];
              sum += data[idx] * weight;
              weightSum += weight;
            }
          }
        }
        
        const idx = (y * width + x) * 4;
        const value = weightSum > 0 ? sum / weightSum : data[idx];
        output.data[idx] = output.data[idx + 1] = output.data[idx + 2] = value;
        output.data[idx + 3] = 255;
      }
    }
    
    return output;
  }

  /**
   * Create Gaussian kernel for blur
   */
  private createGaussianKernel(radius: number): number[][] {
    const size = radius * 2 + 1;
    const kernel: number[][] = [];
    const sigma = radius / 3;
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        kernel[y][x] = value;
        sum += value;
      }
    }
    
    // Normalize kernel
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }
    
    return kernel;
  }

  /**
   * Apply adaptive threshold for better bubble detection
   */
  adaptiveThreshold(imageData: ImageData, blockSize?: number): ImageData {
    const thresholdBlockSize = blockSize || this.config.adaptiveThresholdBlockSize;
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const halfBlock = Math.floor(thresholdBlockSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate local mean
        let sum = 0;
        let count = 0;
        
        for (let dy = -halfBlock; dy <= halfBlock; dy++) {
          for (let dx = -halfBlock; dx <= halfBlock; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += data[(ny * width + nx) * 4];
              count++;
            }
          }
        }
        
        const mean = count > 0 ? sum / count : 128;
        const idx = (y * width + x) * 4;
        
        // Apply threshold with bias for better bubble detection
        const bias = 10;
        const value = data[idx] < mean - bias ? 0 : 255;
        
        output.data[idx] = output.data[idx + 1] = output.data[idx + 2] = value;
        output.data[idx + 3] = 255;
      }
    }
    
    return output;
  }

  /**
   * Apply morphological operations to clean up image
   */
  morphologyClose(imageData: ImageData, kernelSize?: number): ImageData {
    const kSize = kernelSize || this.config.morphologyKernelSize;
    
    // Dilation followed by erosion
    let result = this.dilate(imageData, kSize);
    result = this.erode(result, kSize);
    
    return result;
  }

  /**
   * Dilate operation - expands white regions
   */
  private dilate(imageData: ImageData, kernelSize: number): ImageData {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const halfKernel = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxValue = 0;
        
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const nx = x + kx;
            const ny = y + ky;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              maxValue = Math.max(maxValue, data[idx]);
            }
          }
        }
        
        const idx = (y * width + x) * 4;
        output.data[idx] = output.data[idx + 1] = output.data[idx + 2] = maxValue;
        output.data[idx + 3] = 255;
      }
    }
    
    return output;
  }

  /**
   * Erode operation - shrinks white regions
   */
  private erode(imageData: ImageData, kernelSize: number): ImageData {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const halfKernel = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minValue = 255;
        
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const nx = x + kx;
            const ny = y + ky;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              minValue = Math.min(minValue, data[idx]);
            }
          }
        }
        
        const idx = (y * width + x) * 4;
        output.data[idx] = output.data[idx + 1] = output.data[idx + 2] = minValue;
        output.data[idx + 3] = 255;
      }
    }
    
    return output;
  }

  /**
   * Complete preprocessing pipeline
   */
  preprocess(imageData: ImageData): ImageData {
    let processed = this.toGrayscale(imageData);
    processed = this.gaussianBlur(processed);
    processed = this.adaptiveThreshold(processed);
    
    return processed;
  }
}
