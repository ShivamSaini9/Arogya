import "dotenv/config";
import { createServer as createViteServer } from "vite";
import { createApp } from "./src/app.js";
import { initDatabase } from "./src/db/database.js";
import fs from "node:fs";

const PORT = Number(process.env.PORT || 3000);
const app = await createApp();

if (process.env.NODE_ENV !== "test") {
  await initDatabase();

  if (process.env.NODE_ENV === "production" || fs.existsSync("dist/index.html")) {
    app.use((await import("express")).default.static("dist"));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EVE Healthcare app running on http://localhost:${PORT}`);
  });
}
