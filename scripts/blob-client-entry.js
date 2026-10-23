// Source for assets/vendor/blob-client.js (the browser build of the Vercel Blob
// client). Rebuild with `npm run build:blob-client` after bumping @vercel/blob.
//
// Why: a Vercel function can receive at most 4.5 MB per request, so large
// photos/videos can't go through api/upload. Instead the browser asks
// api/upload-token for a short-lived client token and sends the bytes straight
// to Vercel Blob (multipart for big files).
export { upload } from '@vercel/blob/client';
