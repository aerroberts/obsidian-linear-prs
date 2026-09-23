"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LinearPrsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/api.ts
var import_obsidian = require("obsidian");
async function json(url, method, token, body) {
  const res = await (0, import_obsidian.requestUrl)({ url, method, headers: { "Authorization": token, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" }, body: body === void 0 ? void 0 : JSON.stringify(body), throw: false });
  if (res.status >= 400) throw new Error(`${method} ${url}: ${res.status} ${JSON.stringify(res.json?.message ?? res.text).slice(0, 200)}`);
  return res.json;
}
async function linear(key, query, variables = {}) {
  const data = await json("https://api.linear.app/graphql", "POST", key, { query, variables });
  if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join("; "));
  return data.data;
}
var ISSUE_FIELDS = "id identifier title url state { type } project { id name url } parent { id title url }";
var PAGE = "pageInfo { hasNextPage endCursor }";
async function assignedRoots(key) {
  const roots = [];
  let after = null;
  do {
    const data = await linear(key, `query($after:String){viewer{assignedIssues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`, { after });
    const page = data.viewer.assignedIssues;
    roots.push(...page.nodes.filter((i) => !["completed", "canceled"].includes(i.state?.type ?? "")));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return roots;
}
async function issueChildren(key, id) {
  const children = [];
  let after = null;
  do {
    const data = await linear(key, `query($id:String!,$after:String){issue(id:$id){children(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`, { id, after });
    const page = data.issue.children;
    children.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return children;
}
async function attachmentUrls(key, id) {
  const urls = [];
  let after = null;
  do {
    const data = await linear(key, `query($id:String!,$after:String){issue(id:$id){attachments(first:100,after:$after){nodes{url} ${PAGE}}}}`, { id, after });
    const page = data.issue.attachments;
    urls.push(...page.nodes.map((n) => n.url));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return urls;
}
var prPattern = /https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;
function parsePr(url) {
  const m = url.match(prPattern);
  return m ? { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) } : null;
}
async function gh(token, path, method = "GET", body) {
  return json(`https://api.github.com${path}`, method, `Bearer ${token}`, body);
}
async function githubSearch(token, identifier) {
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const data = await gh(token, `/search/issues?q=${encodeURIComponent(`"${identifier}" type:pr state:open`)}&per_page=100&page=${page}`);
    for (const item of data.items ?? []) {
      const parsed = parsePr(item.html_url);
      if (parsed) found.push(parsed);
    }
    if ((data.items ?? []).length < 100) break;
  }
  return found;
}
async function details(token, repo, number, issue, attached) {
  const path = `/repos/${repo}/pulls/${number}`;
  const p = await gh(token, path);
  if (p.state !== "open") return null;
  if (!attached) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])${issue.identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, "i");
    if (!pattern.test([p.title, p.body ?? "", p.head?.ref ?? ""].join("\n"))) return null;
  }
  const [reviews, checkRuns, status, reviewComments, issueComments] = await Promise.allSettled([
    gh(token, `${path}/reviews?per_page=100`),
    gh(token, `/repos/${repo}/commits/${p.head.sha}/check-runs?per_page=100`),
    gh(token, `/repos/${repo}/commits/${p.head.sha}/status`),
    gh(token, `${path}/comments?per_page=100`),
    gh(token, `/repos/${repo}/issues/${number}/comments?per_page=100`)
  ]);
  const reviewerMap = /* @__PURE__ */ new Map();
  for (const r of reviews.status === "fulfilled" ? reviews.value : []) if (r.user?.login && ["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"].includes(r.state)) reviewerMap.set(r.user.login, r.state.toLowerCase());
  for (const r of p.requested_reviewers ?? []) if (!reviewerMap.has(r.login)) reviewerMap.set(r.login, "requested");
  const checks = [];
  if (checkRuns.status === "fulfilled") for (const c of checkRuns.value.check_runs ?? []) checks.push({ name: c.name, status: c.status !== "completed" ? "pending" : c.conclusion === "success" ? "success" : "failure" });
  if (status.status === "fulfilled") for (const s of status.value.statuses ?? []) checks.push({ name: s.context, status: s.state === "success" ? "success" : s.state === "pending" ? "pending" : "failure" });
  const hasHumanComments = [reviewComments, issueComments].some((result) => result.status === "fulfilled" && result.value.some((comment) => comment.user?.type === "User"));
  const groupId = issue.parent?.id ?? issue.project?.id ?? "unparented";
  const groupTitle = issue.parent?.title ?? issue.project?.name ?? "Unparented issues";
  const groupUrl = issue.parent?.url ?? issue.project?.url ?? "";
  return { id: `${repo}#${number}`, url: p.html_url, repo, number, title: p.title, draft: p.draft, state: p.draft ? "draft" : "open", createdAt: p.created_at, issueId: issue.id, issueTitle: issue.title, issueUrl: issue.url, groupId, groupTitle, groupUrl, checks, reviewers: [...reviewerMap].map(([login, status2]) => ({ login, status: status2 })), automerge: !!p.auto_merge, conflicts: p.mergeable === false, comments: hasHumanComments };
}
async function mapLimit(items, limit, fn) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }));
}
async function discover(c) {
  const roots = await assignedRoots(c.linearKey);
  const seen = /* @__PURE__ */ new Set();
  const issues = [];
  const errors = [];
  let frontier = roots;
  while (frontier.length) {
    const batch = frontier.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
    issues.push(...batch);
    const next = [];
    await mapLimit(batch, 6, async (issue) => {
      try {
        next.push(...await issueChildren(c.linearKey, issue.id));
      } catch (e) {
        errors.push(`${issue.identifier} children: ${String(e)}`);
      }
    });
    frontier = next;
  }
  const prs = [];
  const used = /* @__PURE__ */ new Set();
  const refsByIssue = /* @__PURE__ */ new Map();
  const allowedRepos = /* @__PURE__ */ new Set();
  await mapLimit(issues, 6, async (issue) => {
    const refs = /* @__PURE__ */ new Map();
    refsByIssue.set(issue.id, refs);
    try {
      for (const url of await attachmentUrls(c.linearKey, issue.id)) {
        const ref = parsePr(url);
        if (ref) {
          allowedRepos.add(ref.repo);
          refs.set(`${ref.repo}#${ref.number}`, { ...ref, attached: true });
        }
      }
    } catch (e) {
      errors.push(`${issue.identifier} attachments: ${String(e)}`);
    }
  });
  await mapLimit(issues, 6, async (issue) => {
    const refs = refsByIssue.get(issue.id);
    try {
      for (const ref of await githubSearch(c.githubKey, issue.identifier)) {
        const key = `${ref.repo}#${ref.number}`;
        if (allowedRepos.has(ref.repo) && !refs.has(key)) refs.set(key, { ...ref, attached: false });
      }
    } catch (e) {
      errors.push(`${issue.identifier} search: ${String(e)}`);
    }
    for (const ref of refs.values()) {
      const key = `${ref.repo}#${ref.number}`;
      if (used.has(key)) continue;
      used.add(key);
      try {
        const pr = await details(c.githubKey, ref.repo, ref.number, issue, ref.attached);
        if (pr) prs.push(pr);
      } catch (e) {
        errors.push(`${key}: ${String(e)}`);
      }
    }
  });
  return { prs, errors };
}
async function launchPr(c, pr) {
  const data = await gh(c.githubKey, `/repos/${pr.repo}/pulls/${pr.number}`);
  if (data.draft) await gh(c.githubKey, `/repos/${pr.repo}/pulls/${pr.number}/ready_for_review`, "POST");
  const q = `mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}`;
  const result = await json("https://api.github.com/graphql", "POST", `Bearer ${c.githubKey}`, { query: q, variables: { id: data.node_id } });
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join("; "));
}
async function requestReviewer(c, pr, login) {
  await gh(c.githubKey, `/repos/${pr.repo}/pulls/${pr.number}/requested_reviewers`, "POST", { reviewers: [login] });
}
async function closePr(c, pr) {
  await gh(c.githubKey, `/repos/${pr.repo}/pulls/${pr.number}`, "PATCH", { state: "closed" });
}

