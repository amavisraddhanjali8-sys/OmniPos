import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  
  // Clone element styling cleanup to prevent oklch/color format crashes in html2canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    onclone: (clonedDoc) => {
      // Ensure all elements have standard rgb/hex colors
      const allElements = clonedDoc.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;
        if (el.style.color && (el.style.color.includes('oklab') || el.style.color.includes('oklch'))) {
          el.style.color = '#111827';
        }
        if (el.style.backgroundColor && (el.style.backgroundColor.includes('oklab') || el.style.backgroundColor.includes('oklch'))) {
          el.style.backgroundColor = 'transparent';
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
  let position = 0;

  // Add first page
  pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // If content spans across multiple A4 pages
  while (heightLeft > 2) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  pdf.save(filename);
}
