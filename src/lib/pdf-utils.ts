import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Converts any CSS color (including modern oklab/oklch/color-mix)
 * to a standard sRGB hex or rgb/rgba string supported by html2canvas.
 */
function toStandardColor(colorStr: string, ctx: CanvasRenderingContext2D | null, fallback: string = '#1f2937'): string {
  if (!colorStr) return fallback;
  if (
    !colorStr.includes('oklab') && 
    !colorStr.includes('oklch') && 
    !colorStr.includes('color(') && 
    !colorStr.includes('color-mix')
  ) {
    return colorStr;
  }

  if (ctx) {
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      const converted = ctx.fillStyle;
      if (converted && !converted.includes('oklab') && !converted.includes('oklch')) {
        return converted;
      }
    } catch {
      // Ignore canvas error and fallback
    }
  }

  // Common fallbacks based on context
  if (colorStr.includes('transparent') || colorStr.includes('0%')) {
    return 'transparent';
  }
  if (colorStr.includes('white') || colorStr.includes('255')) {
    return '#ffffff';
  }
  return fallback;
}

/**
 * Exports an HTML element to a standard A4 PDF document
 * with proper margins, page-break handling, and error resiliency.
 */
export async function exportToPdf(
  element: HTMLElement, 
  filename: string = 'document.pdf',
  options?: {
    orientation?: 'portrait' | 'landscape';
    unit?: 'mm';
    format?: 'a4';
  }
) {
  const orientation = options?.orientation || 'portrait';
  
  // Create an offscreen canvas to compute and normalize modern CSS colors
  const scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = 1;
  scratchCanvas.height = 1;
  const ctx = scratchCanvas.getContext('2d');

  // Clone element styling cleanup to prevent oklab/oklch color format crashes in html2canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    onclone: (clonedDoc) => {
      // 1. Sanitize all <style> elements in the cloned document
      const styleTags = clonedDoc.querySelectorAll('style');
      styleTags.forEach((s) => {
        try {
          if (s.textContent) {
            s.textContent = s.textContent
              .replace(/color-mix\(in\s+oklab,\s*([^,]+),\s*([^)]+)\)/gi, '$1')
              .replace(/(?:oklab|oklch)\([^)]+\)/gi, (match) => {
                return toStandardColor(match, ctx, '#1f2937');
              });
          }
        } catch (e) {
          console.warn('Failed to sanitize style element:', e);
        }
      });

      // 2. Inject an override style sheet to remove transforms & ensure standard color handling
      const overrideStyle = clonedDoc.createElement('style');
      overrideStyle.textContent = `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        [data-print-root] {
          transform: none !important;
          box-shadow: none !important;
          margin: 0 auto !important;
        }
      `;
      clonedDoc.head.appendChild(overrideStyle);

      // 3. Clean up computed styles on all cloned DOM elements
      const win = clonedDoc.defaultView || window;
      const allElements = clonedDoc.getElementsByTagName('*');
      
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;
        try {
          const comp = win.getComputedStyle(el);

          // Color
          if (comp.color && (comp.color.includes('oklab') || comp.color.includes('oklch') || comp.color.includes('color('))) {
            el.style.color = toStandardColor(comp.color, ctx, '#111827');
          }

          // Background Color
          if (comp.backgroundColor && (comp.backgroundColor.includes('oklab') || comp.backgroundColor.includes('oklch') || comp.backgroundColor.includes('color('))) {
            el.style.backgroundColor = toStandardColor(comp.backgroundColor, ctx, 'transparent');
          }

          // Border Colors
          if (comp.borderColor && (comp.borderColor.includes('oklab') || comp.borderColor.includes('oklch'))) {
            el.style.borderColor = toStandardColor(comp.borderColor, ctx, '#e5e7eb');
          }
          if (comp.borderTopColor && (comp.borderTopColor.includes('oklab') || comp.borderTopColor.includes('oklch'))) {
            el.style.borderTopColor = toStandardColor(comp.borderTopColor, ctx, '#e5e7eb');
          }
          if (comp.borderRightColor && (comp.borderRightColor.includes('oklab') || comp.borderRightColor.includes('oklch'))) {
            el.style.borderRightColor = toStandardColor(comp.borderRightColor, ctx, '#e5e7eb');
          }
          if (comp.borderBottomColor && (comp.borderBottomColor.includes('oklab') || comp.borderBottomColor.includes('oklch'))) {
            el.style.borderBottomColor = toStandardColor(comp.borderBottomColor, ctx, '#e5e7eb');
          }
          if (comp.borderLeftColor && (comp.borderLeftColor.includes('oklab') || comp.borderLeftColor.includes('oklch'))) {
            el.style.borderLeftColor = toStandardColor(comp.borderLeftColor, ctx, '#e5e7eb');
          }

          // Outline & Text Decoration
          if (comp.outlineColor && (comp.outlineColor.includes('oklab') || comp.outlineColor.includes('oklch'))) {
            el.style.outlineColor = toStandardColor(comp.outlineColor, ctx, 'transparent');
          }
          if (comp.textDecorationColor && (comp.textDecorationColor.includes('oklab') || comp.textDecorationColor.includes('oklch'))) {
            el.style.textDecorationColor = toStandardColor(comp.textDecorationColor, ctx, '#111827');
          }

          // Box shadow - if it contains unsupported color functions, remove to prevent crash
          if (comp.boxShadow && (comp.boxShadow.includes('oklab') || comp.boxShadow.includes('oklch'))) {
            el.style.boxShadow = 'none';
          }

          // SVG fill & stroke
          if (el instanceof SVGElement) {
            const fill = comp.fill;
            if (fill && (fill.includes('oklab') || fill.includes('oklch'))) {
              el.style.fill = toStandardColor(fill, ctx, 'currentColor');
            }
            const stroke = comp.stroke;
            if (stroke && (stroke.includes('oklab') || stroke.includes('oklch'))) {
              el.style.stroke = toStandardColor(stroke, ctx, 'currentColor');
            }
          }
        } catch {
          // Continue gracefully if an element cannot be read
        }
      }
    }
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const imgProps = pdf.getImageProperties(canvas);
  const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = imgHeight;
  let page = 0;

  // Render first page
  pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;
  page++;

  // Handle multi-page content across A4 boundaries
  while (heightLeft > 2) {
    const position = -(page * pdfHeight);
    pdf.addPage();
    pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
    page++;
  }

  pdf.save(filename);
}
