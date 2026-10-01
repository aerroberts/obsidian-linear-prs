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

// src/api/transport.ts
var import_obsidian = require("obsidian");
async function requestJson(url, method, token, body) {
  const res = await (0, import_obsidian.requestUrl)({
    url,
    method,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body === void 0 ? void 0 : JSON.stringify(body),
    throw: false
  });
  if (res.status >= 400) {
    throw new Error(
      `${method} ${url}: ${res.status} ${JSON.stringify(res.json?.message ?? res.text).slice(0, 200)}`
    );
  }
  return res.json;
}
async function queryLinear(key, query, variables = {}) {
  const data = await requestJson(
    "https://api.linear.app/graphql",
    "POST",
    key,
    {
      query,
      variables
    }
  );
  if (data.errors?.length) {
    throw new Error(data.errors.map((e) => e.message).join("; "));
  }
  if (!data.data) {
    throw new Error("Linear returned no GraphQL data.");
  }
  return data.data;
}
async function requestGitHub(token, path, method = "GET", body) {
  return requestJson(`https://api.github.com${path}`, method, `Bearer ${token}`, body);
}

// src/pull-request-matching.ts
var prPattern = /https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;
function parsePullRequestUrl(url) {
  const m = url.match(prPattern);
  return m ? { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) } : null;
}
function referencedIdentifiers(pr) {
  return [
    ...new Set(
      ([pr.title ?? "", pr.body ?? "", pr.head?.ref ?? ""].join("\n").match(/\b[A-Z][A-Z0-9]{1,14}-\d+\b/gi) ?? []).map((id) => id.toUpperCase())
    )
  ];
}

// src/async.ts
async function forEachConcurrent(items, limit, fn) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const item = items[index++];
        await fn(item);
      }
    })
  );
}
async function withDeadline(task, milliseconds, label) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out. Try again.`)),
          milliseconds
        );
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

// src/api/snapshots.ts
var PAGE = "pageInfo { hasNextPage endCursor }";
var ACTOR = "author { login __typename }";
var CHECK_FIELDS = `__typename
  ... on CheckRun { id name status conclusion title summary }
  ... on StatusContext { context state description }`;
var FIELDS = `id number title body url state isDraft createdAt headRefOid headRefName
  baseRefName baseRef { target { oid } } mergeable autoMergeRequest { enabledAt }
  mergeQueueEntry { id }
  reviews(first:20) { nodes { ${ACTOR} state body } ${PAGE} }
  reviewRequests(first:20) { nodes { requestedReviewer { __typename ... on User { login } ... on Bot { login } } } ${PAGE} }
  comments(first:20) { nodes { ${ACTOR} } ${PAGE} }
  reviewThreads(first:10) { nodes { id comments(first:5) { nodes { ${ACTOR} } ${PAGE} } } ${PAGE} }
  statusCheckRollup { id contexts(first:50) { nodes { ${CHECK_FIELDS} } ${PAGE} } }`;
async function graphql(token, query, variables) {
  const result = await requestJson(
    "https://api.github.com/graphql",
    "POST",
    `Bearer ${token}`,
    { query, variables }
  );
  if (result.errors?.length) {
    throw new Error([...new Set(result.errors.map((error) => error.message))].join("; "));
  }
  if (!result.data) {
    throw new Error("GitHub returned no snapshot data.");
  }
  return result.data;
}
async function completeConnection(token, id, type, field, fields, connection) {
  const nodes = [...connection.nodes];
  let page = connection.pageInfo;
  while (page.hasNextPage) {
    if (!page.endCursor) {
      throw new Error(`Missing GitHub cursor for ${field}.`);
    }
    const result = await graphql(
      token,
      `query($id:ID!,$after:String!){node(id:$id){... on ${type}{${field}(first:100,after:$after){nodes{${fields}} ${PAGE}}}}}`,
      { id, after: page.endCursor }
    );
    const next = result.node[field];
    nodes.push(...next.nodes);
    page = next.pageInfo;
  }
  return nodes;
}
async function fetchSnapshots(token, previous) {
  const snapshots = [];
  for (let start = 0; start < previous.length; start += 100) {
    const batch = previous.slice(start, start + 100);
    const fields = batch.map((pr, index) => {
      const [owner, name] = pr.repo.split("/");
      return `p${index}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){pullRequest(number:${pr.number}){${FIELDS}}}`;
    }).join("\n");
    const result = await graphql(
      token,
      `query RefreshPullRequestSnapshots {${fields}}`
    );
    await forEachConcurrent(batch, 4, async (previousPr) => {
      const index = batch.indexOf(previousPr);
      const snapshot = result[`p${index}`]?.pullRequest;
      if (!snapshot) {
        throw new Error(`GitHub did not return ${previousPr.id}.`);
      }
      snapshots.push(await normalizeSnapshot(token, previousPr, snapshot));
    });
  }
  return snapshots;
}
async function fetchAuthoredSnapshots(token) {
  const snapshots = [];
  let after = null;
  do {
    const result = await graphql(
      token,
      `query AuthoredPullRequestSnapshots($after:String){search(query:"is:pr is:open author:@me",type:ISSUE,first:100,after:$after){issueCount nodes{... on PullRequest{${FIELDS}}} ${PAGE}}}`,
      { after }
    );
    if (result.search.issueCount > 1e3) {
      throw new Error(
        "GitHub search exceeds its 1,000-result limit; cached board was retained."
      );
    }
    const page = result.search;
    await forEachConcurrent(page.nodes, 4, async (snapshot) => {
      const reference = parsePullRequestUrl(snapshot.url);
      if (!reference) {
        throw new Error(`Invalid GitHub PR URL: ${snapshot.url}`);
      }
      snapshots.push(
        await normalizeSnapshot(token, createPullRequestReference(reference), snapshot)
      );
    });
    if (page.pageInfo.hasNextPage && !page.pageInfo.endCursor) {
      throw new Error("Missing GitHub search cursor.");
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return snapshots;
}
function createPullRequestReference(reference) {
  return {
    ...reference,
    id: `${reference.repo}#${reference.number}`,
    url: `https://github.com/${reference.repo}/pull/${reference.number}`,
    title: "",
    draft: false,
    state: "open",
    createdAt: "",
    issueId: "",
    groupId: "unlinked",
    groupTitle: "",
    groupUrl: "",
    checks: [],
    reviewers: [],
    automerge: false,
    conflicts: false,
    comments: false
  };
}
async function normalizeSnapshot(token, previous, snapshot) {
  const remote = {
    number: snapshot.number,
    node_id: snapshot.id,
    html_url: snapshot.url,
    title: snapshot.title,
    body: snapshot.body,
    state: snapshot.state.toLowerCase(),
    draft: snapshot.isDraft,
    created_at: snapshot.createdAt,
    head: { sha: snapshot.headRefOid, ref: snapshot.headRefName },
    base: { sha: snapshot.baseRef?.target.oid ?? "", ref: snapshot.baseRefName },
    auto_merge: snapshot.autoMergeRequest,
    mergeable: snapshot.mergeable === "UNKNOWN" ? null : snapshot.mergeable === "MERGEABLE"
  };
  if (snapshot.state !== "OPEN") {
    return { remote, pullRequest: null };
  }
  const [reviews, requests, comments, threads, contexts] = await Promise.all([
    completeConnection(
      token,
      snapshot.id,
      "PullRequest",
      "reviews",
      `${ACTOR} state body`,
      snapshot.reviews
    ),
    completeConnection(
      token,
      snapshot.id,
      "PullRequest",
      "reviewRequests",
      "requestedReviewer { __typename ... on User { login } ... on Bot { login } }",
      snapshot.reviewRequests
    ),
    completeConnection(
      token,
      snapshot.id,
      "PullRequest",
      "comments",
      ACTOR,
      snapshot.comments
    ),
    completeConnection(
      token,
      snapshot.id,
      "PullRequest",
      "reviewThreads",
      `id comments(first:5){nodes{${ACTOR}} ${PAGE}}`,
      snapshot.reviewThreads
    ),
    snapshot.statusCheckRollup ? completeConnection(
      token,
      snapshot.statusCheckRollup.id,
      "StatusCheckRollup",
      "contexts",
      CHECK_FIELDS,
      snapshot.statusCheckRollup.contexts
    ) : []
  ]);
  const reviewers = /* @__PURE__ */ new Map();
  for (const review of reviews) {
    if (!review.author || !["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"].includes(review.state)) {
      continue;
    }
    const previousState = reviewers.get(review.author.login);
    if (review.state === "COMMENTED" && previousState && previousState !== "commented") {
      continue;
    }
    reviewers.set(review.author.login, review.state.toLowerCase());
  }
  for (const request of requests) {
    if (request.requestedReviewer?.login && !reviewers.has(request.requestedReviewer.login)) {
      reviewers.set(request.requestedReviewer.login, "requested");
    }
  }
  let humanComments = comments.some((comment) => comment.author?.__typename === "User") || reviews.some(
    (review) => review.author?.__typename === "User" && Boolean(review.body.trim())
  );
  await forEachConcurrent(threads, 4, async (thread) => {
    if (humanComments) {
      return;
    }
    const comments2 = await completeConnection(
      token,
      thread.id,
      "PullRequestReviewThread",
      "comments",
      ACTOR,
      thread.comments
    );
    if (comments2.some((comment) => comment.author?.__typename === "User")) {
      humanComments = true;
    }
  });
  const checks = [];
  for (const context of contexts) {
    const pending = context.__typename === "CheckRun" ? context.status !== "COMPLETED" : ["PENDING", "EXPECTED"].includes(context.state ?? "");
    const success = context.__typename === "CheckRun" ? ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(context.conclusion ?? "") : context.state === "SUCCESS";
    const status = pending ? "pending" : success ? "success" : "failure";
    const detail = [
      context.title !== context.name ? context.title : "",
      context.summary,
      context.text,
      context.description
    ].filter(Boolean).join(" \u2014 ").replace(/\s+/g, " ").trim().slice(0, 240);
    checks.push({
      name: context.name ?? context.context ?? "Check",
      status,
      detail: status === "failure" ? detail || context.conclusion?.toLowerCase().replace(/_/g, " ") : void 0
    });
  }
  return {
    remote,
    pullRequest: {
      ...previous,
      title: snapshot.title,
      url: snapshot.url,
      draft: snapshot.isDraft,
      state: snapshot.isDraft ? "draft" : "open",
      createdAt: snapshot.createdAt,
      automerge: Boolean(snapshot.autoMergeRequest),
      mergeQueued: Boolean(snapshot.mergeQueueEntry),
      conflicts: snapshot.mergeable === "CONFLICTING",
      reviewers: [...reviewers].map(([login, status]) => ({ login, status })),
      checks,
      comments: humanComments
    }
  };
}

