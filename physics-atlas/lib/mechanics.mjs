// Analytical and reduced-order mechanics models. Internal calculations use SI units.
const TAU = 2 * Math.PI;
const deg = Math.PI / 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const param = (key, label, symbol, unit, min, max, step, value) =>
  ({key, label, symbol, unit, min, max, step, value});
const output = (key, label, unit) => ({key, label, unit});
const fmt = (x, digits = 1) => Number(x.toFixed(digits)).toString();
const xy = (x, y) => [x, y];
const trace = pts => pts.map((p,i) => (i ? 'L' : 'M') + p.map(v=>v.toFixed(2)).join(' ')).join(' ');
const sample = (n, callback) => Array.from({length:n+1},(_,i)=>callback(i/n));
const mint = '#67e8cf', orange = '#ffae7a', blue = '#79b8fb', gray = '#90a8bc';
const line = (a,b,color,width=1,dash='',opacity=1) =>
  '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+color+'" stroke-width="'+width+'" opacity="'+opacity+'" '+(dash ? 'stroke-dasharray="'+dash+'"':'')+'/>';
const path = (points,color,width=1,extra='') => '<path d="'+trace(points)+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linejoin="round" stroke-linecap="round" '+extra+'/>';
const label = (x,y,value,color=gray,size=11,anchor='start',extra='') =>
  '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" text-anchor="'+anchor+'" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" '+extra+'>'+value+'</text>';
const circle = (a,r,fill,stroke='none',width=1) =>
  '<circle cx="'+a[0]+'" cy="'+a[1]+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
