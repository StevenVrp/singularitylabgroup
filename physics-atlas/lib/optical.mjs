// Paraxial transfer optics and scalar far-field diffraction. Distances in models use SI.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const C={ray:'#69e8d5',ray2:'#ac98ff',amber:'#ffc98c',paper:'#cadcea',muted:'#94a9c3',rail:'#466078',glass:'#68b6fb'};
const param=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const out=(key,label,unit)=>({key,label,unit});
const num=(n,d=3)=>Number(n.toFixed(d)).toString();
const line=(x,y,u,v,color,width=1,dash='')=>`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}"/>`;
const label=(x,y,txt,fill=C.muted,size=11,anchor='start')=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}">${txt}</text>`;
const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const defaults={count:'1',x1:'.42',x2:'.75',x3:'1.09',f1:'.24',f2:'.18',f3:'.24',s1:'1',s2:'-1',s3:'1'};
function lensCount(c){return clamp(Math.round(Number(c.count)||1),1,3)}
const bands=[[.21,.52],[.58,.94],[1.02,1.3]];
function setup(raw={}){
 const c={...defaults,...raw};
 return Array.from({length:lensCount(c)},(_,i)=>{
  const k=i+1, [lo,hi]=bands[i];const read=key=>Number.isFinite(+c[key])?+c[key]:+defaults[key];
  return {x:clamp(read('x'+k),lo,hi),f:clamp(read('f'+k),.1,.8)*(read('s'+k)<0?-1:1)};
 });
}
function controls({config:raw={}}){
 const c={...defaults,...raw},lenses=setup(c);
 const select=(key,v,opts)=>'<select data-config-key="'+key+'">'+opts.map(([keyVal,name])=>'<option value="'+keyVal+'" '+(String(keyVal)===String(v)?'selected':'')+'>'+name+'</option>').join('')+'</select>';
 const numberBox=(key,v,min,max)=>'<input type="number" step=".01" min="'+min+'" max="'+max+'" data-config-key="'+key+'" value="'+num(v)+'">';
 return '<label>Lens count '+select('count',lenses.length,[[1,'1'],[2,'2'],[3,'3']])+'</label>'+lenses.map((l,i)=>{const k=i+1;return '<details '+(i===0?'open':'')+'><summary>Lens '+k+'</summary><label>Type '+select('s'+k,Math.sign(l.f),[[1,'Converging'],[-1,'Diverging']])+'</label><label>Rail position (m) '+numberBox('x'+k,l.x,...bands[i])+'</label><label>Focal length magnitude (m) '+numberBox('f'+k,Math.abs(l.f),.1,.8)+'</label></details>'}).join('');
}
function trace(lenses,x0,height,slope){
 const points=[[x0,height]];let x=x0,y=height,u=slope;
 for(const lens of lenses){y+=(lens.x-x)*u;x=lens.x;u-=y/lens.f;points.push([x,y])}
 return {points,x,y,u};
}
function benchModel(p,mode,config){
 const lenses=setup(config),x0=p.object,h=p.height/1000,last=lenses.at(-1).x;
 const central=-h/(lenses[0].x-x0), rays=[-.025,0,.025].map(delta=>trace(lenses,x0,h,central+delta));
 // The difference of two output rays is proportional to the second column of the system matrix.
 const [a,,b]=rays, dy=b.y-a.y, du=b.u-a.u,finite=Math.abs(du)>1e-11;
 const distance=finite?-dy/du:null;
 const imageX=finite?last+distance:null, imageY=finite?a.y+distance*a.u:null;
 const duration=8, far=2.35;
 function at(t){
  const x=mode==='Scan detector'?last+.01+(far-last-.01)*clamp(t/duration,0,1):p.screen;
  const heights=rays.map(r=>(r.y+r.u*(x-r.x))*1000);
  return {screen:x,spot:Math.max(...heights)-Math.min(...heights),centre:heights[1],angle:Math.atan((a.u+b.u)/2)*180/Math.PI};
 }
 const warning=Math.max(...rays.map(r=>Math.abs(r.u)))>.20?'Large ray slopes approach the limit of the paraxial approximation.':'';
 return {lenses,rays,duration,at,imageX,imageY,distance,magnification:finite?imageY/h:null,warning};
}
function benchScene({p,model:m,state:s,showVectors,showPath}){
 const X=x=>44+x*(655/2.4),axis=194;
 const heights=m.rays.flatMap(r=>r.points.map(v=>Math.abs(v[1]))).concat(Math.abs(s.centre+.5*s.spot)/1000,Math.abs(s.centre-.5*s.spot)/1000,p.height/1000);
 const yScale=clamp(100/Math.max(...heights,.025),80,2000),Y=y=>axis-y*yScale;
 const last=m.lenses.at(-1).x, compact=m.imageX!==null&&m.imageX>0&&m.imageX<2.38&&Math.abs(Y(m.imageY)-axis)<113;
 let svg=label(26,28,'OPTICAL RAIL',C.paper,13)+label(26,49,'Paraxial rays · vertical scale enlarged')+line(36,axis,717,axis,C.rail,1,'6 6');
 for(let i=0;i<=24;i++){const x=X(i/10);svg+=line(x,305,x,305+(i%5===0?10:4),C.rail);if(i%5===0)svg+=label(x,333,num(i/10,1),C.muted,11,'middle')}
 svg+=line(X(0),305,X(2.4),305,C.rail)+label(715,332,'m');
 const sourceX=X(p.object);
 svg+=line(sourceX,axis,sourceX,Y(p.height/1000),C.amber,3)+circle(sourceX,Y(p.height/1000),4,C.amber)+label(sourceX,282,'Object',C.amber,10,'middle');
 for(const [i,l] of m.lenses.entries()){const x=X(l.x),thick=l.f>0?13:3,edge=l.f>0?2:10;
 svg+=`<path d="M${x-edge},98 Q${x-thick*2},194 ${x-edge},272 L${x+edge},272 Q${x+thick*2},194 ${x+edge},98Z" fill="#4e98bd" fill-opacity=".28" stroke="${C.glass}" stroke-width="1.2"/>`+label(x,88,'L'+(i+1),C.glass,11,'middle');}
 const colors=[C.ray,C.ray2,C.amber];
 if(showPath)for(const [i,r] of m.rays.entries()){const yEnd=r.y+r.u*(s.screen-last);const pts=[...r.points,[s.screen,yEnd]];for(let j=1;j<pts.length;j++)svg+=line(X(pts[j-1][0]),Y(pts[j-1][1]),X(pts[j][0]),Y(pts[j][1]),colors[i],1.7);
 if(compact&&m.distance<0)svg+=line(X(last),Y(r.y),X(m.imageX),Y(m.imageY),colors[i],1,'3 5');}
 svg+=line(X(s.screen),83,X(s.screen),272,C.paper,2)+label(X(s.screen),282,'Screen',C.paper,10,'middle');
 if(showVectors)for(const r of m.rays){const y=r.y+r.u*(s.screen-last);svg+=circle(X(s.screen),Y(y),3.3,C.ray)}
 if(compact)svg+=circle(X(m.imageX),Y(m.imageY),4,C.amber)+label(clamp(X(m.imageX)+6,40,655),clamp(Y(m.imageY)-9,93,256),m.distance<0?'Virtual image':'Image',C.amber,10);
 const summary=m.imageX===null?'Image at infinity · collimated output':(m.distance<0?'Virtual':'Real')+' image at x = '+num(m.imageX)+' m · signed magnification '+num(m.magnification);
 return svg+label(27,368,summary,C.paper,12);
}
const bench={id:'bench',module:12,title:'Optical bench',intro:'Place up to three thin lenses on an optical rail and observe where rays from one object point meet. Scan a screen to locate the narrowest image of that point.',assumptions:['Rays travel left to right in air. Positive focal length denotes a converging thin lens.','All rays are paraxial. The lens and screen apertures are idealized as unlimited.','The three rays sample a specified angular fan. The spot width represents that fan’s geometrical spread and excludes diffraction.'],misconception:'A virtual image is located by extending the outgoing rays backward. A downstream screen receives their actual diverging bundle.',insight:'A single image distance can be misleading in a multi-lens system. Two independent emitted slopes locate the final conjugate even if the intermediate image lies beyond a later lens.',
 params:[param('object','Object position','xₒ','m',0,.16,.005,.06),param('height','Object height','hₒ','mm',1,20,.5,12),param('screen','Screen position','xₛ','m',1.33,2.35,.005,1.65)],modes:['Fixed detector','Scan detector'],series:[out('spot','Screen spot width','mm'),out('centre','Central ray height','mm')],metrics:[out('screen','Screen position','m'),out('spot','Spot width','mm'),out('centre','Central ray height','mm')],workbench:controls,defaultConfig:defaults,build:benchModel,scene:benchScene,
 formulas:[{tex:'u_{2}=u_{1}-y/f',variables:[['u_1','Ray slope arriving at a lens','1'],['u_2','Ray slope leaving the lens','1'],['y','Signed ray height above the axis','m'],['f','Signed lens focal length','m']],meaning:'A thin lens changes ray slope according to ray height and optical power.',derivation:'A horizontal ray at height y must pass through the rear focus, giving a slope change of −y/f. Paraxial linearity gives the same change for an incoming inclined ray.',example:'A horizontal ray 10 mm above a converging lens axis leaves with slope −0.05 for a 0.20 m focal length.'},{tex:'\\frac{1}{f}=\\frac{1}{s}+\\frac{1}{s\'}',variables:[['f','Signed focal length','m'],['s','Object distance, positive for a real incident object','m'],["s'","Image distance, positive for a real outgoing image",'m']],meaning:'A single thin lens forms conjugate object and image planes.',derivation:'Send one ray through the lens center and a second parallel to the axis. At their intersection, the two expressions for ray height must agree, yielding the reciprocal distance relation.',example:'A real object 0.30 m before a converging 0.20 m lens forms an inverted real image 0.60 m beyond it.'}],
 challenges:[{question:'An object is 0.30 m before a converging lens with f = 0.20 m. A second, diverging lens with f = −0.15 m sits 0.45 m after the first. How far from the second lens is the final image? Enter 0 if the output is collimated. Use metres.',hints:['Locate the image of the first lens alone.','The second lens intercepts rays converging toward a point 0.15 m to its right, so its object distance is negative.'],answer:0,unit:'m (0 for collimated)',tolerance:1e-8,solution:'The first lens would focus 0.60 m past itself. The second lens sees a virtual object at s = −0.15 m. With f = −0.15 m, 1/s′ = 1/f − 1/s = 0. The rays emerge parallel, so enter the specified code 0.'},{question:'A lens projects a fivefold enlarged image onto a wall 1.80 m from the real object. Calculate its focal length.',hints:['Use the ratio of image and object distances.','Their sum is the fixed object–wall separation.'],answer:.25,unit:'m',tolerance:.002,solution:'Let s be the object distance. Then s′ = 5s and 6s = 1.80 m, giving distances 0.30 m and 1.50 m. Substitution in the thin-lens law gives f = 0.25 m.'}]};
