const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PORT = 3456;
const REPO_DIR = path.resolve(__dirname, "..");

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.url === "/api/commit") {
    try {
      const log = execSync(
        'git log -1 --format="author=%an|%ae|date=%ai"',
        { cwd: REPO_DIR, encoding: "utf-8" }
      ).trim();
      const [authorPart, datePart] = log.split("|");
      const authorName = authorPart.split("=")[1];
      const date = datePart.split("=")[1];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        author: authorName,
        date: new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
      }));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ author: "—", date: "—" }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Repo viewer running at http://127.0.0.1:${PORT}`);
});
