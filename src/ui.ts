// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// DOM helpers

export function h(
  tag: string,
  attrs: Record<string, string | null> = {},
  ...kids: (Node | string)[]
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids) {
    el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return el;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function calcReductionPct(original: number, compressed: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

// Modal

export function openModal(content: DocumentFragment | HTMLElement): void {
  const closeBtn = h('button', { class: 'modal-close', type: 'button', 'aria-label': 'Close' }, '×');
  const panel = h('div', { class: 'modal-panel', role: 'document' }, closeBtn);
  panel.appendChild(content as Node);
  const overlay = h('div', { class: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' }, panel);

  const prev = document.activeElement as HTMLElement | null;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    prev?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => closeBtn.focus());
}

export function initModalTriggers(): void {
  document.querySelectorAll<HTMLElement>('[data-modal]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const id = trigger.dataset.modal;
      if (!id) return;
      const tmpl = document.getElementById(id) as HTMLTemplateElement | null;
      if (!tmpl) return;
      openModal(tmpl.content.cloneNode(true) as DocumentFragment);
    });
  });
}

// Progress bar

export function createProgressBar(container: HTMLElement): {
  setProgress: (pct: number) => void;
  setLabel: (text: string) => void;
  reset: () => void;
} {
  const bar = h('div', { class: 'progress-bar' });
  const fill = h('div', { class: 'progress-fill' });
  const label = h('div', { class: 'progress-label' }, '');
  bar.appendChild(fill);
  container.appendChild(bar);
  container.appendChild(label);

  return {
    setProgress: (pct) => { fill.style.width = `${Math.min(100, pct)}%`; },
    setLabel: (text) => { label.textContent = text; },
    reset: () => { fill.style.width = '0%'; label.textContent = ''; },
  };
}

// Status bar helpers

export function setStatus(state: 'idle' | 'busy' | 'good' | 'bad', label: string): void {
  const dot = document.getElementById('sb-dot');
  const lbl = document.getElementById('sb-label');
  if (dot) dot.className = `dot dot-${state}`;
  if (lbl) lbl.textContent = label;
}

export function setStatusPages(text: string): void {
  const el = document.getElementById('sb-pages');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('hidden', !text);
}

// Toast

let toastEl: HTMLElement | null = null;
let toastTimer = 0;

export function toast(msg: string): void {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('visible'), 2200);
}

export function mount(): HTMLElement {
  const el = document.getElementById('app');
  if (!el) throw new Error('#app not found');
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
