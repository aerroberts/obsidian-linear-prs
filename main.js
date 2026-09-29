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
var import_obsidian6 = require("obsidian");

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

// src/api/linear.ts
var ISSUE_FIELDS = "id identifier title url state { type } project { id name url } parent { id title url }";
var PAGE = "pageInfo { hasNextPage endCursor }";
async function assignedRoots(key) {
  const roots = [];
  let after = null;
  do {
    const data = await queryLinear(
      key,
      `query($after:String){viewer{assignedIssues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,
      { after }
    );
    const page = data.viewer.assignedIssues;
    roots.push(
      ...page.nodes.filter(
        (i) => !["completed", "canceled"].includes(i.state?.type ?? "")
      )
    );
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return roots;
}
async function issueChildren(key, id) {
  const children = [];
  let after = null;
  do {
    const data = await queryLinear(
      key,
      `query($id:String!,$after:String){issue(id:$id){children(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,
      { id, after }
    );
    const page = data.issue.children;
    children.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return children;
}
async function projectIssues(key, id) {
  const issues = [];
  let after = null;
  do {
    const data = await queryLinear(
      key,
      `query($id:String!,$after:String){project(id:$id){issues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,
      { id, after }
    );
    const page = data.project.issues;
    issues.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return issues;
}
async function issueById(key, id) {
  const data = await queryLinear(
    key,
    `query($id:String!){issue(id:$id){${ISSUE_FIELDS}}}`,
    { id }
  );
  return data.issue;
}
async function attachmentUrls(key, id) {
  const urls = [];
  let after = null;
  do {
    const data = await queryLinear(
      key,
      `query($id:String!,$after:String){issue(id:$id){attachments(first:100,after:$after){nodes{url} ${PAGE}}}}`,
      { id, after }
    );
    const page = data.issue.attachments;
    urls.push(...page.nodes.map((n) => n.url));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return urls;
}
async function attachedPrUrls(key, urls) {
  const linked = /* @__PURE__ */ new Set();
  for (let start = 0; start < urls.length; start += 20) {
    const batch = urls.slice(start, start + 20);
    const fields = batch.map((url, i) => `a${i}:attachmentsForURL(url:${JSON.stringify(url)}){nodes{id}}`).join(" ");
    const data = await queryLinear(
      key,
      `query{${fields}}`
    );
    batch.forEach((url, i) => {
      if (data[`a${i}`]?.nodes.length) {
        linked.add(url);
      }
    });
  }
  return linked;
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
      const comparison2 = await compareWithCurrentBase(token, repo, current);
      if (current.head.sha !== pullRequest.head.sha && comparison2.behind_by === 0) {
        return { status: "updated" };
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

// src/api/github.ts
async function openRepoPulls(token, repo) {
  const pulls = [];
  for (let page = 1; ; page++) {
    const batch = await requestGitHub(
      token,
      `/repos/${repo}/pulls?state=open&per_page=100&page=${page}`
    );
    pulls.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }
  return pulls;
}
async function fetchPullRequest(token, repo, number, issue, attached = true, prefetched) {
  const path = `/repos/${repo}/pulls/${number}`;
  const pullRequest = prefetched ?? await requestGitHub(token, path);
  if (pullRequest.state !== "open") {
    return null;
  }
  if (issue && !attached) {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9])${issue.identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`,
      "i"
    );
    if (!pattern.test(
      [pullRequest.title, pullRequest.body ?? "", pullRequest.head?.ref ?? ""].join(
        "\n"
      )
    )) {
      return null;
    }
  }
  const [reviews, checkRuns, status, reviewComments, issueComments] = await Promise.allSettled([
    requestGitHub(token, `${path}/reviews?per_page=100`),
    requestGitHub(
      token,
      `/repos/${repo}/commits/${pullRequest.head.sha}/check-runs?per_page=100`
    ),
    requestGitHub(
      token,
      `/repos/${repo}/commits/${pullRequest.head.sha}/status`
    ),
    requestGitHub(token, `${path}/comments?per_page=100`),
    requestGitHub(
      token,
      `/repos/${repo}/issues/${number}/comments?per_page=100`
    )
  ]);
  const reviewerMap = /* @__PURE__ */ new Map();
  const reviewItems = reviews.status === "fulfilled" ? reviews.value : [];
  for (const review of reviewItems) {
    if (!review.user?.login || !["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"].includes(review.state)) {
      continue;
    }
    const previous = reviewerMap.get(review.user.login);
    if (review.state === "COMMENTED" && previous && previous !== "commented") {
      continue;
    }
    reviewerMap.set(review.user.login, review.state.toLowerCase());
  }
  for (const review of pullRequest.requested_reviewers ?? []) {
    if (!reviewerMap.has(review.login)) {
      reviewerMap.set(review.login, "requested");
    }
  }
  const checks = [];
  const missingCheckDetails = [];
  if (checkRuns.status === "fulfilled") {
    for (const checkRun of checkRuns.value.check_runs ?? []) {
      const state = checkRun.status !== "completed" ? "pending" : ["success", "neutral", "skipped"].includes(checkRun.conclusion ?? "") ? "success" : "failure";
      const output = [
        checkRun.conclusion && checkRun.conclusion !== "failure" ? String(checkRun.conclusion).replace(/_/g, " ") : "",
        checkRun.output?.title !== checkRun.name ? checkRun.output?.title : "",
        checkRun.output?.summary,
        checkRun.output?.text
      ].filter(Boolean).join(" \u2014 ").replace(/\s+/g, " ").trim();
      if (state === "failure" && !output && checkRun.id) {
        missingCheckDetails.push({ id: checkRun.id, index: checks.length });
      }
      checks.push({
        name: checkRun.name,
        status: state,
        detail: state === "failure" ? output.slice(0, 240) : void 0
      });
    }
  }
  await Promise.allSettled(
    missingCheckDetails.slice(0, 8).map(async ({ id, index }) => {
      const annotations = await requestGitHub(
        token,
        `/repos/${repo}/check-runs/${id}/annotations?per_page=100`
      );
      const failures = annotations.filter(
        (annotation) => annotation.annotation_level === "failure"
      );
      const first = failures[0];
      if (first) {
        checks[index].detail = [
          first.path && first.start_line ? `${first.path}:${first.start_line}` : "",
          first.message
        ].filter(Boolean).join(" \u2014 ").replace(/\s+/g, " ").trim().slice(0, 240);
      }
    })
  );
  if (status.status === "fulfilled") {
    for (const commitStatus of status.value.statuses ?? []) {
      const state = commitStatus.state === "success" ? "success" : commitStatus.state === "pending" ? "pending" : "failure";
      checks.push({
        name: commitStatus.context,
        status: state,
        detail: state === "failure" ? String(commitStatus.description ?? "").replace(/\s+/g, " ").trim().slice(0, 240) : void 0
      });
    }
  }
  const hasHumanComment = [reviewComments, issueComments].some(
    (result) => result.status === "fulfilled" && result.value.some(
      (comment) => comment.user?.type === "User"
    )
  ) || reviewItems.some(
    (review) => review.user?.type === "User" && Boolean(review.body?.trim())
  );
  const groupId = issue ? issue.parent?.id ?? issue.project?.id ?? "unparented" : "unlinked";
  const groupTitle = issue ? issue.parent?.title ?? issue.project?.name ?? "Unparented issues" : "";
  const groupUrl = issue ? issue.parent?.url ?? issue.project?.url ?? "" : "";
  return {
    id: `${repo}#${number}`,
    url: pullRequest.html_url,
    repo,
    number,
    title: pullRequest.title,
    draft: pullRequest.draft,
    state: pullRequest.draft ? "draft" : "open",
    createdAt: pullRequest.created_at,
    issueId: issue?.id ?? "",
    issueTitle: issue?.title,
    issueUrl: issue?.url,
    groupId,
    groupTitle,
    groupUrl,
    checks,
    reviewers: [...reviewerMap].map(([login, status2]) => ({ login, status: status2 })),
    automerge: !!pullRequest.auto_merge,
    mergeQueued: false,
    conflicts: pullRequest.mergeable === false,
    comments: hasHumanComment
  };
}
async function markMergeQueued(token, prs) {
  for (let start = 0; start < prs.length; start += 50) {
    const batch = prs.slice(start, start + 50);
    const byRepo = /* @__PURE__ */ new Map();
    for (const pr of batch) {
      const items = byRepo.get(pr.repo) ?? [];
      items.push(pr);
      byRepo.set(pr.repo, items);
    }
    const groups = [...byRepo];
    const fields = groups.map(([repo, items], i) => {
      const [owner, name] = repo.split("/");
      const pulls = items.map((pr, j) => `p${j}:pullRequest(number:${pr.number}){mergeQueueEntry{id}}`).join(" ");
      return `r${i}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){${pulls}}`;
    }).join(" ");
    const response = await requestJson(
      "https://api.github.com/graphql",
      "POST",
      `Bearer ${token}`,
      { query: `query{${fields}}` }
    );
    if (response.errors?.length) {
      throw new Error(
        `GitHub merge queue lookup: ${response.errors.map((e) => e.message).join("; ")}`
      );
    }
    groups.forEach(
      ([, items], i) => items.forEach((pr, j) => {
        pr.mergeQueued = !!response.data?.[`r${i}`]?.[`p${j}`]?.mergeQueueEntry;
      })
    );
  }
}
async function authoredOpenPrs(token) {
  const viewer = await requestGitHub(token, "/user");
  if (!viewer.login) {
    throw new Error("Could not identify the GitHub API key owner.");
  }
  const prs = [];
  for (let page = 1; page <= 10; page++) {
    const autoMergeQuery = encodeURIComponent(`is:pr is:open author:${viewer.login}`);
    const result = await requestGitHub(
      token,
      `/search/issues?q=${autoMergeQuery}&per_page=100&page=${page}`
    );
    if (result.incomplete_results) {
      throw new Error("GitHub returned incomplete pull request search results.");
    }
    for (const item of result.items ?? []) {
      const ref = parsePullRequestUrl(item.html_url);
      if (ref) {
        prs.push({ ...ref, url: item.html_url, draft: !!item.draft });
      }
    }
    if ((result.items ?? []).length < 100) {
      break;
    }
    if (page === 10) {
      throw new Error("GitHub search exceeded its 1,000 pull request result limit.");
    }
  }
  return prs;
}
async function launchPr(credentials, pr) {
  let data = await requestGitHub(
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
    data = await requestGitHub(
      credentials.githubKey,
      `/repos/${pr.repo}/pulls/${pr.number}`
    );
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

// src/api/discovery.ts
async function referencedLinearIssue(key, pr, cache) {
  for (const id of referencedIdentifiers(pr)) {
    if (!cache.has(id)) {
      try {
        const result = await queryLinear(
          key,
          `query($id:String!){issue(id:$id){${ISSUE_FIELDS}}}`,
          { id }
        );
        cache.set(id, result.issue);
      } catch (e) {
        if (!String(e).includes("Entity not found: Issue")) {
          throw e;
        }
        cache.set(id, null);
      }
    }
    const issue = cache.get(id);
    if (issue) {
      return issue;
    }
  }
  return null;
}
async function discover(credentials) {
  const authoredOpen = await authoredOpenPrs(credentials.githubKey);
  const roots = await assignedRoots(credentials.linearKey);
  const seen = /* @__PURE__ */ new Set();
  const issues = [];
  const errors = [];
  let frontier = roots;
  while (frontier.length) {
    const batch = frontier.filter((i) => {
      if (seen.has(i.id)) {
        return false;
      }
      seen.add(i.id);
      return true;
    });
    issues.push(...batch);
    const next = [];
    await forEachConcurrent(batch, 6, async (issue) => {
      try {
        next.push(...await issueChildren(credentials.linearKey, issue.id));
      } catch (e) {
        errors.push(`${issue.identifier} children: ${String(e)}`);
      }
    });
    frontier = next;
  }
  const linked = await discoverLinked(credentials, issues, []);
  const prs = linked.prs;
  errors.push(...linked.errors);
  const associatedIds = new Set(prs.map((pr) => pr.id));
  const authored = authoredOpen.filter(
    (pr) => !associatedIds.has(`${pr.repo}#${pr.number}`)
  );
  const attached = await attachedPrUrls(
    credentials.linearKey,
    authored.map((pr) => pr.url)
  );
  const issueRefs = /* @__PURE__ */ new Map();
  await forEachConcurrent(authored, 6, async (ref) => {
    const pr = await requestGitHub(
      credentials.githubKey,
      `/repos/${ref.repo}/pulls/${ref.number}`
    );
    if (pr.state !== "open") {
      return;
    }
    const issue = await referencedLinearIssue(credentials.linearKey, pr, issueRefs);
    if (attached.has(ref.url) && !issue && !pr.draft) {
      return;
    }
    const item = await fetchPullRequest(
      credentials.githubKey,
      ref.repo,
      ref.number,
      issue ?? void 0,
      true,
      pr
    );
    if (item) {
      prs.push(item);
    }
  });
  await markMergeQueued(credentials.githubKey, prs);
  return { prs, errors };
}
async function discoverLinked(credentials, issues, knownRepos) {
  const prs = [];
  const used = /* @__PURE__ */ new Set();
  const errors = [];
  const refsByIssue = /* @__PURE__ */ new Map();
  const allowedRepos = /* @__PURE__ */ new Set();
  await forEachConcurrent(issues, 6, async (issue) => {
    const refs = /* @__PURE__ */ new Map();
    refsByIssue.set(issue.id, refs);
    try {
      for (const url of await attachmentUrls(credentials.linearKey, issue.id)) {
        const ref = parsePullRequestUrl(url);
        if (ref) {
          allowedRepos.add(ref.repo);
          refs.set(`${ref.repo}#${ref.number}`, { ...ref, attached: true });
        }
      }
    } catch (e) {
      errors.push(`${issue.identifier} attachments: ${String(e)}`);
    }
  });
  for (const repo of knownRepos) {
    allowedRepos.add(repo);
  }
  const issuesByIdentifier = new Map(
    issues.map((issue) => [issue.identifier.toUpperCase(), issue])
  );
  await forEachConcurrent([...allowedRepos], 3, async (repo) => {
    try {
      for (const pull of await openRepoPulls(credentials.githubKey, repo)) {
        const issue = referencedIdentifiers(pull).map((id) => issuesByIdentifier.get(id)).find((match) => !!match);
        if (!issue) {
          continue;
        }
        const refs = refsByIssue.get(issue.id);
        const key = `${repo}#${pull.number}`;
        if (!refs.has(key)) {
          refs.set(key, { repo, number: pull.number, attached: false });
        }
      }
    } catch (e) {
      errors.push(`${repo} pull request list: ${String(e)}`);
    }
  });
  await forEachConcurrent(issues, 6, async (issue) => {
    const refs = refsByIssue.get(issue.id);
    for (const ref of refs.values()) {
      const key = `${ref.repo}#${ref.number}`;
      if (used.has(key)) {
        continue;
      }
      used.add(key);
      try {
        const pr = await fetchPullRequest(
          credentials.githubKey,
          ref.repo,
          ref.number,
          issue,
          ref.attached
        );
        if (pr) {
          prs.push(pr);
        }
      } catch (e) {
        errors.push(`${key}: ${String(e)}`);
      }
    }
  });
  return { prs, errors };
}
async function discoverGroup(credentials, groupId, groupUrl, knownRepos, knownIssueIds) {
  let issues;
  if (groupUrl.includes("/project/")) {
    issues = (await projectIssues(credentials.linearKey, groupId)).filter(
      (issue) => !issue.parent
    );
  } else if (groupUrl.includes("/issue/")) {
    issues = await issueChildren(credentials.linearKey, groupId);
  } else {
    issues = [];
    await forEachConcurrent(knownIssueIds, 6, async (id) => {
      const issue = await issueById(credentials.linearKey, id);
      if (issue) {
        issues.push(issue);
      }
    });
  }
  const result = await discoverLinked(credentials, issues, knownRepos);
  result.prs = result.prs.filter((pr) => pr.groupId === groupId);
  await markMergeQueued(credentials.githubKey, result.prs);
  return result;
}
async function refreshPrs(credentials, previous) {
  const refreshed = [];
  const errors = [];
  await forEachConcurrent(previous, 4, async (old) => {
    try {
      const current = await fetchPullRequest(credentials.githubKey, old.repo, old.number);
      if (current) {
        refreshed.push({
          ...current,
          issueId: old.issueId,
          issueTitle: old.issueTitle,
          issueUrl: old.issueUrl,
          groupId: old.groupId,
          groupTitle: old.groupTitle,
          groupUrl: old.groupUrl
        });
      }
    } catch (e) {
      errors.push(`${old.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  if (errors.length) {
    throw new Error(
      `Pull request refresh failed: ${errors[0]}${errors.length > 1 ? ` (${errors.length} errors total)` : ""}`
    );
  }
  await markMergeQueued(credentials.githubKey, refreshed);
  return refreshed;
}

// src/metadata.ts
var BOARD_VIEW_TYPE = "linear-prs";
var METADATA_PATH = ".linear-prs/metadata.json";
var STAGES = ["A", "B", "C"];
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
var BoardView = class extends import_obsidian5.ItemView {
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
    if (!this.plugin.metadata.lastRefresh && this.plugin.settings.linearKey && this.plugin.settings.githubKey) {
      void this.refresh();
    } else {
      void this.plugin.loadCachedMergeQueueStatus().then((changed) => {
        if (changed) {
          this.render();
        }
      }).catch((e) => new import_obsidian5.Notice(errorMessage(e), 8e3));
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
  async refresh() {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    this.busy = true;
    this.render();
    try {
      const r = await this.plugin.refresh();
      new import_obsidian5.Notice(
        `Linear PRs: ${r.prs.length} open PRs${r.errors.length ? `, ${r.errors.length} lookup errors` : ""}`
      );
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
  async refreshGroup(id, url, title) {
    if (this.busy || this.refreshingGroups.size) {
      return;
    }
    this.refreshingGroups.add(id);
    this.render();
    try {
      const r = await this.plugin.refreshGroup(id, url);
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
  rememberCollapse(fetchPullRequest2, id) {
    const metadata = this.plugin.metadata;
    fetchPullRequest2.open = !metadata.collapsed.includes(id);
    let lastOpen = fetchPullRequest2.open;
    fetchPullRequest2.ontoggle = () => {
      if (!fetchPullRequest2.isConnected || fetchPullRequest2.open === lastOpen) {
        return;
      }
      lastOpen = fetchPullRequest2.open;
      metadata.collapsed = fetchPullRequest2.open ? metadata.collapsed.filter((x) => x !== id) : [.../* @__PURE__ */ new Set([...metadata.collapsed, id])];
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
    const fetchPullRequest2 = parent.createEl("details", { cls: "linear-prs-group" });
    this.rememberCollapse(fetchPullRequest2, `queue:${type}`);
    const summary = fetchPullRequest2.createEl("summary", {
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
    const list = fetchPullRequest2.createDiv({ cls: "linear-prs-list" });
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
      for (const pullRequest of pullRequests) {
        try {
          const result = await launchPr(this.plugin.credentials(), pullRequest);
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
      }
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
  renderPullRequestActions(pullRequest, controls) {
    const metadata = this.plugin.metadata;
    const remove = controls.createSpan({ cls: "linear-prs-control-set" });
    createIconButton(
      remove,
      "Close and remove pull request",
      "trash-2",
      () => void this.runAction(async () => {
        await closePr(this.plugin.credentials(), pullRequest);
        metadata.hidden.push(pullRequest.id);
        await this.plugin.saveMetadata();
      }, "Closed and removed PR")
    );
    const review = controls.createSpan({ cls: "linear-prs-control-set" });
    createIconButton(
      review,
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
    for (const stage of STAGES) {
      createIconButton(
        review,
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
    const fetchPullRequest2 = parent.createEl("details", { cls: "linear-prs-group" });
    this.rememberCollapse(fetchPullRequest2, id);
    const summary = fetchPullRequest2.createEl("summary", {
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
      () => void this.refreshGroup(id, url, title),
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
    const list = fetchPullRequest2.createDiv({ cls: "linear-prs-list" });
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
  async loadCachedMergeQueueStatus() {
    if (!this.settings.githubKey) {
      return false;
    }
    const snapshot = this.metadata.pullRequests;
    const stale = snapshot.filter((pullRequest) => pullRequest.mergeQueued === void 0);
    if (!stale.length) {
      return false;
    }
    await withDeadline(
      markMergeQueued(this.settings.githubKey, stale),
      3e4,
      "Merge queue lookup"
    );
    if (this.metadata.pullRequests !== snapshot) {
      return false;
    }
    await this.saveMetadata();
    return true;
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
  async refreshGroup(groupId, groupUrl) {
    if (!this.settings.linearKey || !this.settings.githubKey) {
      throw new Error("Enter both API keys in Linear PRs settings.");
    }
    const previous = this.metadata.pullRequests.filter(
      (pullRequest) => pullRequest.groupId === groupId
    );
    const result = await withDeadline(
      discoverGroup(
        this.settings,
        groupId,
        groupUrl,
        [...new Set(previous.map((pullRequest) => pullRequest.repo))],
        [...new Set(previous.map((pullRequest) => pullRequest.issueId).filter(Boolean))]
      ),
      3e4,
      "Group refresh"
    );
    if (result.errors.length) {
      throw new Error(
        `Group refresh failed: ${result.errors[0]}${result.errors.length > 1 ? ` (${result.errors.length} errors total)` : ""}`
      );
    }
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
  credentials() {
    return { linearKey: this.settings.linearKey, githubKey: this.settings.githubKey };
  }
};
