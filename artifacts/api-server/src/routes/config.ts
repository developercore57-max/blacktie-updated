import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, companySettingsTable } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

router.get("/config/google-maps-key", requireAuth, async (_req, res) => {
  try {
    const [settings] = await db.select({ apiSecrets: companySettingsTable.apiSecrets }).from(companySettingsTable).limit(1);
    if (!settings?.apiSecrets) return res.json({ key: null });
    const secrets = JSON.parse(settings.apiSecrets);
    return res.json({ key: secrets.googleMapsApiKey || secrets.google_maps_key || null });
  } catch {
    return res.json({ key: null });
  }
});

export default router;
