// All geometry in these SVG scenes is generated from the current model state.
const PI = Math.PI;
const R = 8.31446261815324;
const DEG = PI / 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fmt = (v, n = 2) => Number(v).toFixed(n).replace(/\.?0+$/, '') || '0';
const color = { aqua: '#65e4df', blue: '#82acf7', coral: '#ff9c86', gold: '#f7cb79', line: '#47647c', white: '#d8e9f5', dim: '#9bb1c6' };
function text(x, y, value, fill = color.dim, size = 12, anchor = 'start') {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-family="system-ui,sans-serif" text-anchor="${anchor}">${value}</text>`;
}
function line(x1, y1, x2, y2, stroke, width = 1, dash = '') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
}
function dot(x, y, radius, fill, stroke = 'none') {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}"/>`;
}
function arrow(x, y, dx, dy, fill, radius = 6) {
  const l = Math.hypot(dx, dy) || 1, a = dx / l, b = dy / l;
  return `<polygon points="${x + radius*a},${y+radius*b} ${x-radius*a-radius*.65*b},${y-radius*b+radius*.65*a} ${x-radius*a+radius*.65*b},${y-radius*b-radius*.65*a}" fill="${fill}"/>`;
}
function path(points, stroke, width = 2, extra = '') {
  return `<polyline points="${points.map(([x, y]) => x.toFixed(2)+','+y.toFixed(2)).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" ${extra}/>`;
}
function parameter(key, label, symbol, unit, min, max, step, value) {
  return {key, label, symbol, unit, min, max, step, value};
}
const output = (key, label, unit) => ({key, label, unit});

