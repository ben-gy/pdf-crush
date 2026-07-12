# pdf-crush

**Shrink PDFs in your browser — no uploads, no accounts, no server.**

Live: https://pdf-crush.benrichardson.dev

---

## what it is

PDF Crush compresses PDF files entirely in your browser. You drop a PDF, choose a quality and resolution, and get a smaller PDF back — without uploading anything to a server.

It solves a specific, frustrating problem: you have a 15 MB PDF and an email portal that only accepts 5 MB. Every online PDF compressor wants you to upload your file. For a tax return, a contract, or a medical document, that's a privacy nightmare. PDF Crush processes everything locally.

## how it works

1. **pdf.js** renders each page to an HTML Canvas at your chosen DPI (default 150)
2. Each canvas frame's pixel data is transferred to a **Web Worker**
3. The worker runs **MozJPEG** (Mozilla's tuned JPEG encoder, compiled to WebAssembly) to compress each frame — 20–30% better than the browser's built-in JPEG encoder
4. **pdf-lib** assembles the compressed JPEG frames back into a valid PDF
5. The result is handed to you as a local Blob URL — no server involved

The output is an image PDF (rasterised). Selectable text and annotations are not preserved — this is stated clearly in the UI.

## browser APIs used

- **Web Workers** — MozJPEG encoding runs off the main thread; the page stays responsive
- **Canvas 2D** — page rendering via pdf.js
- **Web Crypto (indirect)** — used internally by pdf.js
- **File API** — reading the dropped PDF without uploading
- **Web Share API** — native sharing on mobile
- **Blob URLs** — zero-server output delivery

## security / privacy model

**Protected**
- Full PDF contents — never leaves the device
- All rendering and compression runs in-browser
- No cookies, no localStorage for user data, no fingerprinting — the only analytics is Cloudflare Web Analytics, anonymous cookie-less page-view counts with no personal data

**Not protected**
- GitHub Pages CDN logs that you loaded the page (IP, User-Agent, timestamp)
- pdfjs-dist worker and WASM assets fetched from the same CDN

**Trust model**
- The static bundle served from GitHub Pages (source-auditable)
- TLS chain between your browser and GitHub Pages CDN
- No third-party JavaScript, no external fonts, no trackers

## stack

- Vite 6 + TypeScript
- pdfjs-dist 4.x — PDF rendering
- @jsquash/jpeg — MozJPEG WASM encoder
- pdf-lib — PDF assembly
- vite-plugin-wasm + vite-plugin-top-level-await — WASM bundling
- Vitest — unit tests
- GitHub Pages — hosting, deployed via GitHub Actions

## local development

```bash
npm install
npm run dev      # vite dev server on :5173
npm test         # vitest suite
npm run build    # dist/
npm run preview  # serve dist/ locally
```

## deploying

Push to `main` triggers `.github/workflows/deploy.yml` — runs tests, builds, deploys `dist/` to GitHub Pages. Custom domain pinned via `public/CNAME`. Point a DNS CNAME for `pdf-crush.benrichardson.dev` at `ben-gy.github.io`.

## license

MIT