function arrow(a,b,col,width=1.8) {
  const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy);
  if (len < 2) return '';
  const u=dx/len,v=dy/len,head=Math.min(8,len*.4), wing=head*.45;
  return line(a,b,col,width)+ '<path d="'+trace([b,[b[0]-u*head-v*wing,b[1]-v*head+u*wing],[b[0]-u*head+v*wing,b[1]-v*head-u*wing]])+'Z" fill="'+col+'"/>';
}
function stepSize(span,count) {
  const raw=span/count, power=10**Math.floor(Math.log10(raw)), mantissa=raw/power;
  return power*(mantissa<=1.5 ? 1 : mantissa<=3 ? 2 : mantissa<=7 ? 5 : 10);
}
function grid(x0,y0,sx,sy,xmax,ymax,xName,yName) {
  let out='', dx=stepSize(xmax,8),dy=stepSize(ymax,4);
  for(let x=0;x<=xmax+1e-10;x+=dx){
    const xx=x0+sx*x;
    out+=line([xx,y0],[xx,y0-ymax*sy],'#547085',.6,'',.30)+label(xx,y0+17,fmt(x,2),'#8ca4b7',10,'middle');
  }
  for(let y=dy;y<=ymax+1e-10;y+=dy){
    const yy=y0-y*sy;
    out+=line([x0,yy],[x0+xmax*sx,yy],'#547085',.6,'',.32)+label(x0-9,yy+3,fmt(y,2),'#8ca4b7',10,'end');
  }
  return out+line([x0,y0],[x0+xmax*sx+4,y0],'#6a8392',1)+line([x0,y0],[x0,y0-ymax*sy-4],'#6a8392',1)+label(x0-12,22,yName,gray,11)+label(x0+xmax*sx,y0+33,xName,gray,11,'end');
}
function decorateProjectile(p,s) {
  const speed=Math.hypot(s.vx,s.vy);
  return {...s,y:Math.max(0,s.y),speed,energy:speed*speed/2+p.gravity*Math.max(0,s.y)};
}
function idealShot(p) {
  const vx=p.speed*Math.cos(p.angle*deg), vy=p.speed*Math.sin(p.angle*deg);
  const duration=(vy+Math.sqrt(vy*vy+2*p.gravity*p.height))/p.gravity;
  const at=t=>{
    t=clamp(t,0,duration);
    return decorateProjectile(p,{x:vx*t,y:p.height+vy*t-.5*p.gravity*t*t,vx,vy:vy-p.gravity*t});
  };
  return {duration,at,apexTime:vy/p.gravity,range:vx*duration};
}
function rk4(y,h,derivative) {
  const add=(a,b,f)=>a.map((v,i)=>v+f*b[i]);
  const k1=derivative(y), k2=derivative(add(y,k1,h/2)), k3=derivative(add(y,k2,h/2)), k4=derivative(add(y,k3,h));
  return y.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
}
function dragShot(p) {
  if(p.drag===0) return idealShot(p);
  const derivative=([x,y,vx,vy])=>{
    const b=p.drag*Math.hypot(vx,vy);
    return [vx,vy,-b*vx,-p.gravity-b*vy];
  };
  // Restrict step size below the shortest initial drag timescale.
  const h=Math.min(1/80,.08/(p.drag*p.speed));
  const states=[[0,p.height,p.speed*Math.cos(p.angle*deg),p.speed*Math.sin(p.angle*deg)]];
  let duration=0,apexTime=0;
  function eventTime(last,index){
    let lo=0,hi=h;
    for(let i=0;i<35;i++){
      const mid=(lo+hi)/2;
      if(rk4(last,mid,derivative)[index]>0) lo=mid; else hi=mid;
    }
    return (lo+hi)/2;
  }
  while(duration<200) {
    const last=states.at(-1), next=rk4(last,h,derivative);
    if(last[3]>0 && next[3]<=0) apexTime=duration+eventTime(last,3);
    if(next[1]<=0 && next[3]<0) {
      const tail=eventTime(last,1);
      states.push(rk4(last,tail,derivative));
      duration+=tail; break;
    }
    states.push(next); duration=(states.length-1)*h;
  }
  const at=t=>{
    t=clamp(t,0,duration);
    const i=Math.min(Math.floor(t/h),states.length-2);
    const [x,y,vx,vy]=rk4(states[i],Math.max(0,t-i*h),derivative);
    return decorateProjectile(p,{x,y,vx,vy});
  };
  return {duration,at,apexTime,range:at(duration).x};
}
function projectileScene(ctx) {
  const {p,model,state:s,t,showVectors,showPath}=ctx;
  const apex=model.at(model.apexTime), xmax=Math.max(1,model.range*1.08), ymax=Math.max(.2,apex.y*1.27);
  const spatial=String(ctx.view).toLowerCase()==='3d';
  const sx=646/xmax,sy=263/ymax;
  const P=spatial ? (x,y,z=0)=>ctx.project((x/xmax-.5)*1.64,(y/ymax-.40)*1.18,z) :
    (x,y)=>xy(56+x*sx,318-y*sy);
  const start=P(0,p.height), ground=P(0,0), peak=P(apex.x,apex.y), end=P(model.range,0), pos=P(s.x,s.y);
  const pts=sample(96,f=>{const q=model.at(f*model.duration);return P(q.x,q.y);});
  let svg='<defs><linearGradient id="shot-fill" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#2de2c3" stop-opacity=".155"/><stop offset="1" stop-color="#2de2c3" stop-opacity=".005"/></linearGradient><radialGradient id="shot-halo"><stop stop-color="#76fff0" stop-opacity=".58"/><stop offset="1" stop-color="#63ebc7" stop-opacity="0"/></radialGradient></defs>';
  if(spatial) {
    for(let k=0;k<=12;k++) svg+=line(P(xmax*k/12,0,-.48),P(xmax*k/12,0,.48),'#395363',.8);
    for(let k=-4;k<=4;k++) svg+=line(P(0,0,k*.12),P(xmax,0,k*.12),'#395363',.8);
    svg+=line(P(0,0),P(0,ymax),'#758c9b',1)+label(...P(0,ymax),'y (m)');
  } else svg+=grid(56,318,sx,sy,xmax,ymax,'x (m)','y (m)');
  if(showPath){
    if(!spatial)svg+='<path d="'+trace([...pts,end,ground,start])+'Z" fill="url(#shot-fill)"/>';
    svg+=path(pts,mint,1.8,'stroke-dasharray="5 6" opacity=".54"');
    const elapsed=sample(60,f=>{const q=model.at(f*t);return P(q.x,q.y);});
    svg+=path(elapsed,mint,3);
    svg+=line(peak,P(apex.x,0),gray,1,'3 6',.42)+circle(peak,3.2,'#102424',mint,1.4);
    const peakLabelY=Math.max(23,peak[1]-17);
    svg+=label(peak[0],peakLabelY,'Apex · '+fmt(apex.y,2)+' m',mint,11,'middle');
    svg+=circle(end,7,'none',mint,1)+circle(end,2,mint);
    svg+=label(end[0]-3,end[1]-13,'Landing',gray,10,'end');
  }
  svg+=circle(start,6,'#0d2024',mint,1.5)+circle(start,2,mint);
  if(!spatial && p.angle>8 && s.x>0.7){
    const a=p.angle*deg;
    const displayAngle=Math.atan2(sy*Math.sin(a),sx*Math.cos(a));
    svg+=path(sample(16,f=>[start[0]+30*Math.cos(displayAngle*f),start[1]-30*Math.sin(displayAngle*f)]),orange,1.2)+line(start,[start[0]+32,start[1]],orange,1,'3 3')+label(start[0]+34,start[1]-9,fmt(p.angle)+'°',orange,10);
  }
  if(showVectors) {
    const h=Math.min(xmax/(8*Math.max(1,p.speed)),ymax/(5*Math.max(1,p.speed)));
    const velocity=P(s.x+s.vx*h,s.y+s.vy*h);
    const horizontal=P(s.x+s.vx*h,s.y);
    svg+=line(pos,horizontal,blue,1.3,'3 3')+line(horizontal,velocity,blue,1.3,'3 3')+arrow(pos,velocity,orange,2.2);
    svg+=label(velocity[0]+4,velocity[1]-5,'v',orange,13);
    // Gravity has its own acceleration scale, independent of the velocity arrow.
    const acc=P(s.x,s.y-ymax*.115);
    svg+=arrow(pos,acc,blue,1.6)+label(acc[0]+6,acc[1]+2,'g',blue,12);
  }
  const shadow=P(s.x,0);
  svg+=line(pos,shadow,'#72cbbb',1,'2 5',.38)+circle(pos,22,'url(#shot-halo)')+circle(pos,7,'#b6fff2',mint,1.6)+circle(pos,3.4,'#f1fffc');
  return svg;
}
const projectile={
 id:'projectile',title:'Projectile motion',module:2,spatial:true,
 intro:'Launch a particle and follow its velocity from release to impact. The apex separates ascent from descent, while the horizontal reach records the entire flight.',
 params:[param('speed','Launch speed','v₀','m/s',1,70,.5,24),param('angle','Launch angle','θ','°',2,88,1,48),param('height','Release height','h','m',0,40,.5,0),param('gravity','Gravitational acceleration','g','m/s²',1.6,25,.01,9.81),{...param('drag','Quadratic drag per unit mass','b','m⁻¹',0,.10,.001,.012),mode:'Quadratic drag'}],
 modes:['Ideal flight','Quadratic drag'],
 build:(p,mode)=>mode==='Quadratic drag'?dragShot(p):idealShot(p),
 metrics:[output('x','Horizontal distance','m'),output('y','Height','m'),output('speed','Speed','m/s')],
 series:[output('y','Height','m'),output('x','Horizontal distance','m'),output('vx','Horizontal velocity','m/s'),output('vy','Vertical velocity','m/s'),output('energy','Mechanical energy per mass','J/kg')],
 scene:projectileScene,
 assumptions:['The particle moves in a vertical plane above level ground. Gravity is uniform, and positive y points upward.','Ideal flight omits aerodynamic forces. Quadratic drag uses still air and a constant drag-per-mass coefficient. Spin, lift and wind are omitted.','Ideal flight uses an analytical trajectory. The drag model uses fourth-order Runge–Kutta integration and locates ground impact by bisection. The graph axes may have different spatial scales.'],
 misconception:'At the apex, only vertical velocity vanishes. The projectile still moves horizontally and accelerates downward.',
 insight:'Complementary launch angles give the same ideal range only when release and landing heights match. Air resistance breaks this symmetry by preferentially slowing the longer flight.',
 formulas:[
 {tex:'x=v_0 t\\cos\\theta',variables:[['x','Horizontal displacement from release','m'],['v_0','Launch speed','m/s','speed'],['t','Elapsed time','s'],['\\theta','Angle above the horizontal','rad','angle']],meaning:'Horizontal displacement accumulates at a constant rate during ideal flight.',derivation:'Project the initial velocity onto the horizontal axis. With zero horizontal force this component remains constant, so its time integral is displacement.',example:'A launch at 20 m/s and 60° travels 10 m horizontally in the first second.'},
 {tex:'y=h+v_0t\\sin\\theta-\\tfrac12gt^2',variables:[['y','Height above ground','m'],['h','Initial height','m','height'],['v_0','Launch speed','m/s','speed'],['t','Elapsed time','s'],['\\theta','Launch angle','rad','angle'],['g','Positive magnitude of gravity','m/s²','gravity']],meaning:'The upward launch component raises the particle while downward acceleration progressively curves its path.',derivation:'Integrate constant downward acceleration to get the vertical velocity. Integrate once more and impose the release height. This expression assumes ideal flight.',example:'From a 5 m platform at 20 m/s and 30°, the height after 1 s is 5 + 10 − 4.905 = 10.095 m.'},
 {tex:'\\mathbf a=-g\\,\\hat{\\mathbf y}-b|\\mathbf v|\\mathbf v',variables:[['\\mathbf a','Acceleration vector','m/s²'],['g','Gravitational acceleration magnitude','m/s²','gravity'],['\\hat{\\mathbf y}','Upward unit vector','1'],['b','Quadratic drag per unit mass','m⁻¹','drag'],['\\mathbf v','Velocity relative to still air','m/s'],['|\\mathbf v|','Speed','m/s']],meaning:'Drag opposes the instantaneous velocity. Its magnitude grows with the square of speed.',derivation:'Divide quadratic aerodynamic resistance by mass, resolve it opposite the velocity, then add gravity. The coefficient is treated as speed independent.',example:'At 20 m/s horizontally with b = 0.010 m⁻¹, the initial acceleration components are −4.0 and −9.81 m/s².'}],
 challenges:[
 {question:'A ball leaves a 5.0 m platform at 20.0 m/s, 30° above horizontal. With g = 10 m/s² and ideal flight, how far from the platform does it land?',hints:['Resolve the launch speed into horizontal and vertical components.','Set the height to zero. Use the positive time root, then multiply by horizontal speed.'],answer:41.8154055035,unit:'m',tolerance:.15,solution:'The vertical component is 10.0 m/s. Solving 0 = 5 + 10t − 5t² gives t = 1 + √2 s. The horizontal component is 10√3 m/s, giving 41.82 m.'},
 {question:'A shot crosses a 12 m high window twice, 2.00 s apart. It lands at its release height with horizontal speed 15 m/s. For g = 10 m/s², determine its total horizontal range.',hints:['The apex is halfway in time between the crossings.','The apex is 5 m above the window. Use its absolute height to infer the launch vertical speed.'],answer:55.3172667,unit:'m',tolerance:.15,solution:'In one second from the apex the particle drops 5 m, so its peak is 17 m. The vertical launch speed is √340 m/s. Total flight time is 2√340/10 s, giving a range of 55.32 m.'}]
};
function freeResponse(w0,beta,x0,v0,t) {
  const d=beta*beta-w0*w0;
  if(Math.abs(d) < 1e-10*w0*w0) {
    const b=v0+beta*x0, f=Math.exp(-beta*t);
    return [f*(x0+b*t),f*(b-beta*(x0+b*t))];
  }
  if(d<0) {
    const wd=Math.sqrt(-d), c=Math.cos(wd*t), s=Math.sin(wd*t), b=(v0+beta*x0)/wd, f=Math.exp(-beta*t);
    const x=x0*c+b*s;
    return [f*x,f*(wd*(-x0*s+b*c)-beta*x)];
  }
  const root=Math.sqrt(d), r1=-w0*w0/(beta+root), r2=-beta-root;
  const c1=(v0-r2*x0)/(r1-r2), c2=x0-c1;
  const a=c1*Math.exp(r1*t),b=c2*Math.exp(r2*t);
  return [a+b,r1*a+r2*b];
}
function springModel(p,mode) {
  const w0=Math.sqrt(p.stiffness/p.mass),period=TAU/w0;
  const c=mode==='Free oscillation'?0:p.damping;
  const force=mode==='Driven oscillator'?p.force:0;
  const w=p.frequency*TAU, beta=c/(2*p.mass), det=w0*w0-w*w, damp=2*beta*w;
  const resonance=force!==0 && Math.abs(det)<1e-9*w0*w0 && beta===0;
  const D=det*det+damp*damp;
  const C=force && !resonance ? force/p.mass*det/D : 0;
  const S=force && !resonance ? force/p.mass*damp/D : 0;
  const duration=3*period;
  const at=t=>{
    t=clamp(t,0,duration);
    let [x,v]=freeResponse(w0,beta,p.amplitude-C,-S*w,t);
    if(resonance){
      const term=force/(2*p.mass*w);
      x+=term*t*Math.sin(w*t); v+=term*(Math.sin(w*t)+w*t*Math.cos(w*t));
    }else if(force) {
      x+=C*Math.cos(w*t)+S*Math.sin(w*t);
      v+=w*(-C*Math.sin(w*t)+S*Math.cos(w*t));
    }
    const restoring=-p.stiffness*x, push=force*Math.cos(w*t),accel=(restoring-c*v+push)/p.mass;
    const kinetic=p.mass*v*v/2,elastic=p.stiffness*x*x/2;
    return {x,v,accel,restoring,kinetic,elastic,energy:kinetic+elastic,phase:t*w0,period};
  };
  const maxAmplitude=Math.max(.001,...sample(220,f=>Math.abs(at(f*duration).x)));
  const maxV=Math.max(.001,...sample(220,f=>Math.abs(at(f*duration).v)));
  return {duration,at,period,maxAmplitude,maxV};
}
function springScene({model,state:s,t,showVectors,showPath}){
  const left=62,center=371,width=240,y=141, xx=center+width*s.x/model.maxAmplitude;
  const svg=['<defs><linearGradient id="mass-face" x2=".8" y2="1"><stop stop-color="#579caa"/><stop offset=".45" stop-color="#287180"/><stop offset="1" stop-color="#193d53"/></linearGradient></defs>'];
  const axis=201;
  for(let x=left;x<=705;x+=16)svg.push(line([x,axis],[x-6,axis+7],'#426072',.8));
  svg.push(line([left,axis],[706,axis],'#67818c',1.5),line([center,78],[center,axis+23],gray,1,'4 4',.75),label(center,axis+36,'equilibrium',gray,10,'middle'));
  for(let yy=94;yy<198;yy+=10)svg.push(line([left-8,yy+7],[left,yy],gray,1));
  svg.push(line([left,89],[left,axis],gray,2.2));
  const springEnd=xx-29, coilStart=left+17, coilEnd=springEnd-14;
  const coils=[[left,y],[coilStart,y],...sample(260,f=>[coilStart+(coilEnd-coilStart)*f,y-14*Math.sin(f*TAU*12)]),[springEnd,y]];
  svg.push(path(coils,'#3c797b',5.2),path(coils,mint,1.5));
  svg.push('<rect x="'+(xx-29)+'" y="'+(y-27)+'" width="58" height="58" rx="7" fill="url(#mass-face)" stroke="'+mint+'" stroke-width="1.6"/>',label(xx,y+8,'m','#d9fff6',20,'middle'),circle([xx-16,189],10,'#1e3340',gray,2),circle([xx+16,189],10,'#1e3340',gray,2));
  if(showVectors){
    const forceLength=-s.x/model.maxAmplitude*62, velLength=s.v/model.maxV*62;
    svg.push(arrow([xx,88],[xx+forceLength,88],orange),label(xx,76,'Fₛ',orange,11,'middle'),arrow([xx,56],[xx+velLength,56],blue),label(xx,44,'v',blue,11,'middle'));
  }
  const px=135,py=310,pw=49,ph=43,phaseP=q=>[px+pw*q.x/model.maxAmplitude,py-ph*q.v/model.maxV];
  svg.push(line([73,py],[204,py],gray,1),line([px,364],[px,254],gray,1),label(201,py+17,'x'),label(px+7,260,'v'));
  if(showPath) svg.push(path(sample(180,f=>phaseP(model.at(f*model.duration))),mint,1.3,'opacity=".65"'));
  svg.push(circle(phaseP(s),4,orange),label(237,285,'Phase space',gray,11),label(237,307,'x  '+fmt(s.x,3)+' m',mint,12),label(237,330,'v  '+fmt(s.v,3)+' m/s',blue,12));
  const scale=Math.max(s.energy,.000001),bar=171;
  for(const [i,key,name,col] of [[0,'elastic','Spring energy',mint],[1,'kinetic','Kinetic energy',orange]]){
    const yy=282+i*46;
    svg.push(label(461,yy,name,gray,11),label(690,yy,fmt(s[key],3)+' J',col,11,'end'),line([461,yy+14],[461+bar,yy+14],'#2d4254',5),line([461,yy+14],[461+bar*s[key]/scale,yy+14],col,5));
  }
  return svg.join('');
}
const shm={
 id:'shm',title:'Oscillations and energy',module:7,
 intro:'Release a spring-mounted cart from rest. Inspect its restoring force, trace a phase-space orbit, and follow energy as it passes between spring and cart.',
 modes:['Free oscillation','Viscous damping','Driven oscillator'],
 params:[param('mass','Cart mass','m','kg',.1,4,.05,1),param('stiffness','Spring stiffness','k','N/m',1,60,.5,12),param('amplitude','Initial displacement','x₀','m',.05,1.5,.01,.6),{...param('damping','Viscous damping','c','N·s/m',0,15,.05,1),modes:['Viscous damping','Driven oscillator']},{...param('force','Driving force amplitude','F₀','N',0,10,.1,2),mode:'Driven oscillator'},{...param('frequency','Driving frequency','f','Hz',.05,3,.01,.55),mode:'Driven oscillator'}],
 build:springModel,scene:springScene,metrics:[output('x','Displacement','m'),output('v','Velocity','m/s'),output('energy','Mechanical energy','J')],
 series:[output('x','Displacement','m'),output('v','Velocity','m/s'),output('accel','Acceleration','m/s²'),output('energy','Mechanical energy','J'),output('kinetic','Kinetic energy','J'),output('elastic','Spring energy','J')],
 assumptions:['A point mass moves horizontally on a frictionless rail. The spring obeys Hooke’s law throughout its travel and has negligible mass.','Damping, when selected, is proportional to velocity. The external drive is sinusoidal and starts at maximum force. The cart starts from rest.','The analytical solution includes underdamped, critically damped and overdamped motion. The display spans three undamped natural periods.'],
 misconception:'Maximum displacement gives the greatest restoring acceleration. Maximum speed occurs as an undamped cart crosses equilibrium.',
 insight:'An undamped system repeatedly trades kinetic and elastic energy. In phase space its trajectory closes into an ellipse. Damping contracts the orbit, while a periodic drive can sustain it.',
 formulas:[
 {tex:'m\\ddot x+c\\dot x+kx=F_0\\cos(2\\pi ft)',variables:[['m','Cart mass','kg','mass'],['x','Signed displacement from equilibrium','m'],['\\dot x','Signed velocity','m/s'],['\\ddot x','Acceleration','m/s²'],['c','Viscous damping coefficient','N·s/m','damping'],['k','Spring stiffness','N/m','stiffness'],['F_0','Drive amplitude','N','force'],['f','Drive frequency','Hz','frequency'],['t','Elapsed time','s'],['\\pi','Circle constant','1']],meaning:'Newton’s second law balances the spring force, viscous resistance and periodic external drive.',derivation:'Choose rightward as positive. Sum the restoring force, the velocity-dependent friction and the imposed cosine force, then divide by mass to get acceleration.',example:'For m = 1 kg, k = 12 N/m and x = 0.6 m at rest, a 2 N rightward drive gives an acceleration of −5.2 m/s².'},
 {tex:'T=2\\pi\\sqrt{m/k}',variables:[['T','Natural period of free oscillation','s'],['m','Mass','kg','mass'],['k','Spring stiffness','N/m','stiffness'],['\\pi','Circle constant','1']],meaning:'With zero damping and drive, mass slows the oscillation and a stiff spring speeds it up.',derivation:'A sinusoidal trial displacement has acceleration proportional to its negative displacement. Matching this coefficient to the spring force gives the natural frequency and hence the period.',example:'A 1 kg cart on a 12 N/m spring has a period of 1.814 s, independent of initial displacement within the Hooke-law model.'},
 {tex:'E=\\tfrac12m v^2+\\tfrac12k x^2',variables:[['E','Instantaneous mechanical energy','J'],['m','Cart mass','kg','mass'],['v','Velocity','m/s'],['k','Spring stiffness','N/m','stiffness'],['x','Displacement','m']],meaning:'Kinetic energy and stored elastic energy sum to the mechanical energy. This total is conserved for free undamped motion.',derivation:'Integrating the magnitude of the restoring force from zero extension gives the spring energy. Add the kinetic energy of the moving mass.',example:'At release, a 12 N/m spring stretched by 0.60 m stores 2.16 J. In free motion the 1 kg cart reaches 2.08 m/s at equilibrium.'}],
 challenges:[
 {question:'A 0.50 kg cart oscillates on a 20 N/m spring with amplitude 0.30 m. What speed does it have at a displacement of 0.18 m?',hints:['Use total energy at the turning point.','Subtract the remaining spring energy to obtain kinetic energy.'],answer:1.5178933,unit:'m/s',tolerance:.015,solution:'The kinetic energy at 0.18 m is 10(0.30² − 0.18²) = 0.576 J. Therefore its speed is √(2 × 0.576 / 0.50) = 1.518 m/s.'},
 {question:'An underdamped cart of mass 0.80 kg has positive turning points 0.40 m and 0.25 m one damped period of 1.60 s apart. Infer the viscous damping coefficient.',hints:['The amplitude envelope decays exponentially.','The decay rate of the envelope is half the damping coefficient divided by mass.'],answer:.47000363,unit:'N·s/m',tolerance:.006,solution:'After one period the same-phase displacement is multiplied by exp[−cT/(2m)]. Thus c = (2 × 0.80 / 1.60) ln(0.40/0.25) = 0.470 N·s/m.'}]
};
const bodies={
 Earth:{radius:6371000,mu:3.986004418e14},
 Moon:{radius:1737400,mu:4.9048695e12},
 Mars:{radius:3389500,mu:4.282837e13}
};
function orbitModel(p,mode) {
  const body=bodies[mode]||bodies.Earth, e=p.eccentricity, rp=body.radius+p.altitude*1000;
  const a=rp/(1-e), minor=a*Math.sqrt(1-e*e), n=Math.sqrt(body.mu/a**3), duration=TAU/n;
  function at(t){
    const M=n*clamp(t,0,duration);
    let E=e<.75?M:Math.PI;
    for(let i=0;i<18;i++) {
      const delta=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
      E-=delta;
      if(Math.abs(delta)<1e-13)break;
    }
    const co=Math.cos(E),si=Math.sin(E),d=1-e*co, dE=n/d;
    const x=a*(co-e), z=minor*si, vx=-a*si*dE,vz=minor*co*dE;
    const r=a*d,v=Math.hypot(vx,vz);
    const theta=(Math.atan2(z,x)/deg+360)%360;
    return {x,z,vx,vz,r,distance:r/1000,altitude:(r-body.radius)/1000,speed:v/1000,theta,energy:(v*v/2-body.mu/r)/1e6,potential:-body.mu/r/1e6,accel:body.mu/r**2,period:duration};
  }
  return {at,duration,a,minor,rp,body,e};
}
// Small hand-drawn geographic silhouettes for the globe texture; landmarks are
// schematic, independent of the orbital solver and never used for measurements.
const landOutlines=[
[[-168,66],[-163,61],[-152,58],[-137,58],[-128,50],[-124,40],[-117,32],[-111,27],[-108,23],[-101,17],[-96,16],[-90,14],[-86,12],[-83,9],[-79,9],[-82,14],[-86,16],[-87,21],[-90,21],[-91,18],[-95,20],[-98,25],[-93,29],[-84,29],[-81,25],[-80,26],[-80,32],[-76,36],[-74,40],[-68,44],[-65,44],[-60,47],[-57,51],[-60,54],[-64,59],[-69,60],[-73,56],[-79,52],[-83,55],[-90,57],[-94,60],[-90,65],[-84,67],[-83,72],[-93,74],[-103,70],[-112,71],[-123,70],[-132,69],[-144,70],[-155,71],[-164,69]],
[[-81,12],[-75,12],[-71,11],[-68,11],[-62,10],[-60,8],[-53,5],[-50,1],[-45,-2],[-36,-5],[-35,-8],[-38,-13],[-40,-19],[-42,-22],[-48,-25],[-49,-29],[-53,-33],[-57,-35],[-58,-39],[-62,-42],[-65,-45],[-66,-50],[-69,-54],[-73,-53],[-75,-49],[-74,-43],[-72,-37],[-71,-31],[-70,-23],[-75,-16],[-78,-11],[-81,-5],[-80,-2],[-78,2],[-77,6]],
[[-73,59],[-58,62],[-50,65],[-44,64],[-40,66],[-35,67],[-27,71],[-22,74],[-19,79],[-25,82],[-36,83],[-54,82],[-64,79],[-70,76],[-64,72],[-58,70],[-58,67]],
[[-17,14],[-16,20],[-13,26],[-10,30],[-9,34],[-6,36],[-2,35],[4,37],[10,37],[11,34],[14,33],[20,32],[25,32],[32,31],[33,28],[35,24],[38,19],[40,16],[43,12],[48,12],[51,12],[50,7],[47,3],[43,-1],[40,-5],[40,-12],[37,-17],[35,-20],[34,-25],[30,-30],[26,-34],[20,-35],[17,-32],[15,-27],[13,-22],[12,-17],[12,-11],[13,-7],[10,-3],[9,3],[6,4],[3,6],[-1,5],[-6,5],[-9,6],[-12,8],[-14,10]],
[[44,-13],[50,-12],[50,-17],[46,-25],[44,-25],[43,-21]],
[[-10,36],[-9,42],[-4,44],[-1,44],[-2,47],[-5,48],[0,50],[3,51],[4,53],[8,54],[9,57],[13,55],[18,55],[22,59],[19,61],[13,59],[9,58],[5,59],[5,63],[12,67],[18,69],[25,71],[31,70],[33,67],[40,67],[43,69],[53,68],[60,69],[69,73],[75,72],[83,74],[99,77],[106,76],[113,74],[120,73],[133,72],[143,73],[153,70],[161,70],[172,70],[179,67],[178,63],[170,60],[164,60],[160,55],[156,51],[155,53],[158,59],[153,60],[143,59],[139,54],[135,52],[140,48],[136,44],[131,42],[129,39],[127,36],[126,34],[125,36],[125,39],[122,40],[120,39],[119,37],[122,36],[120,33],[122,30],[120,27],[116,23],[112,21],[108,21],[106,19],[107,16],[109,12],[106,10],[104,11],[101,13],[100,10],[102,6],[104,3],[103,1],[100,4],[99,9],[97,14],[94,16],[92,21],[88,22],[86,20],[83,17],[80,13],[78,8],[76,9],[74,15],[72,20],[69,23],[66,25],[62,25],[58,25],[56,27],[53,25],[50,27],[47,30],[48,27],[50,24],[54,23],[57,25],[60,22],[56,18],[52,16],[47,13],[44,12],[42,15],[39,20],[37,24],[35,29],[34,29],[33,31],[35,34],[36,36],[32,36],[29,37],[27,38],[27,41],[26,40],[24,38],[23,37],[21,37],[20,40],[17,42],[14,45],[12,45],[13,43],[17,40],[16,39],[12,42],[10,44],[8,44],[6,43],[3,43],[1,41],[-1,38],[-5,36]],
[[-8,51],[-6,51],[-5,53],[-3,54],[-5,55],[-5,58],[-2,58],[-2,56],[0,53],[2,52],[0,51],[-4,50]],
[[-10,52],[-9,54],[-8,55],[-6,55],[-6,52]],[[130,31],[132,33],[135,34],[139,35],[141,39],[142,41],[139,40],[138,37],[135,35],[132,35]],[[141,42],[143,45],[145,45],[146,43],[143,42]],
[[112,-23],[114,-21],[118,-20],[121,-18],[123,-15],[127,-14],[130,-12],[133,-12],[136,-13],[138,-16],[141,-17],[142,-11],[145,-15],[147,-19],[150,-22],[153,-26],[153,-29],[150,-35],[146,-39],[141,-38],[138,-35],[134,-32],[130,-32],[126,-33],[123,-34],[118,-35],[115,-34],[114,-30]],
[[95,6],[99,4],[104,-1],[106,-6],[102,-4],[98,0]],[[106,-6],[111,-7],[115,-8],[113,-9],[108,-8]],[[109,1],[111,4],[116,7],[119,4],[119,1],[117,-3],[113,-4],[110,-2]],[[132,-1],[137,-2],[141,-3],[145,-4],[150,-7],[148,-10],[143,-8],[139,-8],[137,-5],[133,-4]],[[166,-46],[169,-43],[173,-40],[174,-41],[171,-45]],[[174,-41],[175,-37],[173,-35],[176,-37],[178,-38],[177,-40]]
];
let globeCanvas,texture,globeCache={};
function textureMap() {
  if(texture) return texture;
  const c=document.createElement('canvas'); c.width=720; c.height=360;
  const g=c.getContext('2d',{willReadFrequently:true});
  if(!g)return null;
  g.fillStyle='black';g.fillRect(0,0,720,360);g.fillStyle='white';
  for(const outline of landOutlines){
    g.beginPath();outline.forEach(([lon,lat],i)=>g[i?'lineTo':'moveTo']((lon+180)*2,(90-lat)*2));g.closePath();g.fill();
  }
  g.beginPath();
  for(let i=0;i<=720;i++)g[i?'lineTo':'moveTo'](i,322+4*Math.sin(i*.04)+3*Math.cos(i*.07));
  g.lineTo(720,360);g.lineTo(0,360);g.closePath();g.fill();
  texture=g.getImageData(0,0,720,360).data;
  return texture;
}
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>a.map(v=>v/Math.hypot(...a));
function cameraAxes(P) {
  const o=P(0,0,0), axes=[P(1,0,0),P(0,1,0),P(0,0,1)];
  const right=norm(axes.map(a=>a[0]-o[0])), down=norm(axes.map(a=>a[1]-o[1]));
  const near=norm(cross(down,right));
  return {right,down,near,scale:Math.hypot(...axes.map(a=>a[0]-o[0]))};
}
// Orthographically sample a procedural sphere. The latitude/longitude mesh and
// land are painted in body coordinates, so camera rotation exposes new terrain.
function globeImage(body,cam) {
  if(typeof document==='undefined')return null;
  const key=body+cam.right.concat(cam.down).map(v=>Math.round(v*40)).join(',');
  if(globeCache.key===key)return globeCache.uri;
  const land=textureMap(); if(!land) return null;
  const size=240;
  globeCanvas ||= document.createElement('canvas');
  globeCanvas.width=size;globeCanvas.height=size;
  const g=globeCanvas.getContext('2d'); if(!g)return null;
  const image=g.createImageData(size,size), data=image.data;
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    const sx=(2*i+1)/size-1,sy=(2*j+1)/size-1, rr=sx*sx+sy*sy;
    if(rr>=1)continue;
    const depth=Math.sqrt(1-rr),n=cam.right.map((v,k)=>v*sx+cam.down[k]*sy+cam.near[k]*depth);
    const lat=Math.asin(clamp(n[1],-1,1))/deg,lon=((Math.atan2(n[0],n[2])/deg+180+26+360)%360)-180;
    const index=(Math.min(359,Math.floor((90-lat)*2))*720+Math.min(719,Math.floor((lon+180)*2)))*4;
    const L=land[index]/255;
    const cloudField=Math.sin(lon*.095+Math.sin(lat*.13)*2.8)+Math.sin(lat*.49+Math.sin(lon*.12)*2)+.55*Math.sin(lat*.87+lon*.19)+.3*Math.cos(lon*.67);
    const wave=Math.sin(lat*.32+lon*.28)+Math.cos(lat*.65-lon*.20);
    const light=.27+.78*Math.max(0,-sx*.56-sy*.46+depth*.69);
    let r,gc,b;
    if(body==='Earth'){
      r=18+L*(61+wave*4);gc=67+L*(102+wave*4);b=123+L*(44+wave*4);
      const ice=Math.max(0,(Math.abs(lat)-70)/20)*L,cloud=clamp((cloudField-1.6)*.28,0,.50);
      const bright=Math.min(.85,ice+cloud);
      r=r*(1-bright)+185*bright;gc=gc*(1-bright)+222*bright;b=b*(1-bright)+232*bright;
    }else if(body==='Moon'){
      const surface=134+wave*9+cloudField*8; r=surface;gc=surface+4;b=surface+10;
    }else{
      r=168+wave*7;gc=84+cloudField*7;b=53+wave*4;
      if(Math.abs(lat)>75){r+=28;gc+=61;b+=66;}
    }
    const lonDist=Math.abs(((lon+180+7.5)%15)-7.5)*Math.cos(lat*deg);
    const latDist=Math.abs(((lat+90+7.5)%15)-7.5);
    const mesh=Math.max(0,1-Math.min(lonDist,latDist)/.48)*.23;
    const rim=(1-depth)**4*.46;
    const k=(j*size+i)*4;
    data[k]=r*light+mesh*102+rim*60;
    data[k+1]=gc*light+mesh*125+rim*134;
    data[k+2]=b*light+mesh*125+rim*195;
    data[k+3]=255*Math.min(1,(1-Math.sqrt(rr))*size*2);
  }
  g.putImageData(image,0,0);
  const uri=globeCanvas.toDataURL('image/png');globeCache={key,uri};return uri;
}
const stars=(()=>{
  let seed=179243;
  const next=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  return Array.from({length:134},()=>{const x=next()*760,y=next()*390,r=.25+next()**3*1.12,alpha=.22+next()*.58;return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(2)+'" fill="#c8def4" opacity="'+alpha.toFixed(2)+'"/>';}).join('');
})();
function orbitScene({p,mode,model,state:s,showVectors,showPath,project,view,focus}) {
  const spatial=String(view).toLowerCase()==='3d';
  const P=spatial?project:(x,y,z)=>[380+x*171,185-z*106-y*171];
  const cam=spatial?cameraAxes(P):{right:[1,0,0],down:[0,0,-1],near:[0,-1,0],scale:171};
  // Draw the 2D view face-on, with equal axis scales for accurate geometry.
  const faceScale=154,faceP=(x,y,z)=>[380+faceScale*x,194-faceScale*z];
  const projectWorld=spatial?P:faceP;
  const scale=spatial?1.61:1.08, off=model.e*scale, globeR=model.body.radius/model.a*scale;
  const center=projectWorld(off,0,0), radius=globeR*(spatial?cam.scale:faceScale);
  const inclination=spatial?p.inclination*deg:0;
  function world(x,z){return [off+x/model.a*scale,z/model.a*scale*Math.sin(inclination),z/model.a*scale*Math.cos(inclination)];}
  function point(x,z){return projectWorld(...world(x,z));}
  const current=point(s.x,s.z),worldNow=world(s.x,s.z);
  const front=dot([worldNow[0]-off,worldNow[1],worldNow[2]],cam.near)>=0;
  const far=[],near=[];
  if(showPath) {
    let previous=null,side=null,segment=[];
    for(let i=0;i<=220;i++){
      const angle=i*TAU/220,x=model.a*(Math.cos(angle)-model.e),z=model.minor*Math.sin(angle),w=world(x,z),pp=projectWorld(...w);
      const nextSide=dot([w[0]-off,w[1],w[2]],cam.near)>=0;
      if(side!==null&&nextSide!==side){
        segment.push(pp);(side?near:far).push(segment);segment=[pp];
      } else segment.push(pp);
      previous=pp;side=nextSide;
    }
    if(segment.length>1)(side?near:far).push(segment);
  }
  const out=['<defs><radialGradient id="space-light"><stop stop-color="#1e426a" stop-opacity=".34"/><stop offset=".63" stop-color="#15334f" stop-opacity=".16"/><stop offset="1" stop-color="#092033" stop-opacity="0"/></radialGradient><radialGradient id="earth-air"><stop offset=".68" stop-color="#65b9ff" stop-opacity=".08"/><stop offset=".78" stop-color="#5ca9ff" stop-opacity=".23"/><stop offset=".815" stop-color="#70d2ff" stop-opacity=".55"/><stop offset=".86" stop-color="#3d8de5" stop-opacity=".13"/><stop offset="1" stop-color="#317abb" stop-opacity="0"/></radialGradient><radialGradient id="globe-base" cx="34%" cy="28%" r="74%"><stop stop-color="#66b7c8"/><stop offset=".4" stop-color="#216998"/><stop offset="1" stop-color="#07152a"/></radialGradient><radialGradient id="sat-glow"><stop stop-color="#ffd4a3" stop-opacity=".92"/><stop offset=".19" stop-color="#ffc482" stop-opacity=".56"/><stop offset="1" stop-color="#f9aa5c" stop-opacity="0"/></radialGradient></defs>'];
  out.push('<rect x="0" y="0" width="760" height="390" fill="#091321"/>',stars,'<ellipse cx="'+center[0]+'" cy="'+center[1]+'" rx="335" ry="205" fill="url(#space-light)"/>');
  if(spatial){
    for(let i=-5;i<=5;i++){
      const q=i*.38;
      out.push(line(P(q,-.70,-1.6),P(q,-.70,1.6),'#586f87',.65,'',.20),line(P(-1.9,-.70,q),P(1.9,-.70,q),'#586f87',.65,'',.20));
    }
  }
  const ink=focus==='eccentricity'||focus==='altitude'?'#c8fff2':'#75e4d0';
  const arc=(seg,back)=>path(seg,ink,back?1.65:2.1,back?'opacity=".77"':'opacity=".95"');
  far.forEach(segment=>out.push(arc(segment,true)));
  const drawSat=()=>{
    let sat='';
    if(showVectors){
      const speed=Math.hypot(s.vx,s.vz), renderTime=model.a*.19/speed;
      const vTo=point(s.x+s.vx*renderTime,s.z+s.vz*renderTime);
      sat+=arrow(current,vTo,orange,1.7)+label(vTo[0]+6,vTo[1]-5,'v',orange,11);
      const gTo=point(s.x*.83,s.z*.83);
      sat+=arrow(current,gTo,blue,1.4);
    }
    return sat+circle(current,15,'url(#sat-glow)')+circle(current,4.4,'#ffda9d','#fff0d7',1.2);
  };
  if(!front)out.push(drawSat());
  if(showVectors)out.push(line(center,current,'#c4d8ed',.9,'3 5',.52));
  const textureUri=globeImage(mode,cam);
  out.push(circle(center,radius*1.215,'url(#earth-air)'),circle(center,radius,'url(#globe-base)'));
  if(textureUri)out.push('<image href="'+textureUri+'" x="'+(center[0]-radius)+'" y="'+(center[1]-radius)+'" width="'+(2*radius)+'" height="'+(2*radius)+'"/>');
  else for(let j=1;j<5;j++)out.push('<ellipse cx="'+center[0]+'" cy="'+center[1]+'" rx="'+radius*j/5+'" ry="'+radius+'" fill="none" stroke="#7fcad3" opacity=".28"/>');
  out.push(circle(center,radius,'none','#80bedc',.85));
  near.forEach(segment=>out.push(arc(segment,false)));
  if(front)out.push(drawSat());
  if(showPath && model.e>.0001) {
    for(const [sign,name,r] of [[1,'Periapsis',model.rp],[-1,'Apoapsis',model.a*(1+model.e)]]){
      const pointAt=point(sign*r,0),dir=pointAt[0]>=center[0]?1:-1;
      if(Math.hypot(pointAt[0]-center[0],pointAt[1]-center[1])<radius && dot([sign,0,0],cam.near)<0)continue;
      const targetX=clamp(pointAt[0]+dir*22,84,676);
      const targetY=clamp(pointAt[1]+(sign>0?25:-26),30,350);
      out.push(circle(pointAt,3.1,'#10262d',ink,1.35),line([pointAt[0],pointAt[1]+(sign>0?4:-4)],[targetX,targetY],'#8fb8be',.8,'',.75),label(targetX+dir*3,targetY+(sign>0?11:-3),name,'#b5cdd8',11,dir>0?'start':'end'));
    }
  }
  return out.join('');
}
const orbit={
 id:'orbit',title:'Orbital mechanics',module:5,spatial:true,
 intro:'Track a satellite as it sweeps around a planet. Change its periapsis and eccentricity, then compare the speed and gravitational acceleration at opposite ends of the orbit.',
 params:[param('altitude','Periapsis altitude','hₚ','km',100,20000,50,2700),param('eccentricity','Orbital eccentricity','e','',0,.85,.01,.44),param('inclination','Orbital inclination','i','°',0,75,1,18)],
 modes:['Earth','Moon','Mars'],
 build:orbitModel,scene:orbitScene,metrics:[output('altitude','Altitude','km'),output('speed','Orbital speed','km/s'),output('accel','Gravitational acceleration','m/s²')],
 series:[output('altitude','Altitude','km'),output('speed','Orbital speed','km/s'),output('accel','Gravitational acceleration','m/s²'),output('energy','Specific orbital energy','MJ/kg'),output('potential','Specific potential','MJ/kg')],
 assumptions:['The satellite has negligible mass compared with a spherical central body. Air resistance, oblateness, rotation and third-body forces are omitted. The orbit begins at periapsis.','This model covers bound ellipses and their circular limit. Position follows Kepler’s equation, solved to numerical tolerance. Inclination changes the plane in the spatial view.','The planet and orbital distances share a physical scale. The glowing satellite marker and atmospheric halo are enlarged for visibility. Globe surfaces are schematic.'],
 misconception:'The altitude control measures from the surface. Gravity and orbital formulas use the distance from the center, which includes the planetary radius.',
 insight:'Near periapsis a satellite moves quickly through a short radius. Angular momentum conservation means that the swept area per second remains constant even as the angular speed changes.',
 formulas:[
 {tex:'v^2=\\mu\\left(\\frac{2}{r}-\\frac{1}{a}\\right)',variables:[['v','Instantaneous orbital speed','m/s'],['\\mu','Central body gravitational parameter','m³/s²'],['r','Current distance from the central body’s center','m'],['a','Semimajor axis of the orbit','m']],meaning:'In an ellipse around a fixed mass, orbital speed increases as the satellite approaches the focus.',derivation:'At the apsides use angular momentum conservation to relate their speeds. Set their specific mechanical energies equal and use the fact that the apsidal radii sum to twice the semimajor axis. The resulting constant energy fixes the speed elsewhere.',example:'For Earth with μ = 3.986 × 10¹⁴ m³/s², a = 10,000 km and r = 8,000 km, the speed is 7.73 km/s.'},
 {tex:'T=2\\pi\\sqrt{a^3/\\mu}',variables:[['T','Time for one revolution','s'],['a','Semimajor axis','m'],['\\mu','Central body gravitational parameter','m³/s²'],['\\pi','Circle constant','1']],meaning:'At fixed central mass, the semimajor axis sets the orbital period. Eccentricity enters this lab’s period because periapsis altitude is held fixed.',derivation:'Divide the area of the ellipse by its constant areal speed. Substituting the angular momentum obtained from the apsidal speed eliminates eccentricity at fixed semimajor axis.',example:'An Earth orbit with semimajor axis 10,000 km takes 9,952 s, or 2.76 h.'},
 {tex:'F_r=-\\frac{dU}{dr}=-\\frac{m\\mu}{r^2}',variables:[['F_r','Radial force, outward taken positive','N'],['U','Gravitational potential energy with zero at infinity','J'],['r','Distance between centers','m'],['dU/dr','Outward slope of potential energy','J/m = N'],['m','Satellite mass','kg'],['\\mu','Gravitational parameter','m³/s²']],meaning:'Potential energy increases outward, giving a negative radial force. The force points toward decreasing potential energy.',derivation:'An outward displacement against attraction increases potential energy by the negative of the work gravity does. Differentiating gravitational potential energy with respect to radius gives a positive slope and the force is its negative.',example:'For a 2 kg satellite 8,000 km from Earth’s center, the potential-energy slope is +12.46 J/m and the radial force is −12.46 N.'}],
 challenges:[
 {question:'A satellite travels at 8.00 km/s at periapsis, 7,000 km from the center. Apoapsis is 14,000 km from the center. What is the apoapsis speed?',hints:['At each apsis the velocity is tangential.','Gravity exerts zero torque about the center. Equate angular momentum at both apsides.'],answer:4,unit:'km/s',tolerance:.02,solution:'Specific angular momentum equals radius times tangential speed. Doubling the radius therefore halves the speed, to 4.00 km/s.'},
 {question:'An Earth satellite has a period of 14,400 s and periapsis radius 8,000 km. With μ = 3.986 × 10¹⁴ m³/s², calculate its apoapsis radius in km.',hints:['Invert the period law to find the semimajor axis in metres.','The sum of periapsis and apoapsis radii equals the full major axis.'],answer:2*Math.cbrt(3.986e14*(14400/TAU)**2)/1000-8000,unit:'km',tolerance:30,solution:'The semimajor axis is the cube root of μ(T/2π)², about 12,790 km. Subtracting the periapsis radius from twice the semimajor axis gives approximately 17,580 km.'}]
};
export const labs=[projectile,shm,orbit];
