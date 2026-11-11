// SI throughout the solvers. Angle controls and plotted angular displacement are in degrees.
const pi=Math.PI, tau=2*pi, rad=pi/180, g=9.81;
const A='#75e5ce', B='#ffc18c', C='#b7a1ff', ink='#dbe8f3', muted='#94a8bb';
const P=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const Q=(key,label,unit)=>({key,label,unit});
const line=(x1,y1,x2,y2,col=muted,w=1,dash='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+w+'" stroke-dasharray="'+dash+'"/>';
const label=(x,y,str,col=ink,size=12,anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+col+'" font-size="'+size+'" text-anchor="'+anchor+'">'+str+'</text>';
const circle=(x,y,r,fill,stroke='none',w=1)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'"/>';
const rect=(x,y,w,h,fill,stroke,rx=3)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'"/>';
const fmt=(x,n=2)=>Number(x.toFixed(n)).toString();
const clamp=(t,d)=>Math.max(0,Math.min(d,t));
function arrow(x,y,dx,dy,color,legend=''){
 const L=Math.hypot(dx,dy);if(L<.5)return '';
 const vx=dx/L,vy=dy/L,ex=x+dx,ey=y+dy,h=Math.min(8,L*.35);
 const points=[[ex,ey],[ex-h*vx+h*.45*vy,ey-h*vy-h*.45*vx],[ex-h*vx-h*.45*vy,ey-h*vy+h*.45*vx]].map(a=>a.join(',')).join(' ');
 return line(x,y,ex,ey,color,2)+'<polygon points="'+points+'" fill="'+color+'"/>'+(legend?label(ex+vx*6,ey+vy*8+3,legend,color,12,vx<-.1?'end':vx>.1?'start':'middle'):'');
}
function pendulumModel(p,mode){
 const a0=p.amplitude*rad, w=Math.sqrt(p.gravity/p.length), smallT=tau/w;
 let a=1,b=Math.cos(a0/2);
 for(let i=0;i<12;i++){const av=(a+b)/2;b=Math.sqrt(a*b);a=av}
 const exactT=smallT/a, duration=3*exactT, steps=1800,dt=duration/steps;
 const nonlinear=mode!=='Small-angle model', states=[[a0,0]];
 const acceleration=x=>-w*w*Math.sin(x);
 let x=a0,v=0;
 for(let i=0;i<steps;i++){
  const k1v=acceleration(x),k2x=v+k1v*dt/2,k2v=acceleration(x+v*dt/2);
  const k3x=v+k2v*dt/2,k3v=acceleration(x+k2x*dt/2),k4x=v+k3v*dt,k4v=acceleration(x+k3x*dt);
  x+=dt*(v+2*k2x+2*k3x+k4x)/6;v+=dt*(k1v+2*k2v+2*k3v+k4v)/6;states.push([x,v]);
 }
 const at=time=>{
  const t=clamp(time,duration),s=t/dt,i=Math.min(steps-1,Math.floor(s)),f=s-i,[x0,v0]=states[i],[x1,v1]=states[i+1];
  // Cubic Hermite interpolation of angle; differentiate this same polynomial for angular velocity.
  const c2=3*(x1-x0)-dt*(2*v0+v1),c3=-2*(x1-x0)+dt*(v0+v1);
  const nx=x0+f*(dt*v0+f*(c2+f*c3)),nv=v0+f*(2*c2+3*f*c3)/dt;
  const sx=a0*Math.cos(w*t),sv=-w*a0*Math.sin(w*t),angle=nonlinear?nx:sx,omega=nonlinear?nv:sv;
  return {angle:angle/rad,exact:nx/rad,small:sx/rad,omega,discrepancy:(nx-sx)/rad,period:nonlinear?exactT:smallT,
   energy:p.mass*(p.length**2*omega**2/2+p.gravity*p.length*(nonlinear?1-Math.cos(angle):angle**2/2))};
 };
 return {at,duration,exactT,smallT};
}
function pendulumScene({p,state:s,model,mode,showVectors,showPath}){
 const xp=255,yp=120,L=114,pt=angle=>[xp+L*Math.sin(angle*rad),yp+L*Math.cos(angle*rad)], [xb,yb]=pt(s.angle),[xs,ys]=pt(mode==='Small-angle model'?s.exact:s.small);
 let pic=label(32,35,'PENDULUM PLANE',muted,11)+line(50,302,467,302,'#34495b')+line(xp,yp,xp,yp+L+36,'#667b90',1,'3 4');
 pic+=line(xp-46,yp-10,xp+46,yp-10,muted,3)+line(xp,yp-10,xp,yp,muted,4);
 if(showPath){let dots=[];for(let j=0;j<=120;j++)dots.push(pt(-p.amplitude+2*p.amplitude*j/120).join(','));pic+='<polyline points="'+dots.join(' ')+'" fill="none" stroke="#395d6d" stroke-width="1.5"/>';
 pic+=line(xp,yp,xs,ys,B,1.3,'5 5')+circle(xs,ys,7,'#775541',B)}
 pic+=line(xp,yp,xb,yb,A,2.5)+circle(xp,yp,5,'#aebfce')+circle(xb,yb,12,'#267887',A,2);
 if(showVectors){const a=s.angle*rad;pic+=arrow(xb,yb,-38*Math.sin(a)*Math.cos(a),38*Math.sin(a)**2,C,'gₜ')}
 pic+=label(60,331,mode==='Small-angle model'?'Small-angle bob':'Nonlinear bob',A,12)+(showPath?label(60,354,mode==='Small-angle model'?'Reference · nonlinear':'Reference · small angle',B,12):'');
 pic+=line(485,54,485,341,'#34495b')+label(511,82,'PERIOD COMPARISON',muted,11)+label(512,127,fmt(model.exactT,3)+' s',A,26)+label(512,150,'Nonlinear period',muted,12)+label(512,204,fmt(model.smallT,3)+' s',B,26)+label(512,227,'Small-angle period',muted,12)+label(512,284,'Period increase',muted,12)+label(512,309,fmt(100*(model.exactT/model.smallT-1),2)+' %',ink,18);
 return pic;
}
const pendulum={id:'pendulum',module:7,title:'Nonlinear pendulum',intro:'Release two pendulums from the same angle and measure their growing phase difference.',assumptions:['Point mass on a rigid massless rod in a uniform gravitational field.','Motion stays in a vertical plane without damping.','Small-angle motion uses a linear restoring torque. Nonlinear motion uses fourth-order Runge–Kutta and an independently calculated elliptic-integral period.'],misconception:'Pendulum period is independent of amplitude only in the small-angle limit. At larger angles the true restoring torque is weaker than its linear approximation.',insight:'At a fixed amplitude both periods scale as the square root of length. Their ratio depends only on release angle, so changing length leaves the fractional error unchanged.',modes:['Nonlinear model','Small-angle model'],params:[P('length','Rod length','ℓ','m',.2,3,.02,1),P('amplitude','Release angle','θ₀','°',1,140,1,55),P('mass','Bob mass','m','kg',.1,4,.05,1),P('gravity','Gravity','g','m/s²',1.6,20,.01,9.81)],build:pendulumModel,scene:pendulumScene,metrics:[Q('angle','Angular displacement','°'),Q('omega','Angular velocity','rad/s'),Q('period','Period','s')],series:[Q('exact','Nonlinear angle','°'),Q('small','Small-angle prediction','°'),Q('discrepancy','Angular difference','°'),Q('energy','Model energy','J')],
 formulas:[{tex:'\\ddot{\\theta}=-\\frac{g}{\\ell}\\sin\\theta',variables:[['\\theta','Angle from the downward vertical','rad','amplitude'],['\\ddot{\\theta}','Angular acceleration','rad/s²'],['g','Local gravity','m/s²','gravity'],['\\ell','Rod length','m','length']],meaning:'Gravity rotates the bob toward the downward vertical. Only its component perpendicular to the rod contributes torque.',derivation:'Take the torque about the pivot and divide by the moment of inertia of the bob. The bob mass cancels.',example:'At 30° on a 1.0 m rod with 9.81 m/s² gravity, angular acceleration is −4.905 rad/s².'},{tex:'T_0=2\\pi\\sqrt{\\ell/g}',variables:[['T_0','Small-amplitude period','s'],['\\pi','Circle constant','1'],['\\ell','Rod length','m','length'],['g','Local gravity','m/s²','gravity']],meaning:'For angular amplitudes much smaller than one radian, restoring torque is proportional to angle.',derivation:'Replace the sine of the angle by the angle itself in radians. The resulting harmonic oscillator has angular frequency equal to the square root of gravity divided by length.',example:'At 1.00 m and 9.81 m/s², the small-angle period is 2.006 s.'}],
 challenges:[{question:'A pendulum clock with a 1.00 m rod keeps time on Earth at small amplitude. An elevator accelerates uniformly upward at 2.00 m/s². What rod length restores the original period? Use g = 9.81 m/s².',hints:['Find the effective gravity in the accelerating cabin.','For an unchanged period, length divided by effective gravity stays fixed.'],answer:11.81/9.81,unit:'m',solution:'Effective gravity increases to 11.81 m/s², so length must increase by 11.81/9.81 to 1.204 m.',tolerance:.008},{question:'A pendulum times 20 large-amplitude oscillations in 43.0 s. A small-amplitude run at the same length takes 40.0 s. By what percentage would using the long period in the small-angle formula underestimate gravity?',hints:['For a fixed rod the inferred gravity varies inversely with the squared period.','Calculate one minus the ratio of inferred to true gravity.'],answer:100*(1-(40/43)**2),unit:'%',solution:'The gravity estimate is reduced by the factor (40/43)². The underestimate is 13.47%.',tolerance:.1}]};
function rotorModel(p,mode){
 const duration=6, fixed=mode==='Fixed radius', rFinal=fixed?p.start:p.end, I0=p.hub+2*p.mass*p.start**2,L0=I0*p.speed;
 function quantities(t){const f=t/duration,smooth=f*f*(3-2*f),radius=p.start+(rFinal-p.start)*smooth,rate=(rFinal-p.start)*6*f*(1-f)/duration,inertia=p.hub+2*p.mass*radius**2,momentum=L0+p.torque*t,omega=momentum/inertia;
 return {radius,inertia,momentum,omega,angularAcceleration:(p.torque-omega*4*p.mass*radius*rate)/inertia,energy:inertia*omega**2/2};}
 const n=360,dt=duration/n,theta=[0];
 function integrate(a,b){return (b-a)*(quantities(a).omega+4*quantities((a+b)/2).omega+quantities(b).omega)/6}
 for(let i=0;i<n;i++)theta.push(theta[i]+integrate(i*dt,(i+1)*dt));
 return {duration,at(time){const t=clamp(time,duration),i=Math.min(n-1,Math.floor(t/dt));return {...quantities(t),angle:theta[i]+integrate(i*dt,t)}}};
}
function rotorScene({p,state:s,mode,showPath,showVectors}){
 const x=254,y=186,R=123,scale=R/1.5,rr=s.radius*scale,c=Math.cos(s.angle),sn=-Math.sin(s.angle);
 let pic=label(32,35,'ROTOR · TOP VIEW',muted,11)+circle(x,y,R+8,'#122232','#3b4b60',1.5)+circle(x,y,R,'#172d3c','#547080');
 for(let i=0;i<36;i++){const f=tau*i/36;pic+=line(x+R*Math.cos(f),y+R*Math.sin(f),x+(R-4)*Math.cos(f),y+(R-4)*Math.sin(f),'#7193a4',1)}
 if(showPath)pic+=circle(x,y,rr,'none','#498b8f',1);
 pic+=line(x-c*R,y-sn*R,x+c*R,y+sn*R,'#537186',11)+line(x-c*R,y-sn*R,x+c*R,y+sn*R,'#273e52',6)+circle(x,y,9,'#8598ac',ink);
 for(const sign of [-1,1]){const mx=x+sign*rr*c,my=y+sign*rr*sn;pic+=circle(mx,my,11,'#2e7882',A,2);if(showVectors&&Math.abs(s.omega)>.001)pic+=arrow(mx,my,sign*sn*Math.sign(s.omega)*28,-sign*c*Math.sign(s.omega)*28,B)}
 pic+=label(42,354,mode==='Fixed radius'?'Carriages locked on guide rail':'Carriages driven along radial guide rail',muted,12)+line(465,60,465,337,'#34495b')+label(500,89,'ROTATIONAL STATE',muted,11)+label(500,135,fmt(s.inertia,3)+' kg·m²',A,22)+label(500,158,'Moment of inertia',muted,12)+label(500,218,fmt(s.momentum,3)+' kg·m²/s',B,20)+label(500,241,'Angular momentum',muted,12)+label(500,304,'Positive rotation is anticlockwise.',ink,11);return pic;
}
const torque={id:'torque',module:5,title:'Torque and rotational inertia',intro:'Move two equal masses along a rotating rail and apply a constant torque to the axle.',assumptions:['The central disk has fixed inertia and each carriage is modeled as a point mass.','An actuator prescribes a smooth radial motion over six seconds. Radial forces on the pair exert zero net axial torque.','Axis friction is negligible. The reported energy includes rotational kinetic energy only.'],misconception:'Angular momentum can be conserved while rotational kinetic energy increases. Pulling the carriages inward does work.',insight:'An external torque fixes the slope of angular momentum even while the mass distribution changes. Angular acceleration depends on both the applied torque and the changing inertia.',modes:['Moving masses','Fixed radius'],params:[P('mass','Mass of each carriage','m','kg',.1,2,.05,.5),P('hub','Central disk inertia','Iₕ','kg·m²',.1,2,.05,.4),P('start','Initial radius','r₀','m',.15,1.5,.05,1.1),{...P('end','Final radius','r₁','m',.15,1.5,.05,.45),mode:'Moving masses'},P('speed','Initial angular velocity','ω₀','rad/s',-5,5,.1,1.5),P('torque','Applied torque','τ','N·m',-1,1,.01,0)],build:rotorModel,scene:rotorScene,metrics:[Q('inertia','Moment of inertia','kg·m²'),Q('omega','Angular velocity','rad/s'),Q('momentum','Angular momentum','kg·m²/s')],series:[Q('omega','Angular velocity','rad/s'),Q('momentum','Angular momentum','kg·m²/s'),Q('energy','Rotational energy','J'),Q('radius','Carriage radius','m')],
 formulas:[{tex:'I=I_h+2mr^2',variables:[['I','Total axial moment of inertia','kg·m²'],['I_h','Disk inertia','kg·m²','hub'],['m','Mass of each carriage','kg','mass'],['r','Instantaneous radius of both carriages','m']],meaning:'A carriage farther from the axis contributes more strongly to the resistance to angular acceleration.',derivation:'Each point mass contributes its mass multiplied by the square of the perpendicular distance to the axis. Add both contributions to the disk inertia.',example:'Two 0.50 kg masses at 1.0 m on a disk of inertia 0.40 kg·m² give a total inertia of 1.40 kg·m².'},{tex:'I\\omega=L_0+\\tau t',variables:[['I','Instantaneous total inertia','kg·m²'],['\\omega','Angular velocity','rad/s'],['L_0','Initial angular momentum','kg·m²/s'],['\\tau','Constant net axial torque','N·m','torque'],['t','Elapsed time','s']],meaning:'A constant external torque adds equal amounts of angular momentum each second.',derivation:'Integrate the angular momentum law with constant torque, then use the instantaneous inertia to recover the angular velocity.',example:'An initial momentum of 2 kg·m²/s and torque of 0.5 N·m give 3 kg·m²/s after two seconds. At inertia 1.5 kg·m² the rotor turns at 2 rad/s.'}],
 challenges:[{question:'Two 0.50 kg masses move from 1.00 m to 0.50 m on a disk of inertia 0.50 kg·m². Initially the rotor turns at 2.00 rad/s. With zero external torque, how much rotational kinetic energy is gained?',hints:['Calculate the initial and final total moments of inertia.','Use conservation of angular momentum, then compare energies.'],answer:3,unit:'J',solution:'Inertia falls from 1.50 to 0.75 kg·m². Momentum remains 3.00 kg·m²/s, so the angular speed doubles to 4 rad/s. The energy increases from 3 to 6 J.',tolerance:.02},{question:'A rotor initially has inertia 0.80 kg·m² and angular velocity 3.0 rad/s. Its inertia decreases to 0.40 kg·m² while an external braking torque acts for 4.0 s. What constant signed torque leaves the final angular velocity equal to its initial value?',hints:['Compute the final angular momentum for the specified final speed.','Divide the angular momentum change by the time interval.'],answer:-.3,unit:'N·m',solution:'The initial and final momenta are 2.4 and 1.2 kg·m²/s. Dividing the change of −1.2 kg·m²/s by 4.0 s gives −0.30 N·m.',tolerance:.003}]};
function pulleyModel(p,mode){
 const a=p.slope*rad,normal=p.cart*g*Math.cos(a),parallel=p.cart*g*Math.sin(a),drive=p.hanger*g-parallel;
 const rough=mode!=='Smooth incline',staticMax=rough?(p.mu+p.gap)*normal:0;
 const stuck=Math.abs(drive)<=staticMax+1e-12;
 const friction=stuck?-drive:-(rough?p.mu:0)*normal*Math.sign(drive);
 const acceleration=stuck?0:(drive+friction)/(p.cart+p.hanger);
 const tension=p.hanger*(g-acceleration);
 // End the run after 0.60 m in either direction so both masses stay on their guides.
 const duration=stuck?3:Math.sqrt(1.2/Math.abs(acceleration));
 return {duration,stuck,at(time){const t=clamp(time,duration);return {x:acceleration*t*t/2,v:acceleration*t,acceleration,tension,friction,normal,parallel,drive,staticMax,heat:Math.abs(friction*acceleration*t*t/2)}}};
}
function pulleyScene({p,model,state:s,showPath,showVectors}){
 const a=p.slope*rad,c=Math.cos(a),sn=Math.sin(a),right=390,top=88,length=310,x0=right-length*c,y0=top+length*sn,d=length*.50+s.x*145;
 const x=x0+d*c,y=y0-d*sn,h=top+111+s.x*145;
 let pic=label(26,30,'STRING-CONSTRAINED SYSTEM',muted,11)+'<polygon points="'+x0+','+y0+' '+right+','+top+' '+right+','+y0+'" fill="#152b3a" stroke="#496477"/>'+line(x0,y0,right,top,A,2);
 if(showPath)pic+=line(right+18,top+14,right+18,top+208,'#547080',1,'3 5');
 const px=right-5*sn,py=top-5*c-13;
 pic+=line(x-12*sn,y-12*c,px,py-9,B,2)+line(px+12,py,px+12,h,B,2)+circle(px,py,12,'#22394c',B,2)+circle(px,py,3,ink);
 pic+='<g transform="translate('+x+' '+y+') rotate('+(-p.slope)+')">'+rect(-21,-21,42,18,'#2b6571',A,3)+circle(-14,-2,3,'#bac6d1')+circle(14,-2,3,'#bac6d1')+'</g>';
 pic+=rect(px-3,h,30,27,'#73563e',B,3)+label(px+12,h+18,'B',ink,11,'middle')+label(x-16*sn,y-15*c,'A',ink,11,'middle')+label(26,312,model.stuck?'Static equilibrium':'Kinetic motion',model.stuck?C:A,14)+label(26,339,'Positive direction: A upslope, B downward.',muted,11)+line(461,48,461,347,'#354758');
 pic+=label(483,49,'ISOLATED BODIES',muted,11);
 if(showVectors){
  const scaleA=68/Math.max(p.cart*g,s.normal,s.tension,Math.abs(s.friction)),scaleB=46/Math.max(p.hanger*g,s.tension);
  const X=570,Y=157;
  pic+=circle(X,Y,6,'#347782',A)+arrow(X,Y,0,p.cart*g*scaleA,B,'mₐg')+arrow(X,Y,-sn*s.normal*scaleA,-c*s.normal*scaleA,C,'N')+arrow(X,Y,c*s.tension*scaleA,-sn*s.tension*scaleA,A,'T')+arrow(X,Y,c*s.friction*scaleA,-sn*s.friction*scaleA,'#ec8fad','f');
  pic+=circle(652,279,6,'#73563e',B)+arrow(652,279,0,p.hanger*g*scaleB,B,'mᵦg')+arrow(652,279,0,-s.tension*scaleB,A,'T');
  pic+=label(491,150,'A',muted,12)+label(494,281,'B',muted,12);
 }else{pic+=label(493,157,'Enable vectors to isolate forces.',muted,12)}
 return pic;
}
const pulley={id:'pulley',module:3,title:'Coupled bodies and pulleys',intro:'Connect a cart on an incline to a hanging mass, then isolate the two bodies to identify the forces that accelerate them.',assumptions:['The string is massless, taut and inextensible. The pulley has negligible inertia and axle friction.','The two masses start at rest. Static friction can take any value up to its limit and kinetic friction has a constant coefficient.','The track exerts a normal force perpendicular to the plane. The model ends after a 0.60 m travel.'],misconception:'The string tension equals the hanging weight only when the hanging mass has zero acceleration. Static friction takes whatever value balances the drive up to the limiting value.',insight:'The two string tensions cancel when the positive coordinates agree with the common string displacement. Net driving force divided by the combined mass gives the acceleration.',modes:['Rough incline','Smooth incline'],params:[P('cart','Cart mass','mₐ','kg',.2,4,.1,1.4),P('hanger','Hanging mass','mᵦ','kg',.2,4,.1,1.6),P('slope','Incline angle','θ','°',5,50,1,29),{...P('mu','Kinetic friction coefficient','μₖ','1',0,.8,.01,.15),mode:'Rough incline'},{...P('gap','Static minus kinetic coefficient','Δμ','1',0,.4,.01,.1),mode:'Rough incline'}],build:pulleyModel,scene:pulleyScene,metrics:[Q('acceleration','Acceleration','m/s²'),Q('tension','String tension','N'),Q('friction','Signed friction','N')],series:[Q('x','Cart displacement','m'),Q('v','Cart velocity','m/s'),Q('tension','Tension','N'),Q('heat','Frictional heat','J')],
 formulas:[{tex:'(m_A+m_B)a=m_Bg-m_Ag\\sin\\theta+f',variables:[['m_A','Cart mass','kg','cart'],['m_B','Hanging mass','kg','hanger'],['a','Cart upslope / hanger downward acceleration','m/s²'],['g','Gravity','m/s²'],['\\theta','Incline angle','rad','slope'],['f','Signed friction on the cart, positive upslope','N']],meaning:'Weight of the hanger drives the system in the positive direction. The cart’s downslope weight component opposes that motion.',derivation:'Write Newton’s law separately along the cart track and down the hanger path. Equal and opposite tension contributions cancel when the equations are added.',example:'On a smooth 30° slope, a 2 kg cart and 2 kg hanger accelerate at (19.62 − 9.81)/4 = 2.4525 m/s².'},{tex:'T=m_B(g-a)',variables:[['T','String tension','N'],['m_B','Hanging mass','kg','hanger'],['g','Gravity','m/s²'],['a','Signed downward acceleration of hanger','m/s²']],meaning:'The net downward force on the hanger is its weight minus the upward tension.',derivation:'Resolve the hanging body’s forces in its positive downward direction and rearrange for tension.',example:'A 2 kg mass accelerating downward at 2 m/s² has tension 2(9.81 − 2) = 15.62 N.'}],
 challenges:[{question:'A 2.0 kg cart on a smooth 30° incline is tied to a 1.5 kg hanging mass. Starting from rest, how fast is the hanger moving after descending 0.50 m? Use g = 9.8 m/s².',hints:['Calculate the drop in gravitational energy of the pair.','Both bodies have the same speed and both gain kinetic energy.'],answer:Math.sqrt(1.4),unit:'m/s',solution:'The hanger loses 7.35 J and the cart gains 4.90 J. The remaining 2.45 J is shared kinetic energy, giving speed √(4.90/3.50) = 1.183 m/s.',tolerance:.01},{question:'A 4.0 kg cart rests on a 30° incline with static coefficient 0.30. What is the largest hanging mass that leaves the pair at rest?',hints:['At the upper limit, the cart is on the verge of moving upslope.','Downslope friction joins the downslope component of weight.'],answer:4*(.5+.3*Math.cos(pi/6)),unit:'kg',solution:'At impending upslope motion, hanging weight balances cart weight down the incline plus limiting friction. The mass is 4(sin 30° + 0.30 cos 30°) = 3.039 kg.',tolerance:.015}]};
export const labs=[pendulum,torque,pulley];
