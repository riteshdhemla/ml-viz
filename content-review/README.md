# Content review loop

A lightweight human-in-the-loop workflow for reviewing site content *while
reading it* and feeding the notes back to Claude for fixes. **Local-dev only** —
none of this ships to Vercel or GitHub Pages.

## How it works

```
 read a page        highlight + note          append              Claude reads,
 in `npm run dev`  ──────────────────▶  review-log.jsonl  ──────▶  fixes per file,
 (the ✎ widget)      (logging server)                             archives entries
```

1. **Start both processes** (two terminals, or one command):

   ```bash
   npm run dev:review      # runs the log server + next dev together
   # — or, in separate terminals —
   npm run review:log      # standalone logging server (port 5174)
   npm run dev             # the site
   ```

2. **Review while reading.** On any lesson, case study, or wiki page:
   - highlight the passage you're reacting to (optional but recommended),
   - press **Alt+R** or click the **✎** button (bottom-right),
   - pick a category, type the note, **⌘/Ctrl+Enter** to log it.

   The note is appended to [`review-log.jsonl`](./review-log.jsonl) with the page
   path, a best-guess source file, the highlighted text, and your note. The
   logging terminal prints a confirmation line per note.

   > If the ✎ button isn't there, you're not in `npm run dev` (it's stripped from
   > production builds by design). If logging fails, the server isn't running —
   > the note is echoed to the browser console so it's never lost.

3. **Hand the log to Claude.** Ask Claude to *"process the content-review log."*
   Claude reads `review-log.jsonl`, groups entries by source file, applies the
   fixes, re-runs the integrity tests + build, and moves the processed entries to
   `review-log.archive.jsonl` (so the active log only ever holds open items).

## Log format (one JSON object per line)

```json
{"ts":"2026-07-30T17:30:00Z","path":"/system-design/fraud-detection","title":"Design a Real-Time Fraud Detection System","file":"src/content/system-design/fraud-detection.mdx","category":"incorrect","selection":"AUPRC (not AUROC…)","note":"cite a source for this claim","status":"open"}
```

- **category** — one of `incorrect | unclear | missing | typo | style | other`
- **file** — best-effort guess from the URL; Claude confirms the real file
- **status** — `open` until Claude processes it

## Notes

- The log is a **tracked file** on purpose: committing it is how review notes made
  on your machine travel to a Claude session running elsewhere. You can also just
  paste the lines into chat.
- Nothing here touches the Next build. The widget self-gates to `NODE_ENV
  === "development"`; the sink is a standalone Node script, never a Next API route
  (a POST route would break the `output: "export"` Pages mirror).
- Override the port/file with `REVIEW_LOG_PORT` / `REVIEW_LOG_FILE`, or point the
  widget elsewhere with `NEXT_PUBLIC_REVIEW_LOG_ENDPOINT`.