// src/main.ts
var VIEW = "linear-prs";
var META = ".linear-prs/metadata.json";
var defaults = { linearKey: "", githubKey: "", favoriteReviewers: "" };
var empty = () => ({ version: 1, reviewTypes: {}, reviewMessage: [], collapsed: [], selectedRepo: "", hidden: [], lastRefresh: "", pullRequests: [] });
function message(prs) {
  return ["Some prs to review:", "", ...prs.map((p, i) => `${i + 1}. ${p.title} ${p.url}`)].join("\n");
}
function icon(parent, name, title, cls = "") {
  const el = parent.createSpan({ cls: `linear-prs-icon ${cls}` });
  (0, import_obsidian2.setIcon)(el, name);
  if (title) {
    el.setAttr("title", title);
    el.setAttr("aria-label", title);
    el.setAttr("role", "img");
  }
  return el;
}
function button(parent, label, name, click, active = false) {
  const b = parent.createEl("button", { cls: `linear-prs-button${active ? " is-active" : ""}`, attr: { "aria-label": label, title: label, type: "button" } });
  (0, import_obsidian2.setIcon)(b, name);
  b.onclick = (e) => {
    e.stopPropagation();
    click();
  };
  return b;
}
function date(iso) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 36e5));
  if (hours < 1) return "opened just now";
  if (hours < 24) return `opened ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `opened ${days} ${days === 1 ? "day" : "days"} ago`;
}
function safeError(e) {
  return e instanceof Error ? e.message : String(e);
}
var LinearPrsPlugin = class extends import_obsidian2.Plugin {
  settings = defaults;
  metadata = empty();
  async onload() {
    this.settings = { ...defaults, ...await this.loadData() };
    await this.loadMetadata();
    this.registerView(VIEW, (leaf) => new BoardView(leaf, this));
    this.addRibbonIcon("git-pull-request", "Linear PRs", () => void this.openBoard());
    this.addCommand({ id: "open-linear-prs", name: "Open Linear PRs", callback: () => void this.openBoard() });
    this.addSettingTab(new Preferences(this.app, this));
  }
  async openBoard() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async loadMetadata() {
    const adapter = this.app.vault.adapter;
    if (await adapter.exists(META)) {
      try {
        this.metadata = { ...empty(), ...JSON.parse(await adapter.read(META)) };
      } catch (e) {
        new import_obsidian2.Notice(`Linear PRs metadata: ${safeError(e)}`);
      }
    }
  }
  async saveMetadata() {
    const adapter = this.app.vault.adapter;
    if (!await adapter.exists(".linear-prs")) await adapter.mkdir(".linear-prs");
    await adapter.write(META, JSON.stringify(this.metadata, null, 2) + "\n");
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async refresh() {
    if (!this.settings.linearKey || !this.settings.githubKey) throw new Error("Enter both API keys in Linear PRs settings.");
    const result = await discover(this.settings);
    this.metadata.pullRequests = [...result.prs, ...this.metadata.pullRequests.filter((p) => this.metadata.hidden.includes(p.id) && !result.prs.some((n) => n.id === p.id))];
    this.metadata.lastRefresh = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveMetadata();
    return result;
  }
  credentials() {
    return { linearKey: this.settings.linearKey, githubKey: this.settings.githubKey };
  }
};
var Preferences = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const c = this.containerEl;
    c.empty();
    c.createEl("h2", { text: "Linear PRs" });
    new import_obsidian2.Setting(c).setName("Linear API key").setDesc("Personal API key for your Linear account.").addText((t) => {
      t.setPlaceholder("lin_api_\u2026").setValue(this.plugin.settings.linearKey).onChange(async (v) => {
        this.plugin.settings.linearKey = v.trim();
        await this.plugin.saveSettings();
      });
      t.inputEl.type = "password";
    });
    new import_obsidian2.Setting(c).setName("GitHub API key").setDesc("Personal access token with access to the linked repositories.").addText((t) => {
      t.setPlaceholder("github_pat_\u2026").setValue(this.plugin.settings.githubKey).onChange(async (v) => {
        this.plugin.settings.githubKey = v.trim();
        await this.plugin.saveSettings();
      });
      t.inputEl.type = "password";
    });
    new import_obsidian2.Setting(c).setName("Favorite reviewers").setDesc("Comma separated GitHub usernames shown in group actions.").addText((t) => t.setPlaceholder("alice,bob").setValue(this.plugin.settings.favoriteReviewers).onChange(async (v) => {
      this.plugin.settings.favoriteReviewers = v;
      await this.plugin.saveSettings();
    }));
    c.createEl("p", { text: "Keys are saved in Obsidian plugin settings; board tracking is saved to .linear-prs/metadata.json in this vault.", cls: "setting-item-description" });
  }
};
var BoardView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  busy = false;
  archived = false;
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "Linear PRs";
  }
  getIcon() {
    return "git-pull-request";
  }
  async onOpen() {
    this.render();
    if (this.plugin.settings.linearKey && this.plugin.settings.githubKey) void this.refresh();
  }
  async act(fn, success) {
    try {
      await fn();
      new import_obsidian2.Notice(success);
      this.render();
    } catch (e) {
      new import_obsidian2.Notice(safeError(e), 8e3);
    }
  }
  async refresh() {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      const r = await this.plugin.refresh();
      new import_obsidian2.Notice(`Linear PRs: ${r.prs.length} open PRs${r.errors.length ? `, ${r.errors.length} lookup errors` : ""}`);
      if (r.errors.length) console.warn("Linear PR lookup errors", r.errors);
    } catch (e) {
      new import_obsidian2.Notice(safeError(e), 8e3);
    } finally {
      this.busy = false;
      this.render();
    }
  }
  visible() {
    const m = this.plugin.metadata;
    return m.pullRequests.filter((p) => this.archived ? m.hidden.includes(p.id) : !m.hidden.includes(p.id)).filter((p) => !m.selectedRepo || p.repo === m.selectedRepo).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  queue(prs, title, parent) {
    const details2 = parent.createEl("details", { cls: "linear-prs-group" });
    details2.open = true;
    const summary = details2.createEl("summary", { cls: "linear-prs-group-header" });
    icon(summary, "chevron-down", void 0, "linear-prs-chevron");
    summary.createSpan({ text: title, cls: "linear-prs-group-title" });
    const tools = summary.createSpan({ cls: "linear-prs-actions" });
    tools.createSpan({ text: String(prs.length), cls: "linear-prs-count" });
    button(tools, `Copy ${title}`, "copy", () => void this.copy(message(prs)));
    button(tools, `Launch ${title}`, "rocket", () => void this.launchMany(prs));
    const list = details2.createDiv({ cls: "linear-prs-list" });
    if (!prs.length) list.createDiv({ text: title === "PRs in Review" ? "No pull requests in review" : "No pull requests to stamp", cls: "linear-prs-empty" });
    else prs.forEach((p) => this.row(p, list));
  }
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      new import_obsidian2.Notice("Copied pull requests");
    } catch (e) {
      new import_obsidian2.Notice(safeError(e));
    }
  }
  async track(type, prs) {
    prs.forEach((p) => this.plugin.metadata.reviewTypes[p.id] = type);
    await this.plugin.saveMetadata();
    this.render();
  }
  async launchMany(prs) {
    if (!prs.length) return;
    let done = 0;
    const errors = [];
    for (const p of prs) {
      try {
        await launchPr(this.plugin.credentials(), p);
        p.draft = false;
        p.automerge = true;
        done++;
      } catch (e) {
        errors.push(`${p.repo}#${p.number}: ${safeError(e)}`);
      }
    }
    await this.plugin.saveMetadata();
    this.render();
    new import_obsidian2.Notice(`Launched ${done}/${prs.length} PRs${errors.length ? `. ${errors.join("; ")}` : ""}`, errors.length ? 1e4 : 4e3);
  }
  reviewBlock(parent) {
    const m = this.plugin.metadata;
    const items = m.reviewMessage.map((id) => m.pullRequests.find((p) => p.id === id)).filter((p) => !!p);
    if (!items.length) return;
    const block = parent.createDiv({ cls: "linear-prs-review-block" });
    block.createEl("pre", { text: message(items) });
    const actions = block.createDiv({ cls: "linear-prs-actions" });
    button(actions, "Mark all as please stamp", "stamp", () => void this.act(async () => {
      await this.track("stamp", items);
      m.reviewMessage = [];
      await this.plugin.saveMetadata();
    }, "Moved to stamp"));
    button(actions, "Mark all as please review", "eye", () => void this.act(async () => {
      await this.track("review", items);
      m.reviewMessage = [];
      await this.plugin.saveMetadata();
    }, "Moved to review"));
    button(actions, "Launch review PRs", "rocket", () => void this.launchMany(items));
    button(actions, "Copy review message", "copy", () => void this.copy(message(items)));
    button(actions, "Clear review message", "trash-2", () => void this.act(async () => {
      m.reviewMessage = [];
      await this.plugin.saveMetadata();
    }, "Cleared review message"));
  }
  row(p, parent) {
    const m = this.plugin.metadata;
    const row = parent.createDiv({ cls: "linear-prs-row" });
    const top = row.createDiv({ cls: "linear-prs-row-top" });
    const link = top.createEl("a", { href: p.url, cls: "linear-prs-title" });
    link.setAttr("target", "_blank");
    icon(link, p.draft ? "git-pull-request-draft" : "git-pull-request", p.draft ? "draft" : "open", p.draft ? "dim" : "good");
    link.createSpan({ text: p.title, cls: "linear-prs-title-text" });
    const controls = top.createSpan({ cls: "linear-prs-actions linear-prs-controls" });
    const remove = controls.createSpan({ cls: "linear-prs-control-set" });
    button(remove, "Close and remove pull request", "trash-2", () => void this.act(async () => {
      await closePr(this.plugin.credentials(), p);
      m.hidden.push(p.id);
      await this.plugin.saveMetadata();
    }, "Closed and removed PR"));
    const review = controls.createSpan({ cls: "linear-prs-control-set" });
    button(review, "Add to review message", "copy", () => void this.act(async () => {
      if (!m.reviewMessage.includes(p.id)) m.reviewMessage.push(p.id);
      await this.plugin.saveMetadata();
      await navigator.clipboard.writeText(message(m.reviewMessage.map((id) => m.pullRequests.find((x) => x.id === id)).filter((x) => !!x)));
    }, "Added to review message"));
    button(review, "Please stamp", "stamp", () => void this.act(() => this.track(m.reviewTypes[p.id] === "stamp" ? "none" : "stamp", [p]), "Updated review type"), m.reviewTypes[p.id] === "stamp");
    button(review, "Please review", "eye", () => void this.act(() => this.track(m.reviewTypes[p.id] === "review" ? "none" : "review", [p]), "Updated review type"), m.reviewTypes[p.id] === "review");
    const badges = controls.createSpan({ cls: "linear-prs-control-set linear-prs-badges" });
    icon(badges, "message-square", p.comments ? "Pull request has comments" : "Pull request has no comments", p.comments ? "orange" : "dim");
    icon(badges, "user", p.reviewers.length ? p.reviewers.map((r) => `${r.login}: ${r.status}`).join(", ") : "No reviewers assigned", p.reviewers.length && p.reviewers.every((r) => r.status === "approved") ? "good" : "dim");
    icon(badges, "git-merge", p.automerge ? "Automerge enabled" : "Automerge disabled", p.automerge ? "good" : "dim");
    const checkTitle = [p.conflicts ? "Merge conflicts" : "", ...p.checks.map((c) => `${c.name}: ${c.status}`)].filter(Boolean).join(", ") || "No checks";
    const checkStatus = p.conflicts || p.checks.some((c) => c.status === "failure") ? "bad" : p.checks.some((c) => c.status === "pending") ? "dim" : "good";
    icon(badges, checkStatus === "bad" ? "circle-x" : checkStatus === "dim" ? "loader-circle" : "circle-check", checkTitle, checkStatus);
    const meta = row.createDiv({ cls: "linear-prs-meta" });
    const refs = meta.createSpan({ cls: "linear-prs-meta-link" });
    if (p.issueTitle && p.issueUrl) {
      const issue = refs.createEl("a", { text: p.issueTitle, href: p.issueUrl, cls: "linear-prs-issue-title" });
      issue.setAttr("target", "_blank");
      issue.setAttr("title", p.issueTitle);
    }
    const a = refs.createEl("a", { href: p.url, cls: "linear-prs-meta-link" });
    a.setAttr("target", "_blank");
    a.createSpan({ text: p.repo, cls: "linear-prs-pill" });
    a.createSpan({ text: `#${p.number}`, cls: "linear-prs-pill" });
    meta.createSpan({ text: date(p.createdAt), cls: "linear-prs-date" });
  }
  group(prs, id, title, url, parent) {
    const m = this.plugin.metadata;
    const details2 = parent.createEl("details", { cls: "linear-prs-group" });
    details2.open = !m.collapsed.includes(id);
    const summary = details2.createEl("summary", { cls: "linear-prs-group-header" });
    icon(summary, "chevron-down", void 0, "linear-prs-chevron");
    if (url) {
      const titleLink = summary.createEl("a", { text: title, href: url, cls: "linear-prs-group-title" });
      titleLink.setAttr("target", "_blank");
      titleLink.onclick = (e) => e.stopPropagation();
    } else summary.createSpan({ text: title, cls: "linear-prs-group-title" });
    const actions = summary.createSpan({ cls: "linear-prs-actions" });
    actions.createSpan({ text: String(prs.length), cls: "linear-prs-count" });
    button(actions, "Launch group PRs", "rocket", () => void this.launchMany(prs));
    const reviewers = this.plugin.settings.favoriteReviewers.split(",").map((s) => s.trim()).filter(Boolean);
    if (reviewers.length) {
      const select = actions.createEl("select", { cls: "linear-prs-reviewer-select", attr: { "aria-label": "Assign reviewer to group PRs" } });
      select.createEl("option", { text: "Reviewer", value: "" });
      for (const login of reviewers) select.createEl("option", { text: login, value: login });
      select.onclick = (e) => e.stopPropagation();
      select.onchange = () => {
        const login = select.value;
        if (!login) return;
        void this.act(async () => {
          for (const p of prs) await requestReviewer(this.plugin.credentials(), p, login);
        }, `Requested ${login} for ${prs.length} PRs`);
        select.value = "";
      };
    }
    details2.ontoggle = () => {
      m.collapsed = details2.open ? m.collapsed.filter((x) => x !== id) : [.../* @__PURE__ */ new Set([...m.collapsed, id])];
      void this.plugin.saveMetadata();
    };
    const list = details2.createDiv({ cls: "linear-prs-list" });
    prs.forEach((p) => this.row(p, list));
  }
  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("linear-prs");
    const m = this.plugin.metadata;
    const shell = root.createDiv({ cls: "linear-prs-shell" });
    const header = shell.createDiv({ cls: "linear-prs-header" });
    header.createSpan({ text: "/ code", cls: "linear-prs-crumb" });
    const right = header.createSpan({ cls: "linear-prs-toolbar" });
    const repos = [...new Set(m.pullRequests.map((p) => p.repo))].sort();
    if (repos.length) {
      const filter = right.createSpan({ cls: "linear-prs-repository-filter" });
      icon(filter, "folder-git-2");
      const sel = filter.createEl("select", { attr: { "aria-label": "Filter repository" } });
      sel.createEl("option", { text: "All repositories", value: "" });
      repos.forEach((r) => sel.createEl("option", { text: r, value: r }));
      sel.value = m.selectedRepo;
      sel.onchange = () => {
        m.selectedRepo = sel.value;
        void this.plugin.saveMetadata();
        this.render();
      };
    }
    button(right, "Archived pull requests", "archive", () => {
      this.archived = !this.archived;
      this.render();
    }, this.archived);
    button(right, "Refresh from Linear and GitHub", "refresh-cw", () => void this.refresh());
    if (!this.plugin.settings.linearKey || !this.plugin.settings.githubKey) shell.createDiv({ text: "Add a Linear API key and GitHub API key in Linear PRs settings, then refresh.", cls: "linear-prs-empty" });
    this.reviewBlock(shell);
    const all = this.visible();
    if (!this.archived) {
      this.queue(all.filter((p) => m.reviewTypes[p.id] === "review"), "PRs in Review", shell);
      this.queue(all.filter((p) => m.reviewTypes[p.id] === "stamp"), "PRs To Be Stamped", shell);
    }
    const h = shell.createEl("h2", { text: this.archived ? "Archived pull requests" : "Pull requests", cls: "linear-prs-section-title" });
    const normal = this.archived ? all : all.filter((p) => (m.reviewTypes[p.id] ?? "none") === "none");
    const groups = /* @__PURE__ */ new Map();
    for (const p of normal) {
      const arr = groups.get(p.groupId) ?? [];
      arr.push(p);
      groups.set(p.groupId, arr);
    }
    for (const prs of groups.values()) {
      const p = prs[0];
      this.group(prs, p.groupId, p.groupTitle.replace(/^[A-Z]+-\d+\s+/, ""), p.groupUrl, shell);
    }
    if (!normal.length) shell.createDiv({ text: "No pull requests", cls: "linear-prs-empty" });
  }
};