// src/api/rebase.ts
async function rebasePullRequest(token, repo, pullRequest, options = {}) {
  try {
    if (pullRequest.mergeable === false) {
      throw new Error("The branch has merge conflicts with its base.");
    }
    const comparison = await compareWithCurrentBase(token, repo, pullRequest);
    if (!Number.isInteger(comparison.behind_by) || comparison.behind_by < 0) {
      throw new Error("GitHub did not return the branch comparison.");
    }
    if (comparison.behind_by === 0) {
      return { status: "up-to-date" };
    }
    const result = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${token}`,
      {
        query: `mutation($input:UpdatePullRequestBranchInput!){updatePullRequestBranch(input:$input){clientMutationId}}`,
        variables: {
          input: {
            pullRequestId: pullRequest.node_id,
            expectedHeadOid: pullRequest.head.sha,
            updateMethod: "REBASE"
          }
        }
      }
    );
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join("; "));
    }
    if (!result.data?.updatePullRequestBranch) {
      throw new Error("GitHub did not accept the branch rebase.");
    }
    const { attempts = 20, intervalMs = 1e3 } = options;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const current = await requestGitHub(
        token,
        `/repos/${repo}/pulls/${pullRequest.number}`
      );
      if (current.state !== "open") {
        throw new Error(
          `PR became ${current.state} before the rebase could be verified.`
        );
      }
      if (current.head.sha !== pullRequest.head.sha) {
        const comparison2 = await compareWithCurrentBase(token, repo, current);
        if (comparison2.behind_by === 0) {
          return { status: "updated", remote: current };
        }
      }
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error(
      "GitHub accepted the rebase, but the branch update did not complete within the verification window. Retry Launch to check again."
    );
  } catch (error) {
    return {
      status: "failed",
      warning: `Could not rebase: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
async function compareWithCurrentBase(token, repo, pullRequest) {
  const base = await requestGitHub(
    token,
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(pullRequest.base.ref)}`
  );
  if (!base.object?.sha) {
    throw new Error("GitHub did not return the current base branch.");
  }
  return requestGitHub(
    token,
    `/repos/${repo}/compare/${base.object.sha}...${pullRequest.head.sha}`
  );
}

// src/main.ts
var import_obsidian6 = require("obsidian");

// src/api/linear.ts
var ISSUE_FIELDS = "id identifier title url state { type } project { id name url } parent { id title url }";
var PAGE2 = "pageInfo { hasNextPage endCursor }";

// src/api/context.ts
async function resolveLinearContexts(key, snapshots) {
  const open = snapshots.filter((snapshot) => snapshot.pullRequest !== null);
  const results = [];
  for (let start = 0; start < open.length; start += 100) {
    const batch = open.slice(start, start + 100);
    const identifiers = [
      ...new Set(batch.flatMap((snapshot) => referencedIdentifiers(snapshot.remote)))
    ];
    const validIdentifiers = identifiers.filter((identifier) => {
      const number = Number(identifier.slice(identifier.lastIndexOf("-") + 1));
      return Number.isSafeInteger(number) && number > 0 && number <= 2147483647;
    });
    const filters = validIdentifiers.map((identifier) => {
      const split = identifier.lastIndexOf("-");
      return {
        and: [
          { number: { eq: Number(identifier.slice(split + 1)) } },
          { team: { key: { eq: identifier.slice(0, split) } } }
        ]
      };
    });
    const fields = batch.map(
      (snapshot, index) => `p${index}:attachmentsForURL(url:${JSON.stringify(snapshot.remote.html_url)},first:5,includeArchived:true){nodes{issue{${ISSUE_FIELDS}}} ${PAGE2}}`
    ).join("\n");
    const response = await queryLinear(
      key,
      `query ResolvePullRequestContexts${filters.length ? "($filter:IssueFilter!)" : ""}{${fields} ${filters.length ? `references:issues(first:100,includeArchived:true,filter:$filter){nodes{${ISSUE_FIELDS}} ${PAGE2}}` : ""}}`,
      filters.length ? { filter: { or: filters } } : {}
    );
    const referenced = [...response.references?.nodes ?? []];
    let referencePage = response.references?.pageInfo;
    while (referencePage?.hasNextPage) {
      if (!referencePage.endCursor) {
        throw new Error("Missing Linear reference cursor.");
      }
      const next = await queryLinear(
        key,
        `query($filter:IssueFilter!,$after:String!){issues(first:100,includeArchived:true,after:$after,filter:$filter){nodes{${ISSUE_FIELDS}} ${PAGE2}}}`,
        { filter: { or: filters }, after: referencePage.endCursor }
      );
      referenced.push(...next.issues.nodes);
      referencePage = next.issues.pageInfo;
    }
    const issuesByIdentifier = new Map(
      referenced.map((issue) => [issue.identifier.toUpperCase(), issue])
    );
    for (const [index, snapshot] of batch.entries()) {
      const connection = response[`p${index}`];
      if (!connection) {
        throw new Error(`Missing Linear context for ${snapshot.remote.html_url}.`);
      }
      const attachments = [...connection.nodes];
      let page = connection.pageInfo;
      while (page.hasNextPage) {
        if (!page.endCursor) {
          throw new Error("Missing Linear attachment cursor.");
        }
        const next = await queryLinear(
          key,
          `query($url:String!,$after:String!){attachmentsForURL(url:$url,first:100,includeArchived:true,after:$after){nodes{issue{${ISSUE_FIELDS}}} ${PAGE2}}}`,
          { url: snapshot.remote.html_url, after: page.endCursor }
        );
        attachments.push(...next.attachmentsForURL.nodes);
        page = next.attachmentsForURL.pageInfo;
      }
      const linked = attachments.map((attachment) => attachment.issue).filter((issue2) => !!issue2);
      const fallback = referencedIdentifiers(snapshot.remote).map((id) => issuesByIdentifier.get(id)).filter((issue2) => !!issue2);
      const source = linked.length ? "attachment" : fallback.length ? "reference" : "none";
      const issues = [
        ...new Map(
          (linked.length ? linked : fallback).map((issue2) => [issue2.id, issue2])
        ).values()
      ].sort((left, right) => left.identifier.localeCompare(right.identifier));
      const issue = issues[0];
      results.push({
        ...snapshot.pullRequest,
        linearContext: { issues, source },
        issueId: issue?.id ?? "",
        issueTitle: issue?.title,
        issueUrl: issue?.url,
        groupId: issue ? issue.parent?.id ?? issue.project?.id ?? "unparented" : "unlinked",
        groupTitle: issue ? issue.parent?.title ?? issue.project?.name ?? "Unparented issues" : "",
        groupUrl: issue ? issue.parent?.url ?? issue.project?.url ?? "" : ""
      });
    }
  }
  return results;
}

// src/api/discovery.ts
async function discover(credentials) {
  const snapshots = await fetchAuthoredSnapshots(credentials.githubKey);
  const prs = await resolveLinearContexts(credentials.linearKey, snapshots);
  return { prs, errors: [] };
}
async function refreshPrs(credentials, previous) {
  const snapshots = await fetchSnapshots(credentials.githubKey, previous);
  return snapshots.map((snapshot) => snapshot.pullRequest).filter((pullRequest) => pullRequest !== null);
}

// src/metadata.ts
var BOARD_VIEW_TYPE = "linear-prs";
var METADATA_PATH = ".linear-prs/metadata.json";
var STAGES = ["A", "B", "C", "D"];
var DEFAULT_SETTINGS = {
  linearKey: "",
  githubKey: "",
  favoriteReviewers: ""
};
var createEmptyMetadata = () => ({
  version: 1,
  reviewTypes: {},
  reviewMessage: [],
  collapsed: [],
  selectedRepo: "",
  hidden: [],
  lastRefresh: "",
  pullRequests: []
});
function migrateMetadata(saved) {
  const { reviewTypes, ...fields } = saved;
  const metadata = { ...createEmptyMetadata(), ...fields };
  metadata.reviewTypes = Object.fromEntries(
    Object.entries(reviewTypes ?? {}).map(([id, stage]) => [
      id,
      stage === "review" ? "A" : stage === "stamp" ? "B" : stage
    ])
  );
  metadata.collapsed = metadata.collapsed.map((id) => {
    if (id === "queue:review") {
      return "queue:A";
    }
    if (id === "queue:stamp") {
      return "queue:B";
    }
    return id;
  });
  return metadata;
}

// src/ui/elements.ts
var import_obsidian2 = require("obsidian");
var MERGE_QUEUE_PATH = "M3.75 4.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM3 7.75a.75.75 0 0 1 1.5 0v2.878a2.251 2.251 0 1 1-1.5 0Zm.75 5.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5-7.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5.75 2.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-1.5 0a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z";
function formatReviewMessage(pullRequests) {
  return [
    "Some prs to review:",
    "",
    ...pullRequests.map(
      (pullRequest, index) => `${index + 1}. ${pullRequest.title} ${pullRequest.url}`
    )
  ].join("\n");
}
function createIcon(parent, name, title, cls = "") {
  const element = parent.createSpan({ cls: `linear-prs-icon ${cls}` });
  if (name === "linear-prs-merge-queue") {
    element.addClass("linear-prs-merge-queue");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", MERGE_QUEUE_PATH);
    path.style.fill = "currentColor";
    path.style.stroke = "none";
    svg.appendChild(path);
    element.appendChild(svg);
  } else {
    (0, import_obsidian2.setIcon)(element, name);
  }
  if (title) {
    element.setAttr("title", title);
    element.setAttr("aria-label", title);
    element.setAttr("role", "img");
  }
  return element;
}
function createIconButton(parent, label, name, click, options = {}) {
  const { active = false, loading } = options;
  const buttonElement = parent.createEl("button", {
    cls: `linear-prs-button${active ? " is-active" : ""}${loading ? ` is-loading is-${loading === "spin" ? "spinning" : "pulsing"}` : ""}`,
    attr: { "aria-label": label, title: label, type: "button" }
  });
  if (loading) {
    buttonElement.disabled = true;
    buttonElement.setAttr("aria-busy", "true");
  }
  if (STAGES.includes(name)) {
    buttonElement.setText(name);
    buttonElement.addClass("linear-prs-stage-button");
  } else {
    (0, import_obsidian2.setIcon)(buttonElement, name);
  }
  buttonElement.onclick = (e) => {
    e.stopPropagation();
    click();
  };
  return buttonElement;
}
function formatOpenedDate(iso) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 36e5));
  if (hours < 1) {
    return "opened just now";
  }
  if (hours < 24) {
    return `opened ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `opened ${days} ${days === 1 ? "day" : "days"} ago`;
}
function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}

// src/preferences.ts
var import_obsidian3 = require("obsidian");
var Preferences = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const container = this.containerEl;
    container.empty();
    container.createEl("h2", { text: "Linear PRs" });
    new import_obsidian3.Setting(container).setName("Linear API key").setDesc("Personal API key for your Linear account.").addText((input) => {
      input.setPlaceholder("lin_api_\u2026").setValue(this.plugin.settings.linearKey).onChange(async (value) => {
        this.plugin.settings.linearKey = value.trim();
        await this.plugin.saveSettings();
      });
      input.inputEl.type = "password";
    });
    new import_obsidian3.Setting(container).setName("GitHub API key").setDesc("Personal access token with access to the linked repositories.").addText((input) => {
      input.setPlaceholder("github_pat_\u2026").setValue(this.plugin.settings.githubKey).onChange(async (value) => {
        this.plugin.settings.githubKey = value.trim();
        await this.plugin.saveSettings();
      });
      input.inputEl.type = "password";
    });
    new import_obsidian3.Setting(container).setName("Favorite reviewers").setDesc("Comma separated GitHub usernames shown in group actions.").addText(
      (input) => input.setPlaceholder("alice,bob").setValue(this.plugin.settings.favoriteReviewers).onChange(async (value) => {
        this.plugin.settings.favoriteReviewers = value;
        await this.plugin.saveSettings();
      })
    );
    container.createEl("p", {
      text: "Keys are saved in Obsidian plugin settings; board tracking is saved to .linear-prs/metadata.json in this vault.",
      cls: "setting-item-description"
    });
  }
};

