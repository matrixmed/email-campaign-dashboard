// exportUtils.js
const EXPORT_CONFIG = {
  width: 1280,
  height: 720,
  scale: 2,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#e8e9ea',
  logging: false
};

const ERROR_MESSAGES = {
  NO_ELEMENT: 'Canvas element not found',
  RENDER_FAILED: 'Failed to render canvas',
  DOWNLOAD_FAILED: 'Failed to download image',
  HTML2CANVAS_MISSING: 'html2canvas library not available'
};

async function loadHtml2Canvas() {
  try {
    // Try to import html2canvas dynamically
    const html2canvas = await import('html2canvas');
    return html2canvas.default || html2canvas;
  } catch (error) {
    // Fallback: try to use global html2canvas if available
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
    return await html2canvas(element, config);
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
    link.href = canvas.toDataURL('image/png');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    scale: 3,
    backgroundColor: '#ffffff'
  },
  presentation: {
    scale: 2,
    backgroundColor: '#e8e9ea'
  },
  web_optimized: {
    scale: 1,
    backgroundColor: '#e8e9ea'
  }
};