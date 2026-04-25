const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "frontend");
const port = Number(process.env.PORT || 4173);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
]);

const server = http.createServer((request, response) => {
  const urlPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": types.get(path.extname(filePath)) || "application/octet-stream" });
    response.end(data);
  });
});

server.listen(port, () => {
  console.log(`ARES-Next frontend running at http://localhost:${port}`);
});
