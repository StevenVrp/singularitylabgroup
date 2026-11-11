// Source coordinates and probe geometry are in meters; charge controls use nC.
const K=8.9875517923e9, perNano=K*1e-9, eps=1/(4*Math.PI*K);
const coral='#ff9b87', cyan='#72ddcc', gold='#ffd091', violet='#bbabff', pale='#d6e5f2', dull='#8ca4b8';
const Q=(key,label,unit)=>({key,label,unit});
const P=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const initial=[{id:1,x:-.49,y:.08,z:.12,q:4},{id:2,x:.57,y:-.12,z:-.23,q:-3}];
const defaultConfig={sources:JSON.stringify(initial),editId:'',x:'0',y:'0.5',z:'0',q:'2',message:''};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x.toPrecision(3)).toString();
function readSources(config){try{const a=JSON.parse(config.sources);return Array.isArray(a)?a.slice(0,8).filter(s=>[s.id,s.x,s.y,s.z,s.q].every(Number.isFinite)):[]}catch{return []}}
function workbench({config={}}){
 const c={...defaultConfig,...config},sources=readSources(c);
 const btn=(action,txt)=>'<button type="button" data-workbench-action="'+action+'">'+txt+'</button>';
 return '<section class="circuit-workbench"><h3>Source charges</h3><div class="net-list">'+sources.map(s=>'<div><strong>Q'+s.id+'</strong> '+fmt(s.q)+' nC · ('+[s.x,s.y,s.z].map(fmt).join(', ')+') m '+btn('edit-'+s.id,'Move / edit')+' '+btn('remove-'+s.id,'Remove')+'</div>').join('')+'</div><h4>'+(c.editId?'Editing Q'+esc(c.editId):'New point charge')+'</h4>'+['x','y','z','q'].map(k=>'<label>'+({x:'x coordinate (m)',y:'y coordinate (m)',z:'z coordinate (m)',q:'Charge (nC)'})[k]+' <input type="number" step="any" min="'+(k==='q'?-20:-1)+'" max="'+(k==='q'?20:1)+'" data-config-key="'+k+'" value="'+esc(c[k])+'"></label>').join('')+btn('commit',c.editId?'Apply position and charge':'Add charge')+(c.editId?' '+btn('cancel','Cancel'):'')+(c.message?'<p role="status">'+esc(c.message)+'</p>':'')+'</section>';
}
function act(action,config={}){
 const c={...defaultConfig,...config,message:''},sources=readSources(c),[kind,id]=action.split('-'),selected=sources.find(s=>s.id===+id);
 if(kind==='edit'&&selected){for(const k of ['x','y','z','q'])c[k]=String(selected[k]);return {...c,editId:id}}
 if(kind==='remove')return {...c,sources:JSON.stringify(sources.filter(s=>s!==selected)),editId:c.editId===id?'':c.editId};
 if(kind==='cancel')return {...c,editId:''};
 if(kind!=='commit')return c;
 const item={id:c.editId?+c.editId:Math.max(0,...sources.map(s=>s.id))+1};
 for(const k of ['x','y','z','q']){const n=Number(c[k]);if(c[k]===''||!Number.isFinite(n)||Math.abs(n)>(k==='q'?20:1))return {...c,message:'Coordinates must lie within ±1 m and charges within ±20 nC.'};item[k]=n}
 if(sources.some(s=>s.id!==item.id&&Math.hypot(s.x-item.x,s.y-item.y,s.z-item.z)<1e-7))return {...c,message:'Move coincident sources apart or combine their charges into one source.'};
 if(!c.editId&&sources.length>=8)return {...c,message:'All eight source slots are in use. Edit or remove an existing source.'};
 return {...c,sources:JSON.stringify(c.editId?sources.map(s=>s.id===item.id?item:s):[...sources,item]),editId:''};
}
function field(charges,x,y,z){
 let ex=0,ey=0,ez=0,V=0;
 for(const s of charges){if(!s.q)continue;const dx=x-s.x,dy=y-s.y,dz=z-s.z,r=Math.hypot(dx,dy,dz);if(r<1e-10)return null;
  const v=perNano*s.q/r,f=v/(r*r);V+=v;ex+=f*dx;ey+=f*dy;ez+=f*dz;}
 return {ex,ey,ez,V,E:Math.hypot(ex,ey,ez)};
}
function lines(charges){
 const out=[],limit=1.13;
 for(const source of charges.filter(s=>s.q!==0)){
  for(let i=0;i<10;i++){
   const h=1-(2*i+1)/10,ro=Math.sqrt(1-h*h),a=i*2.399963229729,toward=Math.sign(source.q),len=.036*toward;
   let r=[source.x+.04*ro*Math.cos(a),source.y+.04*h,source.z+.04*ro*Math.sin(a)];const points=[r];
   for(let j=0;j<110;j++){
    const v=field(charges,...r);if(!v||v.E<1e-7)break;
    const mid=r.map((x,k)=>x+len*[v.ex,v.ey,v.ez][k]/(2*v.E)),m=field(charges,...mid);
    if(!m||m.E<1e-7)break;r=r.map((x,k)=>x+len*[m.ex,m.ey,m.ez][k]/m.E);
    points.push(r);
    if(r.some(x=>Math.abs(x)>limit)||charges.some(s=>s!==source&&s.q&&Math.hypot(r[0]-s.x,r[1]-s.y,r[2]-s.z)<.04))break;
   }
   if(points.length>2)out.push({points,toward});
  }
 }
 return out;
}
function contourSlice(charges,z,level){
 const n=44, extent=1.11, step=extent*2/n, axis=i=>-extent+i*step;
 const table=Array.from({length:n+1},(_,j)=>Array.from({length:n+1},(_,i)=>field(charges,axis(i),axis(j),z)?.V));
 const out=[];
 // Split each cell into triangles, with a consistent diagonal for ambiguous saddle cells.
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const corners=[[axis(i),axis(j),z],[axis(i+1),axis(j),z],[axis(i+1),axis(j+1),z],[axis(i),axis(j+1),z]],vs=[table[j][i],table[j][i+1],table[j+1][i+1],table[j+1][i]];
  if(vs.some(v=>!Number.isFinite(v)))continue;
  for(const tri of [[0,1,2],[0,2,3]]){const pts=[];for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3];if((vs[a]>=level)===(vs[b]>=level))continue;const f=(level-vs[a])/(vs[b]-vs[a]);pts.push(corners[a].map((v,d)=>v+f*(corners[b][d]-v)))}if(pts.length===2)out.push(pts);}
 }
 return out;
}
function build(p,mode,config={}){
 const sources=readSources({...defaultConfig,...config}),radius=p.radius,
 onBoundary=sources.some(s=>s.q&&Math.abs(Math.hypot(s.x,s.y,s.z)-radius)<1e-8),
 enclosed=sources.reduce((sum,s)=>sum+(Math.hypot(s.x,s.y,s.z)<radius?s.q:0),0),
 singular=sources.some(s=>s.q&&Math.hypot(s.y-p.py,s.z-p.pz)<1e-10&&Math.abs(s.x-p.px)<=p.travel+1e-10);
 const warning=singular?'Probe path meets a point-source singularity. Move the probe path or its source.':mode==='Gaussian sphere'&&onBoundary?'A point charge lies on the Gaussian surface. Change the radius to count it inside or outside.':'';
 const at=t=>{const x=p.px-p.travel+2*p.travel*Math.max(0,Math.min(1,t/8)),v=field(sources,x,p.py,p.pz);
  if(!v)return {x,y:p.py,z:p.pz,V:NaN,E:NaN,ex:NaN,ey:NaN,ez:NaN,force:NaN,flux:onBoundary?NaN:enclosed*1e-9/eps,enclosed};
  return {...v,x,y:p.py,z:p.pz,force:Math.abs(p.test)*v.E,flux:onBoundary?NaN:enclosed*1e-9/eps,enclosed};};
 return {sources,duration:8,at,invalid:!!warning,warning,lines:mode==='Field lines'?lines(sources):[],contours:mode==='Equipotential slice'?contourSlice(sources,p.pz,p.level):[]};
}
const svgLabel=(x,y,t,col=dull,size=11,align='start')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+align+'" fill="'+col+'" font-size="'+size+'">'+t+'</text>';
const xy=p=>p.map(x=>x.toFixed(2)).join(',');
const path=(pts,col,width=1,attr='')=>'<polyline fill="none" stroke="'+col+'" stroke-width="'+width+'" points="'+pts.map(xy).join(' ')+'" '+attr+'/>';
const circle=(p,r,fill,stroke,width=1)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
function arrow(start,end,col){const dx=end[0]-start[0],dy=end[1]-start[1],n=Math.hypot(dx,dy);if(n<1)return '';const u=dx/n,v=dy/n,h=Math.min(7,n*.45);return path([start,end],col,1.6)+path([[end[0]-h*u-h*.4*v,end[1]-h*v+h*.4*u],end,[end[0]-h*u+h*.4*v,end[1]-h*v-h*.4*u]],col,1.4)}
function scene({p,mode,model,state:s,view,project,showVectors,showPath}){
 const plot=(x,y,z)=>view==='3D'?project(x*.8,y*.8,z*.8):[380+x*143,198-y*143], projectPoints=a=>a.map(pt=>plot(...pt));
 const parts=[svgLabel(23,29,view==='3D'?'CARTESIAN FIELD VOLUME':'ORTHOGRAPHIC VIEW · LOOKING DOWN z')];
 for(let n=-4;n<=4;n++){const k=n/4;parts.push(path(projectPoints([[-1,k,p.pz],[1,k,p.pz]]),'#263a4a',.65),path(projectPoints([[k,-1,p.pz],[k,1,p.pz]]),'#263a4a',.65))}
 for(const [end,name] of [[[1.11,0,0],'x'],[[0,1.11,0],'y'],[[0,0,1.11],'z']]){if(name==='z'&&view!=='3D')continue;const b=plot(...end);parts.push(path([plot(0,0,0),b],'#617b8c',.85),svgLabel(b[0]+4,b[1],name,pale))}
 if(mode==='Field lines'&&showPath){for(const trace of model.lines){
  const pts=projectPoints(trace.points),j=Math.floor(pts.length*.5),k=Math.max(0,Math.min(pts.length-1,j+2*trace.toward));
  parts.push(path(pts,'#65d7c7',.85,'opacity=".55"'));if(showVectors)parts.push(arrow(pts[j],pts[k],'#70e8d3'));
 }}
 if(mode==='Equipotential slice'&&showPath){const segments=model.contours.map(pair=>'M'+projectPoints(pair).map(xy).join('L')).join('');parts.push('<path d="'+segments+'" fill="none" stroke="'+violet+'" stroke-width="1.8"/>',svgLabel(22,346,'Slice z = '+fmt(p.pz)+' m · V = '+fmt(p.level)+' V',violet));if(!segments)parts.push(svgLabel(22,365,'No crossing at this level in the visible plane.',dull))}
 if(mode==='Gaussian sphere'&&showPath){for(const phi of [0,Math.PI/4,Math.PI/2,3*Math.PI/4]){const pts=Array.from({length:65},(_,i)=>{const t=2*Math.PI*i/64,r=p.radius;return plot(r*Math.sin(t)*Math.cos(phi),r*Math.cos(t),r*Math.sin(t)*Math.sin(phi))});parts.push(path(pts,violet,1,'opacity=".55"'))}
  for(const h of [-.62,0,.62]){const pts=Array.from({length:65},(_,i)=>{const t=2*Math.PI*i/64,r=p.radius,scale=Math.sqrt(1-h*h);return plot(r*scale*Math.cos(t),r*h,r*scale*Math.sin(t))});parts.push(path(pts,violet,.75,'opacity=".55"'))}
  parts.push(svgLabel(22,348,'Enclosed charge '+fmt(s.enclosed)+' nC',violet));
 }
 if(showPath&&p.travel){parts.push(path([plot(p.px-p.travel,p.py,p.pz),plot(p.px+p.travel,p.py,p.pz)],gold,1,'stroke-dasharray="4 4"'))}
 for(const q of model.sources){const a=plot(q.x,q.y,q.z),col=q.q<0?cyan:q.q>0?coral:dull;
 parts.push(circle(a,13,'#15232f',col,1.7),svgLabel(a[0],a[1]+5,q.q<0?'−':q.q>0?'+':'0',col,17,'middle'),svgLabel(a[0]+15,a[1]-10,'Q'+q.id,col));}
 const pt=plot(s.x,s.y,s.z);
 parts.push(circle(pt,5,'#171f28',gold,2),svgLabel(pt[0]+10,pt[1]+16,'probe',gold));
 if(showVectors&&Number.isFinite(s.E)&&s.E>1e-10){const u=[s.ex/s.E,s.ey/s.E,s.ez/s.E],vec=(mag,offset)=>plot(s.x+u[0]*mag+offset,s.y+u[1]*mag,s.z+u[2]*mag);
 parts.push(arrow(pt,vec(.30,0),gold));
 if(p.test!==0){const offset=.025;parts.push(arrow(plot(s.x+offset,s.y,s.z),vec(.19*Math.sign(p.test),offset),violet));}
 parts.push(svgLabel(529,358,'E field',gold),svgLabel(600,358,'F on probe',violet));}
 if(model.warning)parts.push(svgLabel(22,376,'Configuration needs adjustment; see inspector.',coral,11));
 return parts.join('');
}
const chargearray={
 id:'chargearray',module:9,title:'Point-charge workbench',spatial:true,
 intro:'Build an array of up to eight signed point charges in space. Scan a probe through the array, trace field lines, or enclose charges in a Gaussian sphere.',
 assumptions:['Classical electrostatics in vacuum. Sources are fixed and the test charge does not perturb them. Potential is zero at infinity.','The probe is moved externally over eight seconds. Field and force arrows show directions with independent scale factors.','Numerical streamlines use midpoint steps. Their number per source is illustrative. Equipotential contours show one plane. The Gaussian flux follows the exact enclosed-charge law.'],
 misconception:'A charge outside a closed surface affects the field at the surface even though its net contribution to the flux through the whole surface is zero.',
 insight:'A signed test charge can reverse the force on the probe while leaving the source field, potential and flux unchanged.',
 params:[P('px','Probe midpoint x','x₀','m',-.8,.8,.01,0),P('py','Probe y','yₚ','m',-1,1,.01,.26),P('pz','Probe and slice z','zₚ','m',-1,1,.01,.05),P('travel','Scan half-width','b','m',0,.5,.01,.42),P('test','Test charge','qₜ','nC',-5,5,.1,1),{...P('level','Contour potential','Vₛ','V',-200,200,1,20),mode:'Equipotential slice'},{...P('radius','Gaussian radius','R','m',.05,1.05,.01,.55),mode:'Gaussian sphere'}],
 modes:['Field lines','Equipotential slice','Gaussian sphere'],defaultConfig,workbench,act,build,scene,
 metrics:[Q('V','Electric potential','V'),Q('E','Field strength','N/C'),Q('force','Force magnitude','nN'),Q('flux','Flux through sphere','N·m²/C')],
 series:[Q('V','Potential','V'),Q('ex','Field x','N/C'),Q('ey','Field y','N/C'),Q('ez','Field z','N/C'),Q('force','Force magnitude','nN')],
 formulas:[{tex:'V=\\sum_i kq_i/r_i',variables:[['V','Potential at the probe relative to infinity','V'],['i','Source index','1'],['k','Coulomb constant, 8.988 × 10⁹','N·m²/C²'],['q_i','Signed source charge','C'],['r_i','Distance from source i to the probe','m']],meaning:'Work per positive unit charge adds as a signed scalar across all sources.',derivation:'Integrate the inverse-square radial field of each source from infinity to the point. Add the resulting potentials by superposition.',example:'A +2 nC source at 0.20 m and a −1 nC source at 0.30 m give a total potential of 8.988(2/0.20 − 1/0.30) = 59.9 V.'},
 {tex:'\\mathbf E=\\sum_i\\frac{kq_i}{r_i^2}\\hat{\\mathbf r}_i,\\quad\\mathbf F=q_t\\mathbf E',variables:[['\\mathbf E','Net electric field at probe','N/C'],['i','Source index','1'],['k','Coulomb constant','N·m²/C²'],['q_i','Signed source charge','C'],['r_i','Source–probe distance','m'],['\\hat{\\mathbf r}_i','Unit vector from source to probe','1'],['\\mathbf F','Net probe force','N'],['q_t','Signed test charge','C','test']],meaning:'Resolve every source contribution into components before summing. The signed probe charge determines the force direction.',derivation:'Divide Coulomb force for each pair by the test charge and combine the field components along three axes. Multiply the resultant field by the signed test charge.',example:'A field of +120 N/C along x produces −240 nN along x on a −2 nC probe.'},
 {tex:'\\Phi_E=\\oint_S\\mathbf E\\cdot d\\mathbf A=Q_{\\rm in}/\\varepsilon_0',variables:[['\\Phi_E','Net outward electric flux through the closed surface','N·m²/C'],['S','Closed integration surface','1'],['\\mathbf E','Local electric field on the surface','N/C'],['d\\mathbf A','Outward-oriented elemental area vector','m²'],['Q_{\\rm in}','Sum of enclosed signed charges','C'],['\\varepsilon_0','Vacuum permittivity, 8.854 × 10⁻¹²','F/m']],meaning:'Net electric flux depends on the enclosed charge. Crossings into and back out of a closed surface cancel for exterior sources.',derivation:'An individual point charge contributes an outward flux proportional to the signed solid angle subtended by the surface. This angle is a full sphere for enclosed charges and zero for exterior charges. Add the fluxes.',example:'A net enclosed charge of +1 nC gives +112.94 N·m²/C for any enclosing sphere in vacuum.'}],
 challenges:[{question:'A sphere encloses +3.0 nC and −1.0 nC while +7.0 nC sits just outside. The sphere expands and encloses the exterior charge too. By how much does its outward electric flux increase? Use ε₀ = 8.85 × 10⁻¹² F/m.',hints:['Find the change in enclosed charge.','Divide by permittivity and convert nC to C.'],answer:7e-9/8.85e-12,unit:'N·m²/C',tolerance:1.5,solution:'Only the additional +7 nC changes net flux. The increase is 7 × 10⁻⁹ /(8.85 × 10⁻¹²) = 791 N·m²/C.'},{question:'Place three equal +1 nC charges at (0.30,0,0), (0,0.30,0), and (0,0,0.30) m. What force magnitude does a −2.0 nC probe at the origin feel? Use k = 8.99 × 10⁹ N·m²/C².',hints:['The three field contributions have equal magnitudes and orthogonal directions.','Combine the components before multiplying by the probe charge magnitude.'],answer:2*Math.sqrt(3)*8.99/.09,unit:'nN',tolerance:1.2,solution:'Each field component is −99.89 N/C. The magnitude is √3 × 99.89 = 173.0 N/C, giving a force of 346 nN toward the positive octant.'}]
};
export const labs=[chargearray];
