import { Router } from "express";
import https from "https";

const router = Router();

interface GithubRelease {
  id: number;
  name: string;
  published_at: string;
}

// Parse the Codemagic build number out of the release name.
// Convention: release name ends with  " #<number>", e.g. "DC Lugazi Android App #42"
function parseBuildNumber(name: string): number {
  const m = name.match(/#(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

function fetchLatestRelease(): Promise<GithubRelease> {
  return new Promise((resolve, reject) => {
    const req = https.get(
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
    );
    req.setTimeout(8000, () => {
      req.destroy(new Error("GitHub release fetch timed out after 8s"));
    });
    req.on("error", reject);
  });
}

router.get("/api/version", async (req, res) => {
  try {
    const release = await fetchLatestRelease();
    const buildNumber = parseBuildNumber(release.name ?? "");
    res.json({
      buildNumber,
      publishedAt: release.published_at,
      downloadUrl:
        "https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk",
      releaseName: release.name,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch version info");
    res.status(500).json({ error: "Could not fetch version info" });
  }
});

export default router;
