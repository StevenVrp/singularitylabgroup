// SI in all kernels. The magnetic probe displays microteslas for readability.
const TAU=2*Math.PI, MU0=4*Math.PI*1e-7, GRAVITY=9.81;
const cyan='#70e4db',purple='#b7a0ff',amber='#ffc58a',ink='#d6dfeb',soft='#8fa3ba',grid='#34465c';
const param=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const read=(key,label,unit)=>({key,label,unit});
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const n=(x,digits=3)=>Number(x.toPrecision(digits));
const line=(a,b,col=grid,w=1,extra='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${w}" ${extra}/>`;
const dot=(x,y,r,col,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" ${extra}/>`;
const label=(x,y,s,col=ink,anchor='start',size=12)=>`<text x="${x}" y="${y}" fill="${col}" text-anchor="${anchor}" font-size="${size}">${s}</text>`;
const poly=(points,col,width,extra='')=>`<polyline fill="none" stroke="${col}" stroke-width="${width}" points="${points.map(pt=>pt.join(',')).join(' ')}" ${extra}/>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
function arrow(a,b,color,width=2){
 const dx=b[0]-a[0],dy=b[1]-a[1],r=Math.hypot(dx,dy);
 if(r<.1)return '';
 const ux=dx/r,uy=dy/r,h=Math.min(7,r*.42),w=h*.45;
 return line(a,b,color,width)+`<path d="M${b}l${-ux*h+uy*w},${-uy*h-ux*w}l${-2*uy*w},${2*ux*w}Z" fill="${color}"/>`;
}
function circlePath(to,r,y) {return Array.from({length:97},(_,i)=>to(r*Math.cos(TAU*i/96),y,-r*Math.sin(TAU*i/96)));}
function coilSamples(radius,current,x,y) {
 // Midpoint Biot–Savart integral. Probe/field sampling plane is z=0; Bz cancels by symmetry.
 let bx=0,by=0;const pieces=96,dphi=TAU/pieces;
 for(let i=0;i<pieces;i++){
  const a=(i+.5)*dphi,co=Math.cos(a),si=Math.sin(a);
  const dx=x-radius*co,dy=y,dz=radius*si,rsq=dx*dx+dy*dy+dz*dz;
  const dlx=-radius*si*dphi,dlz=-radius*co*dphi,factor=MU0*current/(4*Math.PI*rsq**1.5);
  bx+=-dlz*dy*factor;by+=(dlz*dx-dlx*dz)*factor;
 }
 return [bx,by,0];
}
const magnet={
 id:'magnet',title:'Magnetic field geometry',module:11,spatial:true,
 intro:'Scan the field of a current-carrying wire or circular loop. Rotate the apparatus to inspect the directions hidden by a planar projection.',
 assumptions:['Steady current, vacuum permeability and zero wire thickness. The straight wire is infinitely long.','The circular winding consists of coincident thin turns. Probe readings on its axis use the analytical solution. Off-axis arrows use a 96-element midpoint Biot–Savart sum.','Vector glyphs show direction at each location. Their lengths are normalized. The probe follows a prescribed scan.'],
 misconception:'A loop’s field is strongest near the center along its symmetry axis. The magnetic field of an ideal thin wire becomes singular at the wire itself.',
 insight:'Opposite elements of a circular loop have transverse field components that cancel on the axis. Their axial components add. Far away the loop field falls approximately as the inverse cube of axial distance.',
 modes:['Circular loop','Straight wire'],
 params:[param('current','Conventional current','I','A',-20,20,.1,5),param('radius','Loop radius','R','m',.04,.35,.005,.16),param('turns','Number of turns','N','1',1,40,1,8),param('span','Scan distance','s','m',.08,.6,.005,.3)],
 build(p,mode){
  const wire=mode==='Straight wire',R=p.radius,I=p.current*p.turns;
  const glyphs=[];
  if(!wire){for(const qx of [-1.6,-.7,0,.7,1.6])for(const qy of [-1.35,-.6,.38,1.25])glyphs.push({x:qx*R,y:qy*R,field:coilSamples(R,I,qx*R,qy*R)})}
  return {duration:8,glyphs,at(t){
   const u=clamp(t/8,0,1),x=wire?p.span*(.1+.9*u):0,y=wire?0:p.span*(2*u-1);
   const by=wire?0:MU0*I*R*R/(2*(R*R+y*y)**1.5)*1e6, bz=wire?-MU0*p.current/(TAU*x)*1e6:0;
   return {position:wire?x:y,by,bz,field:Math.hypot(by,bz),x,y};
  }};
 },
 series:[read('field','Field magnitude','μT'),read('by','Axial component','μT'),read('bz','Depth component','μT')],
 metrics:[read('position','Probe coordinate','m'),read('field','Field magnitude','μT'),read('by','Axial field','μT'),read('bz','Depth field','μT')],
 scene({p,mode,model,state:s,view,project,showPath,showVectors}){
  const wire=mode==='Straight wire',spatial=view==='3D',S=Math.max(wire?p.span:p.radius*1.6,p.span);
  const to=(x,y,z)=>spatial?project(x/S,y/S,z/S):[365+x/S*145,192-y/S*145];
  let svg=label(26,28,wire?'LONG STRAIGHT CONDUCTOR':'CIRCULAR WINDING',purple);
  const axis=to(0,0,0);
  if(showPath)svg+=line(to(wire?.1*p.span:0,wire?0:-p.span,0),to(wire?p.span:0,wire?0:p.span,0),amber,1,'stroke-dasharray="4 5"');
  if(wire){
   svg+=line(to(0,-S,0),to(0,S,0),amber,6);
   if(p.current)svg+=arrow(to(0,-Math.sign(p.current)*S*.62,0),to(0,Math.sign(p.current)*S*.62,0),ink,2);
   for(const scale of [.22,.48,.76]){
    if(showPath&&p.current&&spatial)svg+=poly(circlePath(to,S*scale,0),cyan,1,'opacity=".55"');
    if(showVectors&&p.current){for(const f of spatial?[0,.25,.5,.75]:[0,.5]){
     const a=TAU*f,r=S*scale,sign=Math.sign(p.current),pt=to(r*Math.cos(a),0,-r*Math.sin(a));
     if(spatial)svg+=arrow(pt,to(r*Math.cos(a)-sign*.12*S*Math.sin(a),0,-r*Math.sin(a)-sign*.12*S*Math.cos(a)),cyan,1.8);
     else {const inward=sign*Math.cos(a)>0;svg+=dot(...pt,6,'none',`stroke="${cyan}"`)+(inward?line([pt[0]-3,pt[1]-3],[pt[0]+3,pt[1]+3],cyan)+line([pt[0]-3,pt[1]+3],[pt[0]+3,pt[1]-3],cyan):dot(...pt,2,cyan));}
    }}
   }
  }else{
   if(showPath)svg+=line(to(0,-S,0),to(0,S,0),soft,1,'stroke-dasharray="3 5"');
   svg+=poly(circlePath(to,p.radius,0),amber,5);
   if(p.current&&spatial){const d=.30*Math.sign(p.current);svg+=arrow(to(p.radius,0,0),to(p.radius*Math.cos(d),0,-p.radius*Math.sin(d)),ink,2)}
   if(showVectors)for(const g of model.glyphs){const [bx,by]=g.field,r=Math.hypot(bx,by);if(r>0)svg+=arrow(to(g.x,g.y,0),to(g.x+.27*p.radius*bx/r,g.y+.27*p.radius*by/r,0),cyan,1.7)}
  }
  const probe=to(s.x,s.y,0);svg+=dot(...axis,2,soft)+dot(...probe,7,'#1d2836',`stroke="${amber}" stroke-width="2"`)+dot(...probe,2,amber)+label(probe[0]+11,probe[1]-8,'probe',amber);
  return svg+label(24,362,spatial?'3D · drag to orbit':'xy section · ⊗ into page, ⊙ out of page',soft)+label(728,362,'|B| = '+n(s.field)+' μT',cyan,'end');
 },
 formulas:[
  {tex:'B=\\frac{\\mu_0 |I|}{2\\pi r}',variables:[['B','Field magnitude around straight wire','T'],['\\mu_0','Vacuum permeability (approx. 4π × 10⁻⁷)','T m/A'],['I','Signed conventional current','A','current'],['r','Perpendicular distance from wire','m'],['\\pi','Circle constant','1']],meaning:'Outside an infinitely long wire the field is tangent to concentric circles. Its direction follows the right-hand rule.',derivation:'Circular symmetry gives constant field magnitude around an Amperian circle. Multiply the field by its circumference and equate this circulation to permeability times enclosed current.',example:'A 5.0 A wire produces a 10 μT field at 0.10 m.'},
  {tex:'B_y=\\frac{\\mu_0 N I R^2}{2(R^2+y^2)^{3/2}}',variables:[['B_y','Signed axial magnetic field','T'],['\\mu_0','Vacuum permeability','T m/A'],['N','Coincident turns','1','turns'],['I','Current per turn','A','current'],['R','Loop radius','m','radius'],['y','Axial probe coordinate from center','m']],meaning:'A circular winding produces a symmetric axial field with the same direction on either side of the winding.',derivation:'Apply Biot–Savart to a current element, project along the axis and integrate around the loop. Each element has the same distance to the on-axis probe.',example:'Ten turns of radius 0.10 m carrying 2 A give 125.7 μT at the center.'}
 ],
 challenges:[
  {question:'A 4 A straight wire produces the same field magnitude at r as a single 0.15 m circular loop carrying 4 A produces at its center. Find r.',hints:['Use the loop equation at zero axial displacement.','Set the two field magnitudes equal and cancel the common current and permeability.'],answer:.15/Math.PI,unit:'m',tolerance:.0005,solution:'Equating μ₀I/(2πr) to μ₀I/(2R) gives r = R/π = 0.04775 m.'},
  {question:'A circular loop has radius 0.20 m. How far along its axis does its field fall to half the central field?',hints:['Form a ratio to remove the current and permeability.','Raise the reciprocal field ratio to the power 2/3.'],answer:.2*Math.sqrt(2**(2/3)-1),unit:'m',tolerance:.001,solution:'The field ratio is [1+(y/R)²]⁻³ᐟ². Half strength gives y = 0.20√(2²ᐟ³−1) = 0.153 m.'}
 ]
};
magnet.params[1].mode=magnet.params[2].mode='Circular loop';
const buoyancy={
 id:'buoyancy',title:'Buoyancy & hydrostatics',module:6,
 intro:'Lower a prismatic block into a liquid and compare the change in displaced volume with the change in buoyant force. Then release it to find its equilibrium draft.',
 modes:['Immersion sweep','Free equilibrium'],
 assumptions:['The block is a vertical prism with a square cross section, and the liquid is incompressible. The tank is wide enough to neglect the rise of the free surface.','The immersion sweep is externally prescribed. Free equilibrium displays the final static state. Fluid drag and settling transients are omitted.','A dense block rests on an open mesh that admits liquid to its underside. For neutral density the selected equilibrium has its top exactly at the surface.'],
 misconception:'Once a rigid block is fully submerged in a uniform liquid, moving it deeper increases pressure on both its top and bottom. The difference in pressure stays constant.',
 insight:'The increase of pressure with depth gives the buoyant force directly for a vertical prism. Integrating this argument across thin vertical columns gives Archimedes’ result for an arbitrary shape.',
 params:[param('rho','Fluid density','ρ','kg/m³',700,1400,5,1000),param('solid','Block density','ρᵦ','kg/m³',300,2200,10,650),param('height','Block height','H','m',.12,.40,.01,.24),param('width','Square base width','w','m',.06,.20,.005,.12)],
 build(p,mode){
  const area=p.width**2,vol=area*p.height,weight=p.solid*vol*GRAVITY;
  return {duration:6,at(t){const frac=mode==='Free equilibrium'?Math.min(1,p.solid/p.rho):clamp(t/6,0,1);
   const depth=frac*p.height, displaced=frac*vol,buoyant=p.rho*displaced*GRAVITY;
   return {depth,volume:displaced*1000,pressure:p.rho*GRAVITY*depth,buoyant,weight,support:weight-buoyant,frac};
  }};
 },
 series:[read('buoyant','Upthrust','N'),read('support','External force (+ upwards)','N'),read('pressure','Bottom gauge pressure','Pa')],
 metrics:[read('depth','Draft','m'),read('volume','Displaced volume','L'),read('buoyant','Upthrust','N'),read('support','External support','N')],
 scene({p,mode,state:s,showPath,showVectors,focus}){
  const free=mode==='Free equilibrium',water=177,scale=147/Math.max(p.height,.23),base=water+s.depth*scale,top=base-p.height*scale,W=p.width*scale,X=342-W/2;
  let svg=label(24,28,'HYDROSTATIC TANK',purple)+rect(101,water,465,345-water,'#123348')+rect(101,water,465,3,'#6bd8e0');
  for(let d=0;d<=.5;d+=.05){let yy=water+d*scale;if(yy>344)break;svg+=line([101,yy],[115,yy],soft)+label(95,yy+4,n(d)+' m',soft,'end',10)}
  svg+=`<path d="M101 69V345H566V69" fill="none" stroke="${soft}" stroke-width="3"/>`;
  if(showPath){svg+=rect(X,water,W,base-water,cyan,'opacity=".22"')+line([X-18,base],[X+W+28,base],cyan,1,'stroke-dasharray="3 4"')}
  svg+=rect(X,top,W,p.height*scale,'#4b4660',`stroke="${focus==='height'?ink:purple}" stroke-width="2"`)+rect(X,water,W,Math.max(0,base-water),'#43888b','opacity=".38"');
  if(free&&p.solid>p.rho){svg+=line([220,base+2],[458,base+2],soft,3);for(let xx=225;xx<455;xx+=13)svg+=line([xx,base+2],[xx-5,base+7],soft)}
  if(!free)svg+=line([342,46],[342,top],soft,1,'stroke-dasharray="4 4"')+label(347,52,'position control',soft);
  if(showVectors){const div=Math.max(s.buoyant,s.weight,Math.abs(s.support),1e-10),mid=(base+top)/2;
   const force=(x,y,val,color,sym)=>{const end=[x,y-val/div*65];return Math.abs(val)<1e-8?'':arrow([x,y],end,color,2)+label(end[0]+6,end[1]+3,sym,color)};
   svg+=force(X-20,mid,s.buoyant,cyan,'B')+force(X+W+22,mid,-s.weight,amber,'W')+force(X+W+68,mid,s.support,purple,'Fₑ')
  }
  svg+=label(588,water+4,'free surface',cyan)+label(588,water+31,'p gauge = 0',soft);
  return svg+label(24,372,free?'Equilibrium · force sum = 0':'Quasistatic scan · external actuator balances the load',soft);
 },
 formulas:[
  {tex:'B=\\rho gV_{d}',variables:[['B','Buoyant force upwards','N'],['\\rho','Liquid density','kg/m³','rho'],['g','Gravitational acceleration, 9.81','m/s²'],['V_d','Displaced liquid volume','m³']],meaning:'The upward fluid force equals the weight of the displaced liquid.',derivation:'The vertical pressure difference across an immersed depth equals density times gravitational acceleration times depth. Multiplication by the base area gives the displaced-liquid weight.',example:'A displacement of 0.0020 m³ in fresh water generates 19.62 N of upthrust.'},
  {tex:'\\frac{d}{H}=\\frac{\\rho_b}{\\rho}',variables:[['d','Equilibrium draft of a floating prism','m'],['H','Block height','m','height'],['\\rho_b','Uniform block density','kg/m³','solid'],['\\rho','Liquid density','kg/m³','rho']],meaning:'A freely floating prism whose density is below the liquid density submerges a fraction of its height equal to the density ratio.',derivation:'At equilibrium, the weight of the entire prism equals the weight of the displaced fluid. The common base area and gravitational acceleration cancel.',example:'A 0.24 m prism of density 650 kg/m³ floats with 0.156 m submerged in water at 1000 kg/m³.'},
  {tex:'p_g=\\rho gd',variables:[['p_g','Pressure above the free-surface pressure','Pa'],['\\rho','Uniform liquid density','kg/m³','rho'],['g','Gravitational acceleration','m/s²'],['d','Depth below the free surface','m']],meaning:'The mass of the overlying liquid adds a pressure proportional to depth.',derivation:'Balance the weight of a static liquid column against the net upward pressure force on its two ends.',example:'At a depth of 0.15 m in fresh water, gauge pressure is 1472 Pa.'}
 ],
 challenges:[
  {question:'A 0.20 m tall block floats with 0.05 m above fresh water of density 1000 kg/m³. Find its draft in seawater of density 1025 kg/m³.',hints:['Use the freshwater immersed fraction to infer the density of the block.','Apply the new density ratio to the full height.'],answer:.2*750/1025,unit:'m',tolerance:.001,solution:'The original immersed fraction is 0.15/0.20 = 0.75. The block density is 750 kg/m³. In seawater its draft is 0.20 × 750/1025 = 0.1463 m.'},
  {question:'An object weighs 12.0 N in air and needs an upward support force of 3.0 N when completely immersed in water. Neglect air buoyancy. Find its average density.',hints:['The loss of apparent weight equals the upthrust.','Take the ratio of the true weight to the upthrust to eliminate volume and gravity.'],answer:1000*12/9,unit:'kg/m³',tolerance:4,solution:'The upthrust is 9.0 N. Since weight and upthrust act on the same total volume, its density is 1000(12/9) = 1333 kg/m³.'}
 ]
};

const doppler={
 id:'doppler',title:'Moving-source Doppler effect',module:7,
 intro:'Track crests emitted by a moving source and count how quickly they reach a moving receiver. Change the source and receiver velocities independently.',
 assumptions:['Sound travels at constant speed in a homogeneous medium. Source and receiver move at constant velocities along the x-axis, positive to the right.','The receiver stays ahead of the source throughout the scan. Both speeds are subsonic. The source has been emitting since before the observation began.','The top view shows circular cross sections of spherical crests. The receiver trace is normalized pressure; amplitude loss with distance is omitted.'],
 misconception:'Moving the receiver changes the rate at which it crosses crests. Moving the source changes the spacing of successive crests in the medium.',
 insight:'Because the medium defines the propagation speed, the source and receiver velocities enter different parts of the frequency ratio. Equal velocities give zero frequency shift even when both move relative to the medium.',
 params:[param('c','Wave speed','c','m/s',20,360,1,100),param('f','Emission frequency','fₛ','Hz',2,50,.5,10),param('ms','Source velocity / wave speed','vₛ/c','1',-.75,.75,.01,.36),param('mr','Receiver velocity / wave speed','vᵣ/c','1',-.30,.30,.01,0)],
 build(p){const vs=p.c*p.ms,vr=p.c*p.mr,lambda=p.c/p.f,front=(p.c-vs)/p.f,freq=(p.c-vr)/front,initial=10*lambda;
  return {duration:7/p.f,lambda,at(t){const source=vs*t,receiver=initial+vr*t,retarded=(p.c*t-receiver)/(p.c-vs);
   return {source,receiver,freq,front,back:(p.c+vs)/p.f,pressure:Math.cos(TAU*p.f*retarded),offset:freq-p.f};
  }};
 },
 series:[read('pressure','Receiver pressure (normalized)','1'),read('source','Source position','m'),read('receiver','Receiver position','m')],
 metrics:[read('freq','Received frequency','Hz'),read('front','Forward wavelength','m'),read('back','Rear wavelength','m'),read('offset','Frequency shift','Hz')],
 scene({p,model,state:s,t,showPath,showVectors}){
  const sc=31/model.lambda,origin=271,ym=188,px=x=>origin+x*sc,pt=x=>[px(x),ym];
  let out='<defs><clipPath id="dop-stage"><rect x="20" y="43" width="720" height="278" rx="5"/></clipPath></defs>'+label(22,28,'WAVEFRONTS IN THE MEDIUM',purple)+'<g clip-path="url(#dop-stage)">';
  out+=rect(20,43,720,278,'#101c2a')+line([20,ym],[740,ym],grid,1,'stroke-dasharray="3 5"');
  if(showPath){for(let k=-74;k<=Math.floor(t*p.f+1e-9);k++){
   const te=k/p.f,r=Math.max(0,(t-te)*p.c)*sc,x=px(p.c*p.ms*te);
   if(x+r<20||x-r>740)continue;
   out+=dot(x,ym,r,'none',`stroke="${cyan}" stroke-width="1.2" opacity=".58"`);
  }}
  out+='</g>';const source=pt(s.source),receiver=pt(s.receiver);
  out+=dot(...source,9,purple)+dot(...source,3,'#302947')+rect(receiver[0]-5,ym-10,10,20,amber,'rx="3"');
  out+=label(source[0],ym-28,'source',purple,'middle')+label(receiver[0],ym+34,'receiver',amber,'middle');
  if(showVectors){out+=arrow([source[0],ym+17],[source[0]+p.ms*73,ym+17],purple,2)+arrow([receiver[0],ym-17],[receiver[0]+p.mr*100,ym-17],amber,2)}
  return out+label(24,359,'Medium frame · +x to the right',soft)+label(734,359,'receiver signal '+n(s.pressure),amber,'end');
 },
 formulas:[
  {tex:'\\lambda_{+}=\\frac{c-v_s}{f_s}',variables:[['\\lambda_{+}','Wavelength ahead of source','m'],['c','Wave speed in the medium','m/s','c'],['v_s','Signed source velocity in medium frame','m/s','ms'],['f_s','Emission frequency','Hz','f']],meaning:'During one source period the previous crest advances while the source moves to its next emission point.',derivation:'Subtract the source displacement in one period from the distance travelled by the previous forward crest.',example:'With wave speed 340 m/s, source speed +34 m/s and emission frequency 170 Hz, forward crests are 1.80 m apart.'},
  {tex:'f_r=f_s\\frac{c-v_r}{c-v_s}',variables:[['f_r','Frequency at the receiver','Hz'],['f_s','Source emission frequency','Hz','f'],['c','Medium-frame wave speed','m/s','c'],['v_r','Signed receiver velocity along propagation','m/s','mr'],['v_s','Signed source velocity along propagation','m/s','ms']],meaning:'For a receiver ahead of a subsonic source, frequency is the crest speed relative to the receiver divided by the forward wavelength.',derivation:'The receiver crosses a distance c−vᵣ relative to the positive-going crests in each second. Divide by the wavelength in front of the source.',example:'A receiver moving forwards at 17 m/s sees crests 1.80 m apart approaching at 323 m/s, giving 179.4 Hz.'}
 ],
 challenges:[
  {question:'A 500 Hz source and a receiver travel east in still air at 30 m/s and 10 m/s respectively. The receiver is ahead. Taking sound speed as 340 m/s, find the beat frequency with a 500 Hz oscillator on the receiver.',hints:['Compute the received frequency using both medium-frame velocities.','The beat frequency is the absolute difference between the two frequencies.'],answer:500*330/310-500,unit:'Hz',tolerance:.15,solution:'The receiver measures 500 × 330/310 = 532.26 Hz. Its local oscillator gives 32.26 beats per second.'},
  {question:'Two stationary microphones on opposite sides of a moving subsonic source record frequencies in the ratio 5:4 (ahead to behind). At sound speed 342 m/s, find the source speed.',hints:['Write the frequency for a stationary receiver ahead and behind.','Form the ratio so the emission frequency cancels.'],answer:38,unit:'m/s',tolerance:.1,solution:'The frequency ratio is (342+v)/(342−v) = 5/4. Rearrangement gives 9v = 342, or v = 38 m/s.'}
 ]
};
function randomGenerator(seed){
 let s=seed>>>0;
 return ()=>{s=(1664525*s+1013904223)>>>0;return (s+.5)/4294967296};
}
const uncertainty={
 id:'uncertainty',title:'Timing uncertainty & gravity',module:1,
 intro:'Estimate gravity by timing a pendulum. Separate the scatter of repeated readings from the common length uncertainty and a hidden timing bias.',
 modes:['Time one oscillation','Time ten oscillations'],
 assumptions:['The small-angle pendulum has a massless, inextensible string. Its true acceleration due to gravity is 9.81 m/s².','Each gate interval has independent Gaussian timing noise with a common standard deviation. A constant timing offset shifts every interval. The specified seed reproduces the same noise sequence.','Two runs are already recorded at the start. Sample scatter estimates the uncertainty of the mean. The independent length uncertainty is supplied externally. First-order propagation is used. The reported interval is one standard uncertainty.'],
 misconception:'More repeats reduce the random uncertainty of the mean. An unknown common offset in the timer can persist even when the plotted uncertainty becomes small.',
 insight:'Timing several oscillations between two gate readings spreads an approximately fixed timing error over more periods. Improving timing eventually leaves length calibration as the dominant uncertainty.',
 params:[param('length','Pendulum length','L','m',.3,1.5,.01,1),param('uL','Length standard uncertainty','uᴸ','m',0,.025,.0005,.004),param('scatter','Interval timing noise','σₜ','s',0,.15,.005,.07),param('bias','Interval timing bias','b','s',-.15,.15,.005,0),param('sampleSeed','Noise realization','seed','1',1,99,1,7)],
 build(p,mode){const runs=20,cycles=mode==='Time ten oscillations'?10:1;
  const T=TAU*Math.sqrt(p.length/GRAVITY),rng=randomGenerator(p.sampleSeed),records=[];
  for(let i=0;i<runs;i++){
   const z=Math.sqrt(-2*Math.log(rng()))*Math.cos(TAU*rng());
   records.push(T+(p.bias+p.scatter*z)/cycles);
  }
  const cadence=T*cycles,duration=(runs-2)*cadence;
  return {duration,records,truePeriod:T,cycles,at(t){
   const count=Math.min(runs,2+Math.floor(clamp(t,0,duration)/cadence+1e-10)),collected=records.slice(0,count);
   const mean=collected.reduce((a,b)=>a+b,0)/count,sampleVar=collected.reduce((a,b)=>a+(b-mean)**2,0)/(count-1),uMean=Math.sqrt(sampleVar/count);
   const g=(TAU/mean)**2*p.length,ug=g*Math.hypot(p.uL/p.length,2*uMean/mean);
   return {count,mean,uMean,g,ug,lower:g-ug,upper:g+ug,last:records[count-1],systematic:g-GRAVITY};
  }};
 },
 series:[read('g','Estimated gravity','m/s²'),read('lower','Lower 1u bound','m/s²'),read('upper','Upper 1u bound','m/s²'),read('mean','Mean period','s')],
 metrics:[read('count','Runs recorded','1'),read('mean','Mean period','s'),read('g','Measured gravity','m/s²'),read('ug','Standard uncertainty','m/s²')],
 scene({model,state:s,t,showPath,showVectors}){
  const ox=98,oy=68,L=102,angle=.11*Math.cos(TAU*t/model.truePeriod),bob=[ox+L*Math.sin(angle),oy+L*Math.cos(angle)];
  let out=label(24,29,'PENDULUM TIMING',purple)+line([50,oy],[146,oy],soft,4)+line([ox,oy],bob,ink,2)+dot(...bob,10,purple)+dot(ox,oy,4,soft);
  out+=label(98,204,model.cycles+' cycle'+(model.cycles===1?'':'s')+' per run',soft,'middle',11)+label(98,229,n(s.mean,4)+' s',cyan,'middle',15);
  const start=216,end=710,top=69,base=286;const all=[...model.records,model.truePeriod];
  const mid=(Math.max(...all)+Math.min(...all))/2,half=Math.max(.012,(Math.max(...all)-Math.min(...all))*.66);
  const x=i=>start+i*(end-start)/19,y=v=>(base+top)/2-(v-mid)*(base-top)/(2*half);
  out+=label(start,47,'Period estimate per run (s)',soft);
  for(let row=0;row<=4;row++){
   const yv=mid-half+2*half*row/4;
   out+=line([start,y(yv)],[end,y(yv)],grid,.75)+label(start-7,y(yv)+4,n(yv,4),soft,'end',10);
  }
  if(showPath)out+=line([start,y(model.truePeriod)],[end,y(model.truePeriod)],amber,1.2,'stroke-dasharray="4 4"')+label(end,y(model.truePeriod)-7,'ideal period',amber,'end',10);
  for(let i=0;i<s.count;i++)out+=dot(x(i),y(model.records[i]),3.6,cyan);
  if(showVectors)out+=line([start,y(s.mean)],[end,y(s.mean)],purple,1.7);
  for(const i of [0,4,9,14,19])out+=label(x(i),base+18,i+1,soft,'middle',10);
  return out+label(24,357,'Seeded timing trials · two initial readings',soft)+label(731,357,'g = '+n(s.g,4)+' ± '+n(s.ug)+' m/s²',purple,'end');
 },
 formulas:[
  {tex:'g=\\frac{4\\pi^2 L}{\\bar T^2}',variables:[['g','Estimated free-fall acceleration','m/s²'],['\\pi','Circle constant','1'],['L','Pivot-to-bob length','m','length'],['\\bar T','Mean period estimate','s']],meaning:'For small angular amplitudes the pendulum period depends on the square root of length divided by gravity. Inverting that relationship estimates gravity.',derivation:'Linearize the restoring torque for small angular displacement. The angular frequency squared is g/L and one period sweeps 2π radians.',example:'A 1.00 m pendulum with mean period 2.00 s gives g = 9.870 m/s².'},
  {tex:'u_T=\\frac{s_T}{\\sqrt{n}}',variables:[['u_T','Standard uncertainty of the mean period','s'],['s_T','Sample standard deviation of period estimates','s'],['n','Number of independent runs','1']],meaning:'The random error in an average decreases with the square root of the number of independent runs.',derivation:'Add the variances of independent readings and divide by the squared number of readings to obtain the variance of their mean. Estimate the single-reading variance using the sample variance with denominator n−1.',example:'Sixteen independent runs with sample standard deviation 0.040 s give a mean-period uncertainty of 0.010 s.'},
  {tex:'\\frac{u_g}{g}=\\sqrt{\\left(\\frac{u_L}{L}\\right)^2+\\left(\\frac{2u_T}{\\bar T}\\right)^2}',variables:[['u_g','Combined standard uncertainty of gravity','m/s²'],['g','Estimated gravitational acceleration','m/s²'],['u_L','Length standard uncertainty','m','uL'],['L','Pendulum length','m','length'],['u_T','Mean period standard uncertainty','s'],['\\bar T','Mean period','s']],meaning:'Independent length and timing uncertainties add in quadrature after scaling by their effect on the gravity estimate.',derivation:'Differentiate the gravity estimate with respect to length and period. Weight each partial derivative by its independent standard uncertainty and add the squared contributions.',example:'For L = 1.000 ± 0.005 m and T = 2.000 ± 0.010 s, the relative standard uncertainty is 1.12%, giving u(g) = 0.110 m/s².'}
 ],
 challenges:[
  {question:'An experiment has 0.60% relative length uncertainty and 0.40% relative standard uncertainty in the mean period. What percentage standard uncertainty does this give for gravity?',hints:['The period has exponent minus two in the gravity estimator.','Add the two relative contributions in quadrature.'],answer:1,unit:'%',tolerance:.015,solution:'Timing contributes twice 0.40%, or 0.80%. Combining independent contributions gives √(0.60²+0.80²)% = 1.00%.'},
  {question:'A timer adds 0.12 s to every measured interval. A pendulum’s true period is 2.00 s. If you time ten oscillations per interval and know the length exactly, by what percentage is the resulting gravity estimate too low?',hints:['First find the estimated single period from the biased ten-period interval.','Take the ratio of estimated gravity to true gravity using the inverse square dependence.'],answer:100*(1-(2/2.012)**2),unit:'%',tolerance:.015,solution:'The measured interval is 20.12 s, giving a period of 2.012 s. The ratio of estimated to true gravity is (2/2.012)² = 0.98811. The shortfall is 1.189%.'}
 ]
};
export const labs=[magnet,buoyancy,doppler,uncertainty];
