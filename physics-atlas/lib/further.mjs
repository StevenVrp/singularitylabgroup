// Energy landscapes, capacitors and charged-particle dynamics.
// Physical models use SI internally. Display conversions are explicit in outputs.
const aqua = '#5be2d0', coral = '#ff8e76', gold = '#efc777', faint = '#344e65', dim = '#9cacc1';
const tau = 2 * Math.PI;
const bound = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const path = points => points.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)).join(' ');
const polyline = (pts, color, width = 2, extra = '') => '<path d="' + path(pts) + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round" ' + extra + '/>';
const line = (a,b,c,w=1,extra='') => polyline([a,b],c,w,extra);
const circle = (x,y,r,c,extra='') => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" '+extra+'/>';
const label = (x,y,s,c=dim,anchor='start',size=12) => '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" fill="'+c+'" font-family="ui-monospace, monospace" font-size="'+size+'">'+s+'</text>';
const num = (v, n=2) => Number(v.toFixed(n)).toString();
function arrow(from,to,color,w=2.4) {
  const dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);
  if(length<1.5) return '';
  const head=Math.min(8,length*.42), u=dx/length, v=dy/length;
  const a=[to[0]-head*u+head*.46*v,to[1]-head*v-head*.46*u],b=[to[0]-head*u-head*.46*v,to[1]-head*v+head*.46*u];
  return line(from,to,color,w)+'<path d="'+path([a,to,b])+' Z" fill="'+color+'"/>';
}
const param=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const quantity=(key,label,unit)=>({key,label,unit});
const period = 8;
const sweep = (t,excursion) => excursion*(1-Math.cos(tau*t/period))/2;
const potentialModes = ['Spring well','Gravitational well'];
function potentialModel(p,mode) {
  const gravity=mode===potentialModes[1];
  const energyAt=r=>gravity ? -p.energy*p.length/r : p.energy*(r/p.length-1)**2/2;
  const forceAt=r=>gravity ? -p.energy*p.length/r**2 : -p.energy*(r-p.length)/p.length**2;
  return {duration:period, gravity, energyAt, forceAt,at(t){
    const r=p.position+sweep(t,p.excursion), force=forceAt(r);
    return {r,energy:energyAt(r),force,slope:-force};
  }};
}
function energyScene({p,model,state:s,showVectors,showPath,focus}) {
  const left=75,right=691,top=46,bottom=284;
  const xmin=model.gravity?Math.max(.1,Math.min(.5*p.length,p.position*.8)):0;
  const xmax=Math.max(2.3*p.length,p.position+p.excursion+.4*p.length);
  const umin=Math.min(0,model.energyAt(xmin),model.energyAt(xmax));
  const umax=Math.max(0,model.energyAt(xmin),model.energyAt(xmax));
  const spread=Math.max(umax-umin,.1), min=umin-spread*.12,max=umax+spread*.2;
  const x=r=>left+(right-left)*(r-xmin)/(xmax-xmin);
  const y=u=>bottom-(bottom-top)*(u-min)/(max-min);
  let out='';
  for(let i=0;i<=5;i++){
    const r=xmin+(xmax-xmin)*i/5;
    out+=line([x(r),top],[x(r),bottom],faint,.8,'stroke-dasharray="2 6"')+label(x(r),bottom+17,num(r,1),dim,'middle',11);
  }
  for(let i=0;i<=4;i++){
    const u=min+(max-min)*i/4;
    out+=line([left,y(u)],[right,y(u)],faint,.8,'stroke-dasharray="2 6"')+label(left-12,y(u)+3,num(u,1),dim,'end',11);
  }
  const points=Array.from({length:161},(_,i)=>{const r=xmin+(xmax-xmin)*i/160;return [x(r),y(model.energyAt(r))];});
  const shade=path([[left,bottom],...points,[right,bottom]]);
  out+='<defs><linearGradient id="pa-u-fill" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="'+aqua+'" stop-opacity=".16"/><stop offset="1" stop-color="'+aqua+'" stop-opacity="0"/></linearGradient><clipPath id="pa-u-clip"><rect x="'+left+'" y="'+top+'" width="'+(right-left)+'" height="'+(bottom-top)+'"/></clipPath></defs>';
  out+=line([left,y(0)],[right,y(0)],faint,1.5)+label(36,28,'U (J)',aqua)+label(right,324,'Position r (m)',dim,'end')+label(right,24,model.gravity?'Inverse-distance potential':'Elastic potential',aqua,'end');
  out+='<g clip-path="url(#pa-u-clip)"><path d="'+shade+'Z" fill="url(#pa-u-fill)"/>'+polyline(points,aqua,2.8);
  const px=x(s.r),py=y(s.energy),dr=(xmax-xmin)*.11;
  if(showPath)out+=line([px,py],[px,bottom],dim,1,'stroke-dasharray="4 5"');
  if(showVectors)out+=line([x(s.r-dr),y(s.energy-s.slope*dr)],[x(s.r+dr),y(s.energy+s.slope*dr)],gold,2.4);
  out+=circle(px,py,9,aqua,'opacity=".18"')+circle(px,py,4.5,'#f0fcfc')+'</g>';
  if(!model.gravity) out+=line([x(p.length),y(0)+5],[x(p.length),bottom],faint,1,'stroke-dasharray="3 4"')+label(x(p.length),top+11,'equilibrium',dim,'middle',10);
  const track=352; out+=line([left,track],[right,track],faint,1.2)+circle(px,track,6,focus==='position'?gold:aqua);
  if(showVectors&&Math.abs(s.force)>1e-8) out+=arrow([px,track],[px+Math.sign(s.force)*Math.min(80,22+13*Math.log1p(Math.abs(s.force))),track],coral);
  out+=label(left,380,'Force on the probe',coral)+label(right,380,num(s.force,3)+' N',coral,'end');
  return out;
}
const potential={
 id:'potential',module:4,title:'Force from potential',intro:'Move a probe through a one-dimensional energy landscape. The tangent shows how much potential energy changes per metre. Its negative gives the force at that position.',
 assumptions:['The potential is time independent and conservative.','The spring obeys Hooke’s law. The gravitational source is a point mass outside the scanned interval.','The instrument prescribes the probe position. The teal marker records samples along the curve.'],
 misconception:'A negative potential can have a positive slope. The vertical height of the curve fixes an energy relative to its reference. Its local slope fixes the force.',
 insight:'At a smooth minimum the slope vanishes. The curvature there gives a local spring constant. In a gravitational well the inward force grows rapidly as the probe approaches the source.',
 params:[param('energy','Energy scale','U₀','J',1,20,.1,5),param('length','Reference length','ℓ','m',.5,4,.05,2),param('position','Starting position','r₀','m',.3,6,.05,1.5),param('excursion','Probe excursion','Δr','m',0,5,.05,2)],
 modes:potentialModes,build:potentialModel,scene:energyScene,
 metrics:[quantity('r','Probe position','m'),quantity('energy','Potential energy','J'),quantity('slope','Local slope','N'),quantity('force','Force','N')],
 series:[quantity('energy','Potential energy','J'),quantity('force','Force','N'),quantity('r','Probe position','m')],
 formulas:[
 {tex:String.raw`F_r=-\frac{dU}{dr}`,variables:[['Fᵣ','Signed force in the direction of increasing r','N'],['U','Potential energy, with the reference chosen by the model','J'],['r','Probe position, increasing to the right','m','position'],['dU/dr','Local slope of the potential curve','J/m = N']],meaning:'The force points down the energy landscape. A horizontal tangent gives zero force.',derivation:'For a small displacement the conservative force does work equal to the decrease in potential energy. Divide the work by the signed displacement and take its limit as the displacement tends to zero.',example:'A tangent rises by 0.60 J over 0.20 m. Its slope is +3.0 N and the force is −3.0 N.'},
 {tex:String.raw`U=\frac{U_0}{2}\left(\frac{r}{\ell}-1\right)^2`,variables:[['U','Elastic energy with zero at the rest length','J'],['U₀','Energy scale','J','energy'],['r','Distance along the positive coordinate','m','position'],['ℓ','Spring equilibrium position','m','length']],meaning:'In spring mode, twice the extension from equilibrium stores four times the energy. The elastic force restores the probe towards ℓ.',derivation:'Hooke’s law gives a straight force–extension line. The triangular area under it equals the work needed to stretch the spring. The effective stiffness is U₀ divided by ℓ squared.',example:'For U₀ = 8 J and ℓ = 2 m, moving to r = 3 m stores 1 J. The force is −2 N.'},
 {tex:String.raw`U=-\frac{U_0\ell}{r}`,variables:[['U','Gravitational energy relative to infinite separation','J'],['U₀','Magnitude of the gravitational energy at r = ℓ','J','energy'],['ℓ','Reference separation','m','length'],['r','Positive distance from a point source','m','position']],meaning:'The energy rises towards zero with distance. The gravitational force points inward throughout the scan.',derivation:'Integrate the inverse-square force from infinity to the probe radius. The product U₀ℓ represents the gravitational constant times the source and probe masses.',example:'With U₀ = 8 J and ℓ = 2 m, the potential at r = 4 m is −4 J and its slope is +1 J/m. The force is −1 N.'}],
 challenges:[
 {question:'A point-source potential reads −12 J at 2.0 m. A 0.50 kg probe starts at rest at 4.0 m and moves freely inward. Find its speed at 2.0 m.',hints:['Use the inverse-distance dependence to obtain the initial energy.','The decrease in potential energy equals the gain in kinetic energy.'],answer:Math.sqrt(24),unit:'m/s',tolerance:.04,solution:'At 4 m the energy is −6 J. Falling to 2 m releases 6 J. Equating 6 J to half the mass times speed squared gives 4.90 m/s.'},
 {question:'A spring potential has its minimum at 2.0 m. Its tangent has slope +6 N at 3.0 m. A 0.40 kg probe oscillates with amplitude 0.50 m. Find the maximum speed.',hints:['Divide the tangent slope by the extension to find the stiffness.','The energy at maximum extension becomes kinetic energy at equilibrium.'],answer:.5*Math.sqrt(15),unit:'m/s',tolerance:.025,solution:'The stiffness is 6 N/m. An extension of 0.50 m stores 0.75 J. For a 0.40 kg mass this gives a peak speed of 1.94 m/s.'}]
};
const eps0=8.8541878128e-12;
const capModes=['Fixed voltage','Fixed charge'];
function capacitorModel(p,mode){
  const eps=eps0*p.dielectric, constantQ=mode===capModes[1];
  const initialQ=eps*p.area*p.voltage/p.gap;
  return {duration:period,constantQ,at(t){
    const d=p.gap+sweep(t,p.travel),c=eps*p.area/d;
    const q=constantQ?initialQ:c*p.voltage,v=q/c,e=v/d;
    return {d,capacitance:c*1e12,charge:q*1e12,voltage:v,field:e,energy:.5*c*v*v*1e9,force:-.5*eps*p.area*e*e*1e6};
  }};
}
function capacitorScene({p,model,state:s,showVectors,showPath,focus}){
  // Gap is enlarged for legibility relative to the plate width. Area is traced by the outline.
  const x1=212,x2=x1+56+145*s.d/.008,base=266,upper=113,dx=46,dy=-32;
  const plate=(x,c,sign)=>'<polygon points="'+[[x,base],[x+dx,base+dy],[x+dx,upper+dy],[x,upper]].map(a=>a.join(',')).join(' ')+'" stroke="'+c+'" stroke-width="2" fill="'+c+'" fill-opacity=".14"/>'+Array.from({length:5},(_,i)=>label(x+dx*.53,upper+10+i*26,sign,c,'middle',14)).join('');
  let out=label(40,39,'Parallel plates',aqua)+label(720,39,model.constantQ?'Isolated electrodes':'Voltage source connected',gold,'end');
  const l=[x1+12,base-108],r=[x2+12,base-108];
  if(!model.constantQ){
    const top=63,mid=(l[0]+r[0])/2;
    out+=polyline([l,[l[0]-66,l[1]],[l[0]-66,top],[mid-5,top]],faint,1.8);
    out+=polyline([r,[r[0]+62,r[1]],[r[0]+62,top],[mid+5,top]],faint,1.8);
    out+=line([mid-5,top-13],[mid-5,top+13],coral,2)+line([mid+5,top-6],[mid+5,top+6],aqua,2)+label(mid-13,top-10,'+',coral,'end');
  }
  out+=plate(x2,aqua,'−');
  if(showPath&&p.dielectric>1){
    out+='<polygon points="'+[[x1,upper],[x2,upper],[x2,base],[x1,base]].map(a=>a.join(',')).join(' ')+'" fill="'+gold+'" fill-opacity=".045"/>';
  }
  if(showVectors){
    for(let row=0;row<5;row++){
      const y=upper+12+row*28;
      out+=arrow([x1+dx*.45+5,y],[x2+dx*.45-7,y],gold,1.5);
    }
  }
  out+=plate(x1,coral,'+');
  out+=line([x1,base+14],[x1,base+43],faint)+line([x2,base+14],[x2,base+43],faint)+line([x1,base+36],[x2,base+36],focus==='gap'?gold:dim);
  out+=label((x1+x2)/2,base+59,'d = '+num(s.d*1000)+' mm',dim,'middle');
  out+=label(40,361,'Electric field',gold)+label(40,380,num(s.field,1)+' V/m','#e3f1f4', 'start',15);
  out+=label(720,361,'Force on right plate',coral,'end')+label(720,380,num(s.force,3)+' μN', '#e3f1f4','end',15);
  return out;
}
const capacitor={
 id:'capacitor',title:'Parallel-plate capacitor',module:9,
 intro:'Separate two charged plates slowly. A connected supply holds the voltage steady by moving charge. An isolated pair keeps its charge while its voltage changes.',
 assumptions:['Ideal parallel plates with a uniform, linear dielectric filling the entire gap.','Gap is small compared with the square root of the plate area. Fringing and edge forces are neglected.','The plates move quasistatically. Each run starts at the chosen initial voltage. The drawing enlarges the gap for visibility.'],
 misconception:'Disconnecting the supply preserves the free charge. The capacitance still changes with geometry, so the voltage can rise above its initial value.',
 insight:'For fixed voltage, a widening gap sends charge back to the source. A mechanical work calculation must include this electrical energy transfer. At fixed charge, the external work is stored in the field.',
 modes:capModes,params:[param('area','Plate area','A','m²',.01,.08,.001,.03),param('gap','Initial gap','d₀','m',.001,.005,.0001,.002),param('travel','Gap excursion','Δd','m',0,.003,.0001,.002),param('voltage','Initial voltage','V₀','V',1,60,.5,12),param('dielectric','Relative permittivity','εᵣ','1',1,8,.1,2)],
 build:capacitorModel,scene:capacitorScene,metrics:[quantity('capacitance','Capacitance','pF'),quantity('charge','Charge magnitude','pC'),quantity('voltage','Plate voltage','V'),quantity('energy','Field energy','nJ')],
 series:[quantity('energy','Field energy','nJ'),quantity('capacitance','Capacitance','pF'),quantity('charge','Charge magnitude','pC'),quantity('voltage','Plate voltage','V'),quantity('force','Attractive force','μN')],
 formulas:[
 {tex:String.raw`C=\frac{\varepsilon_0\varepsilon_r A}{d}`,variables:[['C','Capacitance','F'],['ε₀','Vacuum permittivity (8.854 × 10⁻¹²)','F/m'],['εᵣ','Relative permittivity of the dielectric','1','dielectric'],['A','Overlap area of flat plates','m²','area'],['d','Instantaneous plate separation','m','gap']],meaning:'Increasing the separation reduces capacitance. A polarizable dielectric increases capacitance for a given geometry.',derivation:'Gauss’s law relates the uniform field to the free surface-charge density divided by permittivity. Multiply field by the gap to obtain voltage, then divide charge by voltage to find capacitance.',example:'Two vacuum plates of area 0.020 m² at a 2.0 mm spacing have capacitance 88.5 pF.'},
 {tex:String.raw`Q=CV,\qquad U=\frac{1}{2}CV^2`,variables:[['Q','Free-charge magnitude on either plate','C'],['C','Capacitance at the current separation','F'],['V','Positive plate potential minus negative plate potential','V','voltage'],['U','Electrostatic field energy','J']],meaning:'During charging the potential grows from zero to the final value. The energy stored equals charge times the average charging potential.',derivation:'Add charge incrementally at fixed geometry, each increment against the current voltage. Integrating from zero charge gives half the product of final charge and voltage.',example:'A 100 pF capacitor at 10 V carries 1.0 nC and stores 5.0 nJ. At half the capacitance with charge fixed, the voltage and energy double.'},
 {tex:String.raw`F_d=-\frac{\varepsilon_0\varepsilon_r A}{2}\left(\frac{V}{d}\right)^2`,variables:[['F_d','Force on the movable plate, positive for increasing gap','N'],['ε₀','Vacuum permittivity','F/m'],['εᵣ','Homogeneous relative permittivity','1','dielectric'],['A','Plate area','m²','area'],['V','Instantaneous potential difference','V'],['d','Instantaneous gap','m','gap']],meaning:'The field pulls the two plates together. The force depends on the instantaneous field and area in either electrical mode.',derivation:'The electrostatic pressure on a conducting surface equals half the permittivity times the squared field. Apply that pressure over the plate area, directed towards the opposite plate.',example:'With vacuum, A = 0.020 m², V = 10 V and d = 2.0 mm, the force points inward with magnitude 2.21 μN.'}],
 challenges:[
 {question:'A 120 pF capacitor is charged to 10 V and isolated. The gap is slowly tripled. How much mechanical work is required, in nJ?',hints:['Determine the charge once, before disconnecting.','With charge fixed, the field energy is inversely proportional to capacitance.'],answer:12,unit:'nJ',tolerance:.1,solution:'Initial energy is 6 nJ. Tripling the gap divides capacitance by three, increasing field energy to 18 nJ. With no source attached the 12 nJ increase is supplied mechanically.'},
 {question:'A 120 pF capacitor stays connected to 10 V while its gap is tripled. How much energy does the voltage source receive, in nJ?',hints:['Find the initial and final charges at fixed voltage.','Each coulomb returned to the source transfers energy equal to its voltage in joules.'],answer:8,unit:'nJ',tolerance:.08,solution:'Capacitance falls to 40 pF. The source receives 800 pC at 10 V, giving 8 nJ. The field lost 4 nJ, so a further 4 nJ came from mechanical work.'}]
};
function particleModel(p){
  const pitch=p.pitch*Math.PI/180,vt=p.speed*Math.cos(pitch),vz0=p.speed*Math.sin(pitch);
  const w=p.specific*p.magnetic,az=p.specific*p.electric;
  const duration=8;
  function at(t){
    const theta=w*t, vx=vt*Math.cos(theta),vy=-vt*Math.sin(theta),vz=vz0+az*t;
    const sinc=Math.abs(theta)<1e-5 ? 1-theta*theta/6 : Math.sin(theta)/theta;
    const cosc=Math.abs(theta)<1e-5 ? theta/2-theta**3/24 : 2*Math.sin(theta/2)**2/theta;
    const x=vt*t*sinc,y=-vt*t*cosc,z=vz0*t+az*t*t/2;
    return {x,y,z,vx,vy,vz,ax:w*vy,ay:-w*vx,az,speed:Math.hypot(vt,vz),specificEnergy:(vt*vt+vz*vz)/2,frequency:Math.abs(w)/tau};
  }
  const samples=Array.from({length:321},(_,i)=>at(duration*i/320));
  const bounds=Object.fromEntries(['x','y','z'].map(k=>[k,[Math.min(...samples.map(s=>s[k])),Math.max(...samples.map(s=>s[k]))]]));
  return {duration,at,samples,bounds};
}
function particleScene({p,model,state:s,t,showVectors,showPath,project,view}){
  const spatial=String(view).toLowerCase()==='3d';
  const {bounds}=model,keys=spatial?['x','y','z']:['x','y'];
  const range=Math.max(.5,...keys.map(k=>bounds[k][1]-bounds[k][0]));
  const norm=(v,k)=>1.65*(v-(bounds[k][0]+bounds[k][1])/2)/range;
  const pos=(x,y,z)=>spatial?project(norm(x,'x'),norm(y,'y'),norm(z,'z')):[365+norm(x,'x')*153,198-norm(y,'y')*153];
  const loc=s=>pos(s.x,s.y,s.z);
  let out=label(31,30,spatial?'Spatial trajectory':'Projection onto the x–y plane',aqua)+label(728,30,'B = '+num(p.magnetic)+' T   ·   E∥ = '+num(p.electric)+' V/m',gold,'end');
  if(!spatial){
    for(let i=0;i<=5;i++)for(let j=0;j<=3;j++){
      const x=125+i*90,y=78+j*77;
      if(p.magnetic>0)out+=circle(x,y,5.5,'none','stroke="'+faint+'" stroke-width="1"')+circle(x,y,1.5,faint);
    }
    const o=pos(0,0,0);
    out+=line([60,o[1]],[680,o[1]],faint,1,'stroke-dasharray="4 6"')+line([o[0],49],[o[0],333],faint,1,'stroke-dasharray="4 6"');
    out+=label(687,o[1]+4,'x',dim)+label(o[0]-4,48,'y',dim,'end');
  } else if(p.magnetic>0&&showVectors) {
    for(const x of [-.85,.85])for(const y of [-.55,.55]){
      out+=arrow(project(x,y,-.65),project(x,y,.65),faint,1.6);
    }
  }
  if(showPath){
    out+=polyline(model.samples.map(loc),aqua,1.6,'opacity=".42" stroke-dasharray="4 5"');
    const trail=model.samples.slice(0,Math.floor(320*t/model.duration)+1).map(loc);
    trail.push(loc(s));out+=polyline(trail,aqua,2.5);
  }
  const pt=loc(s);
  if(showVectors){
    const scale=(spatial?.20:.23)*range/Math.max(s.speed,.3);
    out+=arrow(pt,pos(s.x+s.vx*scale,s.y+s.vy*scale,s.z+s.vz*scale),coral);
    if(Math.hypot(s.ax,s.ay,s.az)>.001){
      const aScale=.17*range/Math.hypot(s.ax,s.ay,s.az);
      out+=arrow(pt,pos(s.x+s.ax*aScale,s.y+s.ay*aScale,s.z+s.az*aScale),gold);
    }
  }
  out+=circle(...pt,12,aqua,'opacity=".14"')+circle(...pt,5,'#d8fff7');
  out+=label(31,363,spatial?'Field along +z':'⊙ B along +z, towards viewer',dim)+label(728,363,'z = '+num(s.z)+' m',dim,'end');
  out+=label(31,383,'Velocity',coral)+label(112,383,'Acceleration',gold)+label(728,383,'Local arrows show directions',dim,'end',10);
  return out;
}
const particle={
 id:'particle',title:'Charged-particle motion',module:11,spatial:true,
 intro:'Launch a charged grain into uniform fields parallel to the z-axis. Watch the magnetic field curve its transverse motion as the electric field changes its axial speed. In the flat view, look along the z-axis towards the origin.',
 assumptions:['Nonrelativistic point particle in spatially uniform, static fields.','The magnetic field and signed electric field lie along the z-axis. The initial transverse velocity points along +x.','Collisions, self-fields, radiation and gravity are neglected. Arrow lengths in the scene are rescaled for direction comparison.'],
 misconception:'A magnetic force can turn the velocity without increasing the speed. Only the electric field transfers kinetic energy in this model.',
 insight:'Reversing the charge reverses the sense of gyration. A sufficiently strong opposing axial electric force can reverse the axial velocity during the run while the transverse speed stays constant.',
 params:[param('specific','Charge-to-mass ratio','q/m','C/kg',-8,8,.1,3),param('magnetic','Axial magnetic field','B','T',0,2,.05,.65),param('electric','Axial electric field','E∥','V/m',-1,1,.02,0),param('speed','Launch speed','v₀','m/s',.2,6,.1,3),param('pitch','Elevation above x–y plane','α','°',-90,90,1,18)],
 build:particleModel,scene:particleScene,metrics:[quantity('speed','Speed','m/s'),quantity('vz','Axial velocity','m/s'),quantity('frequency','Gyrofrequency','Hz'),quantity('specificEnergy','Kinetic energy per mass','J/kg')],
 series:[quantity('vx','X velocity','m/s'),quantity('vy','Y velocity','m/s'),quantity('vz','Z velocity','m/s'),quantity('specificEnergy','Kinetic energy per mass','J/kg')],
 formulas:[
 {tex:String.raw`\mathbf a=\frac{q}{m}\left(\mathbf E+\mathbf v\times\mathbf B\right)`,variables:[['a','Acceleration vector','m/s²'],['q','Signed particle charge','C','specific'],['m','Particle mass','kg','specific'],['E','Electric field vector, axial here','V/m','electric'],['v','Instantaneous particle velocity vector','m/s','speed'],['B','Magnetic field vector, along +z','T','magnetic']],meaning:'The electric acceleration follows the signed charge and field. Magnetic acceleration is perpendicular to both velocity and magnetic field.',derivation:'Divide the Lorentz force by the particle mass. For a field along +z, the x acceleration is proportional to the y velocity and the y acceleration is proportional to minus the x velocity. The electric term acts along z.',example:'For q/m = +3 C/kg, v = 2 m/s along +x and B = 0.5 T along +z, with zero electric field, acceleration is 3 m/s² along −y.'},
 {tex:String.raw`r=\frac{v_\perp}{|q/m|B},\qquad T=\frac{2\pi}{|q/m|B}`,variables:[['r','Radius of the circle projected onto the x–y plane','m'],['v⊥','Speed perpendicular to the magnetic field','m/s'],['q/m','Signed charge-to-mass ratio','C/kg','specific'],['B','Magnitude of the magnetic field','T','magnetic'],['T','Time for one complete rotation','s'],['π','Ratio of circumference to diameter','1']],meaning:'At nonzero charge and field, stronger magnetic bending shrinks the orbit and shortens its period. Axial acceleration leaves the transverse circle unchanged.',derivation:'Equate the magnetic acceleration magnitude in the transverse plane to centripetal acceleration. For a complete turn divide the circle circumference by transverse speed. With zero transverse speed the particle has no visible orbit.',example:'With q/m = −4 C/kg, B = 0.5 T and v⊥ = 3 m/s, the radius is 1.50 m and the period is π seconds.'},
 {tex:String.raw`v_z=v_{z0}+\frac{q}{m}E_z t`,variables:[['v_z','Current axial velocity','m/s'],['v_z0','Initial axial velocity set by launch speed and elevation','m/s','pitch'],['q/m','Signed charge-to-mass ratio','C/kg','specific'],['E_z','Signed axial electric field','V/m','electric'],['t','Time after release','s']],meaning:'The axial velocity changes uniformly because the parallel electric force is constant. An opposing force can reverse the axial motion.',derivation:'The magnetic cross product has zero z component. Integrate the constant electric acceleration in the z direction over elapsed time.',example:'For q/m = −2 C/kg, initial axial speed +1 m/s and field +0.5 V/m, the axial velocity reaches −1 m/s after 2 s.'}],
 challenges:[
 {question:'A particle enters parallel fields with transverse speed 4.0 m/s and initial axial speed +1.0 m/s. Its circular projection has radius 2.0 m. Its positive charge-to-mass ratio is 4.0 C/kg and the axial electric field is +0.25 V/m. Find the axial displacement in its first turn.',hints:['Use circumference divided by transverse speed to find the period.','The axial acceleration is the charge-to-mass ratio times the electric field.'],answer:Math.PI+.5*Math.PI**2,unit:'m',tolerance:.05,solution:'The period is π s. Axial acceleration is +1.0 m/s². The displacement in the first turn is π + π²/2 = 8.08 m.'},
 {question:'An observed trajectory has radius 0.50 m and period 2.0 s. Its pitch along the field is 3.0 m per turn with no electric field. Find the kinetic energy per kilogram.',hints:['Determine transverse speed from one circumference per period.','Determine axial speed from axial advance per period. Add the squared speed components.'],answer:.5*((Math.PI/2)**2+1.5**2),unit:'J/kg',tolerance:.02,solution:'The transverse speed is π/2 m/s and the axial speed is 1.50 m/s. Half the sum of their squares is 2.36 J/kg.'}]
};
export const labs=[potential,capacitor,particle];