// src/ui/pull-request-badges.ts
var import_obsidian4 = require("obsidian");
function renderPullRequestBadges(pullRequest, controls) {
  const badges = controls.createSpan({
    cls: "linear-prs-control-set linear-prs-badges"
  });
  createIcon(
    badges,
    "message-square",
    pullRequest.comments ? "Pull request has comments" : "Pull request has no comments",
    pullRequest.comments ? "orange" : "dim"
  );
  const reviewerTone = pullRequest.reviewers.some((r) => r.status === "approved") ? "good" : pullRequest.reviewers.some((r) => r.status === "dismissed") ? "orange" : "dim";
  createIcon(
    badges,
    "user",
    pullRequest.reviewers.length ? pullRequest.reviewers.map((r) => `${r.login}: ${r.status}`).join(", ") : "No reviewers assigned",
    reviewerTone
  );
  createIcon(
    badges,
    "git-merge",
    pullRequest.automerge ? "Automerge enabled" : "Automerge disabled",
    pullRequest.automerge ? "good" : "dim"
  );
  const failed = pullRequest.checks.filter((c) => c.status === "failure");
  const pending = pullRequest.checks.filter((c) => c.status === "pending");
  const checkStatus = pullRequest.conflicts || failed.length ? "bad" : pending.length ? "dim" : "good";
  const reasons = [
    ...pullRequest.conflicts ? ["Merge conflicts with the base branch"] : [],
    ...failed.slice(0, 8).map((c) => `${c.name}${c.detail ? `: ${c.detail}` : ""}`)
  ];
  if (failed.length > 8) {
    reasons.push(`And ${failed.length - 8} more failing checks`);
  }
  const checkTitle = checkStatus === "bad" ? `Why this PR is failing:
${reasons.join("\n")}` : checkStatus === "dim" ? `Checks pending:
${pending.map((c) => c.name).join("\n")}` : pullRequest.checks.length ? "All checks passing" : "No checks reported";
  const checkBadge = createIcon(
    badges,
    checkStatus === "bad" ? "circle-x" : checkStatus === "dim" ? "loader-circle" : "circle-check",
    void 0,
    checkStatus
  );
  checkBadge.setAttr("role", "img");
  checkBadge.setAttr("aria-label", checkTitle);
  (0, import_obsidian4.setTooltip)(checkBadge, checkTitle, {
    placement: "top",
    classes: ["linear-prs-check-tooltip"]
  });
}

