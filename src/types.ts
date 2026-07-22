// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export interface CompressSettings {
  quality: number; // 40–95
  dpi: number;     // 72 | 96 | 150 | 200 | 300
}

export interface PageResult {
  pageNum: number;
  totalPages: number;
  compressedBytes: number;
  width: number;
  height: number;
  thumbnailDataUrl: string;
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  pageCount: number;
  timeMs: number;
}

// Main → Worker
export type WorkerInMsg =
  | { type: 'encode'; pixels: ArrayBuffer; width: number; height: number; quality: number; pageNum: number };

// Worker → Main
export type WorkerOutMsg =
  | { type: 'encoded'; jpegBytes: ArrayBuffer; pageNum: number }
  | { type: 'error'; message: string; pageNum: number };
