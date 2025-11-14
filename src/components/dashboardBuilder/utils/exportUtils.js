const EXPORT_CONFIG = {
  width: 1024,
  height: 576,
  scale: 3, // High quality
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff', // White background
  logging: false,
  imageTimeout: 15000,
  removeContainer: false,
  windowWidth: 1024,
  windowHeight: 576,
  ignoreElements: (element) => {
    // Ignore alignment guides, selection boxes, and other UI elements
    return element.classList?.contains('alignment-guide') ||
           element.classList?.contains('selection-box') ||
           element.classList?.contains('multi-select-toolbar');
  }
};

const ERROR_MESSAGES = {
  NO_ELEMENT: 'Canvas element not found',
  RENDER_FAILED: 'Failed to render canvas',
  DOWNLOAD_FAILED: 'Failed to download image',
  HTML2CANVAS_MISSING: 'html2canvas library not available'
};

async function loadHtml2Canvas() {
  try {
    const html2canvas = await import('html2canvas');
    return html2canvas.default || html2canvas;
  } catch (error) {
    if (typeof window !== 'undefined' && window.html2canvas) {
      return window.html2canvas;
    }
    throw new Error(ERROR_MESSAGES.HTML2CANVAS_MISSING);
  }
}

async function renderCanvas(element, options = {}) {
  if (!element) {
    throw new Error(ERROR_MESSAGES.NO_ELEMENT);
  }

  const config = { ...EXPORT_CONFIG, ...options };

  try {
    const html2canvas = await loadHtml2Canvas();

    // Ensure all images are loaded before rendering
    const images = element.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails
          setTimeout(resolve, config.imageTimeout || 15000); // Timeout fallback
        });
      })
    );

    // Wait a bit for any animations to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Render with html2canvas
    const canvas = await html2canvas(element, config);

    // Apply post-processing for quality and rounded corners
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Create a new canvas with rounded corners
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');

    // Fill with white background
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Apply rounded corners (16px * scale)
    const cornerRadius = 16 * config.scale;
    finalCtx.beginPath();
    finalCtx.moveTo(cornerRadius, 0);
    finalCtx.lineTo(finalCanvas.width - cornerRadius, 0);
    finalCtx.quadraticCurveTo(finalCanvas.width, 0, finalCanvas.width, cornerRadius);
    finalCtx.lineTo(finalCanvas.width, finalCanvas.height - cornerRadius);
    finalCtx.quadraticCurveTo(finalCanvas.width, finalCanvas.height, finalCanvas.width - cornerRadius, finalCanvas.height);
    finalCtx.lineTo(cornerRadius, finalCanvas.height);
    finalCtx.quadraticCurveTo(0, finalCanvas.height, 0, finalCanvas.height - cornerRadius);
    finalCtx.lineTo(0, cornerRadius);
    finalCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
    finalCtx.closePath();
    finalCtx.clip();

    // Draw the original canvas onto the clipped canvas
    finalCtx.drawImage(canvas, 0, 0);

    return finalCanvas;
  } catch (error) {
    if (error.message === ERROR_MESSAGES.HTML2CANVAS_MISSING) {
      throw error;
    }
    throw new Error(`${ERROR_MESSAGES.RENDER_FAILED}: ${error.message}`);
  }
}

function downloadCanvasAsImage(canvas, filename = 'dashboard') {
  try {
    const link = document.createElement('a');
    link.download = `${filename}.png`;

    // Use maximum quality PNG export
    // The quality parameter doesn't apply to PNG (lossless format)
    // but we ensure we're using PNG for best quality
    link.href = canvas.toDataURL('image/png');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 100);
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.DOWNLOAD_FAILED}: ${error.message}`);
  }
}

function generateFilename(campaignName) {
  if (!campaignName) return 'dashboard';
  
  return campaignName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export async function exportDashboard(canvasRef, campaignName, options = {}) {
  const element = canvasRef?.current;
  
  try {
    const canvas = await renderCanvas(element, options);
    const filename = generateFilename(campaignName);
    downloadCanvasAsImage(canvas, filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
}

export async function exportAsBlob(canvasRef, options = {}) {
  const element = canvasRef?.current;
  
  try {
    const canvas = await renderCanvas(element, options);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({ success: true, blob });
      }, 'image/png');
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function previewImage(canvasRef, onPreview, options = {}) {
  return renderCanvas(canvasRef?.current, options)
    .then(canvas => {
      const dataURL = canvas.toDataURL('image/png');
      onPreview(dataURL);
      return { success: true, dataURL };
    })
    .catch(error => ({ success: false, error: error.message }));
}

export const EXPORT_PRESETS = {
  high_quality: {
    width: 1024,
    height: 576,
    scale: 4, // Very high quality for printing
    backgroundColor: '#ffffff'
  },
  presentation: {
    width: 1024,
    height: 576,
    scale: 3, // Good balance of quality and file size
    backgroundColor: '#ffffff'
  },
  web_optimized: {
    width: 1024,
    height: 576,
    scale: 2, // Smaller file size for web
    backgroundColor: '#ffffff'
  }
};