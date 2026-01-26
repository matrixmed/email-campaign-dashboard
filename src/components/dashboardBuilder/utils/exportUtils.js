import html2pdf from 'html2pdf.js';

const EXPORT_CONFIG = {
  width: 1024,
  height: 576,
  scale: 3,
  useCORS: true,
  allowTaint: true,
  backgroundColor: null,
  logging: false,
  imageTimeout: 15000,
  removeContainer: true,
  windowWidth: 1024,
  windowHeight: 576,
  ignoreElements: (element) => {
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

    const images = element.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, config.imageTimeout || 15000);
        });
      })
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, config);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

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

    link.href = canvas.toDataURL('image/png');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

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
    return { success: false, error: error.message };
  }
}

export async function exportAsPDF(canvasRef, campaignName, options = {}) {
  const innerElement = canvasRef?.current;
  if (!innerElement) {
    return { success: false, error: 'Canvas element not found' };
  }

  const element = innerElement.parentElement || innerElement;

  try {
    const filename = generateFilename(campaignName);

    const images = element.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 5000);
        });
      })
    );

    await new Promise(resolve => setTimeout(resolve, 300));

    const computedStyle = window.getComputedStyle(element);
    const originalBackground = computedStyle.background;
    const originalBoxShadow = computedStyle.boxShadow;
    const originalBorderRadius = computedStyle.borderRadius;

    const pdfOptions = {
      margin: [20, 20, 20, 20],
      filename: `${filename}.pdf`,
      image: { type: 'png', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f0f2f5',
        logging: false,
        windowWidth: 1200,
        windowHeight: 800,
        scrollX: 0,
        scrollY: -window.scrollY,
        ignoreElements: (el) => {
          return el.classList?.contains('alignment-guide') ||
                 el.classList?.contains('selection-box') ||
                 el.classList?.contains('multi-select-toolbar') ||
                 el.classList?.contains('resize-handle');
        },
        onclone: (clonedDoc, clonedElement) => {
          clonedElement.style.width = '1024px';
          clonedElement.style.height = '576px';
          clonedElement.style.maxWidth = '1024px';
          clonedElement.style.maxHeight = '576px';
          clonedElement.style.overflow = 'visible';
          clonedElement.style.position = 'relative';

          clonedElement.style.background = originalBackground || 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
          clonedElement.style.boxShadow = originalBoxShadow || '0 10px 40px rgba(0, 0, 0, 0.15)';
          clonedElement.style.borderRadius = originalBorderRadius || '16px';

          clonedElement.style.backdropFilter = 'none';
          clonedElement.style.webkitBackdropFilter = 'none';

          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach(el => {
            if (el.style) {
              el.style.backdropFilter = 'none';
              el.style.webkitBackdropFilter = 'none';
            }
          });
        }
      },
      jsPDF: {
        unit: 'px',
        format: [1064, 616],
        orientation: 'landscape',
        hotfixes: ['px_scaling']
      }
    };

    await html2pdf().set(pdfOptions).from(element).save();

    return { success: true, filename };
  } catch (error) {
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
    scale: 4,
    backgroundColor: '#ffffff'
  },
  presentation: {
    width: 1024,
    height: 576,
    scale: 3,
    backgroundColor: '#ffffff'
  },
  web_optimized: {
    width: 1024,
    height: 576,
    scale: 2, 
    backgroundColor: '#ffffff'
  }
};