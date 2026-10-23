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

## Admin panel (`/admin.html`)

The admin panel is **password-protected**: opening it shows a login box, and you
enter your `ADMIN_SECRET` (the same env var from step 3). The password is checked
against the server (`/api/admin-check`) and remembered only for that browser tab.
Every upload is also gated server-side, so the secret guards both the page and
the writes.

The panel has three things:

1. **Collage · Photos & Videos** — drop/pick photos (shown in the app at
   `…/#/tasveerein`) and videos/recordings (shown at `…/#/aawaazein`). Add a
   caption per item, Save, or Delete.
2. **Greeting videos** — upload any number of birthday greeting videos (multi-select
   or drop several). Each gets a caption, Save and Delete. They appear in the app's
   greetings page (`…/#/shubhkamnayein`) in upload order.
3. **Questions** — edit the text shown to Mamma, or turn a question off. Saved to
   the cloud and picked up by the app automatically; `content.js` stays the
   fallback. "Reset to original" clears all edits.

These app pages sit behind the app's PIN (like every other page), so only someone
with the link + PIN sees them; the media URLs themselves are public but
unguessable. The listing (`/api/gallery`) is public read; all writes need the key.

Layout in Blob:

```
<space>/media/photos/<id>.<jpg|png|webp|gif>   a collage photo
<space>/media/photos/<id>.json                 { caption, order, … }
<space>/media/videos/<id>.<mp4|webm|mov|m4a|…> a collage video / recording
<space>/media/videos/<id>.json                 { caption, order, … }
<space>/config/questions.json                  { "<question.key>": { prompt?, sub?, enabled? } }
<space>/media/greetings/<id>.<mp4|webm|mov|m4v> a greeting video (any number)
<space>/media/greetings/<id>.json              { caption, order }
<space>/config/greeting-video.<ext>             older single greeting video (still shown; delete from admin)
```

Each media upload is capped at 200 MB (fine for a short phone video). Longer
videos are better linked than uploaded.

Photos/videos don't pass through a function (Vercel caps function request
bodies at 4.5 MB). The browser gets a short-lived, single-path token from
`/api/upload-token` (admin key checked there) and uploads straight to Blob,
multipart above 8 MB. Mamma's voice-note segments use the same route only when
one is over 4 MB; small JSON still goes through `/api/upload`. The browser
client is `assets/vendor/blob-client.js`, a committed build of
`@vercel/blob/client`. Rebuild it with `npm run build:blob-client` if you bump
`@vercel/blob`. No build step runs on Vercel.

## Local testing (optional, before deploying)

`dev-server.mjs` fakes Vercel Blob on disk so you can test the whole flow
offline:

```bash
ADMIN_SECRET=test123 node dev-server.mjs
# App:   http://localhost:3000/            (PIN from content.js)
# Admin: http://localhost:3000/admin.html  (password: test123)
```

Uploads land in `./.localblob` (gitignored); delete it to reset. The dev
server also fakes the Blob upload API (`/_blobapi`) so direct uploads run the
same client code, and it rejects function bodies over 4.5 MB with 413 like
Vercel does. The JSON shapes
and auth rules match the real `api/*.js`, so what works here works on Vercel.

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
