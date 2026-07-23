import { publishToFacebook, publishToInstagram, type CalendarEntry } from "./meta";
import { patchCalendarEntry } from "./cmsSupabase";

// Temporary safety lock: only this client's Page is allowed to actually publish to Meta,
// regardless of what's scheduled or what triggers the publish (manual click or cron sweep).
// Remove/expand this once we're ready to let other real client accounts go live again.
const PUBLISH_ALLOWLIST_PAGE_IDS = ["222934567567236"]; // HiddenGem Creators

/**
 * Attempts to publish whatever platforms this entry still needs.
 * - Facebook is submitted with scheduled_publish_time immediately (Meta owns the timing from there).
 * - Instagram has no native scheduling, so it's only actually published once scheduled_at has arrived
 *   (either right now, if already due, or later via the cron sweep).
 * Marks the entry "sent" once every platform it needs has been handled.
 */
export async function publishEntry(entry: CalendarEntry): Promise<CalendarEntry> {
  if (!PUBLISH_ALLOWLIST_PAGE_IDS.includes(entry.client_page_id)) {
    return patchCalendarEntry(entry.id, {
      publish_error: `Blocked: publishing is temporarily limited to HiddenGem Creators only (this entry belongs to ${entry.client_name}).`,
    });
  }

  const needsFb = entry.platform === "both" || entry.platform === "facebook";
  const needsIg = entry.platform === "both" || entry.platform === "instagram";
  const isDue = new Date(entry.scheduled_at).getTime() <= Date.now();

  const patch: Record<string, unknown> = {};
  let lastError: string | null = null;

  if (needsFb && !entry.fb_published) {
    try {
      const postId = await publishToFacebook(entry);
      patch.fb_published = true;
      patch.fb_post_id = postId;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (needsIg && !entry.ig_published && isDue) {
    try {
      const postId = await publishToInstagram(entry, async (containerId) => {
        await patchCalendarEntry(entry.id, { ig_container_id: containerId });
      });
      patch.ig_published = true;
      patch.ig_post_id = postId;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const fullyDone =
    (!needsFb || patch.fb_published || entry.fb_published) &&
    (!needsIg || patch.ig_published || entry.ig_published);

  if (fullyDone) {
    patch.status = "sent";
    patch.published_at = new Date().toISOString();
  }
  patch.publish_error = lastError;

  return patchCalendarEntry(entry.id, patch);
}
