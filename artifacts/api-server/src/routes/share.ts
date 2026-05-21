import { Router, type Request } from "express";
import { artistProfilesTable, db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { formatArtistProfile } from "./helpers.js";

const router = Router();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPublicWebBaseUrl(req: Request) {
  const explicit = process.env.PUBLIC_WEB_URL || process.env.FRONTEND_URL || process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function toAbsoluteUrl(url: string | null | undefined, baseUrl: string) {
  if (!url) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

router.get("/artists/:userId/share", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).send("Invalid artist");
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [profile] = await db.select().from(artistProfilesTable).where(eq(artistProfilesTable.userId, userId)).limit(1);
  if (!user || !profile) {
    res.status(404).send("Artist not found");
    return;
  }

  const artist = await formatArtistProfile(profile, user, req.session?.userId);
  const webBaseUrl = getPublicWebBaseUrl(req);
  const canonicalUrl = `${webBaseUrl}/artists/${userId}`;
  const shareUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const previewImage =
    toAbsoluteUrl(artist.bannerUrl || artist.avatarUrl || null, webBaseUrl)
    || `${webBaseUrl}/opengraph.svg`;
  const title = `${artist.displayName || artist.user.username} | HollywoodHeartbeats.com`;
  const description = artist.tagline
    || artist.bio
    || [artist.category, artist.location].filter(Boolean).join(" · ")
    || "Explore this artist page on HollywoodHeartbeats.com.";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="HollywoodHeartbeats.com" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:image" content="${escapeHtml(previewImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(previewImage)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(canonicalUrl)}" />
    <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(title)}</a>…</p>
  </body>
</html>`);
});

export default router;
