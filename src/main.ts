import './styles/main.css';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import {
  clear,
  formatBytes,
  formatMs,
  calcReductionPct,
  h,
  initModalTriggers,
  mount,
  openModal,
  setStatus,
  setStatusPages,
  toast,
  createProgressBar,
} from './ui';
import { emit as log, mountEventDrawer } from './eventlog';
import { initGlossary } from './glossary';
import type { CompressSettings, WorkerOutMsg } from './types';

// pdf.js worker — new URL() pattern is understood by Vite and TypeScript
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

// ── Bootstrap ──────────────────────────────────────────────────────────────

const app = mount();
const drawerEl = document.getElementById('event-drawer')!;
const drawerToggle = document.getElementById('drawer-toggle') as HTMLButtonElement;

mountEventDrawer(drawerEl);
initModalTriggers();
initGlossary();

log('system', 'ok', 'pdf crush ready');
log('system', 'info', 'mozjpeg wasm loads on first compression');

// Drawer toggle
let drawerOpen = false;
drawerToggle.addEventListener('click', () => {
  drawerOpen = !drawerOpen;
  drawerEl.classList.toggle('open', drawerOpen);
  drawerToggle.setAttribute('aria-pressed', String(drawerOpen));
});

// ── Settings ───────────────────────────────────────────────────────────────

const settings: CompressSettings = { quality: 75, dpi: 150 };

// ── Worker ─────────────────────────────────────────────────────────────────

let compressWorker: Worker | null = null;

function getWorker(): Worker {
  if (!compressWorker) {
    compressWorker = new Worker(new URL('./compress-worker.ts', import.meta.url), { type: 'module' });
  }
  return compressWorker;
}

function encodePageInWorker(
  pixels: ArrayBuffer,
  width: number,
  height: number,
  quality: number,
  pageNum: number,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const onMsg = (e: MessageEvent<WorkerOutMsg>) => {
      if (e.data.pageNum !== pageNum) return;
      w.removeEventListener('message', onMsg);
      if (e.data.type === 'encoded') resolve(e.data.jpegBytes);
      else reject(new Error(e.data.message));
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ type: 'encode', pixels, width, height, quality, pageNum }, [pixels]);
  });
}

// ── Idle ───────────────────────────────────────────────────────────────────

renderIdle();

function openTmpl(id: string): void {
  const tmpl = document.getElementById(id) as HTMLTemplateElement | null;
  if (tmpl) openModal(tmpl.content.cloneNode(true) as DocumentFragment);
}

function renderIdle(): void {
  clear(app);
  setStatus('idle', 'idle');
  setStatusPages('');
  log('ui', 'info', 'render: idle');

  const badge = h('div', { class: 'privacy-badge', role: 'button', tabindex: '0' });
  badge.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" width="14" height="14"><rect x="2" y="7" width="12" height="8" rx="2"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>&nbsp;All processing in your browser — files never leave your device`;
  badge.addEventListener('click', () => openTmpl('tmpl-threat-model'));
  badge.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') openTmpl('tmpl-threat-model'); });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'file-input';
  fileInput.accept = '.pdf,application/pdf';
  fileInput.setAttribute('aria-label', 'Choose a PDF file');
  fileInput.style.display = 'none';

  const dropzone = h('div', { class: 'dropzone', role: 'button', tabindex: '0', 'aria-label': 'Drop a PDF here or click to browse' });
  dropzone.appendChild(fileInput);
  dropzone.innerHTML += `
    <svg class="dropzone-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path d="M8 6a2 2 0 0 1 2-2h20l10 10v28a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6z"/>
      <path d="M28 4v10h10"/>
      <path d="M16 30 L24 38 L32 30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="24" y1="22" x2="24" y2="38" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <h2>Drop your PDF here</h2>
    <p>or <span class="browse-link">click to browse</span></p>
    <p class="dropzone-hint">PDF files only &middot; any size &middot; processed in-browser</p>`;

  // Re-attach file input that was wiped by innerHTML +=
  dropzone.appendChild(fileInput);

  dropzone.querySelector('.browse-link')?.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.browse-link') || e.target === fileInput) return;
    fileInput.click();
  });
  dropzone.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) void handleFile(f);
  });

  const onDragOver = (e: DragEvent) => { e.preventDefault(); dropzone.classList.add('drag-over'); };
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); if (!dropzone.contains(e.relatedTarget as Node)) dropzone.classList.remove('drag-over'); };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const f = e.dataTransfer?.files[0];
    if (f) void handleFile(f);
  };
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);

  // Cleanup drag listeners when we leave idle state
  const cleanup = () => {
    window.removeEventListener('dragover', onDragOver);
    window.removeEventListener('dragleave', onDragLeave);
    window.removeEventListener('drop', onDrop);
  };
  app.addEventListener('idle-unmount', cleanup, { once: true });

  app.appendChild(h('div', { class: 'idle-shell' },
    badge,
    dropzone,
    buildSettingsCard(),
  ));
}

