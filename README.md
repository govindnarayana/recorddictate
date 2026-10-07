# RecordDictate

A student productivity app that reads a PDF aloud, line by line, in sync with
a blue highlight on the original document — so you can copy it into a
physical notebook/record without repeatedly looking back and forth.

Everything runs locally in the browser. Your PDF is never uploaded anywhere.

## How to run

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`), upload a PDF,
and press **Play** or hit **Space**.

```bash
npm run build    # type-checks then produces a production build in dist/
npm run preview  # serves the production build locally
```

## How it works

1. **PDF.js** parses the real PDF text layer — actual character positions,
   not approximations. (`src/services/pdfService.ts`)
2. Individual text runs are grouped into visual lines using coordinate
   clustering (Y-band grouping, left-to-right ordering).
   (`src/utils/textSegmentation.ts`)
3. Lines can be further merged into sentences or paragraphs depending on the
   "Dictation unit" setting, while keeping every original line's bounding
   box so multi-line spans still highlight correctly.
4. A transparent overlay renders one highlight rectangle per bounding box,
   positioned in the exact same coordinate space as the rendered PDF canvas,
   and scales with zoom. (`src/components/TextHighlight`)
5. The **same text** that's highlighted is converted to speech-friendly text
   (Natural / Dictation / Exact modes, symbol dictionary) and spoken via the
   browser's `SpeechSynthesis` API. (`src/services/textProcessor.ts`,
   `src/services/speechService.ts`)
6. **Record Mode**: the app highlights + reads one line, then waits for you
   to press Next (or waits X seconds if Automatic Next is enabled).

### Scanned PDFs (OCR)

If a page has no usable PDF.js text layer, the app detects this and offers a
"Recognize text on this page (OCR)" button. This runs real OCR via
[Tesseract.js](https://github.com/naptha/tesseract.js) against a rendered
image of that page and derives genuine word-level bounding boxes — it does
not fabricate positions. OCR is opt-in per page since it's noticeably slower
than the text-layer path.

### Resume position

Your current file name/size, page, and line are saved to **IndexedDB** (not
localStorage) as you go. Re-uploading the same file offers to resume where
you left off. The PDF's bytes themselves are never persisted or uploaded —
only this small position record.

## Project structure

```
src/
  components/     UI components (PDFViewer, DictationPanel, SettingsPanel, ...)
  hooks/          usePDF, usePDFText, useSpeech, useDictation, useSessionResume
  services/       pdfService, textProcessor, speechService, ocrService, sessionService
  utils/          punctuation (symbol dictionary), textSegmentation (line/sentence grouping)
  types/          pdf.ts, dictation.ts
```

## Settings

- **Speech mode**: Natural / Dictation (announces punctuation) / Exact (announces symbols literally)
- **Dictation unit**: Visual Line / Sentence / Paragraph
- **Speech speed**: 0.7x – 1.5x
- **Automatic Next**: Manual, or auto-advance after 2/3/5/10 seconds
- **Symbol pronunciation**: fully customizable per-symbol
- **Voice selection**: any voice your browser exposes
- **Highlight color & opacity**
- **Exclude repeated headers/footers** from dictation (detected by sampling pages)

## Keyboard shortcuts

| Key | Action |
|---|---|
| Space | Play / Pause |
| → | Next line |
| ← | Previous line |
| R | Repeat current line |
| S | Stop |
| Page Up / Page Down | Previous / Next PDF page |

Shortcuts are ignored while typing in a text field.

## Known limitations

- OCR word-splitting for CJK and other non-space-delimited scripts is not
  tuned; Tesseract's English model is used by default.
- Multi-column layouts are handled reasonably well by Y-band clustering but
  are not guaranteed to reconstruct perfect column-then-row reading order
  for complex academic layouts (e.g. figures interleaved with two-column text).
  Section 8 of the original spec calls this out as a "reasonable effort"
  area rather than a guarantee.
- Header/footer detection is heuristic (position + repetition across
  sampled pages) and may occasionally mis-flag a short repeated line that
  isn't actually a header/footer.
- Very large PDFs (100+ MB) may be slow to open since the whole file is read
  into memory in the browser; there's a 150MB hard limit.
- No automated test suite; testing is manual against real PDFs per the
  scenarios listed in the original spec (Section 34).
