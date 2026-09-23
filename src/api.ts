import { requestUrl } from 'obsidian';

export type Issue = { id:string; identifier:string; title:string; url:string; state?:{type:string}; project?:{name:string}|null; parent?:{id:string}|null; attachments?:{nodes:{url:string}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}; children?:{nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}} };
export type PR = { id:string; url:string; repo:string; number:number; title:string; draft:boolean; state:string; createdAt:string; issueId:string; groupId:string; groupTitle:string; groupUrl:string; checks:{name:string;status:string}[]; reviewers:{login:string;status:string}[]; automerge:boolean; conflicts:boolean; comments:boolean };
export type Credentials = {linearKey:string;githubKey:string};

async function json(url:string, method:string, token:string, body?:unknown):Promise<any> {
  const res=await requestUrl({url,method,headers:{'Authorization':token,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body),throw:false});
  if(res.status>=400) throw new Error(`${method} ${url}: ${res.status} ${JSON.stringify(res.json?.message??res.text).slice(0,200)}`);
  return res.json;
}
async function linear<T>(key:string,query:string,variables:Record<string,unknown>={}):Promise<T>{
  const data=await json('https://api.linear.app/graphql','POST',key,{query,variables});
  if(data.errors?.length) throw new Error(data.errors.map((e:{message:string})=>e.message).join('; '));
  return data.data as T;
}
const ISSUE_FIELDS='id identifier title url state { type } project { name } parent { id }';
const PAGE='pageInfo { hasNextPage endCursor }';
async function assignedRoots(key:string):Promise<Issue[]>{
  const roots:Issue[]=[]; let after:string|null=null;
  do { const data:any=await linear<{viewer:{assignedIssues:{nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}}>(key,`query($after:String){viewer{assignedIssues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,{after});
    const page=data.viewer.assignedIssues as {nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}; roots.push(...page.nodes.filter(i=>!['completed','canceled'].includes(i.state?.type??''))); after=page.pageInfo.hasNextPage?page.pageInfo.endCursor:null;
  } while(after);
  return roots;
}
async function issueChildren(key:string,id:string):Promise<Issue[]>{
  const children:Issue[]=[];let after:string|null=null;
  do { const data:any=await linear<{issue:{children:{nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}}>(key,`query($id:String!,$after:String){issue(id:$id){children(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,{id,after});
    const page=data.issue.children as {nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}};children.push(...page.nodes);after=page.pageInfo.hasNextPage?page.pageInfo.endCursor:null;
  }while(after);return children;
}
async function attachmentUrls(key:string,id:string):Promise<string[]>{
  const urls:string[]=[];let after:string|null=null;
  do {const data:any=await linear<{issue:{attachments:{nodes:{url:string}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}}>(key,`query($id:String!,$after:String){issue(id:$id){attachments(first:100,after:$after){nodes{url} ${PAGE}}}}`,{id,after});
    const page=data.issue.attachments as {nodes:{url:string}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}};urls.push(...page.nodes.map(n=>n.url));after=page.pageInfo.hasNextPage?page.pageInfo.endCursor:null;
  }while(after);return urls;
}
const prPattern=/https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i;
function parsePr(url:string):{repo:string;number:number}|null{const m=url.match(prPattern);return m?{repo:`${m[1]}/${m[2]}`,number:Number(m[3])}:null;}
async function gh(token:string,path:string,method='GET',body?:unknown):Promise<any>{return json(`https://api.github.com${path}`,method,`Bearer ${token}`,body);}
async function githubSearch(token:string,identifier:string):Promise<{repo:string;number:number}[]>{
  const found:{repo:string;number:number}[]=[];
  for(let page=1;page<=10;page++){
    const data=await gh(token,`/search/issues?q=${encodeURIComponent(`"${identifier}" type:pr state:open`)}&per_page=100&page=${page}`);
    for(const item of data.items??[]){const parsed=parsePr(item.html_url);if(parsed)found.push(parsed);}
    if((data.items??[]).length<100)break;
  }return found;
}
async function details(token:string,repo:string,number:number,issue:Issue,attached:boolean):Promise<PR|null>{
  const path=`/repos/${repo}/pulls/${number}`;
  const p=await gh(token,path);if(p.state!=='open')return null;
  if(!attached){const pattern=new RegExp(`(^|[^A-Za-z0-9])${issue.identifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Za-z0-9]|$)`,'i');if(!pattern.test([p.title,p.body??'',p.head?.ref??''].join('\n')))return null;}
  const [reviews,checkRuns,status,reviewComments,issueComments]=await Promise.allSettled([
    gh(token,`${path}/reviews?per_page=100`),gh(token,`/repos/${repo}/commits/${p.head.sha}/check-runs?per_page=100`),gh(token,`/repos/${repo}/commits/${p.head.sha}/status`),gh(token,`${path}/comments?per_page=100`),gh(token,`/repos/${repo}/issues/${number}/comments?per_page=100`)
  ]);
  const reviewerMap=new Map<string,string>();
  for(const r of reviews.status==='fulfilled'?reviews.value:[])if(r.user?.login && ['APPROVED','CHANGES_REQUESTED','COMMENTED','DISMISSED'].includes(r.state))reviewerMap.set(r.user.login,r.state.toLowerCase());
  for(const r of p.requested_reviewers??[])if(!reviewerMap.has(r.login))reviewerMap.set(r.login,'requested');
  const checks:{name:string;status:string}[]=[];
  if(checkRuns.status==='fulfilled')for(const c of checkRuns.value.check_runs??[])checks.push({name:c.name,status:c.status!=='completed'?'pending':c.conclusion==='success'?'success':'failure'});
  if(status.status==='fulfilled')for(const s of status.value.statuses??[])checks.push({name:s.context,status:s.state==='success'?'success':s.state==='pending'?'pending':'failure'});
  const hasHumanComments=[reviewComments,issueComments].some(result=>result.status==='fulfilled'&&result.value.some((comment:{user?:{type?:string}})=>comment.user?.type==='User'));
  return {id:`${repo}#${number}`,url:p.html_url,repo,number,title:p.title,draft:p.draft,state:p.draft?'draft':'open',createdAt:p.created_at,issueId:issue.id,groupId:issue.id,groupTitle:`${issue.identifier} ${issue.title}`,groupUrl:issue.url,checks,reviewers:[...reviewerMap].map(([login,status])=>({login,status})),automerge:!!p.auto_merge,conflicts:p.mergeable===false,comments:hasHumanComments};
}
async function mapLimit<T>(items:T[],limit:number,fn:(item:T)=>Promise<void>):Promise<void>{
  let index=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(index<items.length){const item=items[index++];await fn(item);}
  }));
}
export async function discover(c:Credentials):Promise<{prs:PR[];errors:string[]}>{
  const roots=await assignedRoots(c.linearKey);const seen=new Set<string>();const issues:Issue[]=[];const errors:string[]=[];
  let frontier=roots;
  while(frontier.length){const batch=frontier.filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;});issues.push(...batch);const next:Issue[]=[];
    await mapLimit(batch,6,async issue=>{try{next.push(...await issueChildren(c.linearKey,issue.id));}catch(e){errors.push(`${issue.identifier} children: ${String(e)}`);}});frontier=next;
  }
  const prs:PR[]=[];const used=new Set<string>();
  const refsByIssue=new Map<string,Map<string,{repo:string;number:number;attached:boolean}>>();const allowedRepos=new Set<string>();
  await mapLimit(issues,6,async issue=>{const refs=new Map<string,{repo:string;number:number;attached:boolean}>();refsByIssue.set(issue.id,refs);
    try{for(const url of await attachmentUrls(c.linearKey,issue.id)){const ref=parsePr(url);if(ref){allowedRepos.add(ref.repo);refs.set(`${ref.repo}#${ref.number}`,{...ref,attached:true});}}}
    catch(e){errors.push(`${issue.identifier} attachments: ${String(e)}`);}
  });
  await mapLimit(issues,6,async issue=>{
    const refs=refsByIssue.get(issue.id)!;
    try{for(const ref of await githubSearch(c.githubKey,issue.identifier)){const key=`${ref.repo}#${ref.number}`;if(allowedRepos.has(ref.repo)&&!refs.has(key))refs.set(key,{...ref,attached:false});}}
    catch(e){errors.push(`${issue.identifier} search: ${String(e)}`);}
    for(const ref of refs.values()){const key=`${ref.repo}#${ref.number}`;if(used.has(key))continue;used.add(key);
      try{const pr=await details(c.githubKey,ref.repo,ref.number,issue,ref.attached);if(pr)prs.push(pr);}catch(e){errors.push(`${key}: ${String(e)}`);}
    }
  });
  return {prs,errors};
}
export async function launchPr(c:Credentials,pr:PR):Promise<void>{
  const data=await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}`);
  if(data.draft)await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}/ready_for_review`,'POST');
  const q=`mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}`;
  const result=await json('https://api.github.com/graphql','POST',`Bearer ${c.githubKey}`,{query:q,variables:{id:data.node_id}});
  if(result.errors?.length)throw new Error(result.errors.map((e:{message:string})=>e.message).join('; '));
}
export async function requestReviewer(c:Credentials,pr:PR,login:string):Promise<void>{await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}/requested_reviewers`,'POST',{reviewers:[login]});}
export async function closePr(c:Credentials,pr:PR):Promise<void>{await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}`,'PATCH',{state:'closed'});}