function buildSettingsCard(): HTMLElement {
  const card = h('div', { class: 'settings-card' });
  card.appendChild(h('h3', { class: 'settings-heading' }, 'Compression settings'));

  // Quality slider
  const qualityValue = h('span', { class: 'setting-value' }, String(settings.quality));
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '20';
  slider.max = '95';
  slider.step = '5';
  slider.value = String(settings.quality);
  slider.setAttribute('aria-label', 'JPEG quality');
  slider.addEventListener('input', () => {
    settings.quality = Number(slider.value);
    qualityValue.textContent = slider.value;
  });
  card.appendChild(h('div', { class: 'setting-row' },
    h('div', { class: 'setting-label-row' },
      h('label', { 'for': 'quality-slider', class: 'setting-label' }, 'JPEG Quality'),
      qualityValue,
      h('span', { class: 'setting-hint' }, '— higher = better image, larger file'),
    ),
    slider,
  ));
  slider.id = 'quality-slider';

  // DPI buttons
  const dpiGroup = h('div', { class: 'dpi-group', role: 'radiogroup', 'aria-label': 'Resolution (DPI)' });
  for (const dpi of [72, 96, 150, 200, 300]) {
    const btn = h('button', {
      type: 'button',
      class: 'dpi-btn' + (dpi === settings.dpi ? ' active' : ''),
      'aria-pressed': String(dpi === settings.dpi),
      'data-dpi': String(dpi),
    }, String(dpi));
    btn.addEventListener('click', () => {
      settings.dpi = dpi;
      dpiGroup.querySelectorAll<HTMLButtonElement>('.dpi-btn').forEach((b) => {
        const active = b.dataset.dpi === String(dpi);
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
    dpiGroup.appendChild(btn);
  }
  card.appendChild(h('div', { class: 'setting-row' },
    h('div', { class: 'setting-label-row' },
      h('span', { class: 'setting-label' }, 'Resolution'),
      h('span', { class: 'setting-hint' }, '— lower DPI = smaller file'),
    ),
    dpiGroup,
  ));

  return card;
}

// ── File handling ──────────────────────────────────────────────────────────

async function handleFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    toast('Please drop a PDF file');
    return;
  }
  log('ui', 'info', `file: ${file.name}`, { bytes: file.size });
  app.dispatchEvent(new Event('idle-unmount'));

  try {
    await processFile(file);
  } catch (err) {
    log('system', 'err', err instanceof Error ? err.message : String(err));
    renderError(err instanceof Error ? err.message : String(err));
  }
}

// ── Processing ─────────────────────────────────────────────────────────────

async function processFile(file: File): Promise<void> {
  clear(app);
  setStatus('busy', 'loading pdf…');

  const startTime = Date.now();
  const progressWrap = h('div', { class: 'progress-wrap' });
  const thumbGrid = h('div', { class: 'thumb-grid', 'aria-live': 'polite', 'aria-label': 'Compressed page thumbnails' });

  app.appendChild(h('div', { class: 'processing-shell' },
    h('h2', { class: 'progress-title' }, 'Compressing…'),
    h('p', { class: 'progress-meta' }, file.name),
    progressWrap,
    thumbGrid,
  ));

  const { setProgress, setLabel } = createProgressBar(progressWrap);

  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData) }).promise;
  const totalPages = pdf.numPages;
  log('pdf', 'ok', `loaded: ${totalPages} pages`, { bytes: file.size });

  const scale = settings.dpi / 72;
  const compressedPages: { jpegBytes: Uint8Array; width: number; height: number }[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    setStatus('busy', `page ${pageNum} / ${totalPages}`);
    setStatusPages(`${pageNum} / ${totalPages}`);
    setProgress(((pageNum - 1) / totalPages) * 100);
    setLabel(`Page ${pageNum} of ${totalPages}…`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const pw = Math.floor(viewport.width);
    const ph = Math.floor(viewport.height);

    const canvas = document.createElement('canvas');
    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageData = ctx.getImageData(0, 0, pw, ph);
    const pixelBuffer = imageData.data.buffer.slice(0);

    log('compress', 'info', `encoding page ${pageNum}`, { dpi: settings.dpi, quality: settings.quality });
    const jpegBuffer = await encodePageInWorker(pixelBuffer, pw, ph, settings.quality, pageNum);
    const jpegBytes = new Uint8Array(jpegBuffer);
    compressedPages.push({ jpegBytes, width: pw, height: ph });
    log('compress', 'ok', `page ${pageNum} done`, { bytes: jpegBytes.byteLength });

    // Thumbnail
    const tc = document.createElement('canvas');
    const tw = 100;
    const thgt = Math.floor(tw * (ph / pw));
    tc.width = tw; tc.height = thgt;
    tc.getContext('2d')!.drawImage(canvas, 0, 0, tw, thgt);
    const thumbImg = document.createElement('img');
    thumbImg.src = tc.toDataURL('image/jpeg', 0.6);
    thumbImg.alt = `Page ${pageNum}`;
    thumbImg.loading = 'lazy';
    const thumbItem = h('div', { class: 'thumb-item' }, thumbImg, h('span', { class: 'thumb-label' }, String(pageNum)));
    thumbGrid.appendChild(thumbItem);

    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }

  setProgress(100);
  setLabel('Building PDF…');
  setStatus('busy', 'building pdf…');
  log('build', 'info', 'assembling output pdf');

  const outDoc = await PDFDocument.create();
  for (const { jpegBytes, width, height } of compressedPages) {
    const jpgImg = await outDoc.embedJpg(jpegBytes);
    const p = outDoc.addPage([width, height]);
    p.drawImage(jpgImg, { x: 0, y: 0, width, height });
  }
  const outBytes = await outDoc.save();
  const outBlob = new Blob([new Uint8Array(outBytes)], { type: 'application/pdf' });
  const timeMs = Date.now() - startTime;

  log('build', 'ok', 'done', {
    originalBytes: file.size,
    compressedBytes: outBlob.size,
    reduction: calcReductionPct(file.size, outBlob.size) + '%',
    ms: timeMs,
  });

  setStatus('good', 'done');
  setStatusPages(`${totalPages} pages`);
  renderDone(file, outBlob, totalPages, timeMs);
}

