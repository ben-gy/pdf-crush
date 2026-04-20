export const GLOSSARY: Record<string, string> = {
  dpi: 'Dots Per Inch — controls how many pixels are used to represent each inch of the PDF page. Lower DPI = smaller file, less detail. 150 DPI is a good balance for screen viewing; 300 DPI for print.',
  mozjpeg: 'MozJPEG is Mozilla\'s JPEG encoder. It produces 20–30% smaller files than standard JPEG at the same visual quality, using advanced optimisation techniques. Here it runs as a WebAssembly module entirely in your browser.',
  wasm: 'WebAssembly (WASM) — a binary instruction format that lets code written in C/C++/Rust run in the browser at near-native speed. PDF Crush uses WASM to run MozJPEG in a Web Worker.',
  'web worker': 'A Web Worker is a background thread in the browser. PDF Crush uses one to run the MozJPEG compression without freezing the page.',
  'pdf-lib': 'pdf-lib is a JavaScript library for creating and editing PDFs. It rebuilds the output PDF by embedding the compressed JPEG page images.',
  'image pdf': 'An image PDF is a PDF where each page is a raster image (like a photograph). Unlike a text PDF, you cannot select or search for text. This is the output format of PDF Crush.',
  rasterise: 'Rasterising converts a vector/text PDF page into a pixel grid (bitmap image). PDF Crush rasterises each page before compressing it.',
};

let tooltipEl: HTMLElement | null = null;

export function initGlossary(): void {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'glossary-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tooltipEl);

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.glossary-link');
    if (target) {
      e.preventDefault();
      const term = target.dataset.term ?? '';
      const def = GLOSSARY[term.toLowerCase()];
      if (!def || !tooltipEl) return;
      tooltipEl.textContent = def;
      tooltipEl.setAttribute('aria-hidden', 'false');
      const rect = target.getBoundingClientRect();
      const top = rect.bottom + window.scrollY + 6;
      const left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 320));
      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.classList.add('visible');
      return;
    }
    hideTooltip();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTooltip();
  });
}

function hideTooltip(): void {
  if (!tooltipEl) return;
  tooltipEl.classList.remove('visible');
  tooltipEl.setAttribute('aria-hidden', 'true');
}

export function gloss(term: string): string {
  return `<span class="glossary-link" data-term="${term}" tabindex="0" role="button">${term}</span>`;
}