// src/ui/board-view.ts
var import_obsidian5 = require("obsidian");

// src/api/github.ts
async function launchPr(credentials, pr, prefetched) {
  let data = prefetched ?? await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}`
  );
  if (data.state !== "open") {
    throw new Error(`Pull request is ${data.state}, not open.`);
  }
  const rebase = await rebasePullRequest(credentials.githubKey, pr.repo, data);
  const branchUpdate = {
    rebaseStatus: rebase.status,
    warnings: rebase.warning ? [rebase.warning] : []
  };
  if (rebase.status === "updated") {
    data = rebase.remote ?? data;
    if (data.state !== "open") {
      throw new Error(`Pull request became ${data.state} after rebasing.`);
    }
  }
  if (data.draft) {
    const readyQuery = `mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft}}}`;
    const ready = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${credentials.githubKey}`,
      { query: readyQuery, variables: { id: data.node_id } }
    );
    if (ready.errors?.length) {
      throw new Error(ready.errors.map((e) => e.message).join("; "));
    }
    if (ready.data?.markPullRequestReadyForReview?.pullRequest?.isDraft !== false) {
      throw new Error("GitHub did not mark the pull request ready for review.");
    }
  }
  if (data.auto_merge) {
    return { readyForReview: true, automergeEnabled: true, ...branchUpdate };
  }
  const autoMergeQuery = `mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}`;
  try {
    const result = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${credentials.githubKey}`,
      { query: autoMergeQuery, variables: { id: data.node_id } }
    );
    if (result.errors?.length) {
      throw new Error(
        result.errors.map((e) => e.message).join("; ")
      );
    }
    return { readyForReview: true, automergeEnabled: true, ...branchUpdate };
  } catch (e) {
    return {
      readyForReview: true,
      automergeEnabled: false,
      ...branchUpdate,
      error: `Ready for review, but auto-merge could not be enabled: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}
