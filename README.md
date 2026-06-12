# Clip Vault — Hidden Gem Media

Internal Next.js tool: paste an Instagram or Facebook link, choose video (MP4)
or audio (MP3), and the file lands in a Google Drive folder.

This is the **frontend only** — the pipeline (Fetch → Pull → Drive) is
simulated so you can see the full UX. Integration points are marked with
`TODO (integration)` comments in `app/page.tsx`.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Wiring it up later

1. **API route** — create `app/api/download/route.ts` that:
   - validates the URL
   - shells out to `yt-dlp` on your Hostinger server
     - video: `yt-dlp -f "bv*+ba/b" -o "%(id)s.%(ext)s" <url>`
     - audio: `yt-dlp -x --audio-format mp3 -o "%(id)s.%(ext)s" <url>`
   - uploads the resulting file to Drive folder
     `1_xWEffueiPstS1vhal24THu-S21fM_SB` via the Drive API
     (`drive.files.create` with a service account or OAuth)
   - reports stage progress (SSE or simple polling endpoint)

2. **Frontend** — in `app/page.tsx`, replace the simulated timers inside
   `startJob()` with the fetch call (the comment block shows the shape),
   and drive `setStageIndex` / `setJob` from real progress events.

3. **Drive folder picker** — the "Saves to Google Drive" button is a
   placeholder; swap in the Google Picker API if you want folder selection.

Notes: Instagram rate-limits aggressively — pass a cookies file to yt-dlp
(`--cookies cookies.txt`) from a logged-in session and refresh it when pulls
start failing.