function slitModel(p,mode){
 const wavelength=p.wave*1e-9,separation=p.spacing*1e-3,width=p.width*1e-3;
 // In the back focal plane of an ideal Fourier lens y/f is the paraxial diffraction angle.
 const fringe=p.focal*wavelength/separation, firstZero=p.focal*wavelength/width;
 const extent=clamp(2.05*firstZero,.003,.10),duration=10;
 function point(y){
  const difference=separation*y/p.focal, phase=Math.PI*difference/wavelength;
  const beta=Math.PI*width*y/(wavelength*p.focal);
  const envelope=Math.abs(beta)<1e-8?1:(Math.sin(beta)/beta)**2;
  const interference=Math.cos(phase)**2;
  const intensity=mode==='Single slit'?envelope:mode==='Point slits'?interference:envelope*interference;
  return {position:y*1e3,intensity,envelope,phase:difference/wavelength,fringe:fringe*1e3,firstZero:firstZero*1e3};
 }
 return {duration,point,extent,at(t){return point((2*clamp(t/duration,0,1)-1)*extent)}};
}
function slitScene({p,mode,model:m,state:s,showPath,showVectors}){
 const l=70,r=704,top=85,base=239, X=y=>l+(y/m.extent+1)*(r-l)/2;
 let svg=label(27,29,'FOURIER PLANE',C.paper,13)+label(27,51,'Detector scan · intensity relative to the central peak')+line(l,top,l,base,C.rail)+line(l,base,r,base,C.rail);
 const rgb=p.wave<470?'132,139,255':p.wave<505?'93,201,255':p.wave<565?'112,233,147':p.wave<590?'231,226,109':p.wave<620?'253,190,96':'253,129,113';
 const paths=[],env=[],strips=[];
 for(let i=0;i<=700;i++){const x=l+(r-l)*i/700,v=m.point((i/350-1)*m.extent);paths.push(num(x,1)+','+num(base-149*v.intensity,2));env.push(num(x,1)+','+num(base-149*v.envelope,2));strips.push(`<rect x="${x}" y="271" width="1.2" height="36" fill="rgb(${rgb})" opacity="${v.intensity.toFixed(4)}"/>`)}
 for(let i=0;i<=2;i++){const y=base-74.5*i;svg+=line(l,y,r,y,C.rail,.65,'3 6')+label(l-10,y+4,num(i/2),C.muted,10,'end')}
 if(showPath&&mode!=='Point slits')svg+='<polyline fill="none" stroke="'+C.amber+'" stroke-dasharray="4 5" points="'+env.join(' ')+'"/>';
 svg+='<polyline fill="none" stroke="rgb('+rgb+')" stroke-width="2" points="'+paths.join(' ')+'"/><rect x="'+l+'" y="270" width="'+(r-l)+'" height="38" rx="2" fill="#050912"/>'+strips.join('');
 for(let i=-2;i<=2;i++){const y=m.extent*i/2,x=X(y);svg+=line(x,base,x,base+4,C.rail)+label(x,255,num(1000*y,2),C.muted,10,'middle')}
 const probeX=X(s.position/1000);
 if(showVectors)svg+=line(probeX,top,probeX,308,C.paper,1,'3 3')+circle(probeX,base-149*s.intensity,4,C.paper);
 return svg+label(r,330,'Screen position (mm)',C.paper,11,'end')+label(27,366,'Detector strip · linear intensity',C.muted,11);
}
const interference={id:'interference',title:'Slits and diffraction',module:12,intro:'Scan the interference pattern formed by coherent slits. Compare fringe separation with the broad diffraction envelope and find orders whose maxima disappear.',assumptions:['The slits are identical, coherent, illuminated uniformly, and long compared with their width.','A lens forms the Fraunhofer pattern in its back focal plane. Paraxial geometry maps angle to screen position.','Power is normalized independently to the on-axis peak in each aperture model.'],misconception:'Narrowing both slits spreads the diffraction envelope. The spacing of the fine interference fringes is set by their center-to-center separation.',insight:'At certain angles the phase difference between slit centers is a whole number of cycles while contributions across each individual slit cancel. This extinguishes an otherwise bright interference order.',
 params:[param('wave','Wavelength','λ','nm',400,700,1,550),param('spacing','Slit separation','d','mm',.16,.80,.005,.4),param('width','Slit width','a','mm',.04,.15,.005,.10),param('focal','Lens focal length','f','m',.5,2,.05,1)],modes:['Finite double slit','Point slits','Single slit'],metrics:[out('position','Probe coordinate','mm'),out('intensity','Relative intensity','1'),out('phase','Path difference','wavelengths')],series:[out('intensity','Relative intensity','1'),out('phase','Path difference','wavelengths')],build:slitModel,scene:slitScene,
 formulas:[{tex:'\\frac{I}{I_0}=\\cos^2\\!\\left(\\frac{\\pi d y}{\\lambda f}\\right)\\left[\\frac{\\sin\\beta}{\\beta}\\right]^2,\\quad \\beta=\\frac{\\pi a y}{\\lambda f}',variables:[['I','Intensity at the detector point','W/m²'],['I_0','Central intensity','W/m²'],['d','Center-to-center slit separation','m','spacing'],['a','Width of each slit','m','width'],['y','Position from optical axis in the focal plane','m'],['f','Fourier lens focal length','m','focal'],['\\lambda','Optical wavelength','m','wave'],['\\beta','Phase variation from slit center to its edge','rad'],['\\pi','Circle constant','1']],meaning:'The two-source interference pattern is multiplied by the diffraction envelope of each slit.',derivation:'Integrating complex wave amplitude across one uniform slit gives a sinc amplitude. Adding two such amplitudes with the phase difference of their centers adds a cosine factor. Squaring and normalizing gives irradiance.',example:'With λ = 500 nm, f = 1.0 m, d = 0.40 mm and a = 0.10 mm, the interference spacing is 1.25 mm. The first envelope zero at 5.0 mm extinguishes the fourth order.'}],
 challenges:[{question:'Coherent 600 nm light illuminates slits 0.30 mm apart. A lens of focal length 1.20 m forms their pattern. The third bright order is the first missing order. What is the physical slit width?',hints:['The first missing bright order coincides with the first single-slit minimum.','Both directions have the same ratio of transverse position to focal length.'],answer:.10,unit:'mm',tolerance:.001,solution:'The order condition gives sin θ = 3λ/d, and the first minimum gives sin θ = λ/a. Equating them yields a = d/3 = 0.10 mm.'},{question:'Two equal coherent point slits give fringes 1.50 mm apart. Starting at a bright center, how far must the detector move before intensity first falls to one quarter of its peak?',hints:['Use the normalized point-slit cosine-squared curve.','Across one complete fringe interval the cosine argument increases by π.'],answer:.50,unit:'mm',tolerance:.004,solution:'On the first decline, cos φ = 1/2 at φ = π/3. One fringe corresponds to a change of π, so the detector must move 1.50/3 = 0.50 mm.'}]};
export const labs=[bench,interference];
