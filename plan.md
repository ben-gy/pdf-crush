# Tool Plan: PDF Crush

## Overview
- **Name:** PDF Crush
- **Repo name:** pdf-crush
- **Tagline:** Shrink PDFs in your browser — no uploads, no accounts, no server.

## Problem It Solves
You have a 14 MB scanned PDF. The email portal caps attachments at 5 MB. Every online PDF compressor wants you to upload the file to their server — a privacy nightmare for contracts, medical records, or tax documents. PDF Crush does the whole thing in the browser tab. The file never leaves the device.

## Why This Must Be Client-Side
- **Privacy**: PDF files often contain sensitive data (legal, medical, financial). Server-side tools are a liability.
- **Cost-avoidance**: No server to run, no storage to provision, no egress fees.
- **Large-file handling**: Keeping the file on-device avoids upload timeouts for large PDFs.
- **No-account friction**: Instant use with no sign-up, no quota, no subscription.

## Browser APIs / Libraries Used
| API / Library | What it does for us | Fallback if unsupported |
|---|---|---|
| pdfjs-dist | Render each PDF page to a canvas | N/A — hard requirement |
| @jsquash/jpeg (MozJPEG WASM) | Compress page images better than browser JPEG | Canvas.toBlob() fallback |
| pdf-lib | Assemble compressed page images into a new PDF | N/A — hard requirement |
| Web Workers | Off-load MozJPEG encoding off the main thread | Graceful main-thread fallback |
| OffscreenCanvas | Render PDF pages off the main thread if needed | Regular Canvas on main thread |
| Web Share API | Native share on mobile | Falls back to copy-link |
| File System Access | Save with native dialog | Falls back to <a download> |

## Workflow
1. User drops or picks a PDF file
2. Settings panel: quality slider (40–95, default 75) + resolution selector (72/96/150/200/300 DPI, default 150)
3. Click "Compress PDF" — worker processes page by page, thumbnails appear as each page completes
4. Done: stats panel shows original → compressed size + reduction %; download + share buttons

## Non-Goals
- No multi-file batching v1
- No text-layer preservation (pages are rasterised — OCR text is lost; stated clearly in UI)
- No WebP output (PDF spec doesn't support WebP natively)
- No cloud sync ever, no account system ever

## Target Audience
Office worker or student at 10 pm with a PDF too large to email or upload to a portal. Stressed, on a laptop, worried about leaking the document to a random server.

## Style Direction
**Tone:** Clean, reassuring, professional  
**Colour palette:** Light — white cards on a light-gray base, blue accent (#2563eb). Feels like Google Docs or Notion light mode. Signals trustworthiness.  
**UI density:** Spacious  
**Dark/light theme:** Light  
**Reference tools:** ilovepdf.com (but ours is private), Adobe Acrobat web tools

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite
- **Key libraries:** pdfjs-dist, @jsquash/jpeg, pdf-lib, vite-plugin-wasm, vite-plugin-top-level-await
- **Worker strategy:** Single dedicated worker for MozJPEG encoding; pdf.js rendering on main thread (async, non-blocking)
- **Storage:** None — everything in memory, cleaned up after download

## Privacy & Trust Model
**Protected**
- Full file contents — never leaves the device
- All processing in-browser; zero network requests for user data

**Not protected**
- The GitHub Pages CDN logs that the user loaded the page (IP + UA)
- pdfjs-dist worker and WASM assets fetched from GitHub Pages CDN (same log)

**Trust surface**
- The static site bundle served from GitHub Pages
- TLS chain between user and GitHub Pages CDN
- No third-party trackers, no analytics, no fonts from external CDNs

## UX Required Surfaces
- Drop zone with drag, click, and paste support
- Quality slider + resolution button group
- Per-page thumbnail grid (appears as pages compress)
- Determinate progress bar with page counter
- Stats panel: before/after size, reduction %, page count, time taken
- Download button + Web Share button
- Event log drawer (right side, collapsible)
- How-It-Works modal (4 steps)
- Threat Model modal
- About modal
- Sticky footer: "Built by benrichardson.dev"
