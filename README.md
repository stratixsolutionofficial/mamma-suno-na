# Mamma, Sunao Na

A static, no-build version of the experience in `01/02/03-*.md` (theme `maa-haldi`). Plain HTML/CSS/JS, no server code, no dependencies.

| File | Who | What |
|---|---|---|
| `index.html` | Mamma | Countdown → PIN → birthday reveal (diya, cake with 5 named candles, blow or tap, petals, montage) → greetings wall → tohfa letter → album (22 chapters, 176 questions) → speak/write answers → seals → her kitaab |
| `g.html?i=N` | Family | Leave a greeting for invite `GREETINGS[N]` (voice/text/memory/photos). `&tribute=1` for the "Jo Yaadon Mein Hain" ask |
| `padho.html` | Children | Open Mamma's backup file to read/listen; seals respected |
| `admin.html` | Children | PLACEHOLDER/CONFIRM checklist, photo shot list, "Preview as Mamma" (simulated date), invite links + WhatsApp messages, greeting import, resolved question list |
| `content.js` | You | **Everything editable lives here** |

## Run locally
```bash
cd mamma-sunao-na && python3 -m http.server 8080
# open http://localhost:8080/            (Mamma)
# open http://localhost:8080/admin.html  (family)
```
The microphone needs HTTPS (or localhost). For phones, host it (Netlify / Vercel / GitHub Pages: drag this folder in) and use the HTTPS URL.

## Before the birthday
1. Open `admin.html` → "Bharna hai". Fill every `PLACEHOLDER` in `content.js` (birthday date, PIN, Sunny's phone, Mamma's names, Nanaji/Naniji alive, …). Remove `CONFIRM:` from values that are correct.
2. Photos: put files in `photos/`, set `PHOTOS["P-…"].src`. Empty slots show a soft paper placeholder.
3. Intro voice note: `audio/intro.m4a` → `INTRO.voice`.
4. Greetings: copy each invite message from admin and send on WhatsApp. People send back a `shubhkamna-*.json` file; open it in admin → download the audio/photo files into `audio/` / `photos/` and paste the snippet into `GREETINGS` (`status: "approved"` makes it visible). Voice greetings marked `playInReveal` play in the montage.
5. Admin → Preview with the birthday date. Preview uses its own storage, so nothing real is saved.

## How data is kept (important)
There is no server. Mamma's answers (text + voice) are saved **only on her phone** (IndexedDB, recorded in 10-second chunks so nothing is lost if the tab closes). To get them out:
- every 5 answers she's asked "Bachchon ko ek copy bhejiye?", or Menu → same option. This shares one `.json` file (WhatsApp works).
- open that file in `padho.html` on any device.

Ask her to send a copy regularly. Clearing browser data or switching phones without a copy loses answers.

## Privacy
- The PIN is a soft lock, not security: it sits in `content.js` and anyone who opens the site's source can read it. Anyone with the URL can see questions, greetings and photos you publish. Use an unguessable URL (e.g. a random Netlify subdomain), keep `noindex`, and don't put anything there you wouldn't want forwarded.
- Answers never leave her phone unless she shares the file.
- The link preview (`og:`) shows only "Mamma ke liye 🌼", no names or photos.

## Differences from the Next.js spec
The spec in `01-experience-template.md` describes Next.js + Turso + R2 + a real admin. This version keeps the full Mamma-facing experience but swaps the backend for files: content is edited in `content.js` instead of an admin UI, greetings come in as files instead of uploads, and the reader opens a shared backup instead of a live link. If you later want the server version, `content.js` maps 1:1 onto the seed payload in `03-generated-experience-mamma-birthday.md`.
