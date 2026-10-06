import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type UploadOptions = {
  bucket: string;
  path: string;
  file: Blob;
  /** 0–1 as bytes are sent. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/**
 * Uploads a file straight from the browser to Supabase Storage, reporting
 * progress.
 *
 * supabase-js's upload() uses fetch(), which can't report upload progress, so
 * this sends the same request (Storage's `POST /object/{bucket}/{path}`) with
 * XMLHttpRequest, whose `upload.onprogress` can. Auth is the user's own access
 * token, so Storage RLS applies exactly as with the SDK: you can only write
 * into your own folder.
 */
export async function uploadWithProgress({
  bucket,
  path,
  file,
  onProgress,
  signal,
}: UploadOptions): Promise<void> {
  const { data } = await createClient().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please log in again.");

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("apikey", env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    request.setRequestHeader("content-type", file.type);
    // Each upload gets a fresh random name, so its content never changes and
    // browsers and the CDN may cache it for a year.
    request.setRequestHeader("cache-control", "max-age=31536000");
    request.setRequestHeader("x-upsert", "false");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload failed (${request.status}).`));
      }
    };
    request.onerror = () => reject(new Error("Upload failed. Check your connection."));
    request.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    signal?.addEventListener("abort", () => request.abort(), { once: true });

    request.send(file);
  });
}
