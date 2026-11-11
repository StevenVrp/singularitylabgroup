/* A four-net teaching breadboard. Values are SI inside the numerical model.
   Sources and meters have documented impedances so shorts and loading are measurable. */
const devices = {
  source: {name:'Battery', tag:'B', unit:'V', min:-24, max:24, initial:6},
  resistor: {name:'Resistor', tag:'R', unit:'Ω', min:0.1, max:1e7, initial:1000},
  capacitor: {name:'Capacitor', tag:'C', unit:'µF', min:0.1, max:1e5, initial:1000},
  switch: {name:'Switch', tag:'S', unit:'', min:0, max:1, initial:1},
  ammeter: {name:'Ammeter', tag:'A', unit:'', initial:0.1},
  voltmeter: {name:'Voltmeter', tag:'V', unit:'', initial:1e7}
};
const initialParts=[
  {id:1,kind:'source',a:1,b:0,value:6},
  {id:2,kind:'resistor',a:1,b:2,value:1000},
  {id:3,kind:'capacitor',a:2,b:0,value:1000}
];
const defaultConfig={
  parts: JSON.stringify(initialParts), kind:'resistor', a:'1', b:'2', value:'1000',
  editId:'', probeA:'2', probeB:'0', currentId:'2', message:''
};
const fmt=n=>Math.abs(n)<1e-14?'0':Number(n.toPrecision(4)).toString();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const partsOf=c=>{
  try {const arr=JSON.parse(c.parts);return Array.isArray(arr)?arr:[];} catch {return [];}
};
function caption(part) {
  if(part.kind==='switch') return part.value?'closed':'open';
  if(part.kind==='ammeter') return '0.1 Ω shunt';
  if(part.kind==='voltmeter') return '10 MΩ input';
  return fmt(part.value)+' '+devices[part.kind].unit;
}
function deviceName(part){return devices[part.kind].tag+part.id;}
function option(value,selected,label){
  return '<option value="'+esc(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+esc(label)+'</option>';
}
function select(key,label,options){return '<label>'+label+' <select data-config-key="'+key+'">'+options+'</select></label>';}
const btn=(act,text)=>'<button type="button" data-workbench-action="'+esc(act)+'">'+esc(text)+'</button>';
function workbench({config={}}){
  const c={...defaultConfig,...config}, parts=partsOf(c);
  const nets=(v)=>[0,1,2,3].map(n=>option(n,v,n===0?'0 · ground':n)).join('');
  const type=devices[c.kind]||devices.resistor;
  const valueEditor=c.kind==='switch'
    ?select('value','Contact',[option(1,Number(c.value)!==0?1:0,'Closed'),option(0,Number(c.value)!==0?1:0,'Open')].join(''))
    :['ammeter','voltmeter'].includes(c.kind)?'<p>'+esc(caption({kind:c.kind}))+'</p>':
    '<label>Value ('+type.unit+') <input data-config-key="value" type="number" step="any" min="'+type.min+'" max="'+type.max+'" value="'+esc(c.value)+'"></label>';
  return '<section class="circuit-workbench"><h3>Build a circuit</h3><p>Connect each branch between two numbered nets. Net 0 is ground.</p>'+
    '<div class="net-list">'+parts.map(b=>'<div><strong>'+deviceName(b)+'</strong> '+esc(caption(b))+' · '+b.a+' → '+b.b+' '+btn('edit-'+b.id,'Edit')+' '+btn('remove-'+b.id,'Remove')+(b.kind==='switch'?' '+btn('toggle-'+b.id,b.value?'Open':'Close'):'')+'</div>').join('')+'</div>'+
    '<h4>'+(c.editId?'Edit branch':'New branch')+'</h4>'+
    select('kind','Component',Object.entries(devices).map(([key,d])=>option(key,c.kind,d.name)).join(''))+
    select('a','From net',nets(c.a))+select('b','To net',nets(c.b))+valueEditor+
    btn('commit',c.editId?'Apply changes':'Add branch')+(c.editId?' '+btn('cancel','Cancel edit'):'')+
    (c.message?'<p role="status">'+esc(c.message)+'</p>':'')+
    '<h4>Instrument probes</h4>'+select('probeA','Positive lead',nets(c.probeA))+select('probeB','Reference lead',nets(c.probeB))+
    select('currentId','Current branch',parts.map(b=>option(b.id,c.currentId,deviceName(b)+' · '+devices[b.kind].name)).join(''))+
    '<p>Positive current runs from the first net to the second. The voltage probe in this panel has infinite input resistance.</p></section>';
}
function act(action,config={}){
  const c={...defaultConfig,...config,message:''},parts=partsOf(c);
  const [kind,idText]=action.split('-'),id=Number(idText);
  const found=parts.find(item=>item.id===id);
  if(kind==='edit'&&found) return {...c,kind:found.kind,a:String(found.a),b:String(found.b),value:String(found.value),editId:String(found.id)};
  if(kind==='cancel')return {...c,editId:''};
  if(kind==='remove') {
    const remainder=parts.filter(p=>p.id!==id);
    return {...c,parts:JSON.stringify(remainder),editId:c.editId===String(id)?'':c.editId,currentId:c.currentId===String(id)?String(remainder[0]?.id??''):c.currentId};
  }
  if(kind==='toggle'&&found?.kind==='switch')return {...c,parts:JSON.stringify(parts.map(p=>p===found?{...p,value:p.value?0:1}:p))};
  if(kind!=='commit')return c;
  const d=devices[c.kind],a=Number(c.a),b=Number(c.b);
  if(!d||![a,b].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||a===b)return {...c,message:'Choose two different nets between 0 and 3.'};
  let value=Number(c.value);
  if(c.kind==='switch')value=value?1:0;
  if(['ammeter','voltmeter'].includes(c.kind))value=d.initial;
  else if(c.value===''||!Number.isFinite(value)||value<d.min||value>d.max)return {...c,message:'Enter a value from '+d.min+' to '+d.max+' '+d.unit+'.'};
  if(!c.editId&&parts.length>=8)return {...c,message:'This breadboard holds eight branches. Remove one before adding another.'};
  const part={id:c.editId?Number(c.editId):Math.max(0,...parts.map(x=>x.id))+1,kind:c.kind,a,b,value};
  const next=c.editId?parts.map(p=>p.id===part.id?part:p):[...parts,part];
  return {...c,parts:JSON.stringify(next),editId:'',currentId:String(c.currentId||part.id)};
}
function resistance(p){
  switch(p.kind){
    case 'source':return 1; // Thevenin internal resistance
    case 'switch':return p.value?0.02:Infinity;
    case 'ammeter':return 0.1;
    case 'voltmeter':return 1e7;
    default:return p.value;
  }
}
function solve(a,b){
  // Scaled partial pivoting; at most three node-voltage unknowns.
  const n=b.length;
  for(let k=0;k<n;k++){
    let pivot=k,ratio=-1;
    for(let i=k;i<n;i++){
      const scale=Math.max(...a[i].map(Math.abs));
      const r=scale?Math.abs(a[i][k])/scale:0;
      if(r>ratio){pivot=i;ratio=r;}
    }
    if(ratio<=1e-15||!Number.isFinite(ratio))throw Error('The active nets need a conducting or capacitive path to ground.');
    [a[k],a[pivot]]=[a[pivot],a[k]];
    [b[k],b[pivot]]=[b[pivot],b[k]];
    for(let i=k+1;i<n;i++){
      const weight=a[i][k]/a[k][k];
      for(let j=k;j<n;j++)a[i][j]-=weight*a[k][j];
      b[i]-=weight*b[k];
    }
  }
  for(let i=n-1;i>=0;i--){
    for(let j=i+1;j<n;j++)b[i]-=a[i][j]*b[j];
    b[i]/=a[i][i];
  }
  return b;
}
const zeroState=()=>({probeV:0,probeI:0,loss:0,energy:0,volts:[0,0,0,0],currents:[]});
function build(p,mode,config={}){
  const c={...defaultConfig,...config},parts=partsOf(c),duration=Number(p.window)||5;
  function unavailable(warning){return {duration,parts,warning,invalid:true,at:zeroState};}
  if(!parts.length)return unavailable('Add a branch, then connect a source and a return path to net 0.');
  if(parts.some(b=>!Object.hasOwn(devices,b.kind)||![b.a,b.b].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||b.a===b||!Number.isFinite(b.value)))return unavailable('A branch contains invalid component data. Edit or remove it.');
  const reachable=new Set([0]), active=new Set(parts.flatMap(b=>[b.a,b.b]));
  for(let k=0;k<4;k++)for(const b of parts){
    if(b.kind==='switch'&&!b.value)continue;
    if(reachable.has(b.a))reachable.add(b.b);
    if(reachable.has(b.b))reachable.add(b.a);
  }
  const floating=[...active].filter(n=>!reachable.has(n));
  if(floating.length)return unavailable('Floating net '+floating.join(', ')+'. Connect this net to ground through a component, or close its return switch.');
  const nodes=[...active].filter(n=>n!==0).sort(),index=Object.fromEntries(nodes.map((v,i)=>[v,i]));
  const hasC=parts.some(d=>d.kind==='capacitor'), currentIndex=parts.findIndex(d=>d.id===Number(c.currentId));
  const probeOK=(active.has(Number(c.probeA))||Number(c.probeA)===0)&&(active.has(Number(c.probeB))||Number(c.probeB)===0);
  const m=nodes.length, states=[],times=[],old=new Float64Array(parts.length);
  function advance(dt){
    const matrix=Array.from({length:m},()=>Array(m).fill(0)),rhs=Array(m).fill(0);
    const terms=parts.map((d,i)=>{
      const cap=d.kind==='capacitor',g=cap?d.value*1e-6/dt:1/resistance(d);
      const emf=cap?old[i]:d.kind==='source'?d.value:0;
      const a=index[d.a],b=index[d.b];
      if(a!==undefined){matrix[a][a]+=g;rhs[a]+=g*emf;}
      if(b!==undefined){matrix[b][b]+=g;rhs[b]-=g*emf;}
      if(a!==undefined&&b!==undefined){matrix[a][b]-=g;matrix[b][a]-=g;}
      return [g,emf];
    });
    const result=solve(matrix,rhs),s=zeroState();
    nodes.forEach((n,i)=>{s.volts[n]=result[i];});
    s.currents=parts.map((d,i)=>{
      const v=s.volts[d.a]-s.volts[d.b];
      const [g,emf]=terms[i],iAB=g*(v-emf);
      if(d.kind==='capacitor'){old[i]=v;s.energy+=0.5*d.value*1e-6*v*v;}
      else if(g>0)s.loss+=iAB*iAB/g;
      return iAB;
    });
    s.probeV=s.volts[Number(c.probeA)]-s.volts[Number(c.probeB)];
    s.probeI=s.currents[currentIndex]??0;
    return s;
  }
  try {
    // The tiny first step approximates the right-hand limit for initially
    // uncharged capacitors. Geometrically spaced steps resolve short RC times.
    const count=hasC?1400:1;
    const ratio=18,scale=duration/Math.expm1(ratio);
    const tiny=hasC?Math.min(duration*1e-11,1e-13):duration;
    times.push(0);states.push(advance(tiny));
    for(let i=1;i<=count;i++){
      const t=hasC?scale*Math.expm1(ratio*i/count):duration;
      const dt=t-Math.max(times[times.length-1],hasC?tiny:0);
      times.push(t);states.push(advance(dt));
    }
  } catch(error){return unavailable(error.message);}
  function at(t){
    if(t<=0)return states[0];
    if(t>=duration)return states.at(-1);
    let l=0,r=times.length-1;
    while(r-l>1){const i=(l+r)>>1;if(times[i]<=t)l=i;else r=i;}
    const f=(t-times[l])/(times[r]-times[l]),a=states[l],b=states[r],lerp=(u,v)=>u+(v-u)*f;
    return {probeV:lerp(a.probeV,b.probeV),probeI:lerp(a.probeI,b.probeI),loss:lerp(a.loss,b.loss),energy:lerp(a.energy,b.energy),
      volts:a.volts.map((u,i)=>lerp(u,b.volts[i])),currents:a.currents.map((u,i)=>lerp(u,b.currents[i]))};
  }
  return {duration,parts,at,warning:probeOK?'':'A voltage probe is on an unused net. Select two connected nets to read a physical voltage.',probeOK};
}
const palette={cyan:'#6ce3e1',blue:'#90b6ff',gold:'#f7c786',salmon:'#ffa598',muted:'#96abc3',wire:'#64889e',paper:'#0f1c2b'};
const text=(x,y,s,color=palette.muted,size=11,anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" font-family="ui-monospace,monospace" text-anchor="'+anchor+'">'+esc(s)+'</text>';
const line=(x1,y1,x2,y2,color,w=2)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="'+w+'"/>';
function glyph(d,x,y,sign,color){
  const l=x-26,r=x+26,ink=palette.paper;
  let body='';
  if(d.kind==='resistor')body='<path d="M-26 0h5l4 -7 6 14 6 -14 6 14 6 -14 6 14 4 -7h9" fill="none" stroke="currentColor" stroke-width="2.4"/>';
  if(d.kind==='source')body='<path d="M-26 0h14m0 -9v18m6 -4v-10m0 5h8m0 -9v18m6 -4v-10m0 5h18" fill="none" stroke="currentColor" stroke-width="2.1"/>';
  if(d.kind==='capacitor')body='<path d="M-26 0h21m0 -11v22m10 -22v22m0 -11h21" fill="none" stroke="currentColor" stroke-width="2.3"/>';
  if(d.kind==='switch')body='<path d="M-26 0h13m26 0h13M-13 0L13 '+(d.value?0:-13)+'" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="-13" r="2.8" fill="currentColor"/><circle cx="13" r="2.8" fill="currentColor"/>';
  if(d.kind==='ammeter'||d.kind==='voltmeter')body='<path d="M-26 0h13m26 0h13" stroke="currentColor" stroke-width="2"/><circle r="13" fill="'+ink+'" stroke="currentColor" stroke-width="2"/><g transform="scale('+sign+' 1)">'+text(0,4,d.kind==='ammeter'?'A':'V',color,12,'middle')+'</g>';
  return '<rect x="'+l+'" y="'+(y-12)+'" width="'+(r-l)+'" height="24" fill="'+ink+'"/><g transform="translate('+x+' '+y+') scale('+sign+' 1)" color="'+color+'">'+body+'</g>';
}
function scene({model,state,showVectors,config}){
  const c={...defaultConfig,...config},parts=model.parts||[], railX=[165,270,375,480],ys=parts.map((_,i)=>parts.length===1?173:87+i*(244/Math.max(3,parts.length-1)));
  let svg='<rect x="35" y="25" width="690" height="330" rx="13" fill="'+palette.paper+'" stroke="#324659"/>'+
    text(54,52,'BRANCH',palette.muted,10)+text(524,52,'A → B  /  MEASURED CURRENT',palette.muted,10);
  const active=new Set(parts.flatMap(d=>[d.a,d.b]));
  for(let n=0;n<4;n++){
    const x=railX[n],col=active.has(n)?palette.wire:'#324454';
    svg+=line(x,67,x,344,col,1.5)+text(x,52,String(n)+(n===0?' ⏚':''),active.has(n)?palette.cyan:col,12,'middle');
  }
  parts.forEach((d,i)=>{
    const y=ys[i],xa=railX[d.a],xb=railX[d.b],mid=(xa+xb)/2,col=d.kind==='source'?palette.gold:d.kind==='capacitor'?palette.blue:palette.cyan;
    svg+=text(55,y+4,deviceName(d),col,13)+line(xa,y,xb,y,col,2)+glyph(d,mid,y,Math.sign(xb-xa),col);
    for(const x of [xa,xb])svg+='<circle cx="'+x+'" cy="'+y+'" r="4" fill="'+col+'" stroke="'+palette.paper+'" stroke-width="1"/>';
    const current=state.currents[i]||0;
    if(showVectors&&Math.abs(current)>1e-9){
      const dir=Math.sign(xb-xa)*Math.sign(current),cx=dir>0?Math.max(xb,xa)-13:Math.min(xb,xa)+13;
      svg+='<path d="M'+(cx-4*dir)+' '+(y-4)+' l'+(6*dir)+' 4 l'+(-6*dir)+' 4" stroke="'+palette.salmon+'" stroke-width="2" fill="none"/>';
    }
    svg+=text(524,y-2,caption(d),col,11)+text(524,y+13,model.invalid?'—':fmt(current*1000)+' mA',palette.muted,10);
  });
  if(!parts.length)svg+=text(367,191,'Add a branch in the build panel',palette.cyan,15,'middle');
  svg+=text(42,377,'●  Joined to net     Crossing without a dot = disconnected',palette.muted,10);
  return svg;
}
const probeV={key:'probeV',label:'Probe voltage',unit:'V'};
const probeI={key:'probeI',label:'Branch current',unit:'A'};
const loss={key:'loss',label:'Resistive heating',unit:'W'};
const energy={key:'energy',label:'Capacitor energy',unit:'J'};
export const labs=[{
  id:'network',module:10,title:'Circuit builder',
  intro:'Wire a battery, resistor and capacitor to numbered nets. Probe a voltage difference, then insert a meter or close a switch to see how the entire network responds.',
  params:[{key:'window',label:'Observation window',symbol:'T',unit:'s',min:0.1,max:30,step:0.1,value:5}],
  defaultConfig,workbench,act,build,scene,
  metrics:[probeV,probeI,loss,energy],series:[probeV,probeI,energy],
  assumptions:[
    'A net is an equipotential conductor. Four nets and up to eight two-terminal components are available. Ground defines zero voltage.',
    'Each battery has 1 Ω internal resistance. A closed switch has 0.02 Ω resistance. An open switch is insulating. The ammeter uses a 0.1 Ω shunt and the voltmeter loads the circuit with 10 MΩ.',
    'Capacitors start uncharged after each edit. Time-dependent solutions use 1,400 geometrically spaced backward-Euler steps; the first displayed current approximates its limit just after connection.',
    'Opening or closing a switch starts a new run from the initial conditions. Components have fixed properties independent of temperature.'
  ],
  misconception:'Two wires may cross in the schematic without connecting. Only a junction dot connects a branch to its numbered rail. A meter wired across a battery draws a current determined by its own resistance.',
  insight:'An ideal voltmeter can conceal loading. Place the 10 MΩ meter across a 10 MΩ divider resistor. Its parallel conductance changes the terminal voltage even though the meter is designed to draw little current.',
  formulas:[
    {tex:'\\sum_{j} I_j=0',variables:[['j','Index of a branch connected to the chosen net','1'],['I_j','Signed current leaving the net through branch j','A']],meaning:'Current cannot accumulate at a lumped ideal junction. The solver imposes this balance at every non-ground net.',derivation:'During a short interval each outgoing branch transports its current times the interval in charge. Summing those transfers and imposing zero charge accumulation gives the node equation.',example:'At a junction, 3 mA enters and 1 mA leaves through one resistor. The second outgoing branch must carry 2 mA.'},
    {tex:'I_{AB}=\\frac{V_A-V_B-\\mathcal E}{r}',variables:[['I_{AB}','Current through the source, positive from net A to net B','A'],['V_A','Potential at its positive-marked terminal A','V'],['V_B','Potential at its negative-marked terminal B','V'],['\\mathcal E','Open-circuit electromotive force','V'],['r','Battery internal resistance, fixed at 1 Ω in this lab','Ω']],meaning:'A supplying battery has negative branch current under this passive sign convention. Its series resistance limits short-circuit current.',derivation:'Traverse the branch from A to B. Its voltage drop is the sum of the source electromotive force and the resistive drop. Rearrangement gives the signed current.',example:'A 6 V battery has 5.8 V across its terminals under load. With 1 Ω internally, the A-to-B current is −0.20 A, so it supplies 0.20 A to the load.'},
    {tex:'I_{AB}^{n}=C\\frac{V_{AB}^{n}-V_{AB}^{n-1}}{\\Delta t}',variables:[['I_{AB}^{n}','Capacitor current from A to B at the end of step n','A'],['C','Capacitance','F'],['V_{AB}^{n}','A-to-B voltage at the end of the time step','V'],['V_{AB}^{n-1}','A-to-B voltage at the preceding time step','V'],['n','Time-step index','1'],['\\Delta t','Length of this time step','s']],meaning:'Charging current measures how quickly voltage across a constant-capacitance device changes. This backward difference is the numerical model used by the solver.',derivation:'Stored plate charge is capacitance times voltage. Subtract consecutive charges, then divide by the elapsed time. Assigning that mean current to the new time level gives backward Euler.',example:'For 20 µF, a voltage increase from 2.0 V to 2.5 V in 0.010 s gives a mean charging current of 1.0 mA.'}
  ],
  challenges:[
    {question:'A 6.00 V battery with 1.00 Ω internal resistance supplies two identical 1.00 kΩ resistors in series. A 1.00 kΩ test resistor is connected across the lower resistor. Find the loaded voltage across the lower resistor.',hints:['Replace the two parallel resistors with their equivalent resistance.','Include the battery resistance when determining the loop current.'],answer:6*500/1501,unit:'V',tolerance:0.01,solution:'The two parallel 1.00 kΩ resistors give 500 Ω. The loop resistance is 1,501 Ω. Its current is 6/1,501 A, giving 1.999 V across 500 Ω.'},
    {question:'An uncharged 1000 µF capacitor charges through a 999 Ω resistor and a 6 V battery with 1 Ω internal resistance. After 1.00 s, how much energy has been dissipated in both resistances together? Give millijoules.',hints:['The total series resistance is 1000 Ω, so the time constant is 1.00 s.','Battery work is emf multiplied by delivered charge. Deduct the energy remaining in the electric field.'],answer:18*(1-Math.exp(-2)),unit:'mJ',tolerance:0.08,solution:'The capacitor reaches 6(1 − exp(−1)) V. Multiply this voltage by 0.001 F for its charge, then multiply charge by 6 V for battery work. Subtract half the capacitance times the square of its final voltage. The resistors dissipate 15.56 mJ.'}
  ]
}];