function refraction(p, mode) {
  const duration = 8;
  return {duration, at(t) {
    const inc = p.angle * (mode === 'Angle scan' ? clamp(t / duration, 0, 1) : 1);
    const a = inc * DEG;
    const sin2 = p.n1 * Math.sin(a) / p.n2;
    const tir = sin2 > 1 + 1e-12;
    const beta = tir ? 90 : Math.asin(Math.min(1, sin2)) / DEG;
    const ci = Math.cos(a), ct = Math.cos(beta * DEG);
    const r = (p.n1 * ci - p.n2 * ct) / (p.n1 * ci + p.n2 * ct);
    const refl = tir ? 100 : 100*r*r;
    return {inc, beta, tir: +tir, refl, trans: 100-refl, ratio: p.n1/p.n2,
      crit: p.n1 > p.n2 ? Math.asin(p.n2 / p.n1) / DEG : -1};
  }};
}
function opticsScene({p, state:s, showVectors, showPath}) {
  const x0 = 383, y0 = 193;
  let svg = `<defs><linearGradient id="glass-atlas" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#377e91" stop-opacity=".24"/><stop offset="1" stop-color="#377e91" stop-opacity=".045"/></linearGradient></defs>
    <rect x="16" y="${y0}" width="728" height="167" fill="url(#glass-atlas)"/>`;
  svg += line(16,y0,744,y0,color.aqua,1.4) + line(x0,26,x0,351,color.dim,1,'5 5');
  svg += text(36,53,'INCIDENT MEDIUM',color.blue,10) + text(36,73,`n₁ = ${fmt(p.n1)}`,color.white,17);
  svg += text(36,294,'SECOND MEDIUM',color.aqua,10) + text(36,314,`n₂ = ${fmt(p.n2)}`,color.white,17);
  svg += text(x0+8,26,'normal',color.dim,11);
  function ray(dx,dy,ink,inward,n,strength) {
    const length = Math.min(dx === 0 ? Infinity : (dx>0 ? 728-x0 : 32-x0)/dx,
      Math.abs(dy)<1e-10 ? Infinity : (dy>0 ? 343-y0 : 35-y0)/dy);
    const xe = x0+dx*length, ye=y0+dy*length;
    let body = line(x0,y0,xe,ye,ink,2.7);
    if (showVectors) body += arrow(x0+dx*length*.72,y0+dy*length*.72,inward ? -dx:dx,inward ? -dy:dy,ink);
    if (showPath) {
      // A stationary phase snapshot. Normal spacing is proportional to wavelength.
      for (let d=40/n; d<length-7; d+=40/n) {
        const x=x0+d*dx, y=y0+d*dy;
        const width = Math.min(13, Math.abs(dy) * d / (Math.abs(dx)+1e-9));
        body+=line(x-dy*width,y+dx*width,x+dy*width,y-dx*width,ink,1);
      }
    }
    return `<g opacity="${strength}">${body}</g>`;
  }
  const a = s.inc * DEG, b = s.beta * DEG;
  svg+=ray(-Math.sin(a),-Math.cos(a),color.gold,true,p.n1,1);
  if(s.refl>1e-7) svg+=ray(Math.sin(a),-Math.cos(a),color.coral,false,p.n1,.68+.32*s.refl/100);
  if(!s.tir && s.trans>1e-7) svg+=ray(Math.sin(b),Math.cos(b),color.aqua,false,p.n2,1);
  const arc = (r, a, above, ink) => {
    const points = Array.from({length:30},(_,i)=>[x0+(above?-1:1)*r*Math.sin(a*i/29),y0+(above?-1:1)*r*Math.cos(a*i/29)]);
    return path(points,ink,1.4);
  };
  svg += arc(47,a,true,color.gold) + text(x0-14,y0-59,`θ₁  ${fmt(s.inc,1)}°`,color.gold,12,'end');
  if(!s.tir) svg += arc(45,b,false,color.aqua) + text(x0+14,y0+60,`θ₂  ${fmt(s.beta,1)}°`,color.aqua,12);
  svg += dot(x0,y0,4.3,color.white);
  svg += text(727,373,s.tir?'Total internal reflection · evanescent field omitted':'Wavefront spacing is proportional to wavelength',color.dim,11,'end');
  if(s.crit>=0) svg += text(36,373,`Critical angle  ${fmt(s.crit,2)}°`,color.coral,11);
  return svg;
}
const optics = {
  id:'optics', module:12, title:'Refraction & total internal reflection',
  intro:'Trace a narrow beam through a flat boundary. Change either medium and watch the ray angle, wavefront spacing and reflected power respond. Use Angle scan to sweep from normal incidence to the selected angle in eight seconds.',
  assumptions:['Planar interface between homogeneous, transparent, nonmagnetic media.','The beam is monochromatic and s-polarized. Crossbars are a stationary phase snapshot with enlarged wavelength.','Ray directions follow geometrical optics. At total internal reflection the lower medium supports an evanescent field that this ray diagram omits.'],
  misconception:'Measure both angles from the normal. An incident angle of 30° to the surface is 60° to the normal, which can change whether a transmitted ray exists.',
  insight:'Reflection can occur below the critical angle. At normal incidence an air–glass boundary reflects about 4% of the incoming power. As the critical angle is approached from below, the transmitted ray becomes grazing and its normal power flow tends to zero.',
  modes:['Fixed incidence','Angle scan'],
  params:[parameter('angle','Incident angle','θ₁','°',0,89,.5,36),parameter('n1','Incident refractive index','n₁','1',1,2.5,.01,1.5),parameter('n2','Second refractive index','n₂','1',1,2.5,.01,1)],
  build:refraction,scene:opticsScene,
  metrics:[output('inc','Incidence','°'),output('refl','Reflected power','%'),output('trans','Transmitted power','%')],
  series:[output('inc','Incident angle','°'),output('refl','Reflectance','%'),output('trans','Transmittance','%')],
  formulas:[
    {tex:'n_1\\sin\\theta_1=n_2\\sin\\theta_2',variables:[['n₁','Refractive index of the incident medium','1','n1'],['n₂','Refractive index of the second medium','1','n2'],['θ₁','Incident angle from the normal','°','angle'],['θ₂','Transmitted angle from the normal','°']],meaning:'A phase front matches continuously across the boundary. The side with higher refractive index has shorter wavelength and the ray there makes the smaller angle with the normal.',derivation:'The time frequency stays the same at the stationary boundary. Equal tangential wave-vector components therefore require equal products of refractive index and sine of ray angle.',example:'For glass (1.50) to air (1.00) at 30.0°, the sine of the transmitted angle is 0.750. The ray emerges at 48.59°.'},
    {tex:'\\theta_c=\\sin^{-1}\\!\\left(\\frac{n_2}{n_1}\\right)',variables:[['θc','Critical incident angle','°'],['n₁','Index of incident medium','1','n1'],['n₂','Index of second medium','1','n2']],meaning:'This boundary angle exists when the incident medium has higher refractive index. At larger incidence no propagating transmitted ray is possible.',derivation:'Set the second-medium ray angle to 90° in Snell’s law and solve for the incident angle.',example:'For glass of index 1.50 meeting air of index 1.00, the critical angle is 41.81°.'},
    {tex:'R_s=\\left(\\frac{n_1\\cos\\theta_1-n_2\\cos\\theta_2}{n_1\\cos\\theta_1+n_2\\cos\\theta_2}\\right)^2,\\quad T_s=1-R_s',variables:[['Rₛ','Fraction of incident power reflected','1'],['Tₛ','Fraction of incident power transmitted','1'],['n₁','Incident refractive index','1','n1'],['n₂','Second refractive index','1','n2'],['θ₁','Incident ray angle to normal','°','angle'],['θ₂','Transmitted ray angle to normal','°']],meaning:'For s-polarization the electric field oscillates perpendicular to the plane of incidence. These expressions apply below critical incidence at a lossless dielectric interface. At total internal reflection the reflected fraction is one.',derivation:'Continuity of the tangential electric and magnetic fields gives a reflected-to-incident field amplitude ratio. Squaring its magnitude yields the reflected power fraction. Conservation of energy gives the remainder.',example:'At normal incidence from air to glass of index 1.50 the reflected fraction is (−0.50/2.50)² = 0.040, leaving 96.0% transmitted.'}],
  challenges:[
    {question:'A glass prism of index 1.52 touches a transparent liquid. The beam just ceases to propagate in the liquid at 61.0° from the normal. Find the liquid index.',hints:['At threshold the transmitted wave is grazing.','Multiply the glass index by the sine of the critical angle.'],answer:1.52*Math.sin(61*DEG),unit:'1',tolerance:.005,solution:'The liquid index equals 1.52 sin(61.0°) = 1.329. Increasing incidence past this angle gives total internal reflection.'},
    {question:'A ray travels through a plane glass plate 18.0 mm thick, surrounded by air. It enters at 50.0° to the normal. Glass has index 1.50. Find its lateral displacement relative to the straight-through ray, measured perpendicular to that ray.',hints:['First find the internal angle by Snell’s law.','The ray travels thickness divided by cosine of the internal angle in glass.','Project this path perpendicular to the original ray using the sine of the angular difference.'],answer:18*Math.sin(50*DEG-Math.asin(Math.sin(50*DEG)/1.5))/Math.cos(Math.asin(Math.sin(50*DEG)/1.5)),unit:'mm',tolerance:.04,solution:'The internal angle is 30.71°. The second parallel face restores the original propagation angle. The internal segment has length 18.0/cos(30.71°) mm. Projecting it perpendicular to the incident ray gives about 6.92 mm.'}]
};