async function requestReviewer(credentials, pr, login) {
  await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}/requested_reviewers`,
    "POST",
    { reviewers: [login] }
  );
}
async function closePr(credentials, pr) {
  await requestGitHub(
    credentials.githubKey,
    `/repos/${pr.repo}/pulls/${pr.number}`,
    "PATCH",
    {
      state: "closed"
    }
  );
}

// src/ui/board-view.ts
var BoardView = class _BoardView extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  busy = false;
  archived = false;
  search = "";
  searchInput = null;
  launching = /* @__PURE__ */ new Set();
  refreshingGroups = /* @__PURE__ */ new Set();
  getViewType() {
    return BOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "Linear PRs";
  }
  getIcon() {
    return "git-pull-request";
  }
  async onOpen() {
    this.scope = new import_obsidian5.Scope(this.app.scope);
    this.scope.register([import_obsidian5.Platform.isMacOS ? "Meta" : "Ctrl"], "f", (event) => {
      event.preventDefault();
      this.focusSearch();
    });
    this.render();
    this.registerInterval(
      window.setInterval(() => {
        if (this.app.workspace.getActiveViewOfType(_BoardView) === this) {
          void this.refresh({ quiet: true });
        }
      }, 6e4)
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        if (this.app.workspace.getActiveViewOfType(_BoardView) === this && Date.now() - Date.parse(this.plugin.metadata.lastRefresh || "1970-01-01") >= 6e4) {
          void this.refresh({ quiet: true });
        }
      })
    );
    if (this.plugin.settings.linearKey && this.plugin.settings.githubKey) {
      void this.refresh({ quiet: true });
    }
  }
  focusSearch() {
    this.searchInput?.focus();
    this.searchInput?.select();
  }
  async runAction(fn, success) {
    try {
      await fn();
      new import_obsidian5.Notice(success);
      this.render();
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    }
  }
  async refresh(options = {}) {
    if (this.busy || this.refreshingGroups.size || this.launching.size || !this.plugin.settings.linearKey || !this.plugin.settings.githubKey) {
      return;
    }
    this.busy = true;
    this.render();
    try {
      const r = await this.plugin.refresh();
      if (!options.quiet) {
        new import_obsidian5.Notice(
          `Linear PRs: ${r.prs.length} open PRs${r.errors.length ? `, ${r.errors.length} lookup errors` : ""}`
        );
      }
      if (r.errors.length) {
        console.warn("Linear PR lookup errors", r.errors);
      }
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.busy = false;
      this.render();
    }
  }
  async refreshGroup(id, title) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    this.refreshingGroups.add(id);
    this.render();
    try {
      const r = await this.plugin.refreshGroup(id);
      new import_obsidian5.Notice(`${title}: refreshed ${r.prs.length} PRs`);
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.refreshingGroups.delete(id);
      this.render();
    }
  }
  async refreshQueue(type, title) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    const key = `queue:${type}`;
    const metadata = this.plugin.metadata;
    const pullRequests = metadata.pullRequests.filter(
      (pullRequest) => !metadata.hidden.includes(pullRequest.id) && metadata.reviewTypes[pullRequest.id] === type
    );
    this.refreshingGroups.add(key);
    this.render();
    try {
      const result = await this.plugin.refreshSelectedPrs(pullRequests);
      new import_obsidian5.Notice(`${title}: refreshed ${result.length} PRs`);
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.refreshingGroups.delete(key);
      this.render();
    }
  }
  rememberCollapse(fetchPullRequest, id) {
    const metadata = this.plugin.metadata;
    fetchPullRequest.open = !metadata.collapsed.includes(id);
    let lastOpen = fetchPullRequest.open;
    fetchPullRequest.ontoggle = () => {
      if (!fetchPullRequest.isConnected || fetchPullRequest.open === lastOpen) {
        return;
      }
      lastOpen = fetchPullRequest.open;
      metadata.collapsed = fetchPullRequest.open ? metadata.collapsed.filter((x) => x !== id) : [.../* @__PURE__ */ new Set([...metadata.collapsed, id])];
      void this.plugin.saveMetadata();
    };
  }
  getVisiblePullRequests() {
    const metadata = this.plugin.metadata;
    const query = this.search.trim().toLocaleLowerCase();
    return metadata.pullRequests.filter(
      (pullRequest) => this.archived ? metadata.hidden.includes(pullRequest.id) : !metadata.hidden.includes(pullRequest.id)
    ).filter(
      (pullRequest) => !metadata.selectedRepo || pullRequest.repo === metadata.selectedRepo
    ).filter(
      (pullRequest) => !query || [
        pullRequest.title,
        pullRequest.repo,
        String(pullRequest.number),
        pullRequest.id,
        pullRequest.issueTitle,
        pullRequest.issueUrl,
        pullRequest.groupTitle
      ].some((value) => value?.toLocaleLowerCase().includes(query))
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  renderStagingSection(pullRequests, title, type, parent) {
    const fetchPullRequest = parent.createEl("details", { cls: "linear-prs-group" });
    this.rememberCollapse(fetchPullRequest, `queue:${type}`);
    const summary = fetchPullRequest.createEl("summary", {
      cls: "linear-prs-group-header"
    });
    createIcon(summary, "chevron-down", void 0, "linear-prs-chevron");
    summary.createSpan({ text: title, cls: "linear-prs-group-title" });
    const tools = summary.createSpan({ cls: "linear-prs-actions" });
    tools.createSpan({ text: String(pullRequests.length), cls: "linear-prs-count" });
    const key = `queue:${type}`;
    const refresh = createIconButton(
      tools,
      `Refresh ${title}`,
      "refresh-cw",
      () => void this.refreshQueue(type, title),
      { loading: this.refreshingGroups.has(key) ? "spin" : void 0 }
    );
    if (this.busy || this.refreshingGroups.size && !this.refreshingGroups.has(key)) {
      refresh.disabled = true;
    }
    createIconButton(
      tools,
      `Copy ${title}`,
      "copy",
      () => void this.copyToClipboard(formatReviewMessage(pullRequests))
    );
    createIconButton(
      tools,
      `Launch ${title}`,
      "rocket",
      () => void this.launchMany(pullRequests),
      {
        loading: this.isLaunching(pullRequests) ? "pulse" : void 0
      }
    );
    const list = fetchPullRequest.createDiv({ cls: "linear-prs-list" });
    if (!pullRequests.length) {
      list.createDiv({ text: `No pull requests in ${title}`, cls: "linear-prs-empty" });
    } else {
      pullRequests.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
    }
  }
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      new import_obsidian5.Notice("Copied pull requests");
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e));
    }
  }
  async setStage(type, pullRequests) {
    pullRequests.forEach(
      (pullRequest) => this.plugin.metadata.reviewTypes[pullRequest.id] = type
    );
    await this.plugin.saveMetadata();
    this.render();
  }
  launchKey(pullRequests) {
    return pullRequests.map((pullRequest) => pullRequest.id).sort().join("");
  }
  isLaunching(pullRequests) {
    return this.launching.has(this.launchKey(pullRequests));
  }
  async launchMany(pullRequests) {
    if (!pullRequests.length) {
      return;
    }
    const key = this.launchKey(pullRequests);
    if (this.launching.has(key)) {
      return;
    }
    this.launching.add(key);
    this.render();
    let launched = 0;
    let readyOnly = 0;
    let rebasesCompleted = 0;
    const errors = [];
    try {
      const snapshots = await fetchSnapshots(
        this.plugin.credentials().githubKey,
        pullRequests
      );
      const current = new Map(
        snapshots.filter((snapshot) => snapshot.pullRequest).map((snapshot) => [snapshot.pullRequest.id, snapshot])
      );
      await forEachConcurrent(pullRequests, 3, async (pullRequest) => {
        try {
          const snapshot = current.get(pullRequest.id);
          if (!snapshot?.pullRequest) {
            throw new Error("Pull request is no longer open.");
          }
          const result = await launchPr(
            this.plugin.credentials(),
            pullRequest,
            snapshot.remote
          );
          if (result.rebaseStatus === "updated") {
            rebasesCompleted++;
          }
          errors.push(
            ...result.warnings.map((warning) => `${pullRequest.id}: ${warning}`)
          );
          pullRequest.draft = !result.readyForReview;
          pullRequest.automerge = result.automergeEnabled;
          if (result.automergeEnabled && result.rebaseStatus !== "failed") {
            launched++;
          } else if (!result.automergeEnabled) {
            readyOnly++;
            errors.push(
              `${pullRequest.repo}#${pullRequest.number}: ${result.error ?? "Ready for review, but auto-merge is disabled."}`
            );
          }
        } catch (e) {
          errors.push(`${pullRequest.repo}#${pullRequest.number}: ${errorMessage(e)}`);
        }
      });
      try {
        await this.plugin.refreshSelectedPrs(pullRequests);
      } catch (error) {
        errors.push(`Could not refresh launched PRs: ${errorMessage(error)}`);
      }
      await this.plugin.saveMetadata();
      const summary = `Launched ${launched}/${pullRequests.length} PRs${rebasesCompleted ? `; ${rebasesCompleted} branches rebased` : ""}${readyOnly ? `; ${readyOnly} ready without auto-merge` : ""}${errors.length ? `. ${errors.join("; ")}` : ""}`;
      new import_obsidian5.Notice(summary, errors.length ? 0 : 8e3);
    } catch (e) {
      new import_obsidian5.Notice(errorMessage(e), 8e3);
    } finally {
      this.launching.delete(key);
      this.render();
    }
  }
  renderReviewMessage(parent) {
    const metadata = this.plugin.metadata;
    const items = metadata.reviewMessage.map((id) => metadata.pullRequests.find((pullRequest) => pullRequest.id === id)).filter((pullRequest) => !!pullRequest);
    if (!items.length) {
      return;
    }
    const block = parent.createDiv({ cls: "linear-prs-review-block" });
    block.createEl("pre", { text: formatReviewMessage(items) });
    const actions = block.createDiv({ cls: "linear-prs-actions" });
    for (const stage of STAGES) {
      createIconButton(
        actions,
        `Move all to Staging ${stage}`,
        stage,
        () => void this.runAction(async () => {
          await this.setStage(stage, items);
          metadata.reviewMessage = [];
          await this.plugin.saveMetadata();
        }, `Moved to Staging ${stage}`)
      );
    }
    createIconButton(
      actions,
      "Launch review PRs",
      "rocket",
      () => void this.launchMany(items),
      {
        loading: this.isLaunching(items) ? "pulse" : void 0
      }
    );
    createIconButton(
      actions,
      "Copy review message",
      "copy",
      () => void this.copyToClipboard(formatReviewMessage(items))
    );
    createIconButton(
      actions,
      "Clear review message",
      "trash-2",
      () => void this.runAction(async () => {
        metadata.reviewMessage = [];
        await this.plugin.saveMetadata();
      }, "Cleared review message")
    );
  }
  renderPullRequest(pullRequest, parent) {
    const row = parent.createDiv({ cls: "linear-prs-row" });
    const top = row.createDiv({ cls: "linear-prs-row-top" });
    const link = top.createEl("a", { href: pullRequest.url, cls: "linear-prs-title" });
    link.setAttr("target", "_blank");
    createIcon(
      link,
      pullRequest.mergeQueued ? "linear-prs-merge-queue" : pullRequest.draft ? "git-pull-request-draft" : "git-pull-request",
      pullRequest.mergeQueued ? "In merge queue" : pullRequest.draft ? "draft" : "open",
      pullRequest.mergeQueued ? "orange" : pullRequest.draft ? "dim" : "good"
    );
    link.createSpan({ text: pullRequest.title, cls: "linear-prs-title-text" });
    const controls = top.createSpan({ cls: "linear-prs-actions linear-prs-controls" });
    this.renderPullRequestActions(pullRequest, controls);
    renderPullRequestBadges(pullRequest, controls);
    this.renderPullRequestMetadata(pullRequest, row);
  }
  async refreshPullRequest(pullRequest) {
    if (this.busy || this.refreshingGroups.size || this.launching.size) {
      return;
    }
    const key = `pr:${pullRequest.id}`;
    this.refreshingGroups.add(key);
    this.render();
    try {
      const result = await this.plugin.refreshPullRequest(pullRequest);
      const status = !result ? "PR is no longer open" : result.status === "updated" ? "refreshed and rebased" : result.status === "up-to-date" ? "refreshed; branch is up to date" : `refreshed; ${result.warning}`;
      new import_obsidian5.Notice(`${pullRequest.id}: ${status}`, result?.status === "failed" ? 0 : 8e3);
    } catch (error) {
      new import_obsidian5.Notice(`${pullRequest.id}: ${errorMessage(error)}`, 0);
    } finally {
      this.refreshingGroups.delete(key);
      this.render();
    }
  }
  renderPullRequestActions(pullRequest, controls) {
    const metadata = this.plugin.metadata;
    const actions = controls.createSpan({ cls: "linear-prs-control-set" });
    createIconButton(
      actions,
      "Close and remove pull request",
      "trash-2",
      () => void this.runAction(async () => {
        await closePr(this.plugin.credentials(), pullRequest);
        metadata.hidden.push(pullRequest.id);
        await this.plugin.saveMetadata();
      }, "Closed and removed PR")
    );
    const key = `pr:${pullRequest.id}`;
    const refresh = createIconButton(
      actions,
      "Refresh and update pull request branch",
      "refresh-cw",
      () => void this.refreshPullRequest(pullRequest),
      { loading: this.refreshingGroups.has(key) ? "spin" : void 0 }
    );
    if (this.busy || this.refreshingGroups.size || this.launching.size) {
      refresh.disabled = true;
    }
    createIconButton(
      actions,
      "Add to review message",
      "copy",
      () => void this.runAction(async () => {
        if (!metadata.reviewMessage.includes(pullRequest.id)) {
          metadata.reviewMessage.push(pullRequest.id);
        }
        await this.plugin.saveMetadata();
        await navigator.clipboard.writeText(
          formatReviewMessage(
            metadata.reviewMessage.map((id) => metadata.pullRequests.find((x) => x.id === id)).filter((x) => !!x)
          )
        );
      }, "Added to review message")
    );
    const staging = controls.createSpan({ cls: "linear-prs-control-set" });
    for (const stage of STAGES) {
      createIconButton(
        staging,
        `Staging ${stage}`,
        stage,
        () => void this.runAction(
          () => this.setStage(
            metadata.reviewTypes[pullRequest.id] === stage ? "none" : stage,
            [pullRequest]
          ),
          "Updated staging"
        ),
        { active: metadata.reviewTypes[pullRequest.id] === stage }
      );
    }
  }
  renderPullRequestMetadata(pullRequest, row) {
    const meta = row.createDiv({ cls: "linear-prs-meta" });
    const refs = meta.createSpan({ cls: "linear-prs-meta-link" });
    if (pullRequest.issueTitle && pullRequest.issueUrl) {
      const issue = refs.createEl("a", {
        text: pullRequest.issueTitle,
        href: pullRequest.issueUrl,
        cls: "linear-prs-issue-title"
      });
      issue.setAttr("target", "_blank");
      issue.setAttr("title", pullRequest.issueTitle);
    }
    const a = refs.createEl("a", { href: pullRequest.url, cls: "linear-prs-meta-link" });
    a.setAttr("target", "_blank");
    a.createSpan({ text: pullRequest.repo, cls: "linear-prs-pill" });
    a.createSpan({ text: `#${pullRequest.number}`, cls: "linear-prs-pill" });
    meta.createSpan({
      text: formatOpenedDate(pullRequest.createdAt),
      cls: "linear-prs-date"
    });
  }
  renderGroup(pullRequests, id, title, url, parent) {
    const fetchPullRequest = parent.createEl("details", { cls: "linear-prs-group" });
    this.rememberCollapse(fetchPullRequest, id);
    const summary = fetchPullRequest.createEl("summary", {
      cls: "linear-prs-group-header"
    });
    createIcon(summary, "chevron-down", void 0, "linear-prs-chevron");
    if (url) {
      const titleLink = summary.createEl("a", {
        text: title,
        href: url,
        cls: "linear-prs-group-title"
      });
      titleLink.setAttr("target", "_blank");
      titleLink.onclick = (e) => e.stopPropagation();
    } else {
      summary.createSpan({ text: title, cls: "linear-prs-group-title" });
    }
    const actions = summary.createSpan({ cls: "linear-prs-actions" });
    actions.createSpan({ text: String(pullRequests.length), cls: "linear-prs-count" });
    const refresh = createIconButton(
      actions,
      `Refresh ${title}`,
      "refresh-cw",
      () => void this.refreshGroup(id, title),
      { loading: this.refreshingGroups.has(id) ? "spin" : void 0 }
    );
    if (this.busy || this.refreshingGroups.size && !this.refreshingGroups.has(id)) {
      refresh.disabled = true;
    }
    createIconButton(
      actions,
      "Copy group PRs",
      "copy",
      () => void this.copyToClipboard(formatReviewMessage(pullRequests))
    );
    createIconButton(
      actions,
      "Launch group PRs",
      "rocket",
      () => void this.launchMany(pullRequests),
      { loading: this.isLaunching(pullRequests) ? "pulse" : void 0 }
    );
    const reviewers = this.plugin.settings.favoriteReviewers.split(",").map((s) => s.trim()).filter(Boolean);
    if (reviewers.length) {
      const select = actions.createEl("select", {
        cls: "linear-prs-reviewer-select",
        attr: { "aria-label": "Assign reviewer to group PRs" }
      });
      select.createEl("option", { text: "Reviewer", value: "" });
      for (const login of reviewers) {
        select.createEl("option", { text: login, value: login });
      }
      select.onclick = (e) => e.stopPropagation();
      select.onchange = () => {
        const login = select.value;
        if (!login) {
          return;
        }
        void this.runAction(async () => {
          for (const pullRequest of pullRequests) {
            await requestReviewer(this.plugin.credentials(), pullRequest, login);
          }
        }, `Requested ${login} for ${pullRequests.length} PRs`);
        select.value = "";
      };
    }
    const list = fetchPullRequest.createDiv({ cls: "linear-prs-list" });
    pullRequests.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
  }
  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("linear-prs");
    const metadata = this.plugin.metadata;
    const shell = root.createDiv({ cls: "linear-prs-shell" });
    this.renderToolbar(shell);
    if (!this.plugin.settings.linearKey || !this.plugin.settings.githubKey) {
      shell.createDiv({
        text: "Add a Linear API key and GitHub API key in Linear PRs settings, then refresh.",
        cls: "linear-prs-empty"
      });
    }
    this.renderReviewMessage(shell);
    const all = this.getVisiblePullRequests();
    if (!this.archived) {
      for (const stage of STAGES) {
        this.renderStagingSection(
          all.filter((pullRequest) => metadata.reviewTypes[pullRequest.id] === stage),
          `Staging ${stage}`,
          stage,
          shell
        );
      }
    }
    shell.createEl("h2", {
      text: this.archived ? "Archived pull requests" : "Pull requests",
      cls: "linear-prs-section-title"
    });
    const unstagedPullRequests = this.archived ? all : all.filter(
      (pullRequest) => (metadata.reviewTypes[pullRequest.id] ?? "none") === "none"
    );
    this.renderIssueGroups(unstagedPullRequests, shell);
    this.renderUnlinkedPullRequests(unstagedPullRequests, shell);
  }
  renderToolbar(shell) {
    const metadata = this.plugin.metadata;
    const header = shell.createDiv({ cls: "linear-prs-header" });
    const right = header.createSpan({ cls: "linear-prs-toolbar" });
    const repos = [
      ...new Set(metadata.pullRequests.map((pullRequest) => pullRequest.repo))
    ].sort();
    if (repos.length) {
      const filter = right.createSpan({ cls: "linear-prs-repository-filter" });
      createIcon(filter, "folder-git-2");
      const sel = filter.createEl("select", {
        attr: { "aria-label": "Filter repository" }
      });
      sel.createEl("option", { text: "All repositories", value: "" });
      repos.forEach((r) => sel.createEl("option", { text: r, value: r }));
      sel.value = metadata.selectedRepo;
      sel.onchange = () => {
        metadata.selectedRepo = sel.value;
        void this.plugin.saveMetadata();
        this.render();
      };
    }
    const shortcutLabel = import_obsidian5.Platform.isMacOS ? "\u2318F" : "Ctrl+F";
    const search = right.createEl("input", {
      cls: "linear-prs-search",
      attr: {
        type: "search",
        placeholder: "Search pull requests\u2026",
        "aria-label": "Search pull requests",
        title: `Search pull requests (${shortcutLabel})`
      }
    });
    search.value = this.search;
    this.searchInput = search;
    search.oninput = () => {
      this.search = search.value;
      const start = search.selectionStart;
      this.render();
      this.searchInput?.focus();
      this.searchInput?.setSelectionRange(start, start);
    };
    search.onkeydown = (event) => {
      if (event.key === "Escape" && search.value) {
        event.stopPropagation();
        this.search = "";
        this.render();
        this.searchInput?.focus();
      }
    };
    createIconButton(
      right,
      "Archived pull requests",
      "archive",
      () => {
        this.archived = !this.archived;
        this.render();
      },
      { active: this.archived }
    );
    const refresh = createIconButton(
      right,
      "Refresh from Linear and GitHub",
      "refresh-cw",
      () => void this.refresh(),
      { loading: this.busy ? "spin" : void 0 }
    );
    if (this.refreshingGroups.size) {
      refresh.disabled = true;
    }
  }
  renderIssueGroups(unstagedPullRequests, shell) {
    const groups = /* @__PURE__ */ new Map();
    for (const pullRequest of unstagedPullRequests.filter(
      (pullRequest2) => pullRequest2.groupId !== "unlinked"
    )) {
      const groupPullRequests = groups.get(pullRequest.groupId) ?? [];
      groupPullRequests.push(pullRequest);
      groups.set(pullRequest.groupId, groupPullRequests);
    }
    for (const pullRequests of groups.values()) {
      const pullRequest = pullRequests[0];
      this.renderGroup(
        pullRequests,
        pullRequest.groupId,
        pullRequest.groupTitle.replace(/^[A-Z]+-\d+\s+/, ""),
        pullRequest.groupUrl,
        shell
      );
    }
    if (!groups.size) {
      shell.createDiv({
        text: "No pull requests associated with Linear tasks",
        cls: "linear-prs-empty"
      });
    }
  }
  renderUnlinkedPullRequests(unstagedPullRequests, shell) {
    const unlinked = unstagedPullRequests.filter(
      (pullRequest) => pullRequest.groupId === "unlinked"
    );
    const unlinkedDetails = shell.createEl("details", {
      cls: "linear-prs-group linear-prs-unlinked-group"
    });
    this.rememberCollapse(unlinkedDetails, "section:unlinked");
    const unlinkedSummary = unlinkedDetails.createEl("summary", {
      cls: "linear-prs-group-header"
    });
    createIcon(unlinkedSummary, "chevron-down", void 0, "linear-prs-chevron");
    unlinkedSummary.createSpan({
      text: "Pull requests without Linear tasks",
      cls: "linear-prs-group-title"
    });
    unlinkedSummary.createSpan({
      text: String(unlinked.length),
      cls: "linear-prs-count"
    });
    const list = unlinkedDetails.createDiv({ cls: "linear-prs-unlinked-list" });
    if (unlinked.length) {
      unlinked.forEach((pullRequest) => this.renderPullRequest(pullRequest, list));
    } else {
      list.createDiv({
        text: "No pull requests without Linear tasks",
        cls: "linear-prs-empty"
      });
    }
  }
};

