import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Serves the Vercel functions in /api during `npm run dev`, so the booking flow and
 * admin panel work locally without the Vercel CLI. Production uses Vercel itself.
 */
function devApi(): Plugin {
  return {
    name: "linda-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
          const mod = await server.ssrLoadModule(`/api/${url.pathname.slice(5).replace(/\/$/, "")}.ts`);
          const fn = mod[req.method ?? "GET"];
          if (typeof fn !== "function") {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          const hasBody = !["GET", "HEAD"].includes(req.method ?? "GET");
          const response: Response = await fn(
            new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }),
          );
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          console.error(err);
          res.statusCode = 500;
          res.end(String(err));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env / .env.local available to the API functions in development.
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ""))) process.env[k] ??= v;
  return {
    plugins: [react(), tailwindcss(), devApi()],
  };
});
