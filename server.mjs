import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number.parseInt(process.env.PORT || "4173", 10);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
]);

function send(response, status, body) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);
  const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
  const requestedPath = resolve(join(root, safePath || "index.html"));

  if (!requestedPath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }

  const filePath = existsSync(requestedPath) && statSync(requestedPath).isDirectory()
    ? join(requestedPath, "index.html")
    : requestedPath;

  if (!existsSync(filePath)) {
    send(response, 404, "Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes.get(extname(filePath)) || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Password Generator is running at http://127.0.0.1:${port}`);
});
