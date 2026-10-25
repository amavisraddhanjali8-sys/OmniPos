
export const handleHtml2CanvasClone = (clonedDoc: Document) => {
  // Remove all existing style and link tags to prevent html2canvas from parsing them
  // and failing on oklab/oklch functions.
  // We do this because html2canvas tries to parse all stylesheets it finds.
  const styles = Array.from(clonedDoc.getElementsByTagName('style'));
  const links = Array.from(clonedDoc.getElementsByTagName('link'));
  
  styles.forEach(s => s.remove());
  links.forEach(l => l.remove());

  // Add a clean style block with only supported color formats
  const style = clonedDoc.createElement('style');
  style.innerHTML = `
    * { 
      color-scheme: light !important;
      box-sizing: border-box;
    }
    
    body {
      font-family: sans-serif;
      margin: 0;
      padding: 0;
      background: white;
    }

    /* Force hex colors for common print elements to avoid oklab/oklch parsing errors in html2canvas */
    .text-primary { color: #f62440 !important; }
    .bg-primary { background-color: #f62440 !important; }
    .border-primary { border-color: #f62440 !important; }
    .bg-gray-50 { background-color: #f9fafb !important; }
    .bg-gray-100 { background-color: #f3f4f6 !important; }
    .bg-gray-200 { background-color: #e5e7eb !important; }
    .bg-gray-900 { background-color: #111827 !important; }
    .bg-gray-50\\/50 { background-color: #fcfdfe !important; }
    .text-gray-100 { color: #f3f4f6 !important; }
    .text-gray-400 { color: #9ca3af !important; }
    .text-gray-500 { color: #6b7280 !important; }
    .text-gray-600 { color: #4b5563 !important; }
    .text-gray-700 { color: #374151 !important; }
    .text-gray-900 { color: #111827 !important; }
    .border-gray-100 { border-color: #f3f4f6 !important; }
    .border-gray-200 { border-color: #e5e7eb !important; }
    .divide-gray-100 > * + * { border-color: #f3f4f6 !important; }
    .divide-gray-50 > * + * { border-color: #f9fafb !important; }
    
    /* Ensure visibility of common elements */
    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .justify-between { justify-content: space-between !important; }
    .items-center { align-items: center !important; }
    .gap-2 { gap: 0.5rem !important; }
    .gap-4 { gap: 1rem !important; }
    .p-4 { padding: 1rem !important; }
    .p-6 { padding: 1.5rem !important; }
    .p-8 { padding: 2rem !important; }
    .m-0 { margin: 0 !important; }
    .w-full { width: 100% !important; }
    .h-full { height: 100% !important; }
    .rounded-xl { border-radius: 0.75rem !important; }
    .rounded-2xl { border-radius: 1rem !important; }
    .font-bold { font-weight: 700 !important; }
    .font-black { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase !important; }
    .text-xs { font-size: 0.75rem !important; }
    .text-sm { font-size: 0.875rem !important; }
    .text-lg { font-size: 1.125rem !important; }
    .text-xl { font-size: 1.25rem !important; }
    .text-2xl { font-size: 1.5rem !important; }
  `;
  clonedDoc.head.appendChild(style);

  // Traverse all elements and convert computed styles to inline styles
  // This is the most effective way to prevent html2canvas from parsing stylesheets
  // that might contain oklab/oklch/oklch-based colors.
  const elements = Array.from(clonedDoc.getElementsByTagName('*'));
  
  const propsToPreserve = [
    'display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'gap', 'column-gap', 'row-gap',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
    'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration',
    'color', 'background-color', 'border-color', 'border-width', 'border-style', 'border-radius',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'opacity', 'visibility', 'box-shadow', 'overflow', 'position', 'top', 'right', 'bottom', 'left',
    'box-sizing', 'list-style', 'table-layout', 'border-collapse', 'border-spacing'
  ];

  elements.forEach(el => {
    const htmlEl = el as HTMLElement;
    const computedStyle = window.getComputedStyle(htmlEl);
    
    propsToPreserve.forEach(prop => {
      const val = computedStyle.getPropertyValue(prop);
      if (val) {
        // Skip oklab/oklch colors
        if (val.includes('oklab') || val.includes('oklch')) return;
        
        // Special handling for width/height to ensure they are preserved correctly
        if ((prop === 'width' || prop === 'height') && val === 'auto') return;

        htmlEl.style.setProperty(prop, val);
      }
    });

    // Ensure images have their natural dimensions if not specified
    if (htmlEl.tagName === 'IMG') {
      const img = htmlEl as HTMLImageElement;
      if (!img.style.width && img.width) img.style.width = img.width + 'px';
      if (!img.style.height && img.height) img.style.height = img.height + 'px';
    }
  });
};
