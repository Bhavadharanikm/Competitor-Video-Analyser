import { google } from "googleapis";

export function extractDriveFileId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{15,}$/.test(input) && !input.includes("/")) return input;
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function driveAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google service account not configured");
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

export async function getDriveFileMeta(fileId: string): Promise<{ mimeType: string; name: string | null }> {
  const drive = google.drive({ version: "v3", auth: driveAuth() });
  const res = await drive.files.get({ fileId, fields: "mimeType,name" });
  return { mimeType: res.data.mimeType ?? "application/octet-stream", name: res.data.name ?? null };
}

export async function streamDriveFile(fileId: string) {
  const drive = google.drive({ version: "v3", auth: driveAuth() });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  return res.data;
}
