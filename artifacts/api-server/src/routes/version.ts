import { Router } from "express";
import https from "https";

const router = Router();

router.get("/api/version", async (req, res) => {
  try {
    const release = await fetchLatestRelease();
    res.json({
      version: release.published_at,
      downloadUrl:
        "https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk",
      releaseName: release.name,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch version info");
    res.status(500).json({ error: "Could not fetch version info" });
  }
});

function fetchLatestRelease(): Promise<{ published_at: string; name: string }> {
  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: "api.github.com",
          path: "/repos/levixticus67-lab/Lugazi-system/releases/tags/latest-build",
          headers: {
            "User-Agent": "dcl-lugazi-server",
            Accept: "application/vnd.github.v3+json",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on("error", reject);
  });
}

export default router;
