// Electromagnetism models use SI internally. Presentation units are declared per observable.
const K = 8.9875517923e9;
const MU0 = 1.25663706e-6;
const cyan = '#69e7db', coral = '#ff967e', amber = '#f4c780', pale = '#c7d9e8', dim = '#829caf';
const param = (key,label,symbol,unit,min,max,step,value) => ({key,label,symbol,unit,min,max,step,value});
const quantity = (key,label,unit) => ({key,label,unit});
const fmt = (n,d=2) => Number(n.toFixed(d)).toString();
const stroke = (points,color,width=1.5,extra='') => '<polyline points="'+points.map(p=>p.map(x=>x.toFixed(2)).join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
const label = (x,y,s,color=dim,size=13,anchor='start') => '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" font-family="ui-monospace,monospace" text-anchor="'+anchor+'">'+s+'</text>';
const circle = (p,r,fill,strokeColor='none',width=1,extra='') => '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" fill="'+fill+'" stroke="'+strokeColor+'" stroke-width="'+width+'" '+extra+'/>';
function arrow(a,b,color,width=1.7){
  const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);
  if(l<1) return '';
  const k=Math.min(7,l*.40),x=dx/l,y=dy/l;
  return stroke([a,b],color,width)+stroke([[b[0]-k*x+k*.48*y,b[1]-k*y-k*.48*x],b,[b[0]-k*x-k*.48*y,b[1]-k*y+k*.48*x]],color,width);
}
const marker=(a,b,c)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);return l>0?arrow(a,[a[0]+dx*10/l,a[1]+dy*10/l],c,1):'';};
function sampleField(p,x,y,z=0){
  let ex=0,ey=0,ez=0,potential=0;
  for(const [cx,q] of [[-p.d/2,p.q1],[p.d/2,p.q2]]){
    if(q===0) continue;
    const dx=x-cx,r=Math.hypot(dx,y,z);
    if(r===0) return null;
    const v=K*q*1e-9/r;
    ex+=v*dx/r**2; ey+=v*y/r**2; ez+=v*z/r**2;potential+=v;
  }
  return {ex,ey,ez,potential,field:Math.hypot(ex,ey,ez)};
}
function fieldGeometry(p,mode){
  const curves=[];
  if(mode==='Equipotentials'){
    // Marching squares in one meridional plane. The grid avoids interpolating across source singularities.
    const nx=92,ny=48,left=-1.5,bottom=-.80,dx=3/nx,dy=1.6/ny;
    const values=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>sampleField(p,left+i*dx,bottom+j*dy)?.potential??1e10));
    if(p.q1===0&&p.q2===0) return curves;
    const scale=Math.max(Math.abs(p.q1),Math.abs(p.q2))*K*1e-9;
    for(const level of [-8,-4,-2,-1,-.5,0,.5,1,2,4,8].map(v=>v*scale)){
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
        const v=[values[j][i],values[j][i+1],values[j+1][i+1],values[j+1][i]],x=left+i*dx,y=bottom+j*dy;
        const pts=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy]],cross=[];
        for(let k=0;k<4;k++){
          const m=(k+1)%4;
          if((v[k]>=level)===(v[m]>=level))continue;
          const f=(level-v[k])/(v[m]-v[k]);
          cross.push(pts[k].map((a,n)=>a+f*(pts[m][n]-a)));
        }
        for(let k=1;k<cross.length;k+=2)curves.push({pts:cross.slice(k-1,k+1),color:level<0?cyan:level>0?coral:pale,sign:0});
      }
    }
    return curves;
  }
  const sources=[[-p.d/2,p.q1],[p.d/2,p.q2]];
  // Start on the larger-magnitude charge. For like signs seed both sources.
  const seeds=p.q1*p.q2<0?[Math.abs(p.q1)>=Math.abs(p.q2)?sources[0]:sources[1]]:sources;
  for(const [cx,q] of seeds){
    if(q===0) continue;
    const sign=Math.sign(q);
    for(let k=0;k<18;k++){
      let angle=(k+.5)*2*Math.PI/18,x=cx+.025*Math.cos(angle),y=.025*Math.sin(angle);
      const pts=[[x,y]];
      for(let i=0;i<220;i++){
        const a=sampleField(p,x,y);if(!a||a.field<1e-6)break;
        const h=.014*sign,m=sampleField(p,x+h*a.ex/a.field/2,y+h*a.ey/a.field/2);
        if(!m||m.field<1e-6)break;
        x+=h*m.ex/m.field;y+=h*m.ey/m.field;pts.push([x,y]);
        if(Math.abs(x)>1.47||Math.abs(y)>.79||sources.some(([sx,sq])=>sq&&Math.hypot(x-sx,y)<.022))break;
      }
      curves.push({pts,color:cyan,sign});
    }
  }
  return curves;
}
function buildField(p,mode){
  return {duration:8,geometry:fieldGeometry(p,mode),at(t){
    const x=-1+Math.min(8,Math.max(0,t))/4;
    const e=sampleField(p,x,p.h);
    return {...e,x,y:p.h,force:p.probe*e.field,fx:p.probe*e.ex,fy:p.probe*e.ey};
  }};
}
function fieldScene({p,mode,model,state:s,showPath,showVectors,project,view,focus}){
  const spatial=view==='3D';
  const xy=(x,y,z=0)=>spatial?project(x/1.5,y/1.5,z/1.5):[380+x*220,205-y*220];
  let out='';
  for(let i=-6;i<=6;i++)out+=stroke([xy(i/4,-.76),xy(i/4,.76)],'#25384c',.6);
  for(let i=-3;i<=3;i++)out+=stroke([xy(-1.5,i/4),xy(1.5,i/4)],'#25384c',.6);
  out+=stroke([xy(-1.5,0),xy(1.5,0)],'#52667a',1)+stroke([xy(0,-.76),xy(0,.76)],'#52667a',1);
  if(!spatial)out+=label(704,224,'x / m')+label(389,39,'y / m')+label(153,224,'−1')+label(595,224,'1');
  if(showPath){
    const contours=new Map();
    for(const curve of model.geometry){
      if(mode==='Equipotentials'){
        const [a,b]=curve.pts.map(([x,y])=>xy(x,y));
        const d='M'+a.map(v=>v.toFixed(1)).join(' ')+'L'+b.map(v=>v.toFixed(1)).join(' ');
        contours.set(curve.color,(contours.get(curve.color)||'')+d);
        continue;
      }
      const draw=(phi,alpha)=>{
        const pts=curve.pts.map(([x,y])=>xy(x,y*Math.cos(phi),y*Math.sin(phi)));
        let path=stroke(pts,curve.color,mode==='Equipotentials'?1.5:1.1,'opacity="'+alpha+'"');
        if(curve.sign&&pts.length>8){
          const i=Math.max(1,Math.floor(pts.length*.56));
          path+=marker(pts[i],pts[i+curve.sign],curve.color);
        }
        return path;
      };
      out+=draw(0,.72);
      if(spatial)out+=draw(Math.PI/2,.28);
    }
    for(const [c,d] of contours)out+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="1.4" opacity=".75"/>';
  }
  const a=xy(-1,p.h),b=xy(1,p.h);
  out+=stroke([a,b],amber,1,'stroke-dasharray="3 6" opacity=".6"');
  for(const [x,q,key,tag] of [[-p.d/2,p.q1,'q1','q₁'],[p.d/2,p.q2,'q2','q₂']]){
    const pos=xy(x,0),c=q<0?cyan:q>0?coral:pale;
    out+=circle(pos,25,c,'none',1,'opacity=".08"')+circle(pos,15,'#132533',c,2)+label(pos[0],pos[1]+5,q<0?'−':q>0?'+':'0',c,17,'middle')+label(pos[0],pos[1]+37,tag+'  '+fmt(q)+' nC',c,12,'middle');
    if(focus===key)out+=circle(pos,29,'none',amber,1.5);
    if(!spatial&&key==='q2')out+=circle(pos,19,'transparent','none',0,'data-drag-param="d" data-drag-min-x="402" data-drag-max-x="512" style="cursor:ew-resize"');
  }
  const point=xy(s.x,s.y);
  if(showVectors&&s.field>1e-10){
    const length=.22;out+=arrow(point,xy(s.x+s.ex/s.field*length,s.y+s.ey/s.field*length),amber,2.5);
  }
  out+=circle(point,7,'#11232d',amber,2)+circle(point,2.3,amber)+label(point[0],point[1]-14,'probe',amber,11,'middle');
  return out;
}
const field={
  id:'field',title:'Electric field & potential',module:9,spatial:true,
  intro:'Move a probe across two stationary charges and compare the direction of the field with the local change in potential.',
  assumptions:['Point charges in vacuum. Source positions and charges remain fixed during each scan.','The probe follows a prescribed path at 0.25 m/s and does not perturb the sources.','Field arrows show direction. Streamline spacing is illustrative. Equipotentials are numerical contour slices.'],
  misconception:'A zero potential can coexist with a strong field. Potential adds with its sign, while field components add as vectors.',
  insight:'For an equal and opposite pair, the perpendicular bisector has zero potential everywhere. The field crosses this surface at right angles.',
  params:[param('q1','Left charge','q₁','nC',-10,10,.25,4),param('q2','Right charge','q₂','nC',-10,10,.25,-4),param('d','Charge separation','d','m',.2,1.2,.01,.8),param('h','Probe height','h','m',.06,.65,.01,.32),param('probe','Positive test charge','qₜ','nC',.1,5,.1,1)],
  modes:['Field lines','Equipotentials'],build:buildField,scene:fieldScene,
  series:[quantity('potential','Electric potential','V'),quantity('ex','Horizontal field','N/C'),quantity('ey','Vertical field','N/C')],
  metrics:[quantity('potential','Potential','V'),quantity('field','Field strength','N/C'),quantity('force','Force magnitude','nN')],
  formulas:[
    {tex:String.raw`V=\sum_i\frac{kq_i}{r_i}`,variables:[['V','Potential relative to infinity','V'],['i','Source-charge index','1'],['k','Coulomb constant, 8.988 × 10⁹','N m²/C²'],['q_i','Signed source charge','C','q1'],['r_i','Distance from source i to the probe','m']],meaning:'Potential is the work per unit positive charge required to bring a probe from infinity against the electrostatic force.',derivation:'Integrate the outward inverse-square field from the observation point to infinity. Each source contributes a signed scalar potential.',example:'At 0.40 m from a single +4.0 nC source, the potential is +89.9 V.'},
    {tex:String.raw`\mathbf E=\sum_i\frac{kq_i}{r_i^2}\hat{\mathbf r}_i,\quad \mathbf F=q_t\mathbf E`,variables:[['E','Electric field at the probe','N/C'],['F','Force on the probe','N'],['q_t','Positive probe charge','C','probe'],['i','Source index','1'],['k','Coulomb constant','N m²/C²'],['q_i','Source charge','C','q2'],['r_i','Source–probe distance','m'],['r̂_i','Unit vector pointing from source i to probe','1']],meaning:'The signed charge determines whether the field points away from or toward a source. Forces on a positive probe point along the net field.',derivation:'Apply Coulomb’s force law to each source–probe pair, add the forces vectorially, then divide by the probe charge.',example:'At the midpoint between +4 and −4 nC separated by 0.80 m, each field is 224.7 N/C to the right. A +1 nC probe feels 449 nN to the right.'}
  ],
  challenges:[
    {question:'A +4.0 nC charge sits at x = −0.40 m and a −4.0 nC charge at x = +0.40 m. Find the horizontal field at the origin. Take right as positive.',hints:['Draw the two field vectors before adding.','Both contributions point right. Each distance is 0.40 m.'],answer:449.38,unit:'N/C',solution:'Each source contributes 8.988 × 10⁹ × 4 × 10⁻⁹ / 0.40² = 224.7 N/C to the right. The horizontal field is +449.4 N/C.',tolerance:1.2},
    {question:'Two positive point charges of 1.0 nC and 9.0 nC are separated by 0.80 m. Where between them is the field zero? Give the distance from the smaller charge.',hints:['At the null point, the fields have opposite directions and equal magnitudes.','The distances must be in the ratio of the square roots of the charges.'],answer:.20,unit:'m',solution:'The 9 nC source must be three times farther away. The two distances sum to 0.80 m, so the smaller distance is 0.80/4 = 0.20 m.',tolerance:.004}
  ]
};
function buildRC(p,mode){
  const R=p.resistance*1e3,C=p.capacitance*1e-6,tau=R*C;
  const source=mode==='Discharge'?0:p.voltage,initial=mode==='Discharge'?p.voltage:0;
  return {duration:5*tau,at(t){
    const voltage=source+(initial-source)*Math.exp(-t/tau),current=(source-voltage)/R;
    return {voltage,current:current*1e3,charge:C*voltage*1e6,energy:.5*C*voltage**2*1e3,tau,resistor:current*R};
  }};
}
function rcScene({p,mode,state:s,showVectors,showPath,focus}){
  const charging=mode!=='Discharge',wire='#82b9c5';
  const path=(pts,c=wire,w=2.2)=>stroke(pts,c,w);
  const top=100,bottom=275,left=150,right=590;
  let out=label(54,39,'SERIES LOOP',dim,12)+label(700,39,'IDEAL COMPONENTS',dim,12,'end');
  out+=path([[left,180],[left,top],[262,top]])+path([[262,top],[295,top]])+path([[295,top],[330,top]]);
  out+=circle([262,top],3.8,wire)+circle([295,top],3.8,wire)+label(277,81,'closed',dim,11,'middle');
  const zig=[[330,top],[340,top]];
  for(let i=0;i<8;i++)zig.push([345+i*9,top+(i%2?-10:10)]);
  zig.push([417,top],[430,top]);out+=path(zig,focus==='resistance'?amber:coral,2.8);
  out+=label(380,64,'R  '+fmt(p.resistance)+' kΩ',coral,14,'middle');
  out+=path([[430,top],[right,top],[right,175]])+path([[right,195],[right,bottom],[left,bottom],[left,220]]);
  if(charging){
    out+=path([[left,180],[left,185]])+path([[left-22,185],[left+22,185]],amber,3)+path([[left-12,201],[left+12,201]],amber,4)+path([[left,201],[left,220]]);
    out+=label(110,178,'+',amber,17)+label(110,212,'−',amber,17)+label(95,198,fmt(p.voltage)+' V',amber,16,'end');
  }else{
    out+=path([[left,180],[left,220]])+label(128,200,'return',dim,12,'end');
  }
  const chargeFrac=s.voltage/p.voltage;
  out+=path([[right-32,175],[right+32,175]],focus==='capacitance'?amber:cyan,3.8)+path([[right-32,195],[right+32,195]],focus==='capacitance'?amber:cyan,3.8);
  out+=label(638,174,'C',cyan,17)+label(638,196,fmt(p.capacitance)+' μF',pale,13);
  if(showPath) {
    for(let i=0;i<5;i++){
      const x=right-24+i*12;
      out+='<g opacity="'+chargeFrac+'">'+label(x,166,'+',coral,11,'middle')+label(x,212,'−',cyan,11,'middle')+'</g>';
    }
  }
  if(showVectors){
    const x1=charging?458:530,x2=charging?530:458;
    out+=arrow([x1,top-12],[x2,top-12],amber,2)+label(495,66,'I  '+fmt(s.current,3)+' mA',amber,12,'middle');
  }
  // An ideal voltmeter draws zero current.
  out+=path([[right,143],[516,143],[516,168]],'#536f80',1.3)+path([[516,203],[516,232],[right,232]],'#536f80',1.3);
  out+=circle([516,185],18,'#122532',pale,1.4)+label(516,191,'V',pale,17,'middle')+label(488,191,fmt(s.voltage,3)+' V',pale,12,'end');
  out+=label(150,333,charging?'CHARGING':'DISCHARGING',cyan,12)+label(383,333,'Stored energy',dim,12)+label(590,333,fmt(s.energy,3)+' mJ',amber,13,'end');
  return out;
}
const rc={
  id:'rc',title:'RC transients',module:10,
  intro:'Watch charge accumulate on capacitor plates after a switch closes. Compare the capacitor voltage and signed current as the circuit approaches equilibrium.',
  assumptions:['Ideal DC voltage source and switch. The resistor is ohmic and the capacitor is linear, with no leakage.','Charging begins with an uncharged capacitor. Discharge begins with the capacitor at the selected voltage and the battery disconnected.','The voltmeter has infinite input resistance. Positive current enters the upper capacitor plate.'],
  misconception:'A capacitor charging from a fixed voltage draws its largest current at the start. As the capacitor voltage rises, the voltage across the resistor falls.',
  insight:'Doubling resistance stretches the time axis by two and halves the initial charging current. The final stored energy depends only on capacitance and voltage.',
  params:[param('voltage','Initial or supply voltage','V₀','V',1,20,.1,9),param('resistance','Resistance','R','kΩ',.5,100,.5,10),param('capacitance','Capacitance','C','μF',10,1000,10,100)],
  modes:['Charge','Discharge'],build:buildRC,scene:rcScene,
  series:[quantity('voltage','Capacitor voltage','V'),quantity('current','Loop current','mA'),quantity('energy','Stored energy','mJ')],
  metrics:[quantity('voltage','Capacitor voltage','V'),quantity('current','Loop current','mA'),quantity('tau','Time constant','s')],
  formulas:[
    {tex:String.raw`V_C(t)=V_f+(V_i-V_f)e^{-t/(RC)}`,variables:[['V_C','Voltage of upper plate relative to lower','V'],['V_i','Initial capacitor voltage','V','voltage'],['V_f','Final capacitor voltage','V','voltage'],['R','Series resistance','Ω','resistance'],['C','Capacitance','F','capacitance'],['t','Elapsed time since switching','s'],['e','Base of the natural logarithm','1']],meaning:'At a fixed supply voltage, the gap between the capacitor voltage and its final value falls exponentially.',derivation:'Kirchhoff’s loop rule gives the resistor drop as the final voltage minus the instantaneous capacitor voltage. Equate the resistor current to capacitance times the voltage derivative and integrate with the initial condition.',example:'For 9 V, 10 kΩ, and 100 μF, the time constant is 1.00 s. One second after switching from zero the capacitor voltage is 9(1 − 0.3679) = 5.69 V.'},
    {tex:String.raw`I=\frac{V_f-V_C}{R},\qquad U=\tfrac12CV_C^2`,variables:[['I','Current into upper plate','A'],['V_f','Steady-state voltage imposed by the circuit','V','voltage'],['V_C','Instantaneous capacitor voltage','V'],['R','Series resistance','Ω','resistance'],['U','Electrostatic energy in capacitor','J'],['C','Capacitance','F','capacitance']],meaning:'Current changes sign on discharge. Stored energy is always nonnegative and rises quadratically with voltage.',derivation:'Apply Ohm’s law to the resistor. To obtain energy, integrate the capacitor voltage over added charge from an uncharged state.',example:'At 4.50 V with 100 μF, the stored energy is 1.01 mJ. With a 9 V supply through 10 kΩ, the current is +0.450 mA.'}
  ],
  challenges:[
    {question:'A 100 μF capacitor initially at 9.0 V discharges through 10 kΩ. How long until only one quarter of its original energy remains?',hints:['Energy depends on voltage squared.','One quarter of the energy requires one half of the voltage.'],answer:.6931,unit:'s',solution:'The time constant is 1.00 s. A factor of two drop in voltage takes 1.00 × ln 2 = 0.693 s.',tolerance:.007},
    {question:'A 6 V battery charges an initially empty capacitor through an unknown resistance. Initial current is 3.0 mA. At 0.800 s the resistor drop has fallen to 6/e volts. Determine the capacitance.',hints:['The initial capacitor voltage is zero.','The resistor drop decays with the same time constant as the current.'],answer:400,unit:'μF',solution:'Initial resistance is 6/0.003 = 2000 Ω. The measured 0.800 s is one time constant, so the capacitance is 0.800/2000 F = 400 μF.',tolerance:2}
  ]
};
const sourceRadius=.060,pickupRadius=.009,sourceTurns=80;
const pickupArea=Math.PI*pickupRadius**2;
function buildInduction(p,mode){
  const direction=mode==='Reverse pass'?-1:1;
  const span=3*sourceRadius,velocity=direction*p.speed,duration=2*span/p.speed;
  return {duration,at(t){
    const x=-direction*span+velocity*t;
    const B=MU0*sourceTurns*p.current*sourceRadius**2/(2*(sourceRadius**2+x*x)**1.5);
    const flux=pickupArea*B,linkage=p.turns*flux;
    const emf=3*x*velocity*linkage/(sourceRadius**2+x*x);
    return {x,field:B*1e6,flux:flux*1e6,linkage:linkage*1e6,emf:emf*1e3,velocity};
  }};
}
function inductionScene({p,state:s,showVectors,showPath,project,view,focus}){
  const spatial=view==='3D',origin=[380,214],scale=1350;
  const xy=(x,y,z=0)=>spatial?project(x/.24,y/.135,z/.135):[origin[0]+scale*(x+.25*z),origin[1]-scale*(y+.12*z)];
  const loop=(x,r)=>Array.from({length:81},(_,i)=>{const a=i*Math.PI/40;return xy(x,r*Math.cos(a),r*Math.sin(a));});
  let out=label(37,39,'COAXIAL COILS',dim,12)+label(720,39,'AIR CORE  /  OPEN CIRCUIT',dim,12,'end');
  out+=stroke([xy(-.23,0),xy(.23,0)],'#52687a',1,'stroke-dasharray="5 6"');
  for(let i=-4;i<=4;i++){const pt=xy(i*.05,0);out+=stroke([[pt[0],pt[1]-3],[pt[0],pt[1]+3]],dim,1);}
  const source=s.x,pickup=0;
  const cs=focus==='current'?amber:coral,cp=focus==='turns'?amber:cyan;
  // A thin coil has negligible axial thickness. Adjacent strokes indicate windings schematically.
  out+=stroke(loop(source,sourceRadius),cs,5)+stroke(loop(source,sourceRadius*.974),'#f5bd9f',1.1);
  out+=stroke(loop(pickup,pickupRadius),cp,4)+stroke(loop(pickup,pickupRadius*.91),'#a3f7ea',1.2);
  const src=xy(source,sourceRadius),dst=xy(0,-pickupRadius);
  out+=label(src[0],src[1]-17,'drive coil',cs,12,'middle');
  out+=stroke([dst,[dst[0]+26,dst[1]+24],[dst[0]+69,dst[1]+24]],cp,1)+label(dst[0]+76,dst[1]+29,'pickup',cp,12);
  if(showVectors){
    const base=xy(source,-sourceRadius-.02),tip=xy(source+Math.sign(s.velocity)*.037,-sourceRadius-.02);
    out+=arrow(base,tip,coral,2)+label((base[0]+tip[0])/2,base[1]+19,'v',coral,12,'middle');
    // The signed arrow samples the axial B at the pickup with a compressed length scale.
    if(Math.abs(s.field)>1e-8){
      const len=Math.sign(s.field)*(.013+.032*Math.tanh(Math.abs(s.field)/700));
      out+=arrow(xy(0,0),xy(len,0),amber,2.4)+label(xy(len,0)[0],xy(len,0)[1]-9,'B',amber,12);
    }
  }
  if(showPath)out+=stroke([xy(-.18,-.102),xy(.18,-.102)],'#445d71',1.2)+circle(xy(source,-.102),4,coral)+label(xy(-.18,-.102)[0],xy(-.18,-.102)[1]+21,'source travel  /  0.36 m',dim,11);
  return out;
}
const induction={
  id:'induction',title:'Electromagnetic induction',module:11,spatial:true,
  intro:'Pass a current-carrying coil through a smaller pickup coil. Compare magnetic flux with the signed voltage generated as the coils approach and separate.',
  assumptions:['Coaxial circular air-core coils. The drive coil has 80 turns and radius 60 mm. The pickup radius is 9 mm. Both windings have negligible axial thickness.','The exact axial drive field is taken uniform across the small pickup area. Flux and emf inherit this small-loop approximation.','The pickup is open-circuit. Its positive area normal points along +x. Positive drive current produces a +x field.'],
  misconception:'Peak flux occurs when the coils align, where induced voltage is zero. The voltage follows the slope of flux with time.',
  insight:'For the same full passage, doubling the speed doubles the peak emf and halves the passage time. The signed time integral of emf remains zero because the end flux equals the start flux.',
  params:[param('current','Drive current','I','A',-5,5,.1,2),param('turns','Pickup turns','N','1',25,800,5,300),param('speed','Pass speed','v','m/s',.03,.60,.01,.18)],
  modes:['Forward pass','Reverse pass'],build:buildInduction,scene:inductionScene,
  series:[quantity('emf','Induced emf','mV'),quantity('linkage','Flux linkage','μWb'),quantity('field','Axial field','μT')],
  metrics:[quantity('emf','Induced emf','mV'),quantity('flux','Flux per turn','μWb'),quantity('x','Drive position','m')],
  formulas:[
    {tex:String.raw`B(x)=\frac{\mu_0 N_s I a^2}{2(a^2+x^2)^{3/2}}`,variables:[['B','Axial magnetic field at pickup center','T'],['x','Drive center relative to pickup along axis','m'],['μ₀','Permeability of vacuum, approximately 1.257 × 10⁻⁶','H/m'],['N_s','Drive winding count, fixed at 80','1'],['I','Signed drive current','A','current'],['a','Drive coil radius, fixed at 0.060','m']],meaning:'Opposite sides of each source winding produce transverse field components that cancel at an axial observation point.',derivation:'Integrate the axial component of the Biot–Savart contribution around the circular conductor and multiply by the number of coincident turns.',example:'At alignment with 2.00 A in the 80-turn, 60 mm source coil, the axial field is 1.68 mT.'},
    {tex:String.raw`\Phi\simeq A B,\qquad \mathcal E=-N\frac{d\Phi}{dt}`,variables:[['Φ','Signed flux per pickup turn','Wb'],['A','Area of the 9 mm-radius pickup','m²'],['B','Axial field at pickup center','T'],['ℰ','Induced voltage around the winding','V'],['N','Pickup turns','1','turns'],['t','Elapsed time','s']],meaning:'Increasing +x flux induces a negative emf in the positive winding direction defined by the right-hand rule about +x.',derivation:'Integrate the normal field over the pickup area. Approximate it by the axial field times area. Differentiate the resulting flux linkage along the uniform-speed passage.',example:'If the flux through each of 300 turns grows by 0.20 μWb in 20 ms, the mean emf is −3.0 mV.'}
  ],
  challenges:[
    {question:'A 300-turn open pickup sees flux per turn rise from 0.10 to 0.42 μWb in 0.080 s as a coil approaches. Find the signed mean induced voltage using a positive flux normal along +x.',hints:['Compute the change per turn in webers.','Use the flux linkage change and the winding sign.'],answer:-1.2,unit:'mV',solution:'Total linkage grows by 300 × 0.32 μWb = 96 μWb. The mean emf is −96 × 10⁻⁶ / 0.080 V = −1.20 mV.',tolerance:.015},
    {question:'During a uniform-speed crossing the open pickup records a −3.6 mV peak on approach. On a second pass its turns double, the source current halves and the speed rises by 50%. What is the new approach peak?',hints:['At a given separation, flux per turn is proportional to source current.','Differentiation along the path adds one factor of speed.'],answer:-5.4,unit:'mV',solution:'The turns and current changes cancel in flux linkage. Speed multiplies its slope by 1.5, giving a peak of −5.40 mV.',tolerance:.03}
  ]
};
export const labs=[field,rc,induction];
