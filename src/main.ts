import { App, ItemView, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { closePr, discover, launchPr, requestReviewer, type PR } from './api';

const VIEW='linear-prs';const META='.linear-prs/metadata.json';
type ReviewType='none'|'review'|'stamp';
type Metadata={version:1;reviewTypes:Record<string,ReviewType>;reviewMessage:string[];collapsed:string[];selectedRepo:string;hidden:string[];lastRefresh:string;pullRequests:PR[]};
type Settings={linearKey:string;githubKey:string;favoriteReviewers:string};
const defaults:Settings={linearKey:'',githubKey:'',favoriteReviewers:''};
const empty=():Metadata=>({version:1,reviewTypes:{},reviewMessage:[],collapsed:[],selectedRepo:'',hidden:[],lastRefresh:'',pullRequests:[]});
function message(prs:PR[]):string{return ['Some prs to review:','',...prs.map((p,i)=>`${i+1}. ${p.title} ${p.url}`)].join('\n');}
function button(parent:HTMLElement,label:string,icon:string,click:()=>void,active=false):HTMLButtonElement{const b=parent.createEl('button',{cls:`linear-prs-button${active?' is-active':''}`,attr:{'aria-label':label,title:label}});b.setText(icon);b.onclick=e=>{e.stopPropagation();click();};return b;}
function date(iso:string){const days=Math.floor((Date.now()-new Date(iso).getTime())/86400000);return days<1?'today':days===1?'1d ago':`${days}d ago`;}
function safeError(e:unknown){return e instanceof Error?e.message:String(e);}

export default class LinearPrsPlugin extends Plugin {
  settings:Settings=defaults;metadata:Metadata=empty();
  async onload(){
    this.settings={...defaults,...await this.loadData()};await this.loadMetadata();
    this.registerView(VIEW,leaf=>new BoardView(leaf,this));
    this.addRibbonIcon('git-pull-request','Linear PRs',()=>void this.openBoard());
    this.addCommand({id:'open-linear-prs',name:'Open Linear PRs',callback:()=>void this.openBoard()});
    this.addSettingTab(new Preferences(this.app,this));
  }
  async openBoard(){const leaf=this.app.workspace.getLeaf(true);await leaf.setViewState({type:VIEW,active:true});this.app.workspace.revealLeaf(leaf);}
  async loadMetadata(){const adapter=this.app.vault.adapter;if(await adapter.exists(META)){try{this.metadata={...empty(),...JSON.parse(await adapter.read(META))};}catch(e){new Notice(`Linear PRs metadata: ${safeError(e)}`);}}}
  async saveMetadata(){const adapter=this.app.vault.adapter;if(!await adapter.exists('.linear-prs'))await adapter.mkdir('.linear-prs');await adapter.write(META,JSON.stringify(this.metadata,null,2)+'\n');}
  async saveSettings(){await this.saveData(this.settings);}
  async refresh(){if(!this.settings.linearKey||!this.settings.githubKey)throw new Error('Enter both API keys in Linear PRs settings.');const result=await discover(this.settings);this.metadata.pullRequests=[...result.prs,...this.metadata.pullRequests.filter(p=>this.metadata.hidden.includes(p.id)&&!result.prs.some(n=>n.id===p.id))];this.metadata.lastRefresh=new Date().toISOString();await this.saveMetadata();return result;}
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
  private busy=false;private archived=false;
  constructor(leaf:WorkspaceLeaf,private plugin:LinearPrsPlugin){super(leaf);}
  getViewType(){return VIEW;}getDisplayText(){return 'Linear PRs';}getIcon(){return 'git-pull-request';}
  async onOpen(){this.render();if(this.plugin.settings.linearKey&&this.plugin.settings.githubKey)void this.refresh();}
  private async act(fn:()=>Promise<void>,success:string){try{await fn();new Notice(success);this.render();}catch(e){new Notice(safeError(e),8000);}}
  private async refresh(){if(this.busy)return;this.busy=true;this.render();try{const r=await this.plugin.refresh();new Notice(`Linear PRs: ${r.prs.length} open PRs${r.errors.length?`, ${r.errors.length} lookup errors`:''}`);if(r.errors.length)console.warn('Linear PR lookup errors',r.errors);}catch(e){new Notice(safeError(e),8000);}finally{this.busy=false;this.render();}}
  private visible():PR[]{const m=this.plugin.metadata;return m.pullRequests.filter(p=>this.archived?m.hidden.includes(p.id):!m.hidden.includes(p.id)).filter(p=>!m.selectedRepo||p.repo===m.selectedRepo).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());}
  private queue(prs:PR[],title:string,parent:HTMLElement){const details=parent.createEl('details',{cls:'linear-prs-group'});details.open=true;const summary=details.createEl('summary');summary.createSpan({text:title,cls:'linear-prs-group-title'});const tools=summary.createSpan({cls:'linear-prs-actions'});tools.createSpan({text:String(prs.length),cls:'linear-prs-count'});button(tools,`Copy ${title}`,'⧉',()=>void this.copy(message(prs)));button(tools,`Launch ${title}`,'➤',()=>void this.launchMany(prs));const list=details.createDiv({cls:'linear-prs-list'});if(!prs.length)list.createDiv({text:title==='PRs in Review'?'No pull requests in review':'No pull requests to stamp',cls:'linear-prs-empty'});else prs.forEach(p=>this.row(p,list));}
  private async copy(text:string){try{await navigator.clipboard.writeText(text);new Notice('Copied pull requests');}catch(e){new Notice(safeError(e));}}
  private async track(type:ReviewType,prs:PR[]){prs.forEach(p=>this.plugin.metadata.reviewTypes[p.id]=type);await this.plugin.saveMetadata();this.render();}
  private async launchMany(prs:PR[]){if(!prs.length)return;let done=0;const errors:string[]=[];for(const p of prs){try{await launchPr(this.plugin.credentials(),p);p.draft=false;p.automerge=true;done++;}catch(e){errors.push(`${p.repo}#${p.number}: ${safeError(e)}`);}}await this.plugin.saveMetadata();this.render();new Notice(`Launched ${done}/${prs.length} PRs${errors.length?`. ${errors.join('; ')}`:''}`,errors.length?10000:4000);}
  private reviewBlock(parent:HTMLElement){const m=this.plugin.metadata;const items=m.reviewMessage.map(id=>m.pullRequests.find(p=>p.id===id)).filter((p):p is PR=>!!p);if(!items.length)return;const block=parent.createDiv({cls:'linear-prs-review-block'});block.createEl('pre',{text:message(items)});const actions=block.createDiv({cls:'linear-prs-actions'});button(actions,'Mark all as please stamp','▣',()=>void this.act(async()=>{await this.track('stamp',items);m.reviewMessage=[];await this.plugin.saveMetadata();},'Moved to stamp'));button(actions,'Mark all as please review','◉',()=>void this.act(async()=>{await this.track('review',items);m.reviewMessage=[];await this.plugin.saveMetadata();},'Moved to review'));button(actions,'Launch review PRs','➤',()=>void this.launchMany(items));button(actions,'Copy review message','⧉',()=>void this.copy(message(items)));button(actions,'Clear review message','⌫',()=>void this.act(async()=>{m.reviewMessage=[];await this.plugin.saveMetadata();},'Cleared review message'));}
  private row(p:PR,parent:HTMLElement){const m=this.plugin.metadata;const row=parent.createDiv({cls:'linear-prs-row'});const top=row.createDiv({cls:'linear-prs-row-top'});const link=top.createEl('a',{text:p.title,href:p.url,cls:'linear-prs-title'});link.setAttr('target','_blank');link.textContent=(p.draft?'◌ ':'◉ ')+p.title;const controls=top.createSpan({cls:'linear-prs-actions'});
    button(controls,'Close and remove pull request','⌫',()=>void this.act(async()=>{await closePr(this.plugin.credentials(),p);m.hidden.push(p.id);await this.plugin.saveMetadata();},'Closed and removed PR'));
    button(controls,'Add to review message','⧉',()=>void this.act(async()=>{if(!m.reviewMessage.includes(p.id))m.reviewMessage.push(p.id);await this.plugin.saveMetadata();await navigator.clipboard.writeText(message(m.reviewMessage.map(id=>m.pullRequests.find(x=>x.id===id)).filter((x):x is PR=>!!x)));},'Added to review message'));
    button(controls,'Please stamp','▣',()=>void this.act(()=>this.track(m.reviewTypes[p.id]==='stamp'?'none':'stamp',[p]),'Updated review type'),m.reviewTypes[p.id]==='stamp');
    button(controls,'Please review','◉',()=>void this.act(()=>this.track(m.reviewTypes[p.id]==='review'?'none':'review',[p]),'Updated review type'),m.reviewTypes[p.id]==='review');
    const badges=top.createSpan({cls:'linear-prs-badges'});const badge=(text:string,title:string,cls='')=>{const b=badges.createSpan({text,cls:`linear-prs-badge ${cls}`});b.setAttr('title',title);};
    badge('▤',p.comments?'Pull request has comments':'Pull request has no comments',p.comments?'warn':'dim');
    badge('♟',p.reviewers.length?p.reviewers.map(r=>`${r.login}: ${r.status}`).join(', '):'No reviewers assigned',p.reviewers.length&&p.reviewers.every(r=>r.status==='approved')?'good':'dim');
    badge('◆',p.automerge?'Automerge enabled':'Automerge disabled',p.automerge?'good':'dim');
    const checkTitle=[p.conflicts?'Merge conflicts':'',...p.checks.map(c=>`${c.name}: ${c.status}`)].filter(Boolean).join(', ')||'No checks';
    badge(p.conflicts||p.checks.some(c=>c.status==='failure')?'⊗':p.checks.some(c=>c.status==='pending')?'◌':'✓',checkTitle,p.conflicts||p.checks.some(c=>c.status==='failure')?'bad':p.checks.some(c=>c.status==='pending')?'dim':'good');
    const meta=row.createDiv({cls:'linear-prs-meta'});const a=meta.createEl('a',{href:p.url});a.setAttr('target','_blank');a.createSpan({text:p.repo,cls:'linear-prs-pill'});a.createSpan({text:`#${p.number}`,cls:'linear-prs-pill'});meta.createSpan({text:date(p.createdAt)});
  }
  private group(prs:PR[],id:string,title:string,url:string,parent:HTMLElement){const m=this.plugin.metadata;const details=parent.createEl('details',{cls:'linear-prs-group'});details.open=!m.collapsed.includes(id);const summary=details.createEl('summary');const titleLink=summary.createEl('a',{text:title,href:url,cls:'linear-prs-group-title'});titleLink.setAttr('target','_blank');titleLink.onclick=e=>e.stopPropagation();const actions=summary.createSpan({cls:'linear-prs-actions'});actions.createSpan({text:String(prs.length),cls:'linear-prs-count'});button(actions,'Launch group PRs','➤',()=>void this.launchMany(prs));const reviewers=this.plugin.settings.favoriteReviewers.split(',').map(s=>s.trim()).filter(Boolean);if(reviewers.length){const select=actions.createEl('select',{attr:{'aria-label':'Assign reviewer to group PRs'}});select.createEl('option',{text:'♟',value:''});for(const login of reviewers)select.createEl('option',{text:login,value:login});select.onclick=e=>e.stopPropagation();select.onchange=()=>{const login=select.value;if(!login)return;void this.act(async()=>{for(const p of prs)await requestReviewer(this.plugin.credentials(),p,login);},`Requested ${login} for ${prs.length} PRs`);select.value='';};}
    details.ontoggle=()=>{m.collapsed=details.open?m.collapsed.filter(x=>x!==id):[...new Set([...m.collapsed,id])];void this.plugin.saveMetadata();};const list=details.createDiv({cls:'linear-prs-list'});prs.forEach(p=>this.row(p,list));}
  private render(){const root=this.containerEl.children[1] as HTMLElement;root.empty();root.addClass('linear-prs');const m=this.plugin.metadata;const header=root.createDiv({cls:'linear-prs-header'});header.createEl('h2',{text:'code'});const right=header.createSpan({cls:'linear-prs-actions'});const repos=[...new Set(m.pullRequests.map(p=>p.repo))].sort();if(repos.length){const sel=right.createEl('select',{attr:{'aria-label':'Filter repository'}});sel.createEl('option',{text:'All repositories',value:''});repos.forEach(r=>sel.createEl('option',{text:r,value:r}));sel.value=m.selectedRepo;sel.onchange=()=>{m.selectedRepo=sel.value;void this.plugin.saveMetadata();this.render();};}button(right,'Archived pull requests','▤',()=>{this.archived=!this.archived;this.render();},this.archived);button(right,'Refresh from Linear and GitHub',this.busy?'◌':'↻',()=>void this.refresh());
    if(!this.plugin.settings.linearKey||!this.plugin.settings.githubKey)root.createDiv({text:'Add a Linear API key and GitHub API key in Linear PRs settings, then refresh.',cls:'linear-prs-empty'});
    if(m.lastRefresh)root.createDiv({text:`Updated ${new Date(m.lastRefresh).toLocaleString()}`,cls:'linear-prs-updated'});
    const all=this.visible();this.reviewBlock(root);if(!this.archived){this.queue(all.filter(p=>m.reviewTypes[p.id]==='review'),'PRs in Review',root);this.queue(all.filter(p=>m.reviewTypes[p.id]==='stamp'),'PRs To Be Stamped',root);}
    const h=root.createEl('h3',{text:'Pull requests'});h.addClass('linear-prs-section-title');if(this.archived)h.setText('Archived pull requests');const normal=this.archived?all:all.filter(p=>(m.reviewTypes[p.id]??'none')==='none');const groups=new Map<string,PR[]>();for(const p of normal){const arr=groups.get(p.groupId)??[];arr.push(p);groups.set(p.groupId,arr);}for(const prs of groups.values()){const p=prs[0];this.group(prs,p.groupId,p.groupTitle,p.groupUrl,root);}if(!normal.length)root.createDiv({text:'No pull requests',cls:'linear-prs-empty'});
  }
}
