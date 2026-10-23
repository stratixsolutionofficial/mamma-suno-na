# Photo collage + recordings gallery with admin-gated Blob upload

Adds an "Album" to the digital book: a photo collage (`#/tasveerein`) and a recordings gallery (`#/aawaazein`), both reading from a new public `api/gallery` endpoint. `api/upload` is extended to accept `media/photos/*` and `media/videos/*` under an `ADMIN_SECRET` (`x-admin-key` header) while leaving the recipient's unguarded audio/answer backup paths intact. `admin.html` grows an Album panel to upload, caption, and delete media. The PIN screen is generalized from a hardcoded 4 digits to the length of `EDITION.pin`, and the edition PIN is set to the 6-digit `231070`.

Watch for: caption edits in the admin panel drop the `order` field and silently reshuffle the collage (confirmed); admin force-renames every uploaded audio recording to `.m4a` regardless of real format, so a `.wav`/`.ogg`/`.mp3` recording can fail to play in the app (confirmed); the public `api/gallery` enumerates all media and fetches every sidecar on each request with no caching (likely, scale-dependent).

**Verdict**: NEEDS_CHANGES

## High-level view

The upload gate is sound. Media paths are matched against an anchored regex, admin writes and deletes are checked in constant time against `ADMIN_SECRET`, and the recipient's unguarded `answers/`+`audio/` paths are kept to a separate anchored pattern so a visitor still cannot write media. There is no path-traversal surface: the path becomes a flat Blob key and the character class forbids slashes outside the fixed `media/photos|videos` segment.

The PIN length change is correct end to end. The dot count, the input cap, and the "complete" check all derive from `String(EDITION.pin).length`, so 6-digit `231070` renders six dots, accepts exactly six digits from both keypad and physical keyboard, and the lockout logic is untouched.

The gallery pairing works by grouping media and `.json` sidecars under a common base id, but the metadata contract between what admin writes and what gallery sorts by is inconsistent: the initial upload writes `order`, the caption save does not, so editing a caption erases the field the collage orders by.

Media format handling has a mismatch between upload and playback. Admin accepts several audio extensions but rewrites all of them to `.m4a` on upload, while the server regex and the app player would have handled the real extensions. The app decides video-vs-audio purely from extension, so a mislabeled file plays through the wrong element.

<details>
<summary>Issues (4)</summary>

1. **Caption save drops `order`** — `wireCard`'s save writes `{ caption, updatedAt }` with `allowOverwrite`, overwriting the sidecar that originally held `order`; the item then sorts at the `1e9` fallback and the collage reshuffles. Merge into the existing sidecar (read-modify-write) or always re-emit `order`.
2. **Audio recordings force-renamed to `.m4a`** — `uploadFiles` maps every `AUD_EXT` file to the `.m4a` extension while uploading the original bytes, so a WAV/OGG/MP3 is stored with a lying extension and may fail to decode in the app's `<audio>`. Keep the real extension (the server regex already allows `mp3|ogg|wav|aac`).
3. **Gallery enumerates everything per request, uncached** — `api/gallery` lists up to 1000 blobs per folder and `fetch`es every sidecar on every call, with `cache-control: no-store` and a 60s client cache only. Fine at album scale; revisit if media grows or the endpoint gets hit often.
4. **Video/audio rendering keys off extension only** — the app's `isVideo(ext)` picks `<video>` vs `<audio>` from the extension list; combined with issue 2, a real video stored under a wrong ext (or vice-versa) renders in the wrong element. Tighten by trusting stored ext only if uploads stop rewriting it.

</details>

<details>
<summary>Details</summary>

### Upload gating: two anchored patterns, constant-time admin check

Writers split into two anchored regexes. `SAFE_APP` (`<space>/answers/*.json`, `<space>/audio/*.(webm|m4a)`) stays unguarded so the recipient's phone backs up answers without a secret. `SAFE_MEDIA` (`<space>/media/photos|videos/*`, including `.json` sidecars) is gated: any `isMedia` path must pass `adminOk(x-admin-key)` before POST *or* DELETE, so a visitor can neither add nor wipe album media. `adminOk` compares lengths first then `timingSafeEqual`, matching `answers.js`.

No traversal surface: `path` goes straight to `put`/`del` as a flat Blob key, and the character class `[A-Za-z0-9._-]` inside each segment forbids `/`, so a caller cannot escape the `media/photos|videos` segment even though `.` is allowed within a filename.