// src/main.ts
var LinearPrsPlugin = class extends import_obsidian6.Plugin {
  settings = DEFAULT_SETTINGS;
  metadata = createEmptyMetadata();
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    await this.loadMetadata();
    this.registerView(BOARD_VIEW_TYPE, (leaf) => new BoardView(leaf, this));
    this.addRibbonIcon("git-pull-request", "Linear PRs", () => void this.openBoard());
    this.addCommand({
      id: "open-linear-prs",
      name: "Open Linear PRs",
      callback: () => void this.openBoard()
    });
    this.addCommand({
      id: "search-pull-requests",
      name: "Search pull requests",
      callback: () => this.app.workspace.getActiveViewOfType(BoardView)?.focusSearch()
    });
    this.addSettingTab(new Preferences(this.app, this));
  }
  async openBoard() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: BOARD_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async loadMetadata() {
    const adapter = this.app.vault.adapter;
    if (await adapter.exists(METADATA_PATH)) {
      try {
        this.metadata = migrateMetadata(JSON.parse(await adapter.read(METADATA_PATH)));
        await this.saveMetadata();
      } catch (e) {
        new import_obsidian6.Notice(`Linear PRs metadata: ${errorMessage(e)}`);
      }
    }
  }
  async saveMetadata() {
    const adapter = this.app.vault.adapter;
    if (!await adapter.exists(".linear-prs")) {
      await adapter.mkdir(".linear-prs");
    }
    await adapter.write(METADATA_PATH, JSON.stringify(this.metadata, null, 2) + "\n");
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async refresh() {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error("Enter both API keys in Linear PRs settings.");
    }
    const result = await withDeadline(discover(this.settings), 9e4, "Board refresh");
    this.metadata.pullRequests = [
      ...result.prs,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => this.metadata.hidden.includes(pullRequest.id) && !result.prs.some(
          (updatedPullRequest) => updatedPullRequest.id === pullRequest.id
        )
      )
    ];
    this.metadata.lastRefresh = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveMetadata();
    return result;
  }
  async refreshGroup(groupId) {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error("Enter both API keys in Linear PRs settings.");
    }
    const previous = this.metadata.pullRequests.filter(
      (pullRequest) => pullRequest.groupId === groupId
    );
    const prs = await withDeadline(
      refreshPrs(this.credentials(), previous),
      3e4,
      "Group refresh"
    );
    const result = { prs, errors: [] };
    const updated = new Set(result.prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result.prs,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => !updated.has(pullRequest.id) && (pullRequest.groupId !== groupId || this.metadata.hidden.includes(pullRequest.id))
      )
    ];
    await this.saveMetadata();
    return result;
  }
  async refreshSelectedPrs(prs) {
    if (!this.settings.githubKey) {
      throw new Error("Enter a GitHub API key in Linear PRs settings.");
    }
    const result = await withDeadline(
      refreshPrs(this.credentials(), prs),
      3e4,
      "Pull request refresh"
    );
    const selected = new Set(prs.map((pullRequest) => pullRequest.id));
    this.metadata.pullRequests = [
      ...result,
      ...this.metadata.pullRequests.filter(
        (pullRequest) => !selected.has(pullRequest.id)
      )
    ];
    await this.saveMetadata();
    return result;
  }
  async refreshPullRequest(pullRequest) {
    if (!this.settings.githubKey) {
      throw new Error("Enter a GitHub API key in Linear PRs settings.");
    }
    const [snapshot] = await fetchSnapshots(this.settings.githubKey, [pullRequest]);
    const branchUpdate = snapshot.pullRequest ? await rebasePullRequest(
      this.settings.githubKey,
      pullRequest.repo,
      snapshot.remote
    ) : void 0;
    const latest = branchUpdate && branchUpdate.status !== "up-to-date" ? (await fetchSnapshots(this.settings.githubKey, [pullRequest]))[0] : snapshot;
    this.metadata.pullRequests = this.metadata.pullRequests.filter(
      (pr) => pr.id !== pullRequest.id
    );
    if (latest.pullRequest) {
      this.metadata.pullRequests.push(latest.pullRequest);
    }
    await this.saveMetadata();
    return branchUpdate;
  }
  credentials() {
    return { linearKey: this.settings.linearKey, githubKey: this.settings.githubKey };
  }
};
