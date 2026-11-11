// Physics Atlas expansion experiments. All model calculations use SI internally.
const cyan = '#65e5e1';
const coral = '#ff907d';
const amber = '#efc779';
const ink = '#c6d9e5';
const muted = '#87a5bb';
const slate = '#345268';
const rad = Math.PI / 180;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const fmt = (x, digits = 2) => Number(x.toFixed(digits)).toString();
const param = (key, label, symbol, unit, min, max, step, value) =>
  ({key, label, symbol, unit, min, max, step, value});
const metric = (key, label, unit) => ({key, label, unit});
const line = (a, b, color = slate, width = 1, attr = '') =>
  `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" ${attr}/>`;
const label = (x, y, value, color = ink, anchor = 'start', size = 12) =>
  `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-size="${size}" font-family="system-ui,sans-serif">${value}</text>`;
const arrow = (a, b, color, width = 2) => {
  const dx = b[0]-a[0], dy = b[1]-a[1], len = Math.hypot(dx,dy);
  if (len < 1) return '';
  const head = Math.min(9, len*.45), ux = dx/len, uy = dy/len;
  const neck = [b[0]-head*ux,b[1]-head*uy];
  const wing = head*.44;
  const sides = [[neck[0]-uy*wing,neck[1]+ux*wing],b,[neck[0]+uy*wing,neck[1]-ux*wing]];
  return line(a,neck,color,width) + `<polygon points="${sides.map(p=>p.join(',')).join(' ')}" fill="${color}"/>`;
};
const poly = (pts, color, width=2, extra='') =>
  `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" stroke="${color}" stroke-width="${width}" fill="none" ${extra}/>`;
