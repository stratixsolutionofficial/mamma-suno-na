# Deploy to Vercel (with voice-note backup to Vercel Blob)

The app is a static site. The only server code is two small functions in `api/`
that back up Mamma's kept answers to **your** Vercel Blob store, so you receive
them without her tapping "Send a copy". Her phone stays the source of truth; the
upload is best-effort and retries when she's back online.

## 1. One-time setup

```bash
cd mamma-sunao-na
npm install            # pulls @vercel/blob
npx vercel             # link / create the project (deploy root = this folder)
```

When prompted, accept this folder as the project root.

## 2. Create the Blob store

Vercel dashboard → your project → **Storage → Create → Blob**.
Connecting it adds `BLOB_READ_WRITE_TOKEN` to the project automatically. You do
not put that token anywhere in the code.

## 3. Set your admin secret

This is the password for the private read page (`/collect.html`). Pick a long
random string.

```bash
npx vercel env add ADMIN_SECRET production
# paste the secret when asked; repeat for "preview" and "development" if you like
```

## 4. Deploy

```bash
npx vercel --prod
```

You get a URL like `https://mamma-sunao-na.xxxx.vercel.app`.

## 5. URLs

- **Mamma:** `…/` (or `…/index.html`) — send her this link.
- **You (read answers):** `…/collect.html` — enter the `ADMIN_SECRET` once;
  it's remembered on that device. "Refresh" pulls new answers.
- Reader-from-file page `padho.html` still works for the WhatsApp JSON export,
  independently of the cloud backup.

## How it stores things

For the edition folder `settings.backup.space` in `content.js`
(currently `mamma-2026-kahani-7f3a9c`):

```
<space>/audio/<segmentId>.webm      the voice note bytes (public but unguessable URL)
<space>/answers/<questionKey>.json  { text, prompt, audio:[{id,url,…}], seal, … }
```

`collect.html` lists every `answers/*.json` (via `/api/answers`, guarded by the
secret) and plays the audio from the public URLs.

## Turning backup off

Set `settings.backup.enabled: false` in `content.js` and redeploy. The app then
behaves exactly as before: everything on-device, nothing uploaded, no network
needed. (Backup is also auto-disabled in admin "Preview as Mamma" and when the
page is opened from `file://`.)

## Notes & limits

- Public Blob URLs are readable by anyone who has the exact URL. They're
  unguessable (random `space` + random segment id), but they are not behind the
  secret — only the *listing* is. Don't paste an audio URL in a public place.
- Each upload is capped at 30 MB (one ~10-minute segment is far smaller).
- Deleting a recording in the app also deletes it from Blob (best-effort).
- Blob usage is billed to your account; for one family it is negligible.
```
