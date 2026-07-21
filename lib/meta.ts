import { extractDriveFileId, getDriveFileMeta } from "./googleDrive";

const GRAPH = "https://graph.facebook.com/v23.0";

export interface CalendarEntry {
  id: string;
  client_page_id: string;
  client_name: string;
  instagram_account_id: string | null;
  title: string;
  caption: string | null;
  media_url: string | null;
  platform: string;
  content_type: string;
  status: string;
  scheduled_at: string;
  link_url: string | null;
  custom_thumbnail_url: string | null;
  thumb_offset_seconds: number | null;
  location_id: string | null;
  user_tags: string | null;
  collaborators: string | null;
  share_to_feed: boolean;
  fb_published: boolean;
  ig_published: boolean;
  fb_post_id: string | null;
  ig_post_id: string | null;
  ig_container_id: string | null;
}

function systemToken(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) throw new Error("META_SYSTEM_USER_TOKEN not configured");
  return token;
}

async function graphFetch(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const url = method === "GET"
    ? `${GRAPH}${path}?${new URLSearchParams(params).toString()}`
    : `${GRAPH}${path}`;
  const res = await fetch(url, method === "GET" ? undefined : { method: "POST", body: new URLSearchParams(params) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Meta API error at ${path}`);
  return data;
}

async function getPageAccessToken(pageId: string): Promise<string> {
  const data = await graphFetch(`/${pageId}`, { fields: "access_token", access_token: systemToken() }, "GET");
  if (!data.access_token) throw new Error(`No page access token available for page ${pageId}`);
  return data.access_token as string;
}

const isDriveUrl = (url: string) => /drive\.google\.com/i.test(url);

/**
 * Meta fetches media_url itself — a Google Drive share/viewer link returns an HTML page,
 * not raw file bytes, so Drive links get rewritten to our own proxy route, which downloads
 * the file server-side (via the Drive service account) and serves it with a real Content-Type.
 */
function resolveMediaUrl(url: string): string {
  if (!isDriveUrl(url)) return url;
  const base = process.env.APP_URL;
  if (!base) throw new Error("APP_URL not configured — required to proxy Google Drive media for Meta");
  return `${base.replace(/\/$/, "")}/api/cms/media?url=${encodeURIComponent(url)}`;
}

const isVideoExtension = (url: string) => /\.(mp4|mov|m4v)(\?|$)/i.test(url);
const isImageExtension = (url: string) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);

/**
 * Drive links carry no file extension to sniff, so for those we ask Drive itself for the
 * real mimeType via the service account. Defaults to "video" for anything else ambiguous,
 * since this pipeline is primarily video content.
 */
async function isVideoMedia(url: string): Promise<boolean> {
  if (isVideoExtension(url)) return true;
  if (isImageExtension(url)) return false;
  if (isDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      const meta = await getDriveFileMeta(fileId);
      return meta.mimeType.startsWith("video/");
    }
  }
  return true;
}

/** Facebook Pages support native scheduling — Meta fires the post itself once scheduled_publish_time arrives. */
export async function publishToFacebook(entry: CalendarEntry): Promise<string> {
  const pageToken = await getPageAccessToken(entry.client_page_id);
  const scheduledUnix = Math.floor(new Date(entry.scheduled_at).getTime() / 1000);
  const nowUnix = Math.floor(Date.now() / 1000);
  const canSchedule = scheduledUnix > nowUnix + 600; // Meta requires >=10 min in the future

  const params: Record<string, string> = { access_token: pageToken };
  let path: string;

  if (entry.media_url) {
    path = `/${entry.client_page_id}/videos`;
    params.file_url = resolveMediaUrl(entry.media_url);
    params.title = entry.title;
    params.description = entry.caption ?? entry.title;
  } else {
    path = `/${entry.client_page_id}/feed`;
    params.message = entry.caption ?? entry.title;
    if (entry.link_url) params.link = entry.link_url;
  }

  if (canSchedule) {
    params.published = "false";
    params.scheduled_publish_time = String(scheduledUnix);
  } else {
    params.published = "true";
  }

  const data = await graphFetch(path, params);
  return data.id as string;
}

/**
 * Instagram has no native scheduling, so this is only called once the scheduled time has
 * actually arrived (immediately on approve if already due, otherwise from the cron sweep).
 * Reuses a previously created container (ig_container_id) if one exists, so retries don't
 * create duplicate containers.
 */
export async function publishToInstagram(
  entry: CalendarEntry,
  saveContainerId: (containerId: string) => Promise<void>
): Promise<string> {
  if (!entry.instagram_account_id) throw new Error("No Instagram account linked to this client");
  const token = systemToken();

  let containerId = entry.ig_container_id;

  if (!containerId) {
    const params: Record<string, string> = { access_token: token };
    // Detect video-vs-image from the ORIGINAL url (proxied URLs have no file extension to sniff).
    const isVideo = entry.media_url ? await isVideoMedia(entry.media_url) : false;
    const resolvedMediaUrl = entry.media_url ? resolveMediaUrl(entry.media_url) : null;

    if (entry.content_type === "story") {
      params.media_type = "STORIES";
      if (resolvedMediaUrl && isVideo) params.video_url = resolvedMediaUrl;
      else if (resolvedMediaUrl) params.image_url = resolvedMediaUrl;
    } else if (entry.content_type === "reel") {
      params.media_type = "REELS";
      if (resolvedMediaUrl) params.video_url = resolvedMediaUrl;
      if (entry.caption) params.caption = entry.caption;
      if (entry.thumb_offset_seconds) params.thumb_offset = String(Math.round(entry.thumb_offset_seconds * 1000));
      params.share_to_feed = entry.share_to_feed ? "true" : "false";
    } else {
      if (resolvedMediaUrl && isVideo) {
        params.media_type = "REELS";
        params.video_url = resolvedMediaUrl;
        params.share_to_feed = "true";
      } else if (resolvedMediaUrl) {
        params.image_url = resolvedMediaUrl;
      }
      if (entry.caption) params.caption = entry.caption;
    }

    if (entry.content_type !== "story") {
      if (entry.location_id) params.location_id = entry.location_id;
      if (entry.user_tags) {
        const usernames = entry.user_tags.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean);
        if (usernames.length) params.user_tags = JSON.stringify(usernames.map(username => ({ username })));
      }
      if (entry.collaborators) {
        const collabs = entry.collaborators.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean);
        if (collabs.length) params.collaborators = JSON.stringify(collabs);
      }
    }

    const created = await graphFetch(`/${entry.instagram_account_id}/media`, params);
    containerId = created.id as string;
    await saveContainerId(containerId);
  }

  // Poll until Meta finishes processing the media (videos take longer than images).
  for (let attempt = 0; attempt < 15; attempt++) {
    const statusData = await graphFetch(`/${containerId}`, { fields: "status_code", access_token: token }, "GET");
    if (statusData.status_code === "FINISHED") break;
    if (statusData.status_code === "ERROR") throw new Error("Instagram media processing failed");
    await new Promise(r => setTimeout(r, 3000));
  }

  const published = await graphFetch(`/${entry.instagram_account_id}/media_publish`, {
    creation_id: containerId,
    access_token: token,
  });
  return published.id as string;
}
