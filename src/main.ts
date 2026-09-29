import { App, ItemView, Notice, Platform, Plugin, PluginSettingTab, Scope, Setting, WorkspaceLeaf, setIcon, setTooltip } from 'obsidian';
import { closePr, discover, discoverGroup, launchPr, markMergeQueued, refreshPrs, requestReviewer, type PR } from './api';

const VIEW='linear-prs';const META='.linear-prs/metadata.json';
const MERGE_QUEUE_PATH='M3.75 4.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM3 7.75a.75.75 0 0 1 1.5 0v2.878a2.251 2.251 0 1 1-1.5 0Zm.75 5.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm5-7.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm5.75 2.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-1.5 0a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z';
type Stage='A'|'B'|'C';
type ReviewType='none'|Stage;
const stages:Stage[]=['A','B','C'];
type Metadata={version:1;reviewTypes:Record<string,ReviewType>;reviewMessage:string[];collapsed:string[];selectedRepo:string;hidden:string[];lastRefresh:string;pullRequests:PR[]};
type Settings={linearKey:string;githubKey:string;favoriteReviewers:string};
const defaults:Settings={linearKey:'',githubKey:'',favoriteReviewers:''};
const empty=():Metadata=>({version:1,reviewTypes:{},reviewMessage:[],collapsed:[],selectedRepo:'',hidden:[],lastRefresh:'',pullRequests:[]});
function message(prs:PR[]):string{return ['Some prs to review:','',...prs.map((p,i)=>`${i+1}. ${p.title} ${p.url}`)].join('\n');}
function icon(parent:HTMLElement,name:string,title?:string,cls=''):HTMLElement{const el=parent.createSpan({cls:`linear-prs-icon ${cls}`});if(name==='linear-prs-merge-queue'){el.addClass('linear-prs-merge-queue');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',MERGE_QUEUE_PATH);path.style.fill='currentColor';path.style.stroke='none';svg.appendChild(path);el.appendChild(svg);}else setIcon(el,name);if(title){el.setAttr('title',title);el.setAttr('aria-label',title);el.setAttr('role','img');}return el;}
function button(parent:HTMLElement,label:string,name:string,click:()=>void,active=false,loading?:'spin'|'pulse'):HTMLButtonElement{const b=parent.createEl('button',{cls:`linear-prs-button${active?' is-active':''}${loading?` is-loading is-${loading==='spin'?'spinning':'pulsing'}`:''}`,attr:{'aria-label':label,title:label,type:'button'}});if(loading){b.disabled=true;b.setAttr('aria-busy','true');}if(stages.includes(name as Stage)){b.setText(name);b.addClass('linear-prs-stage-button');}else setIcon(b,name);b.onclick=e=>{e.stopPropagation();click();};return b;}
function date(iso:string){const hours=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/3600000));if(hours<1)return 'opened just now';if(hours<24)return `opened ${hours} ${hours===1?'hour':'hours'} ago`;const days=Math.floor(hours/24);return `opened ${days} ${days===1?'day':'days'} ago`;}
function safeError(e:unknown){return e instanceof Error?e.message:String(e);}
async function withDeadline<T>(task:Promise<T>,milliseconds:number,label:string):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out. Try again.`)),milliseconds);})]);}
  finally{if(timer)clearTimeout(timer);}
}

export default class LinearPrsPlugin extends Plugin {
  settings:Settings=defaults;metadata:Metadata=empty();
  async onload(){
    this.settings={...defaults,...await this.loadData()};await this.loadMetadata();
    this.registerView(VIEW,leaf=>new BoardView(leaf,this));
    this.addRibbonIcon('git-pull-request','Linear PRs',()=>void this.openBoard());
    this.addCommand({id:'open-linear-prs',name:'Open Linear PRs',callback:()=>void this.openBoard()});
    this.addCommand({id:'search-pull-requests',name:'Search pull requests',callback:()=>this.app.workspace.getActiveViewOfType(BoardView)?.focusSearch()});
    this.addSettingTab(new Preferences(this.app,this));
  }
  async openBoard(){const leaf=this.app.workspace.getLeaf(true);await leaf.setViewState({type:VIEW,active:true});this.app.workspace.revealLeaf(leaf);}
  async loadMetadata(){const adapter=this.app.vault.adapter;if(await adapter.exists(META)){try{this.metadata={...empty(),...JSON.parse(await adapter.read(META))};const types=this.metadata.reviewTypes as Record<string,string>;for(const id of Object.keys(types)){if(types[id]==='review')types[id]='A';else if(types[id]==='stamp')types[id]='B';}this.metadata.collapsed=this.metadata.collapsed.map(id=>id==='queue:review'?'queue:A':id==='queue:stamp'?'queue:B':id);await this.saveMetadata();}catch(e){new Notice(`Linear PRs metadata: ${safeError(e)}`);}}}
  async saveMetadata(){const adapter=this.app.vault.adapter;if(!await adapter.exists('.linear-prs'))await adapter.mkdir('.linear-prs');await adapter.write(META,JSON.stringify(this.metadata,null,2)+'\n');}
  async saveSettings(){await this.saveData(this.settings);}
  async loadCachedMergeQueueStatus(){
    if(!this.settings.githubKey)return false;
    const snapshot=this.metadata.pullRequests;
    const stale=snapshot.filter(p=>p.mergeQueued===undefined);
    if(!stale.length)return false;
    await withDeadline(markMergeQueued(this.settings.githubKey,stale),30000,'Merge queue lookup');
    if(this.metadata.pullRequests!==snapshot)return false;
    await this.saveMetadata();return true;
  }
  async refresh(){if(!this.settings.linearKey||!this.settings.githubKey)throw new Error('Enter both API keys in Linear PRs settings.');const result=await withDeadline(discover(this.settings),90000,'Board refresh');this.metadata.pullRequests=[...result.prs,...this.metadata.pullRequests.filter(p=>this.metadata.hidden.includes(p.id)&&!result.prs.some(n=>n.id===p.id))];this.metadata.lastRefresh=new Date().toISOString();await this.saveMetadata();return result;}
  async refreshGroup(groupId:string,groupUrl:string){
    if(!this.settings.linearKey||!this.settings.githubKey)throw new Error('Enter both API keys in Linear PRs settings.');
    const previous=this.metadata.pullRequests.filter(p=>p.groupId===groupId);
    const result=await withDeadline(discoverGroup(this.settings,groupId,groupUrl,[...new Set(previous.map(p=>p.repo))],[...new Set(previous.map(p=>p.issueId).filter(Boolean))]),30000,'Group refresh');
    if(result.errors.length)throw new Error(`Group refresh failed: ${result.errors[0]}${result.errors.length>1?` (${result.errors.length} errors total)`:''}`);
    const updated=new Set(result.prs.map(p=>p.id));
    this.metadata.pullRequests=[...result.prs,...this.metadata.pullRequests.filter(p=>!updated.has(p.id)&&(p.groupId!==groupId||this.metadata.hidden.includes(p.id)))];
    await this.saveMetadata();return result;
  }
  async refreshSelectedPrs(prs:PR[]){
    if(!this.settings.githubKey)throw new Error('Enter a GitHub API key in Linear PRs settings.');
    const result=await withDeadline(refreshPrs(this.credentials(),prs),30000,'Pull request refresh');
    const selected=new Set(prs.map(p=>p.id));
    this.metadata.pullRequests=[...result,...this.metadata.pullRequests.filter(p=>!selected.has(p.id))];
    await this.saveMetadata();return result;
  }
  credentials(){return {linearKey:this.settings.linearKey,githubKey:this.settings.githubKey};}
}
class Preferences extends PluginSettingTab {
  constructor(app:App,private plugin:LinearPrsPlugin){super(app,plugin);}
  display(){const c=this.containerEl;c.empty();c.createEl('h2',{text:'Linear PRs'});
    new Setting(c).setName('Linear API key').setDesc('Personal API key for your Linear account.').addText(t=>{t.setPlaceholder('lin_api_…').setValue(this.plugin.settings.linearKey).onChange(async v=>{this.plugin.settings.linearKey=v.trim();await this.plugin.saveSettings();});t.inputEl.type='password';});
    new Setting(c).setName('GitHub API key').setDesc('Personal access token with access to the linked repositories.').addText(t=>{t.setPlaceholder('github_pat_…').setValue(this.plugin.settings.githubKey).onChange(async v=>{this.plugin.settings.githubKey=v.trim();await this.plugin.saveSettings();});t.inputEl.type='password';});
    new Setting(c).setName('Favorite reviewers').setDesc('Comma separated GitHub usernames shown in group actions.').addText(t=>t.setPlaceholder('alice,bob').setValue(this.plugin.settings.favoriteReviewers).onChange(async v=>{this.plugin.settings.favoriteReviewers=v;await this.plugin.saveSettings();}));
    c.createEl('p',{text:'Keys are saved in Obsidian plugin settings; board tracking is saved to .linear-prs/metadata.json in this vault.',cls:'setting-item-description'});
  }
}
class BoardView extends ItemView {
  private busy=false;private archived=false;private search='';private searchInput:HTMLInputElement|null=null;private launching=new Set<string>();private refreshingGroups=new Set<string>();
  constructor(leaf:WorkspaceLeaf,private plugin:LinearPrsPlugin){super(leaf);}
  getViewType(){return VIEW;}getDisplayText(){return 'Linear PRs';}getIcon(){return 'git-pull-request';}
  async onOpen(){this.scope=new Scope(this.app.scope);this.scope.register([Platform.isMacOS?'Meta':'Ctrl'],'f',event=>{event.preventDefault();this.focusSearch();});this.render();if(!this.plugin.metadata.lastRefresh&&this.plugin.settings.linearKey&&this.plugin.settings.githubKey)void this.refresh();else void this.plugin.loadCachedMergeQueueStatus().then(changed=>{if(changed)this.render();}).catch(e=>new Notice(safeError(e),8000));}
  focusSearch(){this.searchInput?.focus();this.searchInput?.select();}
  private async act(fn:()=>Promise<void>,success:string){try{await fn();new Notice(success);this.render();}catch(e){new Notice(safeError(e),8000);}}
  private async refresh(){if(this.busy||this.refreshingGroups.size)return;this.busy=true;this.render();try{const r=await this.plugin.refresh();new Notice(`Linear PRs: ${r.prs.length} open PRs${r.errors.length?`, ${r.errors.length} lookup errors`:''}`);if(r.errors.length)console.warn('Linear PR lookup errors',r.errors);}catch(e){new Notice(safeError(e),8000);}finally{this.busy=false;this.render();}}
  private async refreshGroup(id:string,url:string,title:string){if(this.busy||this.refreshingGroups.size)return;this.refreshingGroups.add(id);this.render();try{const r=await this.plugin.refreshGroup(id,url);new Notice(`${title}: refreshed ${r.prs.length} PRs`);}catch(e){new Notice(safeError(e),8000);}finally{this.refreshingGroups.delete(id);this.render();}}
  private async refreshQueue(type:Stage,title:string){
    if(this.busy||this.refreshingGroups.size)return;
    const key=`queue:${type}`;
    const m=this.plugin.metadata;
    const prs=m.pullRequests.filter(p=>!m.hidden.includes(p.id)&&m.reviewTypes[p.id]===type);
    this.refreshingGroups.add(key);this.render();
    try{const result=await this.plugin.refreshSelectedPrs(prs);new Notice(`${title}: refreshed ${result.length} PRs`);}
    catch(e){new Notice(safeError(e),8000);}
    finally{this.refreshingGroups.delete(key);this.render();}
  }
  private rememberCollapse(details:HTMLDetailsElement,id:string){
    const m=this.plugin.metadata;
    details.open=!m.collapsed.includes(id);
    let lastOpen=details.open;
    details.ontoggle=()=>{
      if(!details.isConnected||details.open===lastOpen)return;
      lastOpen=details.open;
      m.collapsed=details.open?m.collapsed.filter(x=>x!==id):[...new Set([...m.collapsed,id])];
      void this.plugin.saveMetadata();
    };
  }
  private visible():PR[]{const m=this.plugin.metadata;const query=this.search.trim().toLocaleLowerCase();return m.pullRequests.filter(p=>this.archived?m.hidden.includes(p.id):!m.hidden.includes(p.id)).filter(p=>!m.selectedRepo||p.repo===m.selectedRepo).filter(p=>!query||[p.title,p.repo,String(p.number),p.id,p.issueTitle,p.issueUrl,p.groupTitle].some(value=>value?.toLocaleLowerCase().includes(query))).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());}
  private queue(prs:PR[],title:string,type:Stage,parent:HTMLElement){
    const details=parent.createEl('details',{cls:'linear-prs-group'});this.rememberCollapse(details,`queue:${type}`);
    const summary=details.createEl('summary',{cls:'linear-prs-group-header'});icon(summary,'chevron-down',undefined,'linear-prs-chevron');summary.createSpan({text:title,cls:'linear-prs-group-title'});
    const tools=summary.createSpan({cls:'linear-prs-actions'});tools.createSpan({text:String(prs.length),cls:'linear-prs-count'});
    const key=`queue:${type}`;const refresh=button(tools,`Refresh ${title}`,'refresh-cw',()=>void this.refreshQueue(type,title),false,this.refreshingGroups.has(key)?'spin':undefined);if(this.busy||(this.refreshingGroups.size&&!this.refreshingGroups.has(key)))refresh.disabled=true;
    button(tools,`Copy ${title}`,'copy',()=>void this.copy(message(prs)));button(tools,`Launch ${title}`,'rocket',()=>void this.launchMany(prs),false,this.isLaunching(prs)?'pulse':undefined);
    const list=details.createDiv({cls:'linear-prs-list'});if(!prs.length)list.createDiv({text:`No pull requests in ${title}`,cls:'linear-prs-empty'});else prs.forEach(p=>this.row(p,list));
  }
  private async copy(text:string){try{await navigator.clipboard.writeText(text);new Notice('Copied pull requests');}catch(e){new Notice(safeError(e));}}
  private async track(type:ReviewType,prs:PR[]){prs.forEach(p=>this.plugin.metadata.reviewTypes[p.id]=type);await this.plugin.saveMetadata();this.render();}
  private launchKey(prs:PR[]):string{return prs.map(p=>p.id).sort().join('\u001f');}
  private isLaunching(prs:PR[]):boolean{return this.launching.has(this.launchKey(prs));}
  private async launchMany(prs:PR[]){if(!prs.length)return;const key=this.launchKey(prs);if(this.launching.has(key))return;this.launching.add(key);this.render();let launched=0;let readyOnly=0;const errors:string[]=[];try{for(const p of prs){try{const result=await launchPr(this.plugin.credentials(),p);p.draft=!result.readyForReview;p.automerge=result.automergeEnabled;if(result.automergeEnabled)launched++;else{readyOnly++;errors.push(`${p.repo}#${p.number}: ${result.error??'Ready for review, but auto-merge is disabled.'}`);}}catch(e){errors.push(`${p.repo}#${p.number}: ${safeError(e)}`);}}await this.plugin.saveMetadata();const summary=`Launched ${launched}/${prs.length} PRs${readyOnly?`; ${readyOnly} ready without auto-merge`:''}${errors.length?`. ${errors.join('; ')}`:''}`;new Notice(summary,errors.length?10000:4000);}catch(e){new Notice(safeError(e),8000);}finally{this.launching.delete(key);this.render();}}
  private reviewBlock(parent:HTMLElement){
    const m=this.plugin.metadata;const items=m.reviewMessage.map(id=>m.pullRequests.find(p=>p.id===id)).filter((p):p is PR=>!!p);if(!items.length)return;
    const block=parent.createDiv({cls:'linear-prs-review-block'});block.createEl('pre',{text:message(items)});const actions=block.createDiv({cls:'linear-prs-actions'});
    for(const stage of stages)button(actions,`Move all to Staging ${stage}`,stage,()=>void this.act(async()=>{await this.track(stage,items);m.reviewMessage=[];await this.plugin.saveMetadata();},`Moved to Staging ${stage}`));
    button(actions,'Launch review PRs','rocket',()=>void this.launchMany(items),false,this.isLaunching(items)?'pulse':undefined);button(actions,'Copy review message','copy',()=>void this.copy(message(items)));
    button(actions,'Clear review message','trash-2',()=>void this.act(async()=>{m.reviewMessage=[];await this.plugin.saveMetadata();},'Cleared review message'));
  }
  private row(p:PR,parent:HTMLElement){
    const m=this.plugin.metadata;const row=parent.createDiv({cls:'linear-prs-row'});const top=row.createDiv({cls:'linear-prs-row-top'});
    const link=top.createEl('a',{href:p.url,cls:'linear-prs-title'});link.setAttr('target','_blank');icon(link,p.mergeQueued?'linear-prs-merge-queue':p.draft?'git-pull-request-draft':'git-pull-request',p.mergeQueued?'In merge queue':p.draft?'draft':'open',p.mergeQueued?'orange':p.draft?'dim':'good');link.createSpan({text:p.title,cls:'linear-prs-title-text'});
    const controls=top.createSpan({cls:'linear-prs-actions linear-prs-controls'});const remove=controls.createSpan({cls:'linear-prs-control-set'});
    button(remove,'Close and remove pull request','trash-2',()=>void this.act(async()=>{await closePr(this.plugin.credentials(),p);m.hidden.push(p.id);await this.plugin.saveMetadata();},'Closed and removed PR'));
    const review=controls.createSpan({cls:'linear-prs-control-set'});
    button(review,'Add to review message','copy',()=>void this.act(async()=>{if(!m.reviewMessage.includes(p.id))m.reviewMessage.push(p.id);await this.plugin.saveMetadata();await navigator.clipboard.writeText(message(m.reviewMessage.map(id=>m.pullRequests.find(x=>x.id===id)).filter((x):x is PR=>!!x)));},'Added to review message'));
    for(const stage of stages)button(review,`Staging ${stage}`,stage,()=>void this.act(()=>this.track(m.reviewTypes[p.id]===stage?'none':stage,[p]),'Updated staging'),m.reviewTypes[p.id]===stage);
    const badges=controls.createSpan({cls:'linear-prs-control-set linear-prs-badges'});
    icon(badges,'message-square',p.comments?'Pull request has comments':'Pull request has no comments',p.comments?'orange':'dim');
    const reviewerTone=p.reviewers.some(r=>r.status==='approved')?'good':p.reviewers.some(r=>r.status==='dismissed')?'orange':'dim';
    icon(badges,'user',p.reviewers.length?p.reviewers.map(r=>`${r.login}: ${r.status}`).join(', '):'No reviewers assigned',reviewerTone);
    icon(badges,'git-merge',p.automerge?'Automerge enabled':'Automerge disabled',p.automerge?'good':'dim');
    const failed=p.checks.filter(c=>c.status==='failure');const pending=p.checks.filter(c=>c.status==='pending');
    const checkStatus=p.conflicts||failed.length?'bad':pending.length?'dim':'good';
    const reasons=[...(p.conflicts?['Merge conflicts with the base branch']:[]),...failed.slice(0,8).map(c=>`${c.name}${c.detail?`: ${c.detail}`:''}`)];
    if(failed.length>8)reasons.push(`And ${failed.length-8} more failing checks`);
    const checkTitle=checkStatus==='bad'?`Why this PR is failing:\n${reasons.join('\n')}`:checkStatus==='dim'?`Checks pending:\n${pending.map(c=>c.name).join('\n')}`:p.checks.length?'All checks passing':'No checks reported';
    const checkBadge=icon(badges,checkStatus==='bad'?'circle-x':checkStatus==='dim'?'loader-circle':'circle-check',undefined,checkStatus);checkBadge.setAttr('role','img');checkBadge.setAttr('aria-label',checkTitle);setTooltip(checkBadge,checkTitle,{placement:'top',classes:['linear-prs-check-tooltip']});
    const meta=row.createDiv({cls:'linear-prs-meta'});const refs=meta.createSpan({cls:'linear-prs-meta-link'});if(p.issueTitle&&p.issueUrl){const issue=refs.createEl('a',{text:p.issueTitle,href:p.issueUrl,cls:'linear-prs-issue-title'});issue.setAttr('target','_blank');issue.setAttr('title',p.issueTitle);}const a=refs.createEl('a',{href:p.url,cls:'linear-prs-meta-link'});a.setAttr('target','_blank');a.createSpan({text:p.repo,cls:'linear-prs-pill'});a.createSpan({text:`#${p.number}`,cls:'linear-prs-pill'});meta.createSpan({text:date(p.createdAt),cls:'linear-prs-date'});
  }
  private group(prs:PR[],id:string,title:string,url:string,parent:HTMLElement){
    const details=parent.createEl('details',{cls:'linear-prs-group'});this.rememberCollapse(details,id);
    const summary=details.createEl('summary',{cls:'linear-prs-group-header'});icon(summary,'chevron-down',undefined,'linear-prs-chevron');
    if(url){const titleLink=summary.createEl('a',{text:title,href:url,cls:'linear-prs-group-title'});titleLink.setAttr('target','_blank');titleLink.onclick=e=>e.stopPropagation();}else summary.createSpan({text:title,cls:'linear-prs-group-title'});
    const actions=summary.createSpan({cls:'linear-prs-actions'});actions.createSpan({text:String(prs.length),cls:'linear-prs-count'});const refresh=button(actions,`Refresh ${title}`,'refresh-cw',()=>void this.refreshGroup(id,url,title),false,this.refreshingGroups.has(id)?'spin':undefined);if(this.busy||(this.refreshingGroups.size&&!this.refreshingGroups.has(id)))refresh.disabled=true;button(actions,'Copy group PRs','copy',()=>void this.copy(message(prs)));button(actions,'Launch group PRs','rocket',()=>void this.launchMany(prs),false,this.isLaunching(prs)?'pulse':undefined);
    const reviewers=this.plugin.settings.favoriteReviewers.split(',').map(s=>s.trim()).filter(Boolean);
    if(reviewers.length){const select=actions.createEl('select',{cls:'linear-prs-reviewer-select',attr:{'aria-label':'Assign reviewer to group PRs'}});select.createEl('option',{text:'Reviewer',value:''});for(const login of reviewers)select.createEl('option',{text:login,value:login});select.onclick=e=>e.stopPropagation();select.onchange=()=>{const login=select.value;if(!login)return;void this.act(async()=>{for(const p of prs)await requestReviewer(this.plugin.credentials(),p,login);},`Requested ${login} for ${prs.length} PRs`);select.value='';};}
    const list=details.createDiv({cls:'linear-prs-list'});prs.forEach(p=>this.row(p,list));
  }
  private render(){
    const root=this.containerEl.children[1] as HTMLElement;root.empty();root.addClass('linear-prs');const m=this.plugin.metadata;
    const shell=root.createDiv({cls:'linear-prs-shell'});const header=shell.createDiv({cls:'linear-prs-header'});const right=header.createSpan({cls:'linear-prs-toolbar'});
    const repos=[...new Set(m.pullRequests.map(p=>p.repo))].sort();if(repos.length){const filter=right.createSpan({cls:'linear-prs-repository-filter'});icon(filter,'folder-git-2');const sel=filter.createEl('select',{attr:{'aria-label':'Filter repository'}});sel.createEl('option',{text:'All repositories',value:''});repos.forEach(r=>sel.createEl('option',{text:r,value:r}));sel.value=m.selectedRepo;sel.onchange=()=>{m.selectedRepo=sel.value;void this.plugin.saveMetadata();this.render();};}
    const shortcutLabel=Platform.isMacOS?'⌘F':'Ctrl+F';const search=right.createEl('input',{cls:'linear-prs-search',attr:{type:'search',placeholder:'Search pull requests…','aria-label':'Search pull requests',title:`Search pull requests (${shortcutLabel})`}});search.value=this.search;this.searchInput=search;search.oninput=()=>{this.search=search.value;const start=search.selectionStart;this.render();this.searchInput?.focus();this.searchInput?.setSelectionRange(start,start);};search.onkeydown=event=>{if(event.key==='Escape'&&search.value){event.stopPropagation();this.search='';this.render();this.searchInput?.focus();}};
    button(right,'Archived pull requests','archive',()=>{this.archived=!this.archived;this.render();},this.archived);const refresh=button(right,'Refresh from Linear and GitHub','refresh-cw',()=>void this.refresh(),false,this.busy?'spin':undefined);if(this.refreshingGroups.size)refresh.disabled=true;
    if(!this.plugin.settings.linearKey||!this.plugin.settings.githubKey)shell.createDiv({text:'Add a Linear API key and GitHub API key in Linear PRs settings, then refresh.',cls:'linear-prs-empty'});
    this.reviewBlock(shell);const all=this.visible();if(!this.archived){for(const stage of stages)this.queue(all.filter(p=>m.reviewTypes[p.id]===stage),`Staging ${stage}`,stage,shell);}
    shell.createEl('h2',{text:this.archived?'Archived pull requests':'Pull requests',cls:'linear-prs-section-title'});const normal=this.archived?all:all.filter(p=>(m.reviewTypes[p.id]??'none')==='none');const groups=new Map<string,PR[]>();for(const p of normal.filter(p=>p.groupId!=='unlinked')){const arr=groups.get(p.groupId)??[];arr.push(p);groups.set(p.groupId,arr);}for(const prs of groups.values()){const p=prs[0];this.group(prs,p.groupId,p.groupTitle.replace(/^[A-Z]+-\d+\s+/,''),p.groupUrl,shell);}if(!groups.size)shell.createDiv({text:'No pull requests associated with Linear tasks',cls:'linear-prs-empty'});
    const unlinked=normal.filter(p=>p.groupId==='unlinked');const unlinkedDetails=shell.createEl('details',{cls:'linear-prs-group linear-prs-unlinked-group'});this.rememberCollapse(unlinkedDetails,'section:unlinked');const unlinkedSummary=unlinkedDetails.createEl('summary',{cls:'linear-prs-group-header'});icon(unlinkedSummary,'chevron-down',undefined,'linear-prs-chevron');unlinkedSummary.createSpan({text:'Pull requests without Linear tasks',cls:'linear-prs-group-title'});unlinkedSummary.createSpan({text:String(unlinked.length),cls:'linear-prs-count'});const list=unlinkedDetails.createDiv({cls:'linear-prs-unlinked-list'});if(unlinked.length)unlinked.forEach(p=>this.row(p,list));else list.createDiv({text:'No pull requests without Linear tasks',cls:'linear-prs-empty'});
  }
}