const gasModes = ['Isothermal', 'Adiabatic', 'Isobaric', 'Isochoric', 'Four-stroke cycle'];
function idealGas(p, mode) {
  const duration=8, P0=p.amount*R*p.temperature/p.volume, V0=p.volume;
  const Cv=1.5*R, Cp=Cv+R, r=p.ratio;
  return {duration, at(t) {
    const f=clamp(t/duration,0,1), scale=1+(r-1)*f;
    let v=V0*scale, temp=p.temperature, work=0, heatIn=0, stroke=0;
    if(mode === 'Four-stroke cycle') {
      stroke=Math.min(3,Math.floor(4*f));
      const u=4*f-stroke, dv=V0*(r-1);
      const high=2*P0;
      let pressure;
      if(stroke===0) {v=V0;pressure=P0*(1+u);}
      else if(stroke===1) {v=V0+dv*u;pressure=high;work=high*dv*u;}
      else if(stroke===2) {v=V0+dv;pressure=P0*(2-u);work=high*dv;}
      else {v=V0+dv*(1-u);pressure=P0;work=high*dv-P0*dv*u;}
      temp=pressure*v/(p.amount*R);
      heatIn=p.amount*p.temperature*(Cv*(stroke===0?u:1)+2*Cp*(r-1)*(stroke===0?0:stroke===1?u:1));
    } else if(mode==='Adiabatic') {
      temp=p.temperature*scale**(-2/3);
      work=p.amount*Cv*(p.temperature-temp);
    } else if(mode==='Isobaric') {
      temp=p.temperature*scale;
      work=P0*(v-V0);
    } else if(mode==='Isochoric') {
      v=V0;
      temp=p.temperature*scale;
    } else {
      work=p.amount*R*p.temperature*Math.log(scale);
    }
    const internal=p.amount*Cv*(temp-p.temperature), heat=internal+work;
    return {v,pressure:p.amount*R*temp/v/1000,temp,work,heat,internal,stroke,heatIn:mode==='Four-stroke cycle'?heatIn:Math.max(0,heat)};
  }};
}
function gasScene({p,mode,model,state:s,t,showPath,showVectors}) {
  const vb=p.volume*p.ratio, top=57, bottom=297, left=65, right=300;
  const y=bottom-(bottom-top)*s.v/vb;
  const nParticles=32, strokeNames=['Isochoric heating','Isobaric expansion','Isochoric cooling','Isobaric compression'];
  let svg=`<defs><linearGradient id="piston-wall"><stop stop-color="#94becb" stop-opacity=".16"/><stop offset=".5" stop-color="#bbe8f0" stop-opacity=".035"/><stop offset="1" stop-color="#94becb" stop-opacity=".18"/></linearGradient>
  <linearGradient id="gas-fill" x2="0" y2="1"><stop stop-color="#579690" stop-opacity=".24"/><stop offset="1" stop-color="#579690" stop-opacity=".06"/></linearGradient></defs>`;
  svg+=text(left,26,mode==='Four-stroke cycle'?strokeNames[s.stroke].toUpperCase():mode.toUpperCase()+' PROCESS',color.aqua,10);
  svg+=`<rect x="${left}" y="${top-6}" width="${right-left}" height="${bottom-top+6}" fill="url(#piston-wall)"/>
  <rect x="${left}" y="${y}" width="${right-left}" height="${bottom-y}" fill="url(#gas-fill)"/>
  <path d="M${left} ${top-6}V${bottom}H${right}V${top-6}" fill="none" stroke="#8eaebc" stroke-width="4"/>
  <rect x="${(left+right)/2-4}" y="34" width="8" height="${Math.max(2,y-34)}" fill="#7695a4"/>
  <rect x="${left+2}" y="${y-8}" width="${right-left-4}" height="11" rx="2" fill="#718b9d" stroke="#bed8e0"/>
  <path d="M${left+7} ${y-2}H${right-7}" stroke="#d0e3e6" stroke-opacity=".6"/>`;
  // Deterministic particle positions are a schematic of occupancy, not atom trajectories.
  function reflect(a) {return 1-Math.abs(1-((a%2+2)%2));}
  for(let i=0;i<nParticles;i++) {
    const xx=left+7+reflect(i*0.61803398875+t*.08*(1+Math.sin(i*5.1)*.42))*(right-left-14);
    const yy=y+8+reflect(i*.41421356237+t*.13*(1+Math.cos(i*3.2)*.51))*(bottom-y-16);
    svg+=dot(xx,yy,2.4,i%4===0?color.gold:color.aqua);
    if(showVectors && i%6===1) {
      // A position marker only: these neutral rings are not velocity arrows.
      svg+=`<circle cx="${xx}" cy="${yy}" r="6" fill="none" stroke="${color.aqua}" opacity=".27"/>`;
    }
  }
  svg+=text(left,321,`Chamber volume   ${fmt(1000*s.v,2)} L`,color.white,14);
  svg+=text(left,345,'Particle positions are schematic.',color.dim,11);
  const gx=397, gy=296, gw=312, gh=219;
  const press0=p.amount*R*p.temperature/p.volume/1000;
  const maxP=(mode==='Four-stroke cycle'?2:mode==='Isochoric'?p.ratio:1)*press0*1.1;
  const maxV=vb*1.08;
  const coords=f=>[gx+gw*f.v/maxV,gy-gh*f.pressure/maxP];
  const samples=Array.from({length:121},(_,i)=>coords(model.at(i*model.duration/120)));
  svg+=text(gx,28,'PRESSURE–VOLUME DIAGRAM',color.aqua,10);
  svg+=text(gx,54,'Pressure (kPa)',color.dim,12);
  for(let i=0;i<=4;i++){
    const xx=gx+gw*i/4,yy=gy-gh*i/4;
    svg+=line(gx,yy,gx+gw,yy,color.line,.7,'2 5')+line(xx,gy-gh,xx,gy,color.line,.7,'2 5');
    svg+=text(gx-6,yy+4,fmt(maxP*i/4,1),color.dim,10,'end')+text(xx,gy+16,fmt(maxV*1000*i/4,1),color.dim,10,'middle');
  }
  svg+=line(gx,gy,gx+gw,gy,color.dim,1)+line(gx,gy,gx,gy-gh,color.dim,1)+text(gx+gw,gy+34,'Volume (L)',color.dim,12,'end');
  if(showPath) {
    if(mode==='Four-stroke cycle') svg+=`<polygon points="${samples.map(a=>a.join(',')).join(' ')}" fill="${color.aqua}" fill-opacity=".12"/>`;
    svg+=path(samples,color.line,2,'stroke-dasharray="4 4"');
    const trace=Array.from({length:100},(_,i)=>coords(model.at(t*i/99)));
    svg+=path(trace,color.aqua,2.7);
  }
  const [xx,yy]=coords(s);
  svg+=dot(xx,yy,8,'#59dbce2b')+dot(xx,yy,4,color.aqua);
  if(mode==='Four-stroke cycle') {
    const end=model.at(model.duration), efficiency=end.work/end.heatIn;
    svg+=text(gx,350,`Complete cycle   η = ${fmt(100*efficiency,1)}%   ·   W = ${fmt(end.work,1)} J`,color.gold,12);
  } else svg+=text(gx,350,`Work by gas   ${fmt(s.work,1)} J`,color.gold,12);
  return svg;
}
const gas={
  id:'gas',module:8,title:'Gas processes & PV cycles',
  intro:'Follow a programmed quasistatic change in a monatomic ideal gas. The piston height gives volume for a fixed cross-section. The point on the pressure–volume diagram uses the same state as the chamber.',
  assumptions:['Fixed amount of dilute, monatomic ideal gas with constant heat capacities.','Quasistatic equilibrium throughout and a frictionless piston; work is positive when the gas expands.','For isochoric heating the end ratio multiplies temperature. Otherwise it sets final-to-initial volume ratio, or maximum-to-minimum volume on a cycle.','The particle illustration depicts occupancy; the measured pressure and temperature come from the thermodynamic state.'],
  misconception:'Heat and work depend on the path. Returning to the starting temperature makes the change in internal energy zero, while a clockwise closed loop can still do positive net work.',
  insight:'For a full cycle, measure heat input during the heating strokes only. Dividing net work by net heat gives one by the first law and does not measure thermal efficiency.',
  modes:gasModes,
  params:[parameter('volume','Initial chamber volume','V₀','m³',.005,.05,.001,.015),parameter('temperature','Initial temperature','T₀','K',200,600,5,300),parameter('amount','Amount of gas','n','mol',.1,1,.05,.5),parameter('ratio','End-state ratio','r','1',1.05,3,.05,2)],
  build:idealGas,scene:gasScene,
  metrics:[output('pressure','Gas pressure','kPa'),output('temp','Temperature','K'),output('work','Work by gas','J'),output('heat','Heat into gas','J')],
  series:[output('v','Volume','m³'),output('pressure','Pressure','kPa'),output('temp','Temperature','K'),output('work','Work','J'),output('heat','Heat','J'),output('internal','Internal energy change','J')],
  formulas:[
    {tex:'PV=nRT',variables:[['P','Absolute gas pressure','Pa'],['V','Gas volume','m³','volume'],['n','Amount of gas','mol','amount'],['R','Molar gas constant (8.31446)','J mol⁻¹ K⁻¹'],['T','Absolute temperature','K','temperature']],meaning:'Pressure from a fixed amount of ideal gas rises in proportion to absolute temperature and falls with volume.',derivation:'For a dilute gas, molecular flux onto a wall together with momentum transfer gives pressure proportional to number density and mean kinetic energy. Mean kinetic energy is proportional to absolute temperature.',example:'At 300 K, 0.500 mol in 0.0150 m³ has pressure 83.14 kPa.'},
    {tex:'W=\\int_{V_i}^{V_f}P\\,dV,\\qquad Q=\\Delta U+W',variables:[['W','Work done by the gas','J'],['P','Gas pressure in a quasistatic process','Pa'],['V','Instantaneous volume','m³'],['Vᵢ, V𝒻','Initial and final volumes','m³'],['dV','Infinitesimal outward volume change','m³'],['Q','Net heat added to gas','J'],['ΔU','Change in gas internal energy','J']],meaning:'The area under a pressure–volume curve gives work. Incoming heat supplies both the rise in internal energy and the work delivered to the environment.',derivation:'An expanding piston moves a distance while pressure exerts force equal to pressure times piston area. Multiplying force by distance gives pressure times incremental volume. Integrating yields the path-dependent work.',example:'At a constant 80 kPa, expansion from 10 to 14 L gives 320 J of work. If internal energy rises by 480 J, the gas took in 800 J of heat.'},
    {tex:'\\Delta U=\\tfrac32 n R(T_f-T_i),\\qquad TV^{2/3}=\\mathrm{constant}\\; (Q=0)',variables:[['ΔU','Internal energy change','J'],['n','Amount of monatomic gas','mol','amount'],['R','Molar gas constant','J mol⁻¹ K⁻¹'],['Tᵢ, T𝒻','Initial and final absolute temperatures','K'],['T','Absolute temperature','K'],['V','Volume','m³'],['Q','Heat added to gas','J']],meaning:'A monatomic ideal gas has three translational degrees of freedom. Its internal energy depends only on temperature. The second relation applies to a quasistatic adiabatic path.',derivation:'Each degree of freedom contributes half the molar gas constant per kelvin per mole. Under adiabatic expansion, differential internal energy equals minus the work by the gas. Substitute ideal-gas pressure and separate temperature and volume before integrating.',example:'A gas at 300 K expands adiabatically to twice its original volume. Its final temperature is 300 × 2⁻²ᐟ³ = 189.0 K.'},
    {tex:'\\eta=\\frac{W_{\\rm net}}{Q_{\\rm in}}',variables:[['η','Thermal efficiency','1'],['Wnet','Work delivered over one full cycle','J'],['Qin','Sum of heat transfers into gas, counting only positive transfers','J']],meaning:'For a clockwise heat-engine cycle the enclosed pressure–volume area gives net work. The efficiency is the fraction of heat input converted into this work.',derivation:'On returning to its initial state the gas has zero total internal-energy change. Energy conservation sets net work equal to total input heat less heat rejected during cooling.',example:'If an engine absorbs 600 J and rejects 480 J, it delivers 120 J of work and has efficiency 0.20.'}],
  challenges:[
    {question:'A monatomic gas expands quasistatically from 10 L to 16 L at 60 kPa. Determine the heat supplied during expansion.',hints:['First calculate the rectangle under the pressure–volume curve.','For a monatomic ideal gas, internal energy is three halves of pressure times volume.'],answer:900,unit:'J',tolerance:2,solution:'The work is 60,000 × 0.006 = 360 J. The change in internal energy is 1.5 times 360 J = 540 J. Heat supplied equals their sum, 900 J.'},
    {question:'Build the four-stroke cycle with an end-state ratio of 2. Pressure doubles before expansion. What percentage of the heat input is converted into net work?',hints:['Let the initial pressure–volume product be E. The rectangle has area E.','Isochoric heating consumes 1.5E. Isobaric expansion at twice the initial pressure raises the temperature by twice its initial value.','At constant pressure add the changes in internal energy and work for this stroke.'],answer:100/6.5,unit:'%',tolerance:.1,solution:'With E the initial pressure times volume, the two heating strokes absorb 1.5E and 5E. The rectangle encloses E, so efficiency is 100/6.5 = 15.38%.'}]
};
function stringWave(p, mode) {
  const speed=Math.sqrt(p.tension/p.density), k=p.harmonic*PI/p.length;
  const omega=speed*k, freq=omega/(2*PI), duration=4/freq;
  function sample(x,t) {
    const phase=k*x, time=omega*t, a=p.amplitude;
    if(mode==='Incident component') return [a/2*Math.sin(phase-time),-a/2*omega*Math.cos(phase-time)];
    if(mode==='Reflected component') return [a/2*Math.sin(phase+time),a/2*omega*Math.cos(phase+time)];
    return [a*Math.sin(phase)*Math.cos(time),-a*omega*Math.sin(phase)*Math.sin(time)];
  }
  return {duration,sample,at(t) {
    const [y,vy]=sample(p.length*p.probe,t);
    return {y,vy,ay:-(omega**2)*y,frequency:freq,speed,wavelength:2*p.length/p.harmonic,energy:p.density*p.length*(p.amplitude*omega)**2/(mode==='Standing wave'||!mode?4:8)};
  }};
}
function waveScene({p,mode,model,state:s,t,showPath,showVectors}) {
  const left=64,right=705,cy=190,yscale=4000;
  const xPixel=x=>left+(right-left)*x/p.length;
  let svg=text(left,31,mode.toUpperCase(),color.aqua,10)+text(right,31,`λ = ${fmt(s.wavelength)} m   ·   f = ${fmt(s.frequency)} Hz`,color.dim,12,'end');
  for(let j=0;j<=8;j++) {
    const x=left+(right-left)*j/8;
    svg+=line(x,63,x,301,color.line,.8,'2 5');
    if(j%2===0)svg+=text(x,323,fmt(p.length*j/8),color.dim,11,'middle');
  }
  svg+=line(left,cy,right,cy,color.dim,1,'5 5')+line(left,301,right,301,color.line,1)+text(right,343,'Position along string (m)',color.dim,12,'end');
  const curve=fn=>Array.from({length:241},(_,i)=>[xPixel(p.length*i/240),cy-yscale*fn(p.length*i/240)]);
  if(showPath && mode==='Standing wave'){
    for(const sign of [-1,1])svg+=path(curve(x=>sign*p.amplitude*Math.sin(PI*p.harmonic*x/p.length)),color.line,1.5,'stroke-dasharray="4 5"');
  }
  svg+=path(curve(x=>model.sample(x,t)[0]),color.aqua,3);
  if(mode==='Standing wave') {
    for(let j=0;j<=p.harmonic;j++){
      const x=left+(right-left)*j/p.harmonic;
      svg+=dot(x,cy,4.5,color.gold,'#172736');
      if(j===0 || j===p.harmonic)svg+=line(x,cy-17,x,cy+17,color.gold,3);
    }
  } else if(showVectors) {
    const dx=mode==='Incident component'?1:-1;
    svg+=line(360-35*dx,76,360+35*dx,76,color.gold,1.4)+arrow(360+35*dx,76,dx,0,color.gold,5);
  }
  const xp=xPixel(p.length*p.probe),yp=cy-yscale*s.y;
  svg+=line(xp,66,xp,298,color.coral,1,'3 5')+text(xp,58,'probe',color.coral,12,'middle')+
    `<g data-drag-param="probe" data-drag-min-x="${left}" data-drag-max-x="${right}" style="cursor:ew-resize">${dot(xp,yp,11,'#f38f741f')}${dot(xp,yp,5,color.coral,'#ffe3d8')}</g>`;
  if(showVectors && Math.abs(s.vy)>1e-7) {
    const maxSpeed=p.amplitude*s.frequency*2*PI;
    const dy=-38*s.vy/maxSpeed;
    svg+=line(xp+9,yp,xp+9,yp+dy,color.coral,1.5)+arrow(xp+9,yp+dy,0,dy,color.coral,4);
  }
  svg+=text(left,365,'Transverse displacement enlarged · 40 diagram units per cm',color.dim,11);
  return svg;
}
const waves={
  id:'waves',module:7,title:'Standing waves on a string',
  intro:'A fixed string supports modes with nodes at both ends. Inspect either traveling component, then add them to see the standing pattern. Move the probe to compare an antinode with a node.',
  assumptions:['Uniform, perfectly flexible string under constant tension.','Transverse slopes are small; tension and mass per unit length are uniform. Damping and stiffness are neglected.','Traveling components are shown separately for superposition; the fixed-end condition applies to their sum. The display exaggerates vertical displacement.'],
  misconception:'Wave speed along the string differs from the transverse velocity of a string element. A node stays at rest even while both traveling components carry disturbances through that position.',
  insight:'Every point between adjacent nodes has the same phase. Across a node the phase jumps by half a cycle. A reflected component is the sign-reversed mirror image of the incident one about a fixed endpoint.',
  modes:['Standing wave','Incident component','Reflected component'],
  params:[parameter('length','String length','L','m',2,8,.1,4),parameter('tension','String tension','F','N',.5,5,.1,2.4),parameter('density','Linear density','μ','kg/m',.05,.5,.01,.15),parameter('harmonic','Harmonic number','j','1',1,5,1,3),parameter('amplitude','Antinode amplitude','A','m',.001,.02,.001,.012),parameter('probe','Probe fraction of length','ξ','1',0,1,.005,.5)],
  build:stringWave,scene:waveScene,
  metrics:[output('frequency','Frequency','Hz'),output('wavelength','Wavelength','m'),output('y','Probe displacement','m'),output('vy','Probe velocity','m/s')],
  series:[output('y','Probe displacement','m'),output('vy','Transverse velocity','m/s'),output('ay','Transverse acceleration','m/s²'),output('energy','Total wave energy','J')],
  formulas:[
    {tex:'c=\\sqrt{\\frac{F}{\\mu}},\\quad f_j=\\frac{jc}{2L},\\quad \\lambda_j=\\frac{2L}{j}',variables:[['c','Wave speed along the string','m/s'],['F','String tension','N','tension'],['μ','Linear mass density','kg/m','density'],['j','Mode number, a positive integer','1','harmonic'],['fⱼ','Frequency of mode j','Hz'],['λⱼ','Wavelength of mode j','m'],['L','String length','m','length']],meaning:'Two fixed ends require a whole number of half-wavelengths to fit along the string. Tension and density set their common propagation speed.',derivation:'The difference in tension direction at the ends of a short segment gives its transverse acceleration. For small slopes this gives a wave speed equal to the square root of tension over linear density. Matching zero displacements at both endpoints restricts the wavelength.',example:'For a 4.0 m string under 2.4 N with density 0.15 kg/m, waves travel at 4.0 m/s. The third harmonic has wavelength 2.67 m and frequency 1.50 Hz.'},
    {tex:'y(x,t)=A\\sin(kx)\\cos(\\omega t),\\quad k=\\frac{j\\pi}{L},\\quad\\omega=2\\pi f_j',variables:[['y','Transverse displacement from equilibrium','m'],['x','Position along string','m'],['t','Elapsed time','s'],['A','Peak displacement at an antinode','m','amplitude'],['k','Angular wavenumber','rad/m'],['ω','Angular frequency','rad/s'],['j','Harmonic number','1','harmonic'],['L','String length','m','length'],['fⱼ','Frequency of mode j','Hz'],['π','Circle constant','1']],meaning:'The spatial sine fixes the amplitude at each position while the temporal cosine makes each part of the string oscillate. Initial velocity is zero in this choice of time origin.',derivation:'Add equal-amplitude counterpropagating sine waves with angular phases kx−ωt and kx+ωt. The sum-to-product identity gives twice the component amplitude times the product of a spatial sine and temporal cosine.',example:'At the midpoint of a 4 m string in its third harmonic the spatial factor is −1. With an antinode amplitude of 0.012 m, displacement there begins at −0.012 m.'}],
  challenges:[
    {question:'A 3.0 m string has wave speed 6.0 m/s. Its standing pattern has three internal nodes, excluding the endpoints. What is the frequency?',hints:['Count intervals between consecutive nodes. Each interval spans half a wavelength.','Divide wave speed by wavelength.'],answer:4,unit:'Hz',tolerance:.02,solution:'Three internal nodes divide the string into four half-wavelengths. Wavelength is 2 × 3/4 = 1.5 m, giving 6/1.5 = 4 Hz.'},
    {question:'A fixed string supports its third harmonic at 12 Hz. A probe one quarter of the way along the string reaches a maximum transverse speed of 0.240 m/s. Find the maximum antinode displacement in millimetres.',hints:['The local amplitude is the antinode amplitude multiplied by the magnitude of the spatial sine.','At one quarter length in mode 3 that factor is sin(3π/4).','Maximum transverse speed is angular frequency times local amplitude.'],answer:1000*.240/(2*PI*12*Math.sin(3*PI/4)),unit:'mm',tolerance:.02,solution:'The probe amplitude is 0.240/(2π × 12) m. Divide by sin(3π/4) and convert metres to millimetres to obtain 4.50 mm.'}]
};
export const labs=[optics,gas,waves];