const dot = (x,y,r,color,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${extra}/>`;
const add = (a,b,k=1) => a.map((x,i)=>x+k*b[i]);
const length = v => Math.hypot(...v);
const inner = (a,b) => a.reduce((sum,x,i)=>sum+x*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

const vector = {
  id:'vector', title:'Vector laboratory', module:1, spatial:true,
  intro:'Construct two displacement vectors. Rotate the second about the vertical axis and compare its projection onto the first with the area of their parallelogram.',
  assumptions:['Vectors share a right-handed Cartesian frame.','Both vectors represent displacements in metres. The cyan and coral arrow lengths use a common scale.','The optional rotation changes only the azimuth of the second vector.'],
  misconception:'A negative dot product means the vectors point more than 90° apart. It says nothing about either vector having a negative length.',
  insight:'The dot product selects the component parallel to the first vector. The cross-product magnitude selects the perpendicular component. Their squared values add to the squared product of the two lengths.',
  modes:['Addition','Subtraction'],
  params:[
    param('ax','First vector · x','Aₓ','m',.5,4,.1,2.4),
    param('ay','First vector · y','Aᵧ','m',-3,3,.1,1),
    param('az','First vector · z','A𝓏','m',-3,3,.1,.6),
    param('b','Second vector length','B','m',.5,4,.1,2.8),
    param('phi','Initial azimuth','φ₀','°',-180,180,1,78),
    param('el','Elevation','α','°',-90,90,1,28),
    param('spin','Angular speed','ω','°/s',-60,60,1,15)
  ],
  build(p,mode) {
    const a=[p.ax,p.ay,p.az], el=p.el*rad;
    return {duration:12,at(t){
      const phi=(p.phi+p.spin*t)*rad;
      const b=[p.b*Math.cos(el)*Math.cos(phi),p.b*Math.cos(el)*Math.sin(phi),p.b*Math.sin(el)];
      const c=add(a,b,mode==='Subtraction'?-1:1), n=cross(a,b), d=inner(a,b);
      return {bx:b[0],by:b[1],bz:b[2],cx:c[0],cy:c[1],cz:c[2],nx:n[0],ny:n[1],nz:n[2],
        dot:d,area:length(n),result:length(c),angle:Math.acos(clamp(d/(length(a)*p.b),-1,1))/rad};
    }};
  },
  series:[metric('dot','Dot product','m²'),metric('area','Parallelogram area','m²'),metric('result','Resultant length','m')],
  metrics:[metric('angle','Included angle','°'),metric('dot','Dot product','m²'),metric('area','Cross magnitude','m²'),metric('result','Resultant length','m')],
  scene({p,state:s,project,view,mode,showVectors,showPath}){
    const a=[p.ax,p.ay,p.az], b=[s.bx,s.by,s.bz], c=[s.cx,s.cy,s.cz];
    const scale = length(a)+p.b;
    const spatial=String(view).toLowerCase()==='3d';
    const to = v => spatial ? project(...v.map(z=>z/scale)) : [363+v[0]*198/scale,205-v[1]*165/scale];
    const o=to([0,0,0]), pa=to(a), pb=to(b), pc=to(c);
    let out='';
    for(let k=-4;k<=4;k++){
      const d=k*scale/4;
      out+=line(to([d,-scale,0]),to([d,scale,0]),slate,.65,'opacity=".53"');
      out+=line(to([-scale,d,0]),to([scale,d,0]),slate,.65,'opacity=".53"');
    }
    for(const [v,name] of [[[scale,0,0],'x'],[[0,scale,0],'y'],...(spatial?[[[0,0,scale],'z']]:[])]){
      const q=to(v);out+=arrow(o,q,muted,1)+label(q[0]+6,q[1]-4,name,muted);
    }
    if(showPath){
      const addMode=mode!=='Subtraction', corner=addMode?pb:to(b.map(z=>-z));
      out+=`<polygon points="${[o,pa,pc,corner].map(z=>z.join(',')).join(' ')}" fill="#56b5c5" fill-opacity=".11" stroke="${slate}" stroke-dasharray="4 5"/>`;
      out+=line(pa,pc,coral,1.5,'stroke-dasharray="4 5"');
    }
    out+=arrow(o,pa,cyan,3)+arrow(o,pb,coral,3)+arrow(o,pc,amber,2.7)+dot(...o,3,ink);
    for(const [pos,name,col] of [[pa,'A',cyan],[pb,'B',coral],[pc,mode==='Subtraction'?'A − B':'A + B',amber]]){
      out+=label(pos[0]+7,pos[1]-9,name,col,'start',14);
    }
    if(spatial && showVectors && s.area>1e-8){
      const tip=to([s.nx,s.ny,s.nz].map(v=>v/s.area*scale*.50));
      out+=arrow(o,tip,'#bdadff',1.8)+label(tip[0]+7,tip[1]-4,'plane normal','#bdadff');
    }
    return out+label(28,355,spatial?'3D frame · right-handed axes':'xy projection · z components are perpendicular to the screen',muted)
      +label(730,355,'A · B = '+fmt(s.dot)+' m²',cyan,'end');
  },
  formulas:[
    {tex:'\\mathbf A\\cdot\\mathbf B=|\\mathbf A||\\mathbf B|\\cos\\theta',variables:[['A','First displacement vector','m'],['B','Second displacement vector','m','b'],['θ','Angle between the vectors','rad'],['A · B','Scalar product','m²']],meaning:'Multiply the first length by the signed projection of the second vector along the first.',derivation:'Project B onto a unit vector along A. Its component is B cos θ. Multiplying by A gives the dot product.',example:'For lengths 3 m and 4 m separated by 60°, the dot product is 3 × 4 × 0.5 = 6 m².'},
    {tex:'|\\mathbf A\\times\\mathbf B|=|\\mathbf A||\\mathbf B|\\sin\\theta',variables:[['A','First displacement','m'],['B','Second displacement','m','b'],['θ','Included angle','rad'],['|A × B|','Area of their parallelogram','m²']],meaning:'Base times perpendicular height gives the area. The cross product points normal to this plane according to the right-hand rule.',derivation:'Use A as the base. The perpendicular height of the parallelogram is B sin θ.',example:'Displacements of 3 m and 4 m at 30° enclose a parallelogram of area 6 m².'}
  ],
  challenges:[
    {question:'A 5 m displacement and a 7 m displacement have dot product −21 m². What is the magnitude of their vector sum?',hints:['Square the length of the sum using the dot product.','The cross term is twice −21 m².'],answer:Math.sqrt(32),unit:'m',tolerance:.02,solution:'Expand (A+B)·(A+B) = 25 + 49 − 42 = 32 m². The resultant length is √32 = 5.657 m.'},
    {question:'Two displacements have lengths 3 m and 4 m and bound a parallelogram of area 6 m². Their dot product is negative. Find the angle between them.',hints:['Compute the sine from area divided by the product of the lengths.','A negative cosine selects the obtuse solution.'],answer:150,unit:'°',tolerance:.1,solution:'The sine of the angle is 6/12 = 0.5. The angles from 0° to 180° are 30° and 150°. Only 150° has negative cosine.'}
  ]
};

const incline = {
  id:'incline',title:'Forces on an incline',module:3,
  intro:'Release a block on an adjustable slope. Find the angle where static friction can no longer hold it, then resolve the forces along and perpendicular to the surface.',
  assumptions:['The block starts from rest on a rigid straight slope with 4 m of travel.','Dry friction follows the Coulomb model and the block cannot tip or roll.','Gravity is uniform at 9.81 m/s². The observation ends at the bottom of the track.'],
  misconception:'Static friction adjusts to the force required for equilibrium. Its upper limit applies only just before slipping begins.',
  insight:'The onset angle determines the static coefficient. Acceleration after release determines the kinetic coefficient. Neither measurement requires knowing the mass.',
  modes:['Dry contact','Frictionless'],
  params:[param('m','Block mass','m','kg',.5,8,.1,2),param('theta','Slope angle','θ','°',5,50,.5,28),param('mu','Kinetic friction','μₖ','1',0,.65,.01,.25),param('gap','Static excess','μₛ − μₖ','1',0,.4,.01,.12)],
  build(p,mode){
    const phi=p.theta*rad, weight=p.m*9.81, normal=weight*Math.cos(phi), parallel=weight*Math.sin(phi);
    const mu=mode==='Frictionless'?0:p.mu, mus=mode==='Frictionless'?0:p.mu+p.gap;
    const staticState=parallel<=mus*normal+1e-12;
    const friction=staticState?parallel:mu*normal,acc=(parallel-friction)/p.m;
    const duration=staticState?4:Math.sqrt(8/acc);
    return {duration,at(t){const tau=clamp(t,0,duration);return {distance:.5*acc*tau*tau,speed:acc*tau,acc,friction,normal,parallel,weight,staticState:Number(staticState),heat:.5*friction*acc*tau*tau};}};
  },
  series:[metric('distance','Downslope travel','m'),metric('speed','Speed','m/s'),metric('heat','Frictional dissipation','J')],
  metrics:[metric('acc','Acceleration','m/s²'),metric('normal','Normal force','N'),metric('friction','Friction magnitude','N'),metric('distance','Travel','m')],
  scene({p,state:s,showVectors,showPath}){
    const angle=p.theta*rad,c=Math.cos(angle),d=Math.sin(angle),rail=Math.min(565,200/d);
    const world=(along,above)=>[380+(along-.5)*rail*c+above*d,205+(along-.5)*rail*d-above*c];
    const top=world(-.09,0),base=world(1.09,0),foot=[top[0],base[1]];
    let out=`<polygon points="${[top,base,foot].map(z=>z.join(',')).join(' ')}" fill="#173549" stroke="${slate}"/>`+line(top,base,cyan,2);
    for(let i=0;i<=16;i++){
      const w=world(i/16,0);
      out+=line(w,[w[0],w[1]+(i%4===0?8:4)],muted,.8);
      if(i%4===0) out+=label(w[0],w[1]+23,String(i/4)+' m',muted,'middle',10);
    }
    const pos=s.distance/4, ctr=world(pos,16);
    if(showPath) out+=line(world(0,3),world(pos,3),amber,3,'stroke-dasharray="4 3"');
    out+=`<g transform="translate(${ctr[0]} ${ctr[1]}) rotate(${p.theta})"><rect x="-24" y="-16" width="48" height="32" rx="3" fill="#286778" stroke="${cyan}" stroke-width="1.8"/><path d="M-16 -9h32" stroke="#65b8be"/></g>`;
    if(showVectors){
      const forceScale=74/s.weight;
      const vectors=[
        [[0,s.weight*forceScale],coral,'mg'],
        [[d*s.normal*forceScale,-c*s.normal*forceScale],cyan,'N'],
        [[-c*s.friction*forceScale,-d*s.friction*forceScale],amber,s.staticState?'fₛ':'fₖ']
      ];
      for(const [delta,col,name] of vectors){
        if(Math.hypot(...delta)<.3) continue;
        const tip=[ctr[0]+delta[0],ctr[1]+delta[1]];
        out+=arrow(ctr,tip,col,2.5)+label(tip[0]+(delta[0]<0?-5:5),tip[1]+(delta[1]<0?-3:8),name,col,delta[0]<0?'end':'start',13);
      }
      out+=dot(...ctr,3,ink);
    }
    return out+label(25,33,s.staticState?'STATIC EQUILIBRIUM':'ACCELERATING DOWNSLOPE',s.staticState?amber:cyan,'start',11)
      +label(730,357,'θ = '+fmt(p.theta,1)+'°',muted,'end');
  },
  formulas:[
    {tex:'N=mg\\cos\\theta',variables:[['N','Normal force from the plane','N'],['m','Block mass','kg','m'],['g','Gravitational acceleration','m/s²'],['θ','Slope angle above horizontal','rad','theta']],meaning:'With no acceleration into or away from the surface, its normal force balances the perpendicular component of weight.',derivation:'Resolve gravity perpendicular to the plane and set the sum of the perpendicular forces to zero.',example:'A 2 kg block on a 30° slope experiences a normal force of 2 × 9.81 × cos 30° = 16.99 N.'},
    {tex:'a=g(\\sin\\theta-\\mu_k\\cos\\theta)',variables:[['a','Acceleration measured positive downslope while sliding down','m/s²'],['g','Gravitational acceleration','m/s²'],['θ','Inclination','rad','theta'],['μₖ','Kinetic friction coefficient','1','mu']],meaning:'Gravity pulls the sliding block downslope while kinetic friction acts uphill. The equation applies during downhill sliding.',derivation:'Resolve the weight along the plane. Subtract kinetic friction μₖN from mg sin θ, substitute N = mg cos θ, and divide by mass.',example:'At 30° with μₖ = 0.20, acceleration is 9.81(0.5 − 0.20 × 0.866) = 3.21 m/s².'},
    {tex:'\\tan\\theta_c=\\mu_s',variables:[['θc','Inclination at the threshold of slipping','rad'],['μₛ','Static friction coefficient, kinetic value plus the static excess','1','gap']],meaning:'Downslope gravity first reaches the limiting static friction at this angle.',derivation:'At incipient sliding, mg sin θc = μₛ mg cos θc. Divide by mg cos θc.',example:'A static coefficient of 0.40 gives a limiting angle arctan(0.40) = 21.8°.'}
  ],
  challenges:[
    {question:'A block first slips at 26.0°. Once released at this same angle, it travels 2.00 m from rest in 1.50 s. Find the kinetic friction coefficient. Take g = 9.81 m/s².',hints:['Obtain acceleration from the travel time.','Resolve the net force along the slope and isolate the kinetic coefficient.'],answer:(Math.sin(26*rad)-4/(2.25*9.81))/Math.cos(26*rad),unit:'1',tolerance:.003,solution:'The measured acceleration is 2(2.00)/1.50² = 1.778 m/s². Rearranging the downslope equation gives μₖ = (sin 26° − 1.778/9.81)/cos 26° ≈ 0.286. The onset angle by itself measures the static coefficient.'},
    {question:'On a 30° slope a 3.00 kg block slides 4.00 m downhill with kinetic coefficient 0.20. How much energy is dissipated by friction?',hints:['Find the normal force.','Multiply the kinetic friction magnitude by the sliding distance.'],answer:.2*3*9.81*Math.cos(30*rad)*4,unit:'J',tolerance:.1,solution:'N = 3.00 × 9.81 × cos 30° = 25.49 N. Friction is 5.10 N, giving 5.10 × 4.00 = 20.4 J of dissipated energy.'}
  ]
};

const collision = {
  id:'collision', title:'Collision laboratory', module:4,
  intro:'Track two carts through a one-dimensional impact. Set the restitution and compare the system momentum, center-of-mass motion, and kinetic energy across contact.',
  assumptions:['Each cart has length 0.50 m. Their centers initially lie at −2 m and +2 m.','The straight track exerts no horizontal force. The collision is instantaneous and has no external impulse.','The restitution coefficient applies only to the relative velocity at contact.'],
  misconception:'An inelastic impact still conserves system momentum when external impulse vanishes. The missing kinetic energy becomes internal energy.',
  insight:'In the center-of-mass frame, the relative speed sets all kinetic energy available for dissipation. A perfectly inelastic collision leaves the common translational motion intact.',
  params:[param('m1','Cyan cart mass','m₁','kg',.5,5,.25,2),param('m2','Coral cart mass','m₂','kg',.5,5,.25,1),param('u1','Cyan initial velocity','u₁','m/s',0,5,.25,2),param('u2','Coral initial velocity','u₂','m/s',-3,3,.25,-.5),param('e','Restitution','e','1',0,1,.05,.75)],
  build(p){
    const sum=p.m1+p.m2,mom=p.m1*p.u1+p.m2*p.u2,vc=mom/sum,closing=p.u1-p.u2;
    const hit=closing>0?3.5/closing:Infinity;
    const duration=Number.isFinite(hit)?hit+2.5:4;
    const after1=vc-p.m2*p.e*closing/sum,after2=vc+p.m1*p.e*closing/sum;
    const initial=.5*p.m1*p.u1**2+.5*p.m2*p.u2**2;
    return {duration,hit,at(t){
      const tau=clamp(t,0,duration),collided=tau>=hit;
      const before=Math.min(tau,hit), after=tau-before;
      const v1=collided?after1:p.u1,v2=collided?after2:p.u2;
      const x1=-2+p.u1*before+v1*after,x2=2+p.u2*before+v2*after;
      const energy=.5*p.m1*v1**2+.5*p.m2*v2**2;
      return {x1,x2,v1,v2,p1:p.m1*v1,p2:p.m2*v2,momentum:mom,energy,loss:initial-energy,cm:(p.m1*x1+p.m2*x2)/sum,vc,collided:Number(collided)};
    }};
  },
  series:[metric('v1','Cyan velocity','m/s'),metric('v2','Coral velocity','m/s'),metric('energy','Kinetic energy','J'),metric('momentum','Total momentum','kg·m/s')],
  metrics:[metric('momentum','Total momentum','kg·m/s'),metric('energy','Kinetic energy','J'),metric('loss','Energy dissipated','J'),metric('vc','Center-of-mass velocity','m/s')],
  scene({p,state:s,model,showVectors,showPath}){
    const terminal=model.at(model.duration), impact=Number.isFinite(model.hit)?model.at(model.hit):model.at(0);
    const endMin=Math.min(-2,terminal.x1,terminal.x2,impact.x1,impact.x2)-.6;
    const endMax=Math.max(2,terminal.x1,terminal.x2,impact.x1,impact.x2)+.6;
    const scale=648/(endMax-endMin),x=v=>56+(v-endMin)*scale,y=206;
    let out=line([40,y+26],[720,y+26],muted,2)+line([40,y+32],[720,y+32],slate,1);
    const step=Math.max(1,Math.ceil((endMax-endMin)/10));
    for(let i=Math.ceil(endMin/step)*step;i<=endMax;i+=step){
      out+=line([x(i),y+33],[x(i),y+41],muted,1)+label(x(i),y+59,fmt(i)+' m',muted,'middle',10);
    }
    if(showPath) out+=line([x(-2),302],[x(s.x1),302],cyan,1.3,'stroke-dasharray="3 4"')
      +line([x(2),317],[x(s.x2),317],coral,1.3,'stroke-dasharray="3 4"');
    const capSpeed=Math.max(Math.abs(p.u1),Math.abs(p.u2),Math.abs(terminal.v1),Math.abs(terminal.v2),1);
    for(const [pos,v,m,col,signalOffset] of [[s.x1,s.v1,p.m1,cyan,0],[s.x2,s.v2,p.m2,coral,-32]]){
      const cx=x(pos),w=.5*scale,sy=y-53+signalOffset;
      out+=`<rect x="${cx-w/2}" y="${y-15}" width="${w}" height="30" rx="2" fill="${col}" fill-opacity=".24" stroke="${col}" stroke-width="1.6"/>`
        +dot(cx-w*.25,y+19,Math.min(6,w*.16),muted)+dot(cx+w*.25,y+19,Math.min(6,w*.16),muted)
        +line([cx,sy+6],[cx,y-15],slate,1)+label(cx,sy-8,fmt(m)+' kg',col,'middle');
      if(showVectors) out+=arrow([cx,sy],[cx+v/capSpeed*50,sy],col,2.6);
    }
    out+=line([x(s.cm),y+32],[x(s.cm),y+77],amber,1,'stroke-dasharray="3 4"')+dot(x(s.cm),y+77,3,amber)
      +label(x(s.cm),y+94,'CM',amber,'middle',11);
    return out+label(25,33,s.collided?'AFTER CONTACT':Number.isFinite(model.hit)?'APPROACH TO CONTACT':'NO ENCOUNTER',muted,'start',11)
      +label(730,357,'Positive direction →',muted,'end');
  },
  formulas:[
    {tex:'m_1u_1+m_2u_2=m_1v_1+m_2v_2',variables:[['m₁','Mass of cyan cart','kg','m1'],['m₂','Mass of coral cart','kg','m2'],['u₁','Initial cyan velocity','m/s','u1'],['u₂','Initial coral velocity','m/s','u2'],['v₁','Final cyan velocity','m/s'],['v₂','Final coral velocity','m/s']],meaning:'Total signed momentum remains fixed throughout a collision with negligible external impulse.',derivation:'Integrate each cart’s horizontal force over contact time. The contact impulses cancel in the total by Newton’s third law.',example:'If a 2 kg cart moving at 3 m/s sticks to a stationary 1 kg cart, the common velocity is 6/3 = 2 m/s.'},
    {tex:'v_2-v_1=e(u_1-u_2)',variables:[['v₂','Final coral velocity','m/s'],['v₁','Final cyan velocity','m/s'],['e','Coefficient of restitution','1','e'],['u₁','Initial cyan velocity','m/s','u1'],['u₂','Initial coral velocity','m/s','u2']],meaning:'Restitution is the ratio of relative separating speed to relative approaching speed at impact.',derivation:'Cart 1 approaches from the left. Relative closing speed is u₁ − u₂. After impact the separation grows at v₂ − v₁.',example:'With closing speed 4 m/s and e = 0.75, the separating speed is 3 m/s.'}
  ],
  challenges:[
    {question:'A 2 kg cart moving right at 3 m/s overtakes a 1 kg cart moving right at 1 m/s. Their restitution is 0.50. How much kinetic energy becomes internal energy?',hints:['The separating speed is 1 m/s.','Combine momentum conservation with this relative speed, then compare energies.'],answer:1,unit:'J',tolerance:.015,solution:'Initial momentum is 7 kg·m/s. Solving 2v₁ + v₂ = 7 and v₂ − v₁ = 1 gives v₁ = 2 and v₂ = 3 m/s. Initial energy is 9.5 J and final energy is 8.5 J. The decrease is 1.0 J.'},
    {question:'A 1 kg cart moving at 4 m/s hits a stationary 3 kg cart. What minimum restitution makes the lighter cart leave with zero or negative velocity?',hints:['At the boundary its final velocity is zero.','Use momentum to get the heavier cart’s speed and divide the separating speed by the closing speed.'],answer:1/3,unit:'1',tolerance:.004,solution:'At the boundary, all 4 kg·m/s of momentum belongs to the 3 kg cart. Its speed is 4/3 m/s. The ratio to the 4 m/s closing speed is e = 1/3.'}
  ]
};

const flow = {
  id:'flow',title:'Venturi flow',module:6,
  intro:'Follow a tracer through a smooth contraction and read its local speed and pressure. Adjust the throat area to see how two pressure taps can reveal a pipe’s volume flow rate.',
  assumptions:['Steady, incompressible flow in a horizontal, circular pipe. Density is uniform and viscosity is neglected.','Section-mean speeds follow continuity and Bernoulli. Streamlines are a schematic interpolation between cross sections.','The transit time follows the one-dimensional mean velocity field. Pressure is absolute.'],
  misconception:'A narrow region carries the same volume per second as a wide one. The local speed increases because that same volume passes through a smaller area.',
  insight:'Combining a pressure difference with a known area ratio lets a Venturi act as a flow meter. A real instrument needs calibration for viscous losses and departures from the assumed speed profile.',
  params:[param('area','Inlet area','A₁','cm²',8,32,.5,20),param('beta','Throat / inlet area','β','1',.35,1,.01,.52),param('u','Inlet mean speed','v₁','m/s',.4,3,.05,1.5),param('rho','Fluid density','ρ','kg/m³',600,1200,5,1000),param('pin','Inlet pressure','P₁','kPa',75,180,1,105)],
  build(p){
    const L=4,dip=1-p.beta,Q=p.u*p.area*1e-4;
    // Integral of section area / flow rate between the inlet and coordinate x.
    const timeAt=x=>(x*(1-dip/2)+dip*L*Math.sin(2*Math.PI*x/L)/(4*Math.PI))/p.u;
    const duration=timeAt(L);
    return {duration,at(t){
      const tau=clamp(t,0,duration);let lo=0,hi=L;
      for(let i=0;i<38;i++){const mid=(lo+hi)/2;if(timeAt(mid)<tau)lo=mid;else hi=mid;}
      const x=(lo+hi)/2,ratio=1-dip*Math.sin(Math.PI*x/L)**2,speed=p.u/ratio;
      const pressure=p.pin+p.rho*(p.u**2-speed**2)/2000,dp=p.rho*((p.u/p.beta)**2-p.u**2)/2000;
      return {x,speed,pressure,area:p.area*ratio,flow:Q*1000,dp,throat:p.pin-dp};
    }};
  },
  metrics:[metric('flow','Volume flow','L/s'),metric('speed','Tracer speed','m/s'),metric('pressure','Local pressure','kPa'),metric('dp','Inlet-to-throat drop','kPa')],
  series:[metric('speed','Local speed','m/s'),metric('pressure','Absolute pressure','kPa'),metric('area','Cross section','cm²')],
  scene({p,state:s,model,t,showPath,showVectors}){
    const sx=v=>56+162*v,cy=209;
    // The axial and radial directions have different drawing scales.
    const ry=v=>65*Math.sqrt(p.area/20)*Math.sqrt(1-(1-p.beta)*Math.sin(Math.PI*v/4)**2);
    const section=Array.from({length:81},(_,i)=>4*i/80);
    const top=section.map(x=>[sx(x),cy-ry(x)]), bottom=section.map(x=>[sx(x),cy+ry(x)]);
    let out=`<polygon points="${top.concat([...bottom].reverse()).map(z=>z.join(',')).join(' ')}" fill="#133a4a"/>`;
    if(showPath){
      for(const fraction of [-.75,-.5,-.25,0,.25,.5,.75]){
        out+=poly(section.map(x=>[sx(x),cy+fraction*ry(x)]),fraction===0?cyan:'#56aab4',fraction===0?1.4:1,'opacity=".62"');
      }
    }
    out+=poly(top,ink,2.2)+poly(bottom,ink,2.2);
    for(const [x,name,value] of [[0,'INLET',p.pin],[2,'THROAT',s.throat]]){
      const cx=sx(x),tap=cy-ry(x),labelX=x===0?cx+17:cx+16;
      out+=line([cx,tap],[cx,73],slate,2)+dot(cx,tap,3,amber)+dot(cx,73,4,amber)
        +label(labelX,70,name,muted,'start',10)+label(labelX,88,fmt(value)+' kPa',ink,'start',13);
    }
    for(let marker=0;marker<8;marker++){
      const phase=model.at((t+model.duration*marker/8)%model.duration).x;
      for(const fraction of [-.5,.5]){
        out+=dot(sx(phase),cy+fraction*ry(phase),1.8,cyan,'opacity=".65"');
      }
    }
    out+=dot(sx(s.x),cy,11,cyan,'opacity=".12"')+dot(sx(s.x),cy,4.4,cyan);
    if(showVectors) out+=arrow([sx(s.x),cy],[sx(s.x)+32*s.speed/(p.u/p.beta),cy],amber,2.3);
    out+=line([sx(0),320],[sx(4),320],slate,1);
    for(let i=0;i<=4;i++)out+=line([sx(i),316],[sx(i),324],muted,1)+label(sx(i),340,i+' m',muted,'middle',11);
    return out+label(730,363,'Radial dimension exaggerated',muted,'end',11);
  },
  formulas:[
    {tex:'Q=A_1v_1=A_2v_2',variables:[['Q','Volume flow rate','m³/s'],['A₁','Inlet cross-sectional area','m²','area'],['A₂','Throat area','m²'],['v₁','Inlet mean speed','m/s','u'],['v₂','Throat mean speed','m/s']],meaning:'The same volume crosses any two sections per unit time for steady incompressible flow through an unbranched pipe.',derivation:'In a short time interval, the transported volume is cross-sectional area times the distance the fluid moves.',example:'An inlet of 20 cm² at 1.50 m/s carries 0.0030 m³/s, or 3.0 L/s. Halving the area doubles the speed.'},
    {tex:'P_1-P_2=\\tfrac12\\rho(v_2^2-v_1^2)',variables:[['P₁','Inlet absolute pressure','Pa','pin'],['P₂','Throat absolute pressure','Pa'],['ρ','Fluid density','kg/m³','rho'],['v₁','Inlet speed','m/s','u'],['v₂','Throat speed','m/s']],meaning:'In this ideal horizontal model, fluid gains kinetic energy as the pressure falls.',derivation:'The net pressure work on a fluid volume transported between two sections equals its change in kinetic energy. Divide by that volume.',example:'For water at 1000 kg/m³, accelerating from 1.5 m/s to 3.0 m/s requires a pressure drop of 3375 Pa.'}
  ],
  challenges:[
    {question:'A horizontal Venturi has an inlet area of 20 cm² and a throat area of 8 cm². With water of density 1000 kg/m³, the inlet-to-throat pressure drop is 10.5 kPa. Find the volume flow rate in litres per second.',hints:['Throat speed is the inlet speed multiplied by 20/8.','Insert that ratio into the pressure-drop equation. Convert the area to square metres.'],answer:4,unit:'L/s',tolerance:.025,solution:'10 500 = 500[(2.5v₁)² − v₁²] gives v₁ = 2 m/s. The volume flow is 0.0020 × 2 = 0.0040 m³/s = 4.0 L/s.'},
    {question:'A horizontal ideal duct carries a fluid of density 800 kg/m³ at inlet speed 2.0 m/s and pressure 110 kPa. At the throat the absolute pressure is 105.2 kPa. Find the throat-to-inlet area ratio.',hints:['Convert the pressure difference to pascals.','Find throat speed from Bernoulli, then use continuity.'],answer:.5,unit:'1',tolerance:.005,solution:'The 4800 Pa drop increases speed squared by 2 × 4800/800 = 12 m²/s². Thus the throat speed is √(4+12) = 4.0 m/s. The area ratio is 2.0/4.0 = 0.50.'}
  ]
};

// Equal seeds reproduce the same trial; isotope identities are stable as the clock is scrubbed.
function decayTimes(n, half, seed){
  let word=(seed*2654435761)>>>0;
  return Array.from({length:n},()=>{
    word=(Math.imul(word,1664525)+1013904223)>>>0;
    const uniform=(word+.5)/4294967296;
    return -Math.log(uniform)*half/Math.LN2;
  });
}
const decay = {
  id:'decay',title:'Radioactive decay',module:13,
  intro:'Observe a counted sample of unstable nuclei alongside its ensemble prediction. Replay the same trial or change the seed to compare random outcomes at fixed half-life.',
  assumptions:['Nuclei decay independently with a constant probability per unit time. Each parent produces one stable daughter.','The detector records every decay. The sample is closed and the count has no background contribution.','Each dot represents one nucleus. Positions are an inventory grid, and the exponential curve gives the ensemble average.'],
  misconception:'One half-life gives each nucleus a 50% survival probability. A particular sample can have more or fewer than half of its parents remaining.',
  insight:'Survivor counts at a fixed time follow a binomial distribution. With survival probability one half, a sample of 100 nuclei has a standard deviation of 5 nuclei.',
  params:[param('n','Initial nuclei','N₀','nuclei',16,160,1,96),param('half','Half-life','T½','s',1,20,.25,5),param('seed','Trial seed','seed','1',1,100,1,21)],
  build(p){
    const times=decayTimes(p.n,p.half,p.seed),sorted=[...times].sort((a,b)=>a-b);
    const lambda=Math.LN2/p.half,duration=4*p.half;
    return {duration,times,at(t){
      const tau=clamp(t,0,duration),survival=Math.exp(-lambda*tau),expected=p.n*survival;
      let lo=0,hi=sorted.length;
      while(lo<hi){const mid=(lo+hi)>>>1;if(sorted[mid]<=tau)lo=mid+1;else hi=mid;}
      return {count:p.n-lo,daughters:lo,expected,activity:lambda*expected,sd:Math.sqrt(p.n*survival*(1-survival))};
    }};
  },
  series:[metric('count','Trial parents','nuclei'),metric('expected','Expected parents','nuclei'),metric('daughters','Trial daughters','nuclei')],
  metrics:[metric('count','Parents counted','nuclei'),metric('expected','Expected parents','nuclei'),metric('activity','Mean activity','Bq'),metric('sd','Population SD','nuclei')],
  scene({model,p,t,state:s,showPath}){
    const cols=Math.ceil(Math.sqrt(p.n*1.85)),rows=Math.ceil(p.n/cols);
    const dx=Math.min(26,400/(cols-1)),dy=Math.min(27,223/(rows-1||1)),ox=270-dx*(cols-1)/2,oy=193-dy*(rows-1)/2;
    let out='';
    model.times.forEach((death,i)=>{
      const x=ox+(i%cols)*dx,y=oy+Math.floor(i/cols)*dy,live=death>t;
      out+=dot(x,y,Math.min(7,dx*.32),live?cyan:'#6d7c96',live?'stroke="#b6f8f4" stroke-width=".65"':'opacity=".77"');
      if(!live && t-death<p.half*.08)out+=`<circle cx="${x}" cy="${y}" r="${7+7*(t-death)/(p.half*.08)}" fill="none" stroke="${amber}" opacity=".6"/>`;
    });
    const bx=530,by=101,bw=170;
    out+=label(bx,by-24,'SURVIVAL FRACTION',muted,'start',11);
    for(const [i,name,val,col] of [[0,'Counted',s.count/p.n,cyan],[1,'Expected',s.expected/p.n,amber]]){
      const y=by+i*83;
      out+=label(bx,y+9,name,ink)+label(bx+bw,y+9,fmt(val*100,1)+'%',col,'end')
        +`<rect x="${bx}" y="${y+22}" width="${bw}" height="8" rx="3" fill="#253a50"/><rect x="${bx}" y="${y+22}" width="${bw*val}" height="8" rx="3" fill="${col}"/>`;
      if(showPath)out+=line([bx+bw/2,y+17],[bx+bw/2,y+36],ink,1,'stroke-dasharray="2 2"');
    }
    return out+dot(63,348,5,cyan)+label(76,352,'Parent nucleus',ink)+dot(205,348,5,'#6d7c96')+label(218,352,'Stable daughter',ink)
      +label(700,352,'t / T½ = '+fmt(t/p.half,2),muted,'end');
  },
  formulas:[
    {tex:'\\langle N(t)\\rangle=N_0 2^{-t/T_{1/2}}',variables:[['⟨N(t)⟩','Expected number of surviving parents','nuclei'],['N₀','Initial number of parents','nuclei','n'],['t','Elapsed time','s'],['T½','Half-life','s','half']],meaning:'Each half-life multiplies survival probability by one half. Fractional counts are meaningful as ensemble averages.',derivation:'Independent survival over consecutive time intervals multiplies probabilities. A constant decay rate implies exponential survival, with the exponent fixed by the half-life.',example:'From 96 initial nuclei with a half-life of 5 s, the expected parent count at 10 s is 96/4 = 24.'},
    {tex:'\\langle A(t)\\rangle=\\frac{\\ln 2}{T_{1/2}}\\langle N(t)\\rangle',variables:[['⟨A(t)⟩','Ensemble-average activity','Bq'],['t','Elapsed time','s'],['T½','Half-life','s','half'],['⟨N(t)⟩','Mean surviving parent count','nuclei']],meaning:'Activity measures the expected number of decays per second at an instant. A finite trial produces separate, discrete events.',derivation:'Activity is the negative derivative of the mean surviving population. Differentiate its exponential time dependence.',example:'With 80 expected survivors and an 8 s half-life, mean activity is 80 ln 2/8 = 6.93 Bq.'}
  ],
  challenges:[
    {question:'A counter measures 640 counts per minute initially and 220 counts per minute 12 minutes later. The constant background is 80 counts per minute. Assuming a single isotope, estimate its half-life in minutes.',hints:['Subtract the background from both observations.','Count how many halvings occur between the corrected values.'],answer:6,unit:'min',tolerance:.05,solution:'The source rates are 560 and 140 counts per minute. The source falls by a factor of four in 12 minutes, corresponding to two half-lives. The half-life is 6 minutes.'},
    {question:'Two independent samples each start with 128 identical nuclei. After two half-lives, find the standard deviation of the difference between their survivor counts.',hints:['Survival probability is one quarter. A binomial count has variance Np(1−p).','Independent variances add when forming a difference.'],answer:Math.sqrt(48),unit:'nuclei',tolerance:.04,solution:'Each sample has variance 128 × 0.25 × 0.75 = 24 nuclei². Their independent difference has variance 24 + 24 = 48 nuclei². Its standard deviation is √48 = 6.93 nuclei.'}
  ]
};

export const labs = [vector,incline,collision,flow,decay];
