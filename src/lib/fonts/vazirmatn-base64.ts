/**
 * Vazirmatn Font Loader for jsPDF
 * Loads Persian/Farsi font to support proper text rendering in PDFs
 */

export const loadVazirmFontBase64 = async (): Promise<string> => {
  try {
    const response = await fetch('/fonts/Vazirmatn-Regular.ttf');
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 part (remove "data:font/ttf;base64," prefix)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading Vazirmatn font:', error);
    throw error;
  }
};
