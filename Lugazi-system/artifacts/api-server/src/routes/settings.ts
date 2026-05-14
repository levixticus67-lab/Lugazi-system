import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    res.json({ churchName: "Deliverance Church Lugazi", tagline: "The House of Kingdom Giants", mission: null, vision: null, coreValues: null, email: null, phone: null, address: "Lugazi, Uganda", website: null });
    return;
  }
  res.json(settings);
});

router.patch("/settings", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const { churchName, tagline, mission, vision, coreValues, email, phone, address, website } = req.body;
  const [existing] = await db.select().from(settingsTable).limit(1);
  const updateData: Record<string, unknown> = {};
  if (churchName !== undefined) updateData.churchName = churchName;
  if (tagline !== undefined) updateData.tagline = tagline;
  if (mission !== undefined) updateData.mission = mission;
  if (vision !== undefined) updateData.vision = vision;
  if (coreValues !== undefined) updateData.coreValues = coreValues;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (website !== undefined) updateData.website = website;

  if (existing) {
    const [updated] = await db.update(settingsTable).set(updateData).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(settingsTable).values({
      churchName: churchName ?? "Deliverance Church Lugazi",
      tagline, mission, vision, coreValues, email, phone, address, website,
    }).returning();
    res.json(created);
  }
});

export default router;
