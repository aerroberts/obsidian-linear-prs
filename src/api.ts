import { requestUrl } from 'obsidian';

export type Issue = { id:string; identifier:string; title:string; url:string; state?:{type:string}; project?:{id:string;name:string;url:string}|null; parent?:{id:string;title:string;url:string}|null; attachments?:{nodes:{url:string}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}; children?:{nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}} };
export type PR = { id:string; url:string; repo:string; number:number; title:string; draft:boolean; state:string; createdAt:string; issueId:string; issueTitle?:string; issueUrl?:string; groupId:string; groupTitle:string; groupUrl:string; checks:{name:string;status:string;detail?:string}[]; reviewers:{login:string;status:string}[]; automerge:boolean; mergeQueued?:boolean; conflicts:boolean; comments:boolean };
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
const ISSUE_FIELDS='id identifier title url state { type } project { id name url } parent { id title url }';
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
async function projectIssues(key:string,id:string):Promise<Issue[]>{
  const issues:Issue[]=[];let after:string|null=null;
  do {const data:any=await linear<{project:{issues:{nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}}>(key,`query($id:String!,$after:String){project(id:$id){issues(first:100,after:$after){nodes{${ISSUE_FIELDS}} ${PAGE}}}}`,{id,after});
    const page=data.project.issues as {nodes:Issue[];pageInfo:{hasNextPage:boolean;endCursor:string|null}};issues.push(...page.nodes);after=page.pageInfo.hasNextPage?page.pageInfo.endCursor:null;
  }while(after);return issues;
}
async function issueById(key:string,id:string):Promise<Issue|null>{
  const data=await linear<{issue:Issue|null}>(key,`query($id:String!){issue(id:$id){${ISSUE_FIELDS}}}`,{id});return data.issue;
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
async function openRepoPulls(token:string,repo:string):Promise<any[]>{
  const pulls:any[]=[];
  for(let page=1;;page++){
    const batch=await gh(token,`/repos/${repo}/pulls?state=open&per_page=100&page=${page}`);
    pulls.push(...batch);
    if(batch.length<100)break;
  }
  return pulls;
}
function referencedIdentifiers(pr:{title?:string;body?:string|null;head?:{ref?:string}}):string[]{
  return [...new Set(([pr.title??'',pr.body??'',pr.head?.ref??''].join('\n').match(/\b[A-Z][A-Z0-9]{1,14}-\d+\b/gi)??[]).map(id=>id.toUpperCase()))];
}
async function details(token:string,repo:string,number:number,issue?:Issue,attached=true,prefetched?:any):Promise<PR|null>{
  const path=`/repos/${repo}/pulls/${number}`;
  const p=prefetched??await gh(token,path);if(p.state!=='open')return null;
  if(issue&&!attached){const pattern=new RegExp(`(^|[^A-Za-z0-9])${issue.identifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Za-z0-9]|$)`,'i');if(!pattern.test([p.title,p.body??'',p.head?.ref??''].join('\n')))return null;}
  const [reviews,checkRuns,status,reviewComments,issueComments]=await Promise.allSettled([
    gh(token,`${path}/reviews?per_page=100`),gh(token,`/repos/${repo}/commits/${p.head.sha}/check-runs?per_page=100`),gh(token,`/repos/${repo}/commits/${p.head.sha}/status`),gh(token,`${path}/comments?per_page=100`),gh(token,`/repos/${repo}/issues/${number}/comments?per_page=100`)
  ]);
  const reviewerMap=new Map<string,string>();
  const reviewItems:any[]=reviews.status==='fulfilled'?reviews.value:[];
  for(const r of reviewItems){
    if(!r.user?.login||!['APPROVED','CHANGES_REQUESTED','COMMENTED','DISMISSED'].includes(r.state))continue;
    const previous=reviewerMap.get(r.user.login);
    if(r.state==='COMMENTED'&&previous&&previous!=='commented')continue;
    reviewerMap.set(r.user.login,r.state.toLowerCase());
  }
  for(const r of p.requested_reviewers??[])if(!reviewerMap.has(r.login))reviewerMap.set(r.login,'requested');
  const checks:{name:string;status:string;detail?:string}[]=[];
  const missingCheckDetails:{id:number;index:number}[]=[];
  if(checkRuns.status==='fulfilled')for(const c of checkRuns.value.check_runs??[]){
    const state=c.status!=='completed'?'pending':['success','neutral','skipped'].includes(c.conclusion)?'success':'failure';
    const output=[c.conclusion&&c.conclusion!=='failure'?String(c.conclusion).replace(/_/g,' '):'',c.output?.title!==c.name?c.output?.title:'',c.output?.summary,c.output?.text].filter(Boolean).join(' — ').replace(/\s+/g,' ').trim();
    if(state==='failure'&&!output&&c.id)missingCheckDetails.push({id:c.id,index:checks.length});
    checks.push({name:c.name,status:state,detail:state==='failure'?output.slice(0,240):undefined});
  }
  await Promise.allSettled(missingCheckDetails.slice(0,8).map(async ({id,index})=>{
    const annotations=await gh(token,`/repos/${repo}/check-runs/${id}/annotations?per_page=100`);
    const failures=annotations.filter((annotation:{annotation_level:string})=>annotation.annotation_level==='failure');
    const first=failures[0];
    if(first)checks[index].detail=[first.path&&first.start_line?`${first.path}:${first.start_line}`:'',first.message].filter(Boolean).join(' — ').replace(/\s+/g,' ').trim().slice(0,240);
  }));
  if(status.status==='fulfilled')for(const s of status.value.statuses??[]){
    const state=s.state==='success'?'success':s.state==='pending'?'pending':'failure';
    checks.push({name:s.context,status:state,detail:state==='failure'?String(s.description??'').replace(/\s+/g,' ').trim().slice(0,240):undefined});
  }
  const hasHumanComment=[reviewComments,issueComments].some(result=>result.status==='fulfilled'&&result.value.some((comment:{user?:{type?:string}})=>comment.user?.type==='User'))||reviewItems.some(r=>r.user?.type==='User'&&Boolean(r.body?.trim()));
  const groupId=issue?(issue.parent?.id??issue.project?.id??'unparented'):'unlinked';
  const groupTitle=issue?(issue.parent?.title??issue.project?.name??'Unparented issues'):'';
  const groupUrl=issue?(issue.parent?.url??issue.project?.url??''):'';
  return {id:`${repo}#${number}`,url:p.html_url,repo,number,title:p.title,draft:p.draft,state:p.draft?'draft':'open',createdAt:p.created_at,issueId:issue?.id??'',issueTitle:issue?.title,issueUrl:issue?.url,groupId,groupTitle,groupUrl,checks,reviewers:[...reviewerMap].map(([login,status])=>({login,status})),automerge:!!p.auto_merge,mergeQueued:false,conflicts:p.mergeable===false,comments:hasHumanComment};
}
async function mapLimit<T>(items:T[],limit:number,fn:(item:T)=>Promise<void>):Promise<void>{
  let index=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(index<items.length){const item=items[index++];await fn(item);}
  }));
}
export async function markMergeQueued(token:string,prs:PR[]):Promise<void>{
  for(let start=0;start<prs.length;start+=50){
    const batch=prs.slice(start,start+50);
    const byRepo=new Map<string,PR[]>();
    for(const pr of batch){const items=byRepo.get(pr.repo)??[];items.push(pr);byRepo.set(pr.repo,items);}
    const groups=[...byRepo];
    const fields=groups.map(([repo,items],i)=>{
      const [owner,name]=repo.split('/');
      const pulls=items.map((pr,j)=>`p${j}:pullRequest(number:${pr.number}){mergeQueueEntry{id}}`).join(' ');
      return `r${i}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){${pulls}}`;
    }).join(' ');
    const response=await json('https://api.github.com/graphql','POST',`Bearer ${token}`,{query:`query{${fields}}`});
    if(response.errors?.length)throw new Error(`GitHub merge queue lookup: ${response.errors.map((e:{message:string})=>e.message).join('; ')}`);
    groups.forEach(([,items],i)=>items.forEach((pr,j)=>{pr.mergeQueued=!!response.data?.[`r${i}`]?.[`p${j}`]?.mergeQueueEntry;}));
  }
}
async function authoredOpenPrs(token:string):Promise<{repo:string;number:number;url:string;draft:boolean}[]>{
  const viewer=await gh(token,'/user');if(!viewer.login)throw new Error('Could not identify the GitHub API key owner.');
  const prs:{repo:string;number:number;url:string;draft:boolean}[]=[];
  for(let page=1;page<=10;page++){
    const q=encodeURIComponent(`is:pr is:open author:${viewer.login}`);
    const result=await gh(token,`/search/issues?q=${q}&per_page=100&page=${page}`);
    if(result.incomplete_results)throw new Error('GitHub returned incomplete pull request search results.');
    for(const item of result.items??[]){const ref=parsePr(item.html_url);if(ref)prs.push({...ref,url:item.html_url,draft:!!item.draft});}
    if((result.items??[]).length<100)break;
    if(page===10)throw new Error('GitHub search exceeded its 1,000 pull request result limit.');
  }
  return prs;
}
async function attachedPrUrls(key:string,urls:string[]):Promise<Set<string>>{
  const linked=new Set<string>();
  for(let start=0;start<urls.length;start+=20){
    const batch=urls.slice(start,start+20);
    const fields=batch.map((url,i)=>`a${i}:attachmentsForURL(url:${JSON.stringify(url)}){nodes{id}}`).join(' ');
    const data=await linear<Record<string,{nodes:{id:string}[]}>>(key,`query{${fields}}`);
    batch.forEach((url,i)=>{if(data[`a${i}`]?.nodes.length)linked.add(url);});
  }
  return linked;
}
async function referencedLinearIssue(key:string,pr:any,cache:Map<string,Issue|null>):Promise<Issue|null>{
  for(const id of referencedIdentifiers(pr)){
    if(!cache.has(id)){
      try{const result=await linear<{issue:Issue|null}>(key,`query($id:String!){issue(id:$id){${ISSUE_FIELDS}}}`,{id});cache.set(id,result.issue);}
      catch(e){if(!String(e).includes('Entity not found: Issue'))throw e;cache.set(id,null);}
    }
    const issue=cache.get(id);if(issue)return issue;
  }
  return null;
}
export async function discover(c:Credentials):Promise<{prs:PR[];errors:string[]}>{
  const authoredOpen=await authoredOpenPrs(c.githubKey);
  const roots=await assignedRoots(c.linearKey);const seen=new Set<string>();const issues:Issue[]=[];const errors:string[]=[];
  let frontier=roots;
  while(frontier.length){const batch=frontier.filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true;});issues.push(...batch);const next:Issue[]=[];
    await mapLimit(batch,6,async issue=>{try{next.push(...await issueChildren(c.linearKey,issue.id));}catch(e){errors.push(`${issue.identifier} children: ${String(e)}`);}});frontier=next;
  }
  const linked=await discoverLinked(c,issues,[]);const prs=linked.prs;errors.push(...linked.errors);
  const associatedIds=new Set(prs.map(pr=>pr.id));
  const authored=authoredOpen.filter(pr=>!associatedIds.has(`${pr.repo}#${pr.number}`));
  const attached=await attachedPrUrls(c.linearKey,authored.map(pr=>pr.url));
  const issueRefs=new Map<string,Issue|null>();
  await mapLimit(authored,6,async ref=>{
    const pr=await gh(c.githubKey,`/repos/${ref.repo}/pulls/${ref.number}`);
    if(pr.state!=='open')return;
    // Keep authored PRs visible when their Linear issue is outside the assigned
    // issue tree, and group them under that issue when its identifier is known.
    const issue=await referencedLinearIssue(c.linearKey,pr,issueRefs);
    if(attached.has(ref.url)&&!issue&&!pr.draft)return;
    const item=await details(c.githubKey,ref.repo,ref.number,issue??undefined,true,pr);
    if(item)prs.push(item);
  });
  await markMergeQueued(c.githubKey,prs);
  return {prs,errors};
}
async function discoverLinked(c:Credentials,issues:Issue[],knownRepos:string[]):Promise<{prs:PR[];errors:string[]}>{
  const prs:PR[]=[];const used=new Set<string>();const errors:string[]=[];
  const refsByIssue=new Map<string,Map<string,{repo:string;number:number;attached:boolean}>>();const allowedRepos=new Set<string>();
  await mapLimit(issues,6,async issue=>{const refs=new Map<string,{repo:string;number:number;attached:boolean}>();refsByIssue.set(issue.id,refs);
    try{for(const url of await attachmentUrls(c.linearKey,issue.id)){const ref=parsePr(url);if(ref){allowedRepos.add(ref.repo);refs.set(`${ref.repo}#${ref.number}`,{...ref,attached:true});}}}
    catch(e){errors.push(`${issue.identifier} attachments: ${String(e)}`);}
  });
  for(const repo of knownRepos)allowedRepos.add(repo);
  const issuesByIdentifier=new Map(issues.map(issue=>[issue.identifier.toUpperCase(),issue]));
  await mapLimit([...allowedRepos],3,async repo=>{
    try{for(const pull of await openRepoPulls(c.githubKey,repo)){
      const issue=referencedIdentifiers(pull).map(id=>issuesByIdentifier.get(id)).find((match):match is Issue=>!!match);
      if(!issue)continue;
      const refs=refsByIssue.get(issue.id)!;const key=`${repo}#${pull.number}`;
      if(!refs.has(key))refs.set(key,{repo,number:pull.number,attached:false});
    }}catch(e){errors.push(`${repo} pull request list: ${String(e)}`);}
  });
  await mapLimit(issues,6,async issue=>{
    const refs=refsByIssue.get(issue.id)!;
    for(const ref of refs.values()){const key=`${ref.repo}#${ref.number}`;if(used.has(key))continue;used.add(key);
      try{const pr=await details(c.githubKey,ref.repo,ref.number,issue,ref.attached);if(pr)prs.push(pr);}catch(e){errors.push(`${key}: ${String(e)}`);}
    }
  });
  return {prs,errors};
}
export async function discoverGroup(c:Credentials,groupId:string,groupUrl:string,knownRepos:string[],knownIssueIds:string[]):Promise<{prs:PR[];errors:string[]}>{
  let issues:Issue[];
  if(groupUrl.includes('/project/'))issues=(await projectIssues(c.linearKey,groupId)).filter(issue=>!issue.parent);
  else if(groupUrl.includes('/issue/'))issues=await issueChildren(c.linearKey,groupId);
  else {issues=[];await mapLimit(knownIssueIds,6,async id=>{const issue=await issueById(c.linearKey,id);if(issue)issues.push(issue);});}
  const result=await discoverLinked(c,issues,knownRepos);
  result.prs=result.prs.filter(pr=>pr.groupId===groupId);
  await markMergeQueued(c.githubKey,result.prs);
  return result;
}
export async function refreshPrs(c:Credentials,previous:PR[]):Promise<PR[]>{
  const refreshed:PR[]=[];
  const errors:string[]=[];
  await mapLimit(previous,4,async old=>{
    try{
      const current=await details(c.githubKey,old.repo,old.number);
      if(current)refreshed.push({...current,issueId:old.issueId,issueTitle:old.issueTitle,issueUrl:old.issueUrl,groupId:old.groupId,groupTitle:old.groupTitle,groupUrl:old.groupUrl});
    }catch(e){errors.push(`${old.id}: ${e instanceof Error?e.message:String(e)}`);}
  });
  if(errors.length)throw new Error(`Pull request refresh failed: ${errors[0]}${errors.length>1?` (${errors.length} errors total)`:''}`);
  await markMergeQueued(c.githubKey,refreshed);
  return refreshed;
}
export async function launchPr(c:Credentials,pr:PR):Promise<{readyForReview:boolean;automergeEnabled:boolean;error?:string}>{
  const data=await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}`);
  if(data.state!=='open')throw new Error(`Pull request is ${data.state}, not open.`);
  if(data.draft){
    const readyQuery=`mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft}}}`;
    const ready=await json('https://api.github.com/graphql','POST',`Bearer ${c.githubKey}`,{query:readyQuery,variables:{id:data.node_id}});
    if(ready.errors?.length)throw new Error(ready.errors.map((e:{message:string})=>e.message).join('; '));
    if(ready.data?.markPullRequestReadyForReview?.pullRequest?.isDraft!==false)throw new Error('GitHub did not mark the pull request ready for review.');
  }
  if(data.auto_merge)return {readyForReview:true,automergeEnabled:true};
  const q=`mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}`;
  try{
    const result=await json('https://api.github.com/graphql','POST',`Bearer ${c.githubKey}`,{query:q,variables:{id:data.node_id}});
    if(result.errors?.length)throw new Error(result.errors.map((e:{message:string})=>e.message).join('; '));
    return {readyForReview:true,automergeEnabled:true};
  }catch(e){return {readyForReview:true,automergeEnabled:false,error:`Ready for review, but auto-merge could not be enabled: ${e instanceof Error?e.message:String(e)}`};}
}
export async function requestReviewer(c:Credentials,pr:PR,login:string):Promise<void>{await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}/requested_reviewers`,'POST',{reviewers:[login]});}
export async function closePr(c:Credentials,pr:PR):Promise<void>{await gh(c.githubKey,`/repos/${pr.repo}/pulls/${pr.number}`,'PATCH',{state:'closed'});}
