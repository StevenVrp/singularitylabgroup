import {lengthCalibration,overlay,events} from './lib/instruments.mjs';
import {labs} from './lib/registry.mjs';
import {chapters,connections} from './lib/curriculum.mjs';
import {icon} from './lib/icons.mjs';
import {sample,number,escape as e,colors,drawPlot} from './lib/plot.mjs';
import math from './lib/math.mjs';
const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
const get=(key,otherwise)=>{try{return JSON.parse(localStorage.getItem('atlas.'+key))??otherwise}catch{return otherwise}};
function save(key,value){try{localStorage.setItem('atlas.'+key,JSON.stringify(value))}catch{notify('Browser storage is unavailable. This session is still active.')}}
const byId=new Map(labs.map(l=>[l.id,l]));
const defaults=l=>Object.fromEntries(l.params.map(p=>[p.key,p.value]));
const opt=(v,selected,label=v)=>'<option value="'+e(v)+'" '+(v===selected?'selected':'')+'>'+e(label)+'</option>';
const button=(action,ico,title,cls='iconbtn',extra='')=>'<button class="'+cls+'" data-action="'+action+'" aria-label="'+e(title)+'" title="'+e(title)+'" '+extra+'>'+icon(ico,16)+'</button>';
const named=(action,label,ico,cls='outline',extra='')=>'<button class="'+cls+'" data-action="'+action+'" '+extra+'>'+ (ico?icon(ico,15):'')+e(label)+'</button>';
const tab=(target,on,group,label,ico)=>'<button data-'+group+'="'+target+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+(ico?icon(ico,14):'')+e(label)+'</button>';
let favorites=get('favorites',[]),done=get('completed',[]),recent=get('recent',[]),notes=get('notes',[]),light=get('light',false);
let lab,params,mode,config,model,data,time=0,playing=false,rate=1,baseRate=1,view='2D',expanded=new Set(),currentPanel='controls',analysis='graphs',graphKeys=[],graphRange=[],cursor=null,graphArea=false;
let camera,canvasZoom=1,canvasPan=[0,0],markTime=null,showPath=true,showVectors=true,focus=null,liveFocus=null,challengeIdx=0,hintCount=0,solutionOpen=false,answerFeedback='',attempt='',reverse=null,savedObservations=[],modalType='',toastTimer,drag=null,foldInspector=false,foldGraphs=false,graphRaf=0;
let instrument=null,points=[];
const initialCamera=()=>({yaw:-.48,pitch:.55});
const idFromHash=()=>decodeURIComponent(location.hash.slice(1)).split('/')[0];
const labOf=()=>byId.get(idFromHash())||byId.get('orbit');
function notify(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2400)}
const pageTitle=()=>document.title=lab.title+' · Physics Atlas';
function openLab(id,restore){
 const next=byId.get(id);if(!next)return;
 if($('#dialog').open)$('#dialog').close();
 lab=next;params=defaults(lab);mode=lab.modes?.[0]||'';config={...lab.defaultConfig};
 if(restore){Object.assign(params,restore.params);if(lab.modes?.includes(restore.mode))mode=restore.mode;Object.assign(config,restore.config)}
 instrument=null;points=[];view=restore?.view||(lab.spatial&&lab.id!=='projectile'?'3D':'2D');camera=initialCamera();canvasZoom=1;canvasPan=[0,0];playing=false;rate=1;currentPanel='controls';analysis='graphs';focus=null;liveFocus=null;
 showPath=true;showVectors=true;graphKeys=[lab.series[0].key];if(lab.id==='shm')graphKeys=lab.series.map(s=>s.key);
 expanded=new Set([lab.module]);challengeIdx=hintCount=0;solutionOpen=false;answerFeedback=attempt='';reverse=null;savedObservations=[];markTime=null;foldInspector=foldGraphs=false;
 rebuild(restore?.fraction??(lab.id==='orbit'?.29:lab.id==='projectile'?.32:0));pageTitle();
 recent=[lab.id,...recent.filter(x=>x!==lab.id)].slice(0,12);save('recent',recent);document.body.classList.remove('rail-open');
 if(location.hash!=='#'+id)history.pushState(null,'','#'+id);
 header();rail();shell();window.scrollTo({top:0,behavior:'instant'});
}
function rebuild(fraction=0){
 try{model=lab.build(params,mode,config);if(!(model.duration>0))throw Error('The model has no positive run interval.')}
 catch(err){model={invalid:true,warning:err.message,duration:1,at:()=>({})}}
 data=model.invalid?[]:sample(model,320);time=Math.max(0,Math.min(1,fraction))*model.duration;graphRange=[0,model.duration];cursor=null;
 baseRate=model.duration>90?model.duration/24:model.duration<2?model.duration/6:1;
}
function header(){
 document.body.classList.toggle('light',light);
 $('#header').innerHTML=button('rail','panel','Toggle curriculum','iconbtn bare mobile-only')+'<button class="brand" data-action="home" aria-label="Physics Atlas home"><img src="./mark.svg" alt="">PHYSICS ATLAS</button><nav class="toplinks" aria-label="Workspace navigation">'+[['workspace','flask','Laboratory'],['catalog','book','Curriculum'],['notebook','note','Notebook']].map(([a,i,l])=>'<button class="toplink '+((modalType===a||(!modalType&&a==='workspace'))?'active':'')+'" aria-label="'+e(l)+'" data-action="'+a+'">'+icon(i,16)+'<span>'+l+'</span></button>').join('')+'</nav><div class="top-right">'+button('theme',light?'moon':'sun','Switch to '+(light?'dark':'light')+' mode','iconbtn bare')+'<span class="avatar" aria-label="Steven’s workspace">SH</span></div>';
}
function rail(){
 $('#sidebar').innerHTML='<div class="rail-head"><strong>Curriculum</strong>'+button('rail','panel','Collapse curriculum','iconbtn bare')+'</div><button class="find" data-action="search">'+icon('search',15)+'Find experiment<kbd>/</kbd></button><div class="rail-label eyebrow">Physics modules</div>'+
 chapters.map(([name,ico],i)=>{const n=i+1,open=expanded.has(n);return '<button class="chapter-button '+(lab.module===n?'current':'')+'" data-chapter="'+n+'" aria-expanded="'+open+'">'+icon(ico,17)+e(name)+icon(open?'down':'chev',12)+'</button>'+(open?labs.filter(l=>l.module===n).map(l=>'<button class="child '+(l.id===lab.id?'active':'')+'" data-lab="'+l.id+'"><i></i>'+e(l.title)+(done.includes(l.id)?icon('check',12):'')+'</button>').join(''):'')}).join('')+
 '<div class="rail-foot"><button class="quick" data-action="favorites">'+icon('pin',15)+'Saved experiments<b>'+favorites.length+'</b></button><button class="quick" data-action="recent">'+icon('clock',15)+'Recently visited</button><button class="quick" data-action="progress">'+icon('check',15)+'Learning progress<b>'+done.length+'/'+labs.length+'</b></button><a class="quick" href="./coverage.html">Coverage &amp; source ↗</a></div>';
}
const subtitles={orbit:'Explore how gravity shapes a satellite’s path, speed, and orbital period.',projectile:'Resolve a launch into horizontal and vertical motion, from release to impact.',shm:'Follow the exchange of kinetic and elastic energy through an oscillation.',optics:'Trace light across a boundary and locate the onset of total internal reflection.'};
function shell(){
 const ch=chapters[lab.module-1],pinned=favorites.includes(lab.id);
 $('#main').innerHTML='<div class="crumbs">'+button('rail','panel','Toggle curriculum','iconbtn bare rail-reopen')+'Curriculum '+icon('chev',10)+'<em>'+e(ch[0])+'</em></div><div class="title-row"><div><h1>'+e(lab.title)+'</h1><p>'+e(subtitles[lab.id]||lab.intro.split(/(?<=\.) /)[0])+'</p></div>'+button('inspectorJump','sliders','Jump to experiment parameters','iconbtn mobile-only right')+button('favorite','pin',pinned?'Remove bookmark':'Bookmark experiment','iconbtn '+(pinned?'ico-on':''))+'</div>'+
 '<div class="workspace"><div class="stage-col"><section class="panel scene-panel"><div class="panel-head">'+icon('cube',17)+'<h2>Simulation viewport</h2><span class="right"></span><div class="seg" id="viewseg"></div>'+button('expand','expand','Expand simulation','iconbtn bare')+'</div><div class="stage-box"><svg id="scene" class="stage-svg" viewBox="0 0 760 390" role="img" aria-label="'+e(lab.title)+' simulation"></svg><div class="stage-tools">'+button('zoomOut','minus','Zoom out')+button('zoomIn','plus','Zoom in')+button('cameraReset','compass','Reset camera')+'</div></div><div class="transport"><button id="play" class="play" data-action="play" aria-label="Play simulation"></button>'+button('restart','reset','Restart clock','iconbtn bare')+button('step','step','Step forward','iconbtn bare')+'<input id="timeline" type="range" aria-label="Simulation time" min="0" max="10000" step="1"><span class="time" id="clock"></span><select id="rate" aria-label="Playback rate">'+[.1,.25,.5,1,2,4].map(v=>opt(v,rate,v+'×')).join('')+'</select></div></section>'+
 '<section id="metrics" class="metrics" aria-label="Live measurements"></section><section class="panel analysis-panel"><div class="tabs" id="analysisTabs"></div><div class="panel-body" id="analysisBody"></div></section></div><div class="inspector-resize" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize inspector"></div><aside class="inspector"><section class="panel" id="inspectorPanel"><div class="panel-head">'+icon('sliders',16)+'<h2>Experiment inspector</h2><span class="right"></span>'+button('foldInspector','panel','Collapse or expand inspector','iconbtn bare')+'</div><div class="ins-content"><div class="tabs" id="insTabs"></div><div class="panel-body" id="insBody"></div><div class="panel-foot">'+named('store','Save setup','save','')+named('reset','Reset','reset','')+'</div></div></section><section class="sidenote"><h3>'+icon('book',15)+'Field notes</h3><p>'+e(lab.misconception)+'</p><button data-action="guide">Open lab guide '+icon('chev',11)+'</button></section></aside></div>';
 const toolBox=$('.stage-tools');if(['orbit','projectile','optics'].includes(lab.id))toolBox.insertAdjacentHTML('afterbegin',button('instrument',lab.id==='optics'?'compass':'sliders',lab.id==='optics'?'Measure an angle':'Measure a distance'));
 const eventList=events(lab.id,model);if(eventList.length)$('#timeline').setAttribute('list','clock-events');
 $('#timeline').insertAdjacentHTML('afterend','<datalist id="clock-events">'+eventList.map(([name,t])=>'<option label="'+e(name)+'" value="'+Math.round(t/model.duration*10000)+'"></option>').join('')+'</datalist>');
 $('#viewseg').innerHTML=lab.spatial?['2D','3D'].map(v=>'<button data-view="'+v+'" class="'+(view===v?'on':'')+'">'+v+'</button>').join(''):'<button title="Plane diagram" disabled>2D</button>';
 inspect();analysisShell();renderFrame(true);
}
function projection(x,y,z){
 const {yaw,pitch}=camera,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 return [380+170*(x*cy-z*sy),195-170*(y*cp+(x*sy+z*cy)*sp)];
}
function renderScene(){
 const svg=$('#scene');if(!svg)return;
 if(model.invalid&&!lab.workbench){svg.innerHTML='<text x="380" y="190" text-anchor="middle" fill="#ffbd94">Model unavailable for these settings</text>';return}
 const state=model.at(time);
 let markup=lab.scene({p:params,mode,config,model,state,t:time,showVectors,showPath,project:projection,view,focus});
 if(instrument)markup+=overlay(points,instrument,lengthCalibration(lab.id,model,view));
 if(liveFocus){markup+='<g transform="translate(12 14)"><rect rx="4" width="'+Math.min(550,28+liveFocus.length*6.5)+'" height="24" fill="#10263a" stroke="#527fa6"/><text x="9" y="16" font-size="11" fill="#b7dcff">'+e(liveFocus)+'</text></g>'}
 svg.innerHTML='<g transform="translate('+(380+canvasPan[0])+' '+(195+canvasPan[1])+') scale('+canvasZoom+') translate(-380 -195)">'+markup+'</g>';
 svg.style.cursor=view==='3D'?'grab':'default';
}
function renderFrame(full=false){
 renderScene();const s=model.at(time);
 $('#metrics').style.setProperty('--metric-count',lab.metrics.length);$('#metrics').innerHTML=lab.metrics.map(a=>'<div class="metric"><span>'+e(a.label)+'</span><b>'+number(model.invalid?NaN:s[a.key],2)+'</b><small>'+e(a.unit||'')+'</small></div>').join('');
 $('#timeline').value=Math.round(time/model.duration*10000);$('#timeline').title=number(time,3)+' s';
 $('#clock').textContent=number(time,2)+' / '+number(model.duration,2)+' s';
 $('#play').innerHTML=icon(playing?'pause':'play',16);$('#play').setAttribute('aria-label',playing?'Pause simulation':'Play simulation');
 $('#rate').title='At 1×, one real second advances '+number(baseRate,2)+' simulated seconds.';
 if(analysis==='graphs'&&!foldGraphs)plots();
 if(analysis==='measurements'&&(full||playing))measurementReadout();
 if(analysis==='challenge'&&reverse)reverseStatus();
}
function visibleParams(){return lab.params.filter(q=>(!q.mode||q.mode===mode)&&(!q.modes||q.modes.includes(mode)))}
function rangeControl(q){const value=params[q.key];return '<div class="param '+(focus===q.key?'highlight':'')+'" data-param-box="'+q.key+'"><div class="param-top"><label for="num-'+q.key+'">'+e(q.label)+'</label><span class="symbol">'+e(q.symbol)+'</span>'+button('oneReset','reset','Reset '+q.label,'','data-key="'+q.key+'"')+'<div class="numeric"><input id="num-'+q.key+'" aria-label="'+e(q.label)+' value" type="number" min="'+q.min+'" max="'+q.max+'" step="'+q.step+'" value="'+value+'" data-num="'+q.key+'"><span>'+e(q.unit==='1'?'':q.unit)+'</span></div></div><input type="range" aria-label="'+e(q.label)+' slider" data-slider="'+q.key+'" min="'+q.min+'" max="'+q.max+'" step="'+q.step+'" value="'+value+'"><div class="param-range"><span>'+number(q.min,4)+'</span><span>'+number(q.max,4)+'</span></div></div>'}
function toggleRow(key,label,on){return '<button class="switch-row" role="switch" aria-checked="'+on+'" data-action="'+key+'">'+e(label)+'<span class="switch '+(on?'on':'')+'"><i></i></span></button>'}
function inspect(){
 const i=$('#insBody');$('#insTabs').innerHTML=[['controls','Parameters'],['equations','Equations'],['assumptions','Model']].map(([k,l])=>tab(k,currentPanel===k,'ins',l)).join('');
 $('#inspectorPanel').classList.toggle('is-folded',foldInspector);
 if(currentPanel==='controls'){
 const label=lab.id==='orbit'?'Central body':'Model selection';
 i.innerHTML=(lab.modes?.length?'<div class="section-line"><label class="subhead" for="mode">'+label+'</label></div><select class="mode" id="mode">'+lab.modes.map(v=>opt(v,mode)).join('')+'</select><div class="divider"></div>':'')+
 visibleParams().map(rangeControl).join('')+(lab.workbench?'<div class="workbench">'+lab.workbench({p:params,mode,config})+'</div>':'')+(model.warning?'<p class="warning">'+e(model.warning)+'</p>':'')+
 '<div class="divider"><div class="subhead">Display layers</div>'+(lab.id==='network'?'':toggleRow('paths',layerLabels()[0],showPath))+(lab.id==='decay'?'':toggleRow('vectors',layerLabels()[1],showVectors))+'</div>';
 }else if(currentPanel==='assumptions'){
 i.innerHTML='<div class="guide"><h3>Model assumptions</h3><ul>'+lab.assumptions.map(a=>'<li>'+e(a)+'</li>').join('')+'</ul><h3>Interpretation</h3><p>'+e(lab.insight)+'</p><p class="help">The timeline is measured in simulated seconds. At 1× playback, one real second advances '+number(baseRate,2)+' s.</p></div>';
 }else{
 i.innerHTML='<div class="equation">'+lab.formulas.map((f,j)=>'<details '+(j===0?'open':'')+'><summary>Relationship '+(j+1)+'</summary><div class="eq-block" data-eq="'+j+'">'+math[f.tex]+'</div><p>'+e(f.meaning)+'</p><div class="vars">'+f.variables.map((v,k)=>'<button class="var" data-var="'+j+','+k+'"><b>'+symbol(v[0])+'</b><span>'+e(v[1])+'</span><code>'+e(v[2])+'</code></button>').join('')+'</div><details><summary>Derivation & worked example</summary><p>'+e(f.derivation)+'</p><p>'+e(f.example)+'</p></details></details>').join('')+'<details><summary>Conditions of validity</summary><ul>'+lab.assumptions.map(a=>'<li>'+e(a)+'</li>').join('')+'</ul></details></div>';
 bindMath();
 }
}
const symbol=s=>(math[s]||e(s)).replace('display="block"','display="inline"');
function bindMath(){
 all('[data-eq]').forEach(el=>{const j=+el.dataset.eq;lab.formulas[j].variables.forEach((v,k)=>{
 const tmp=document.createElement('div');tmp.innerHTML=math[v[0]]||'';const token=tmp.querySelector('math semantics')?.firstElementChild?.textContent?.replaceAll(' ','');if(!token)return;
 el.querySelectorAll('mi,msub,msup,mover,msubsup,mrow').forEach(n=>{if(n.textContent.replaceAll(' ','')===token){n.setAttribute('data-var',j+','+k);n.setAttribute('data-variable','');n.setAttribute('title',v[1]+' ('+v[2]+')')}})
 })});
}
const layerNames={orbit:['Orbital path','Velocity & gravity vectors'],projectile:['Predicted trajectory','Velocity components'],shm:['Phase trajectory','Force vectors'],field:['Field contours','Electric field vectors'],rc:['Reference curve','Current direction'],induction:['Source travel','Field direction'],optics:['Wavefronts','Ray directions'],gas:['Process curve','Molecular velocity vectors'],waves:['Reference waves','Motion vectors']};
function layerLabels(){return layerNames[lab.id]||['Reference geometry','Vectors & annotations']}
function analysisShell(){
 $('#analysisTabs').innerHTML=[['graphs','Graphs','data'],['measurements','Data','sliders'],['guide','Lab guide','book'],['challenge','Challenges','target']].map(([k,l,i])=>tab(k,analysis===k,'analysis',l,i)).join('')+button('foldGraphs','down','Collapse or expand analysis','iconbtn bare right');
 const b=$('#analysisBody');b.classList.toggle('hidden',foldGraphs);if(foldGraphs)return;
 if(analysis==='graphs'){
 b.innerHTML='<div class="graph-controls">'+lab.series.map((s,i)=>'<button class="chip '+(graphKeys.includes(s.key)?'on':'')+'" data-series="'+s.key+'" aria-pressed="'+graphKeys.includes(s.key)+'"><i class="dot" style="--c:'+colors[i%colors.length]+'"></i>'+e(s.label)+'</button>').join('')+'</div><div id="plots"></div><div class="graph-axis">Time (s)</div><div class="graph-controls divider">'+button('graphIn','plus','Zoom in on graph')+button('graphOut','minus','Zoom out on graph')+button('graphReset','reset','Reset graph bounds')+named('area',graphArea?'Integral on':'Integral','data','chip '+(graphArea?'on':''))+button('graphExpand','expand','Expand or restore graphs')+named('export','CSV','download','chip right')+'</div><div id="graphStats" class="graph-extra"></div>';plots();
 }else if(analysis==='measurements'){
 b.innerHTML='<div class="section-line"><h3 class="section-title">Observation log</h3>'+named('measure','Record reading','plus')+'</div><div id="measureTime" class="help"></div><div class="overflow" id="logTable"></div><div class="input-line divider">'+named('exportLog','Export readings','download')+named('stopwatch',markTime===null?'Start stopwatch':'Clear stopwatch','clock')+'</div>';const evts=events(lab.id,model);if(evts.length)b.insertAdjacentHTML('beforeend','<div class="divider"><span class="subhead">Timeline events</span><div class="input-line">'+evts.map(([label,t])=>'<button class="chip" data-jump="'+t+'">'+e(label)+' · '+number(t,2)+' s</button>').join('')+'</div></div>');measurementReadout();logTable();
 }else if(analysis==='guide'){
 const related=connections.filter(([a,b])=>(a===lab.id||b===lab.id)&&byId.has(a)&&byId.has(b));
 b.innerHTML='<div class="guide"><h3>'+e(chapters[lab.module-1][2])+'</h3><p>'+e(lab.intro)+'</p><details open><summary>Physical interpretation</summary><p>'+e(lab.insight)+'</p></details><details><summary>Common misconception</summary><p>'+e(lab.misconception)+'</p></details>'+lab.formulas.map(f=>'<details><summary>'+e(f.meaning)+'</summary><div class="eq-block">'+math[f.tex]+'</div><p>'+e(f.derivation)+'</p><p><strong>Worked example.</strong> '+e(f.example)+'</p><div class="vars">'+f.variables.map(v=>'<div class="var"><b>'+symbol(v[0])+'</b><span>'+e(v[1])+'</span><code>'+e(v[2])+'</code></div>').join('')+'</div></details>').join('')+'<details><summary>Connected experiments</summary>'+related.map(([a,b,why])=>'<p><button class="inline-link" data-lab="'+(a===lab.id?b:a)+'">'+e(byId.get(a===lab.id?b:a).title)+'</button> · '+e(why)+'</p>').join('')+'</details>'+named('complete',done.includes(lab.id)?'Reviewed':'Mark as reviewed','check')+'</div>';
 }else challenge();
}
function plots(){
 if(!$('#plots'))return;if(model.invalid){$('#plots').textContent=model.warning||'Correct the configuration to measure this circuit.';return}
 $('#plots').innerHTML=lab.series.filter(s=>graphKeys.includes(s.key)).map(s=>drawPlot(data,s,graphRange,time,cursor,{model,color:colors[lab.series.indexOf(s)%colors.length],area:graphArea})).join('');
 const ti=cursor??time,series=lab.series.find(s=>s.key===graphKeys[0]);if(!series)return;
 const h=model.duration/100000,a=Math.max(0,ti-h),b=Math.min(model.duration,ti+h);
 const slope=(model.at(b)[series.key]-model.at(a)[series.key])/(b-a);
 let detail='At '+number(ti,3)+' s · '+e(series.label)+' slope '+number(slope,4)+' '+e(series.unit)+'/s';
 if(graphArea){let area=0;const n=256,dt=(graphRange[1]-graphRange[0])/n;let prev=model.at(graphRange[0])[series.key];for(let j=1;j<=n;j++){let next=model.at(graphRange[0]+j*dt)[series.key];area+=(prev+next)*.5*dt;prev=next}detail+=' · Signed integral '+number(area,4)+' '+e(series.unit)+'·s (trapezoids)'}
 $('#graphStats').innerHTML=detail;
}
function measurementReadout(){if($('#measureTime'))$('#measureTime').textContent='Clock '+number(time,4)+' s'+(markTime===null?'':' · Stopwatch Δt = '+number(time-markTime,4)+' s')}
function logTable(){
 const el=$('#logTable');if(!el)return;
 el.innerHTML=savedObservations.length?'<table class="readtable"><thead><tr><th>Setup</th><th>t (s)</th>'+lab.metrics.map(s=>'<th>'+e(s.label)+' ('+e(s.unit)+')</th>').join('')+'</tr></thead><tbody>'+savedObservations.map(row=>'<tr><td><details><summary>'+e(row.run?.mode||'Parameters')+'</summary>'+e(lab.params.map(q=>q.label+' '+(row.run?.params?.[q.key]??'—')+' '+q.unit).join(' · '))+'</details></td><td>'+number(row.t,4)+'</td>'+lab.metrics.map(s=>'<td>'+number(row[s.key],4)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<p class="no-data">Pause or scrub to an event, then record its measurements.</p>';
}
function challenge(){
 const b=$('#analysisBody'),ch=lab.challenges[challengeIdx];
 b.innerHTML='<div class="challenge"><div class="section-line"><span class="subhead">BPhO practice</span><select class="mode" style="width:auto" id="challengeIndex">'+lab.challenges.map((_,i)=>opt(i,challengeIdx,(i===0?'Core':'Extension')+' '+(i+1))).join('')+'</select></div><h3>'+e(ch.question)+'</h3><form id="answerForm" class="input-line"><input type="number" step="any" required id="answer" aria-label="Numerical answer" class="text-input" placeholder="Your answer" value="'+e(attempt)+'"><span>'+e(ch.unit)+'</span><button class="action" type="submit">Check answer</button></form><p class="feedback" role="status">'+e(answerFeedback)+'</p><div class="input-line">'+named('hint','Hint '+hintCount+'/'+ch.hints.length,'info','chip',hintCount>=ch.hints.length?'disabled':'')+named('solution',solutionOpen?'Hide solution':'Worked solution','book','chip')+'</div>'+ch.hints.slice(0,hintCount).map((h,i)=>'<p><b>Hint '+(i+1)+'.</b> '+e(h)+'</p>').join('')+(solutionOpen?'<p><strong>Solution.</strong> '+e(ch.solution)+'</p>':'')+
 '<div class="divider"><h3>Reverse challenge</h3><p>Set a target reading at a chosen instant. Adjust the experiment controls until the model reaches it.</p>'+(!reverse?named('reverseStart','Set a target','target'):reverseForm())+'</div></div>';if(reverse)reverseStatus();
}
function reverseForm(){return '<div class="input-line"><select id="reverseKey" aria-label="Target quantity">'+lab.metrics.map(q=>opt(q.key,reverse.key,q.label)).join('')+'</select><input id="reverseValue" class="text-input" type="number" step="any" aria-label="Target reading" value="'+e(reverse.value)+'"><span>'+e(lab.metrics.find(q=>q.key===reverse.key).unit)+'</span><label>At <input class="text-input" id="reverseFraction" type="number" min="0" max="100" step="1" aria-label="Percent of run" value="'+reverse.percent+'">% of run</label></div><p id="reverseFeedback"></p>'}
function reverseStatus(){const out=$('#reverseFeedback');if(!out)return;const val=model.at(model.duration*reverse.percent/100)[reverse.key],tol=Math.max(Math.abs(reverse.value)*.01,1e-8);
 out.textContent=model.invalid?'Correct the model configuration first.':(Math.abs(val-reverse.value)<=tol?'Target reached. ':'Current prediction '+number(val,4)+'. ')+'Tolerance ±'+number(tol,5)+'.';}
function dialog(title,body,type){
 modalType=type;playing=false;$('#modalbody').innerHTML='<div class="modal-top"><h2>'+e(title)+'</h2>'+button('close','close','Close dialog')+'</div><div class="modal">'+body+'</div>';
 if(!$('#dialog').open)$('#dialog').showModal();header();renderFrame();
}
const labResult=l=>'<button class="result" data-lab="'+l.id+'">'+icon(chapters[l.module-1][1],20)+'<span><b>'+e(l.title)+'</b><small>'+e(chapters[l.module-1][0])+'</small></span><span class="end">'+icon('chev',13)+'</span></button>';
function openSearch(){dialog('Find an experiment','<input class="text-input find-input" id="query" type="search" aria-label="Search experiments" placeholder="Search a topic, experiment, or physical quantity…"><div id="results"></div>','search');searchResults('');$('#query').focus()}
function searchResults(query){const terms=query.toLowerCase().trim().split(/\s+/);const hits=labs.filter(l=>{const text=[l.title,chapters[l.module-1][0],l.intro,...l.metrics.map(m=>m.label),...l.params.map(p=>p.label),...l.modes||[]].join(' ').toLowerCase();return terms.every(term=>text.includes(term))});$('#results').innerHTML=hits.map(labResult).join('')||'<p>No matching experiment. Try a quantity such as pressure or voltage.</p>'}
function openCatalog(){
 dialog('Curriculum','<div class="section-line"><span>'+labs.length+' experiments across '+chapters.length+' modules</span>'+named('connections','Concept connections','link')+'</div><div class="cardgrid">'+chapters.map(([name,ico,full],i)=>'<button class="catalog-card" data-catalog="'+(i+1)+'">'+icon(ico,19)+'<b>'+e(name)+'</b><span>'+e(full)+' · '+labs.filter(l=>l.module===i+1).length+' labs</span></button>').join('')+'</div><div class="divider"><a href="./coverage.html" target="_blank">Full curriculum coverage and model limits ↗</a></div>','catalog');
}
function conceptMap(selected=lab.id){
 const adjacent=connections.filter(c=>c.slice(0,2).includes(selected)&&c.slice(0,2).every(k=>byId.has(k)));
 const nodes=[selected,...adjacent.map(c=>c[0]===selected?c[1]:c[0])],cx=270,cy=110;
 const pts=nodes.map((_,i)=>i===0?[cx,cy]:[cx+183*Math.cos(2*Math.PI*(i-1)/Math.max(1,nodes.length-1)),cy+81*Math.sin(2*Math.PI*(i-1)/Math.max(1,nodes.length-1))]);
 const net='<svg viewBox="0 0 540 220" role="group" aria-label="Concept network">'+pts.slice(1).map(p=>'<path stroke="#547da0" d="M270 110L'+p.join(' ')+'"/>').join('')+nodes.map((n,i)=>'<g role="button" tabindex="0" aria-label="Explore '+e(byId.get(n).title)+' connections" data-node="'+n+'" style="cursor:pointer"><circle cx="'+pts[i][0]+'" cy="'+pts[i][1]+'" r="'+(i?6:10)+'" fill="'+(i?'#7ddbc3':'#79bfff')+'"/><text x="'+pts[i][0]+'" y="'+(pts[i][1]+22)+'" fill="var(--fg)" text-anchor="middle" font-size="11">'+e(byId.get(n).title)+'</text></g>').join('')+'</svg>';
 dialog('Concept connections',net+'<p>'+named('goSelected','Open '+byId.get(selected).title,'flask','outline','data-target="'+selected+'"')+'</p>'+adjacent.map(c=>'<p class="connection">'+icon('link',15)+'<span>'+e(c[2])+'</span></p>').join('')+(adjacent.length?'':'<p>This experiment has no mapped connections yet.</p>'),'catalog');
}
function notebook(){
 dialog('Lab notebook','<div class="section-line"><span>'+notes.length+' saved setups</span>'+named('store','Save current setup','plus')+'</div>'+
 (notes.length?notes.map((n,i)=>'<div class="note-entry"><div class="details"><b>'+e(n.title||byId.get(n.id)?.title)+'</b><small>'+e(n.mode||'Experiment')+' · '+e(new Date(n.date).toLocaleDateString())+' · '+(n.observations?.length||0)+' readings</small>'+e(n.note||'')+'</div>'+named('loadNote','Restore',null,'chip','data-index="'+i+'"')+button('deleteNote','close','Remove saved setup','iconbtn bare','data-index="'+i+'"')+'</div>').join(''):'<p>Save a setup to keep its parameters, clock position, observations, and your notes on this device.</p>'),'notebook');
}
function storeDialog(){dialog('Save experiment setup','<form id="saveForm"><label>Setup name<input class="text-input find-input" name="title" required maxlength="100" value="'+e(lab.title)+'"></label><label>Observation<textarea name="note" maxlength="2000" placeholder="What did changing a parameter reveal?"></textarea></label><p>'+savedObservations.length+' recorded readings will be included.</p><button class="action">Save to notebook</button></form>','notebook')}
function exportCSV(log=false){
 const rows=log?savedObservations:data,series=log?lab.metrics:[...new Map([...lab.metrics,...lab.series].map(s=>[s.key,s])).values()];if(!rows.length){notify('Record a measurement first.');return}
 const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
 const csv=[['Time (s)',...series.map(s=>s.label+' ('+(s.unit||'1')+')'),...(log?['Model','Parameter configuration','Workbench configuration']:[])].map(quote).join(','),...rows.map(d=>[d.t,...series.map(s=>Number.isFinite(d[s.key])?d[s.key]:''),...(log?[quote(d.run?.mode||''),quote(JSON.stringify(d.run?.params||{})),quote(JSON.stringify(d.run?.config||{}))]:[])].join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=lab.id+(log?'-observations':'-run')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function setGraphWindow(start,span){const d=model.duration;span=Math.max(d/24,Math.min(d,span));start=Math.max(0,Math.min(start,d-span));graphRange=[start,start+span];plots()}
function zoomGraph(k){const span=(graphRange[1]-graphRange[0])*k;const middle=cursor??(graphRange[0]+graphRange[1])/2;setGraphWindow(middle-span/2,span)}
function changeParam(key,v,continuous=false){const q=lab.params.find(q=>q.key===key);if(!q||!Number.isFinite(v))return;
 v=Number((q.min+Math.round((v-q.min)/q.step)*q.step).toPrecision(12));params[key]=Math.min(q.max,Math.max(q.min,v));const frac=time/model.duration;playing=false;points=[];rebuild(frac);
 markTime=null;
 if(continuous){const n=$('[data-num="'+key+'"]'),sl=$('[data-slider="'+key+'"]');if(n)n.value=params[key];if(sl)sl.value=params[key]}else inspect();
 renderFrame(true);if(analysis==='measurements')logTable();
}
function newConfig(){points=[];liveFocus=null;const frac=time/model.duration;playing=false;points=[];rebuild(frac);markTime=null;inspect();analysisShell();renderFrame(true)}
function setPlaying(){if(model.invalid)return;playing=!playing;if(playing&&time>=model.duration)time=0;renderFrame(true);if(playing)startLoop()}
let animation=0;
function startLoop(){cancelAnimationFrame(animation);let last=performance.now();function frame(now){
 if(!playing)return;const dt=(now-last)/1000;if(dt>=1/25){time=Math.min(model.duration,time+Math.min(dt,.15)*rate*baseRate);last=now;if(time>=model.duration)playing=false;renderFrame()}
 if(playing)animation=requestAnimationFrame(frame)}animation=requestAnimationFrame(frame)}
function action(name,el){
 switch(name){
 case 'home':openLab('orbit');break;
 case 'workspace':if($('#dialog').open)$('#dialog').close();break;
 case 'rail':if(matchMedia('(max-width:900px)').matches)document.body.classList.toggle('rail-open');else document.body.classList.toggle('no-rail');break;
 case 'search':openSearch();break;case 'catalog':openCatalog();break;case 'notebook':notebook();break;
 case 'theme':light=!light;save('light',light);header();break;case 'close':$('#dialog').close();break;
 case 'favorite':favorites=favorites.includes(lab.id)?favorites.filter(x=>x!==lab.id):[...favorites,lab.id];save('favorites',favorites);rail();el.classList.toggle('ico-on',favorites.includes(lab.id));el.title=el.ariaLabel=favorites.includes(lab.id)?'Remove bookmark':'Bookmark experiment';break;
 case 'favorites':case 'recent':case 'progress':{const list=name==='favorites'?favorites:name==='recent'?recent:done;dialog(name==='favorites'?'Saved experiments':name==='recent'?'Recently visited':'Reviewed experiments',list.map(id=>byId.get(id)).filter(Boolean).map(labResult).join('')||'<p>'+(name==='progress'?'Mark an experiment as reviewed in its lab guide.':'Use the bookmark beside an experiment title to save it here.')+'</p>',name);break}
 case 'complete':done=done.includes(lab.id)?done.filter(k=>k!==lab.id):[...done,lab.id];save('completed',done);rail();analysisShell();break;
 case 'connections':conceptMap();break;case 'goSelected':openLab(el.dataset.target);break;
 case 'inspectorJump':foldInspector=false;currentPanel='controls';inspect();$('#inspectorPanel').scrollIntoView({block:'start'});break;
 case 'guide':analysis='guide';analysisShell();$('.analysis-panel').scrollIntoView({block:'nearest'});break;
 case 'store':storeDialog();break;case 'loadNote':{const n=notes[Number(el.dataset.index)];openLab(n.id,n);savedObservations=n.observations||[];notify('Setup restored.');break}
 case 'deleteNote':notes.splice(+el.dataset.index,1);save('notes',notes);notebook();break;
 case 'reset':params=defaults(lab);mode=lab.modes?.[0]||'';config={...lab.defaultConfig};time=0;focus=null;newConfig();notify('Default parameters restored.');break;
 case 'oneReset':changeParam(el.dataset.key,lab.params.find(q=>q.key===el.dataset.key).value);break;
 case 'play':setPlaying();break;case 'step':playing=false;time=Math.min(model.duration,time+model.duration/240);renderFrame(true);break;
 case 'restart':playing=false;time=0;renderFrame(true);break;
 case 'foldGraphs':foldGraphs=!foldGraphs;analysisShell();break;case 'foldInspector':foldInspector=!foldInspector;inspect();break;
 case 'instrument':instrument=instrument?null:(lab.id==='optics'?'protractor':'ruler');points=[];if(instrument&&view!=='2D'){view='2D';all('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===view))}liveFocus=instrument==='ruler'?'Ruler · select two points':instrument==='protractor'?'Protractor · select a ray point, vertex, then second ray point':null;el.classList.toggle('ico-on',!!instrument);renderScene();break;
 case 'graphExpand':$('.analysis-panel').classList.toggle('analysis-expanded');break;
 case 'paths':showPath=!showPath;inspect();renderScene();break;case 'vectors':showVectors=!showVectors;inspect();renderScene();break;
 case 'expand':$('.scene-panel').classList.toggle('stage-expanded');break;
 case 'cameraReset':camera=initialCamera();canvasZoom=1;canvasPan=[0,0];renderScene();break;
 case 'zoomIn':case 'zoomOut':canvasZoom=Math.min(5,Math.max(.5,canvasZoom*(name==='zoomIn'?1.18:1/1.18)));renderScene();break;
 case 'graphIn':zoomGraph(.65);break;case 'graphOut':zoomGraph(1.5);break;case 'graphReset':graphRange=[0,model.duration];cursor=null;plots();break;
 case 'area':graphArea=!graphArea;analysisShell();break;case 'export':exportCSV();break;case 'exportLog':exportCSV(true);break;
 case 'measure':if(model.invalid)return;playing=false;savedObservations.push({t:time,...model.at(time),run:{params:{...params},config:{...config},mode}});logTable();renderFrame(true);break;
 case 'stopwatch':markTime=markTime===null?time:null;analysisShell();break;
 case 'hint':hintCount=Math.min(lab.challenges[challengeIdx].hints.length,hintCount+1);challenge();break;
 case 'solution':solutionOpen=!solutionOpen;challenge();break;
 case 'reverseStart':{const key=lab.metrics[0].key;reverse={key,percent:50,value:Number(((model.at(model.duration*.5)[key]||1)*1.2).toPrecision(3))};challenge();break}
 }
}
document.addEventListener('click',ev=>{
 const el=ev.target.closest('[data-action],[data-lab],[data-chapter],[data-catalog],[data-ins],[data-analysis],[data-view],[data-series],[data-var],[data-node],[data-workbench-action],[data-jump]');if(!el)return;const d=el.dataset;
 if(d.jump!==undefined){playing=false;time=Number(d.jump);renderFrame(true);return}if(d.action){action(d.action,el);return}if(d.lab){openLab(d.lab);return}if(d.node){conceptMap(d.node);return}
 if(d.catalog){const n=+d.catalog;dialog(chapters[n-1][0],'<p>'+e(chapters[n-1][3])+'</p>'+labs.filter(l=>l.module===n).map(labResult).join(''),'catalog');return}
 if(d.chapter){const n=+d.chapter;if(expanded.has(n))expanded.delete(n);else expanded.add(n);rail();return}
 if(d.ins){currentPanel=d.ins;inspect();return}if(d.analysis){analysis=d.analysis;foldGraphs=false;analysisShell();return}
 if(d.view){instrument=null;points=[];liveFocus=null;view=d.view;canvasZoom=1;canvasPan=[0,0];all('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===view));renderScene();return}
 if(d.series){if(graphKeys.includes(d.series)){if(graphKeys.length===1)return;graphKeys=graphKeys.filter(k=>k!==d.series)}else graphKeys.push(d.series);analysisShell();return}
 if(d.var){const [j,k]=d.var.split(',').map(Number),v=lab.formulas[j].variables[k];focus=v[3]||null;liveFocus=v[1]+' ('+(v[2]||'1')+')';if(lab.id==='orbit'&&['r','v'].includes(v[0]))showVectors=true;notify(v[1]+' · '+(v[2]||'dimensionless'));if(focus&&visibleParams().some(q=>q.key===focus)){currentPanel='controls';inspect();const input=$('[data-num="'+focus+'"]');input?.focus({preventScroll:true})}renderScene();return}
 if(d.workbenchAction){config=lab.act(d.workbenchAction,config);newConfig()}
});
document.addEventListener('submit',ev=>{
 if(ev.target.id==='saveForm'){ev.preventDefault();let fd=new FormData(ev.target);notes.unshift({id:lab.id,params:{...params},config:{...config},mode,view,fraction:time/model.duration,title:fd.get('title').trim()||lab.title,note:fd.get('note').trim(),date:Date.now(),observations:[...savedObservations]});save('notes',notes);notebook();notify('Setup saved.')}
 if(ev.target.id==='answerForm'){ev.preventDefault();const ch=lab.challenges[challengeIdx];attempt=$('#answer').value;let correct=Math.abs(Number(attempt)-ch.answer)<=ch.tolerance;answerFeedback=correct?'Correct. Your result is within the stated precision.':'Try again. Check the units or reveal the next hint.';challenge()}
});
document.addEventListener('change',ev=>{const el=ev.target,d=el.dataset;
 if(d.num){changeParam(d.num,el.value===''?params[d.num]:Number(el.value));return}
 if(d.configKey){config={...config,[d.configKey]:el.type==='checkbox'?String(el.checked):el.value};newConfig();return}
 switch(el.id){
 case 'mode':mode=el.value;newConfig();break;case 'rate':rate=Number(el.value);break;
 case 'challengeIndex':challengeIdx=+el.value;hintCount=0;solutionOpen=false;answerFeedback=attempt='';challenge();break;
 case 'reverseKey':reverse.key=el.value;challenge();break;
 case 'reverseValue':reverse.value=Number(el.value);reverseStatus();break;
 case 'reverseFraction':reverse.percent=Math.min(100,Math.max(0,Number(el.value)));el.value=reverse.percent;reverseStatus();break;
 }
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.id==='query'){searchResults(el.value);return}
 if(el.dataset.slider){changeParam(el.dataset.slider,Number(el.value),true);return}
 if(el.id==='timeline'){playing=false;time=model.duration*Number(el.value)/10000;renderFrame(true)}
 if(el.id==='answer')attempt=el.value;
});
function svgX(ev,svg){const point=new DOMPoint(ev.clientX,ev.clientY);return point.matrixTransform(svg.getScreenCTM().inverse()).x}
function plotTime(ev,svg){const x=svgX(ev,svg);return graphRange[0]+Math.max(0,Math.min(1,(x-68)/(610-68-16)))*(graphRange[1]-graphRange[0])}
document.addEventListener('pointerdown',ev=>{
 const el=ev.target,handle=el.closest('[data-drag-param]'),scene=el.closest('#scene'),plot=el.closest('[data-plot]'),sep=el.closest('[role="separator"]');
 if(!(scene||plot||sep))return;
 if(scene&&instrument){const point=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(scene.getScreenCTM().inverse());if(points.length>=(instrument==='ruler'?2:3))points=[];points.push([(point.x-380-canvasPan[0])/canvasZoom+380,(point.y-195-canvasPan[1])/canvasZoom+195]);renderScene();ev.preventDefault();return}
 drag={x:ev.clientX,y:ev.clientY,viewYaw:camera.yaw,viewPitch:camera.pitch,pan:[...canvasPan],range:[...graphRange],pid:ev.pointerId};
 if(sep)drag.type=sep.id==='rail-resize'?'rail':'inspector';
 else if(handle){drag.type='param';drag.key=handle.dataset.dragParam;drag.min=Number(handle.dataset.dragMinX);drag.max=Number(handle.dataset.dragMaxX)}
 else if(scene)drag.type=(view==='3D'&&!ev.shiftKey&&ev.button!==2)?'rotate':'pan';
 else if(plot){drag.type='plot';drag.width=plot.getBoundingClientRect().width*(610-68-16)/610;drag.t=plotTime(ev,plot)}
 ev.preventDefault();document.body.setPointerCapture(ev.pointerId);
});
function resizeRail(kind,x){let val=kind==='rail'?Math.min(340,Math.max(155,x)):Math.min(480,Math.max(205,$('.workspace').getBoundingClientRect().right-x));document.documentElement.style.setProperty(kind==='rail'?'--rail':'--inspector',val+'px')}
document.addEventListener('pointermove',ev=>{
 if(!drag){const svg=ev.target.closest('[data-plot]');if(svg){cursor=plotTime(ev,svg);cancelAnimationFrame(graphRaf);graphRaf=requestAnimationFrame(plots)}else if(cursor!==null){cursor=null;cancelAnimationFrame(graphRaf);graphRaf=requestAnimationFrame(plots)}return}
 const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
 if(drag.type==='rail'||drag.type==='inspector'){resizeRail(drag.type,ev.clientX);return}
 if(drag.type==='plot'){const span=drag.range[1]-drag.range[0];setGraphWindow(drag.range[0]-dx/drag.width*span,span);return}
 if(drag.type==='param'){const q=lab.params.find(p=>p.key===drag.key);if(!q||drag.max===drag.min)return;const x=(svgX(ev,$('#scene'))-380-canvasPan[0])/canvasZoom+380;changeParam(q.key,q.min+(q.max-q.min)*(x-drag.min)/(drag.max-drag.min),true);return}
 if(drag.type==='rotate'){camera.yaw=drag.viewYaw+dx*.008;camera.pitch=Math.max(-1.48,Math.min(1.48,drag.viewPitch+dy*.008))}
 else{const scale=$('#scene').getScreenCTM().a;canvasPan=[drag.pan[0]+dx/scale,drag.pan[1]+dy/scale]}
 renderScene();
});
function endDrag(ev){if(drag?.type==='plot'&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<4){playing=false;time=drag.t;renderFrame(true)}drag=null}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',()=>drag=null);
document.addEventListener('wheel',ev=>{const plot=ev.target.closest('[data-plot]');if(plot&&ev.ctrlKey){ev.preventDefault();cursor=plotTime(ev,plot);zoomGraph(ev.deltaY>0?1.2:.8)}},{passive:false});
document.addEventListener('keydown',ev=>{
 const interactive=ev.target.closest('input,textarea,select,button,summary,a,[role="button"]');
 if(ev.key==='Escape'){$('.stage-expanded')?.classList.remove('stage-expanded');$('.analysis-expanded')?.classList.remove('analysis-expanded');document.body.classList.remove('rail-open')}
 if(ev.target.matches('[data-node]')&&['Enter',' '].includes(ev.key)){ev.preventDefault();conceptMap(ev.target.dataset.node);return}
 if(ev.target.matches('[role="separator"]')&&['ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();resizeRail(ev.target.id?'rail':'inspector',ev.target.getBoundingClientRect().left+(ev.key==='ArrowRight'?10:-10));return}
 if($('#dialog').open||interactive)return;
 if(ev.key==='/'){ev.preventDefault();openSearch()}if(ev.code==='Space'){ev.preventDefault();setPlaying()}
});
$('#dialog').addEventListener('close',()=>{modalType='';header()});
$('#dialog').addEventListener('click',ev=>{if(ev.target===$('#dialog')){const r=ev.target.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)ev.target.close()}});
window.addEventListener('hashchange',()=>openLab(labOf().id));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){playing=false;renderFrame(true)}});
openLab(labOf().id);
