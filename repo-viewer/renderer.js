const state = {
  documents: [],
  history: [],
  selectedId: null,
  filteredDocuments: [],
  searchTerm: "",
  dataDir: ""
};

const elements = {};

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoValue) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function preview(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}…` : compact;
}

function formatTags(tags) {
  return (tags || []).map((tag) => `#${tag}`).join("  ");
}

function getSelectedDocument() {
  return state.documents.find((doc) => doc.id === state.selectedId) || state.documents[0] || null;
}

function renderDocuments() {
  const list = elements.docList;
  list.innerHTML = "";

  const isFiltering = Boolean(state.searchTerm.trim());
  const docs = isFiltering ? state.filteredDocuments : state.documents;
  elements.docCount.textContent = isFiltering
    ? `${docs.length} / ${state.documents.length} 篇文档`
    : `${state.documents.length} 篇文档`;

  if (!docs.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的文档";
    list.appendChild(empty);
    return;
  }

  docs.forEach((doc) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `doc-row${doc.id === state.selectedId ? " active" : ""}`;
    item.innerHTML = `
      <span class="doc-row__main">
        <strong>${escapeText(doc.title)}</strong>
        <span>${escapeText(preview(doc.content))}</span>
      </span>
      <span class="doc-row__meta">${escapeText(formatDate(doc.updatedAt))}</span>
    `;
    item.addEventListener("click", () => {
      state.selectedId = doc.id;
      renderAll();
    });
    list.appendChild(item);
  });
}

function renderSelectedDocument() {
  const doc = getSelectedDocument();
  if (!doc) {
    elements.docTitle.textContent = "暂无文档";
    elements.docMeta.textContent = "";
    elements.docBody.textContent = "左侧列表里还没有任何文档。";
    elements.docTags.textContent = "";
    return;
  }

  elements.docTitle.textContent = doc.title;
  elements.docMeta.textContent = `${formatDate(doc.updatedAt)} · ${doc.content.split(/\r?\n/).length} 行`;
  elements.docBody.textContent = doc.content;
  elements.docTags.textContent = formatTags(doc.tags);
}

function createMessageNode(item, role) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const meta = document.createElement("div");
  meta.className = "message__meta";
  meta.textContent = role === "user" ? "你" : "知识库";

  const body = document.createElement("div");
  body.className = "message__body";
  body.textContent = item;

  article.append(meta, body);
  return article;
}

function createAnswerNode(entry) {
  const article = document.createElement("article");
  article.className = "message assistant";

  const meta = document.createElement("div");
  meta.className = "message__meta";
  meta.textContent = "知识库";

  const body = document.createElement("div");
  body.className = "message__body";
  body.textContent = entry.answer;

  article.append(meta, body);

  if (entry.sources && entry.sources.length) {
    const sources = document.createElement("div");
    sources.className = "sources";
    const title = document.createElement("div");
    title.className = "sources__title";
    title.textContent = "相关文档";
    sources.appendChild(title);

    entry.sources.forEach((source) => {
      const row = document.createElement("div");
      row.className = "source-row";
      const sourceTitle = document.createElement("strong");
      sourceTitle.textContent = source.title;
      const snippet = document.createElement("span");
      snippet.textContent = source.snippet;
      row.append(sourceTitle, snippet);
      sources.appendChild(row);
    });

    article.appendChild(sources);
  }

  return article;
}

function renderChat() {
  const chat = elements.chat;
  chat.innerHTML = "";

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent = "输入一个问题，右侧会返回基于本地文档的答案。";
    chat.appendChild(empty);
    return;
  }

  state.history.forEach((entry) => {
    chat.appendChild(createMessageNode(entry.question, "user"));
    chat.appendChild(createAnswerNode(entry));
  });
}

function renderFooter() {
  elements.storagePath.textContent = state.dataDir ? `本地数据目录：${state.dataDir}` : "本地数据目录已启用";
}

function renderAll() {
  renderDocuments();
  renderSelectedDocument();
  renderChat();
  renderFooter();
}

function applyFilter() {
  const term = state.searchTerm.trim().toLowerCase();
  if (!term) {
    state.filteredDocuments = [];
    return;
  }

  state.filteredDocuments = state.documents.filter((doc) => {
    const haystack = `${doc.title} ${doc.tags.join(" ")} ${doc.content}`.toLowerCase();
    return haystack.includes(term);
  });
}

async function submitQuestion(question) {
  const content = question.trim();
  if (!content) {
    return;
  }

  elements.questionInput.value = "";
  elements.askButton.disabled = true;

  state.history.push({
    id: `draft-${Date.now()}`,
    question: content,
    answer: "正在整理本地文档…",
    sources: []
  });
  renderChat();

  try {
    const entry = await window.kb.ask(content);
    state.history[state.history.length - 1] = entry;
    renderChat();
    elements.chat.scrollTop = elements.chat.scrollHeight;
  } finally {
    elements.askButton.disabled = false;
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    applyFilter();
    renderDocuments();
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(elements.questionInput.value);
  });

  elements.questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submitQuestion(elements.questionInput.value);
    }
  });
}

async function init() {
  elements.docList = document.getElementById("doc-list");
  elements.docCount = document.getElementById("doc-count");
  elements.docTitle = document.getElementById("doc-title");
  elements.docMeta = document.getElementById("doc-meta");
  elements.docBody = document.getElementById("doc-body");
  elements.docTags = document.getElementById("doc-tags");
  elements.chat = document.getElementById("chat");
  elements.form = document.getElementById("question-form");
  elements.questionInput = document.getElementById("question-input");
  elements.searchInput = document.getElementById("doc-search");
  elements.askButton = document.getElementById("ask-button");
  elements.storagePath = document.getElementById("storage-path");

  const bootstrap = await window.kb.bootstrap();
  state.documents = bootstrap.documents || [];
  state.history = bootstrap.history || [];
  state.dataDir = bootstrap.dataDir || "";
  state.selectedId = state.documents[0]?.id || null;

  bindEvents();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
