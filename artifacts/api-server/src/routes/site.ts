import { Router } from "express";
import { db, siteSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireAdminMiddleware(req: any, res: any, next: any) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);

  if (!user?.isAdmin) {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    return;
  }

  next();
}

async function getOrCreateSiteSettings() {
  const [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1)).limit(1);
  if (settings) return settings;

  const [created] = await db.insert(siteSettingsTable).values({
    id: 1,
    siteName: "ArtistHub",
    logoUrl: "/brand-mark.png",
    faviconUrl: "/favicon.png",
  }).returning();

  return created;
}

router.get("/site/settings", async (_req, res) => {
  const settings = await getOrCreateSiteSettings();
  res.json(settings);
});

router.get("/admin/site-settings", requireAdminMiddleware, async (_req, res) => {
  const settings = await getOrCreateSiteSettings();
  res.json(settings);
});

router.post("/admin/site-settings", requireAdminMiddleware, async (req, res) => {
  const { siteName, logoUrl, faviconUrl } = req.body ?? {};
  const [updated] = await db
    .insert(siteSettingsTable)
    .values({
      id: 1,
      siteName: (typeof siteName === "string" && siteName.trim()) || "ArtistHub",
      logoUrl: typeof logoUrl === "string" ? logoUrl.trim() || null : null,
      faviconUrl: typeof faviconUrl === "string" ? faviconUrl.trim() || null : null,
      updatedByUserId: req.session.userId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: {
        siteName: (typeof siteName === "string" && siteName.trim()) || "ArtistHub",
        logoUrl: typeof logoUrl === "string" ? logoUrl.trim() || null : null,
        faviconUrl: typeof faviconUrl === "string" ? faviconUrl.trim() || null : null,
        updatedByUserId: req.session.userId,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(updated);
});

export default router;
