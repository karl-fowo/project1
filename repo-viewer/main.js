const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let mainWindow;
let dataDir;
let documentsFile;
let historyFile;

const seedDocuments = [
  {
    id: "welcome",
    title: "知识库欢迎说明",
    tags: ["入门", "说明", "本地数据"],
    content: [
      "这个知识库应用会把文档与问答历史保存到 Electron 的本地数据目录。",
      "左侧用于浏览文档，右侧用于提问和查看回答。",
      "回答逻辑基于本地文档检索，会优先返回最相关的内容和引用片段。"
    ].join("\n"),
    updatedAt: "2026-08-08T10:00:00.000Z"
  },
  {
    id: "layout",
    title: "界面结构说明",
    tags: ["UI", "布局", "问答"],
    content: [
      "界面分成两栏：左边是文档列表，右边是问答面板。",
      "文档列表支持搜索，点击后可以查看摘要、标签和更新时间。",
      "问答面板会把最近的对话保留在本地历史里。"
    ].join("\n"),
    updatedAt: "2026-08-08T10:30:00.000Z"
  },
  {
    id: "workflow",
    title: "使用流程",
    tags: ["流程", "知识管理", "检索"],
    content: [
      "先在左侧挑选相关文档，再在右侧输入问题。",
      "如果答案不够精确，可以补充更多文档，或者换一种说法提问。",
      "所有内容都保存在本地数据目录中，关闭应用后仍然可用。"
    ].join("\n"),
    updatedAt: "2026-08-08T11:00:00.000Z"
  }
];

function ensureStorage() {
  dataDir = path.join(app.getPath("userData"), "knowledge-base");
  documentsFile = path.join(dataDir, "documents.json");
  historyFile = path.join(dataDir, "history.json");
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(documentsFile)) {
    fs.writeFileSync(documentsFile, JSON.stringify(seedDocuments, null, 2), "utf-8");
  }

  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2), "utf-8");
  }
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function loadDocuments() {
  const docs = readJson(documentsFile, seedDocuments);
  return docs
    .filter((doc) => doc && doc.id && doc.title && doc.content)
    .map((doc) => ({
      id: String(doc.id),
      title: String(doc.title),
      tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
      content: String(doc.content),
      updatedAt: doc.updatedAt || new Date().toISOString()
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function loadHistory() {
  const history = readJson(historyFile, []);
  return Array.isArray(history) ? history : [];
}

function extractTerms(question) {
  const matches = question.toLowerCase().match(/[a-z0-9\u4e00-\u9fff]+/g) || [];
  return [...new Set(matches.filter((term) => term.trim().length > 1))];
}

function scoreDocument(document, terms) {
  const title = document.title.toLowerCase();
  const tags = document.tags.join(" ").toLowerCase();
  const content = document.content.toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) {
      score += 6;
    }
    if (tags.includes(term)) {
      score += 4;
    }
    const occurrences = content.split(term).length - 1;
    score += occurrences;
  }
  return score;
}

function getSnippet(document, terms) {
  const lines = document.content.split(/\r?\n/);
  let bestLine = lines[0] || "";
  let bestScore = -1;

  for (const line of lines) {
    const lowered = line.toLowerCase();
    const score = terms.reduce((total, term) => total + (lowered.includes(term) ? 2 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  const compact = bestLine.replace(/\s+/g, " ").trim();
  if (compact.length <= 150) {
    return compact;
  }
  return `${compact.slice(0, 150)}…`;
}

function answerQuestion(question, documents) {
  const terms = extractTerms(question);
  if (!documents.length) {
    return {
      answer: "本地知识库里还没有文档，先放一些资料进数据目录再来提问吧。",
      sources: []
    };
  }

  const ranked = documents
    .map((doc) => ({
      doc,
      score: scoreDocument(doc, terms)
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked.filter((item) => item.score > 0).slice(0, 3);
  if (!best.length) {
    return {
      answer: `我没有在这 ${documents.length} 篇文档里找到直接命中的内容。你可以换个问法，或者补充更多资料。`,
      sources: ranked.slice(0, 3).map(({ doc }) => ({
        title: doc.title,
        snippet: getSnippet(doc, terms)
      }))
    };
  }

  const sources = best.map(({ doc }) => ({
    title: doc.title,
    snippet: getSnippet(doc, terms)
  }));
  const lead = `我在本地知识库里找到了 ${best.length} 篇相关文档。`;
  const first = sources[0];
  const others = sources.slice(1).map((item) => `《${item.title}》`).join("、");
  const answer = others
    ? `${lead}\n\n最相关的是《${first.title}》。${first.snippet}\n\n另外还关联了 ${others}。`
    : `${lead}\n\n最相关的是《${first.title}》。${first.snippet}`;

  return { answer, sources };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#eef2f6",
    title: "知识库应用",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  ensureStorage();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("kb:bootstrap", () => {
  ensureStorage();
  return {
    documents: loadDocuments(),
    history: loadHistory(),
    dataDir
  };
});

ipcMain.handle("kb:ask", (_event, payload) => {
  ensureStorage();
  const documents = loadDocuments();
  const question = String(payload?.question || "").trim();
  const response = answerQuestion(question, documents);
  const history = loadHistory();
  const entry = {
    id: crypto.randomUUID(),
    question,
    answer: response.answer,
    sources: response.sources,
    createdAt: new Date().toISOString()
  };
  history.push(entry);
  writeJson(historyFile, history.slice(-100));
  return entry;
});