// ── Done ───────────────────────────────────────────────────────────────────

function renderDone(original: File, compressed: Blob, pageCount: number, timeMs: number): void {
  clear(app);
  const reduction = calcReductionPct(original.size, compressed.size);
  const blobUrl = URL.createObjectURL(compressed);
  const filename = original.name.replace(/\.pdf$/i, '') + '-compressed.pdf';

  const statsCard = h('div', { class: 'stats-card' });
  statsCard.appendChild(h('div', { class: 'stats-badge' }, `${reduction}% smaller`));
  const grid = h('div', { class: 'stats-grid' });
  const stat = (label: string, value: string) =>
    h('div', { class: 'stat-cell' }, h('div', { class: 'stat-label' }, label), h('div', { class: 'stat-value' }, value));
  grid.appendChild(stat('Before', formatBytes(original.size)));
  grid.appendChild(stat('After', formatBytes(compressed.size)));
  grid.appendChild(stat('Pages', String(pageCount)));
  grid.appendChild(stat('Time', formatMs(timeMs)));
  statsCard.appendChild(grid);

  const dlBtn = document.createElement('a');
  dlBtn.className = 'btn btn-primary';
  dlBtn.href = blobUrl;
  dlBtn.download = filename;
  dlBtn.setAttribute('role', 'button');
  dlBtn.textContent = '↓ Download compressed PDF';
  dlBtn.addEventListener('click', () => setTimeout(() => URL.revokeObjectURL(blobUrl), 5000));

  const btnRow = h('div', { class: 'btn-row' });
  btnRow.appendChild(dlBtn);

  if (navigator.share) {
    const shareBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Share');
    shareBtn.addEventListener('click', async () => {
      try {
        const f = new File([compressed], filename, { type: 'application/pdf' });
        await navigator.share({ files: [f], title: 'Compressed PDF' });
        log('ui', 'ok', 'shared via web share api');
      } catch { toast('Share cancelled'); }
    });
    btnRow.appendChild(shareBtn);
  }

  const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost' }, 'Compress another PDF');
  resetBtn.addEventListener('click', () => { URL.revokeObjectURL(blobUrl); renderIdle(); });
  btnRow.appendChild(resetBtn);

  const noteBtn = h('button', { type: 'button', class: 'link-btn' }, 'Why is text not selectable?');
  noteBtn.addEventListener('click', () => openTmpl('tmpl-how-it-works'));

  app.appendChild(h('div', { class: 'done-shell' },
    h('h2', { class: 'done-title' }, 'Compression complete'),
    h('p', { class: 'done-filename' }, original.name),
    statsCard,
    btnRow,
    h('p', { class: 'output-note' }, noteBtn),
  ));
  log('ui', 'ok', 'render: done');
}

// ── Error ──────────────────────────────────────────────────────────────────

function renderError(msg: string): void {
  clear(app);
  setStatus('bad', 'error');
  const retryBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Try again');
  retryBtn.addEventListener('click', renderIdle);
  app.appendChild(h('div', { class: 'error-shell' },
    h('div', { class: 'error-icon' }, '⚠'),
    h('h2', {}, 'Compression failed'),
    h('p', { class: 'error-msg' }, msg),
    h('div', { class: 'btn-row' }, retryBtn),
  ));
}