One asymmetry, not blocking and pre-existing: the unguarded `SAFE_APP` branch lets anyone who knows the (unguessable) space write arbitrary `answers/*.json` and `audio/*` blobs. Out of scope here — flagged only so it is not mistaken for something the media gate changed.

### PIN length now follows `EDITION.pin`

```js
const PIN_LEN = String(EDITION.pin).length;
...
<div class="pin-dots">${'<i></i>'.repeat(PIN_LEN)}</div>
...
if (val.length >= PIN_LEN) return;   // input cap
if (val.length === PIN_LEN) { ... }  // completeness check
```

Dots, cap, and compare all derive from the same `PIN_LEN`, and physical-keyboard entry (`/^\d$/`, Backspace) shares the keypad's `press()` path, so both honor the new length. The 5-attempt / 15-minute lockout is untouched. No correctness concern.

### Gallery pairing and the `order` contract

`api/gallery` groups blobs by `baseId` (filename minus extension), treating `.json` as a caption sidecar for the media file sharing that id, then sorts by `meta.order` with a `1e9` fallback and an `uploadedAt` tiebreak. The pairing is sound; the break is on the write side. Upload emits a full sidecar:

```js
// uploadFiles
JSON.stringify({ caption: cap, order: Date.now(), updatedAt: Date.now() })
```

but the per-card save re-writes the sidecar without `order`:

```js
// wireCard save
const meta = { caption: ..., updatedAt: Date.now() };
await apiPut(photoMeta(id)|videoMeta(id), JSON.stringify(meta), 'application/json');
```

Because the sidecar is overwritten wholesale (`allowOverwrite: true`, stable path), editing any caption deletes that item's `order`, dropping it to the `1e9` bucket. One caption edit silently reshuffles the collage. Fix by reading the existing sidecar and merging, or by re-sending the known `order`.

### Audio extension rewrite vs the player

Admin accepts `m4a|mp3|ogg|wav|aac` for recordings, but normalizes all of them to `.m4a` on upload:

```js
const useExt = (kind === 'video' && AUD_EXT.includes(ext)) ? 'm4a' : ext;
```

The original bytes are uploaded unchanged under a `.m4a` name. The server regex already permits the real extensions, so this rewrite is self-imposed. The consequence is a container/extension mismatch: a `.wav` or `.ogg` recording stored as `.m4a` can fail to decode in the app's `<audio>` element depending on the browser. The app chooses `<video>` vs `<audio>` purely from extension (`isVideo(ext)`), so it has no way to recover the true type. Dropping the rewrite and keeping `ext` fixes both the decode risk and keeps the element choice honest.

### Caption rendering on the trust boundary

Captions originate in the admin panel (and from filenames on bulk upload) and are rendered into the recipient's app. They pass through `esc()` at every render site in `tasveerein`/`aawaazein`, so an admin-authored or filename-derived caption cannot inject markup. No concern — noted because it sits on a write-then-render boundary.

### Test coverage

No automated tests exist in the project and none were added. Not tested: the upload auth gate (401 on missing/wrong key, 200 on correct), the path regexes (especially that `answers/`/`audio/` stay unguarded while `media/` is gated), the sidecar pairing and `order` sort, and the caption-save `order` regression above. Given this is static + serverless with no harness, at minimum the regex behavior and the metadata merge are worth a small unit test if a runner is introduced.

</details>

<details>
<summary>Files changed</summary>

- `api/upload.js` — add `SAFE_MEDIA` admin-gated path pattern, raise body cap to 200 MB, constant-time admin check on media write/delete.
- `api/gallery.js` — new public read endpoint; lists media, folds `.json` sidecars, sorts by `order`.
- `admin.html` — Album panel: upload/caption/delete photos and recordings with the admin key.
- `assets/app.js` — `#/tasveerein` + `#/aawaazein` routes and links; PIN length driven by `EDITION.pin`.
- `content.js` — gallery/menu i18n strings; `pin` set to `231070`.
- `assets/styles.css` — collage and recordings-list styling.
- `sw.js` — cache bump to `sunao-v9`.
- `DEPLOY.md` — document the media upload workflow.

Full diff: `git diff f9ec96d -- .` (last commit + uncommitted PIN tweak).

</details>
