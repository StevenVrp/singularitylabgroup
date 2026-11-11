// Pressures in kPa and volumes in litres give pressure-volume work in joules.
const R=8.31446261815324;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const fmt=v=>Number(v.toPrecision(4)).toString();
const ly=(x,y,s,c='#b7cada',size=12,anchor='start')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+c+'">'+s+'</text>';
const line=(x1,y1,x2,y2,c,w=1,d='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+w+'" stroke-dasharray="'+d+'"/>';
const path=(pts,c,w=2,extra='')=>'<polyline points="'+pts.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linejoin="round" '+extra+'/>';
const spot=(x,y,r,c)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'"/>';
const cyan='#79eed4',amber='#ffbd79',purple='#c6a6ff',blue='#84b8fa',muted='#889bb3',grid='#2d4055',colors=[cyan,amber,purple,blue];
const parameter=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const output=(key,label,unit)=>({key,label,unit});
const cfg={vertices:'4'};
[[1,1],[1,2],[2,2],[2,1]].forEach(([v,p],i)=>{cfg['v'+i]=String(v);cfg['p'+i]=String(p);cfg['s'+i]='linear'});
const coordinate=(c,key)=>clamp(Number(c[key])||1,.5,4);
function cycleBench({config={}}){
 const c={...cfg,...config},n=c.vertices==='3'?3:4;
 const select=(key,options)=>'<select data-config-key="'+key+'" aria-label="'+key+'">'+options.map(([v,name])=>'<option value="'+v+'" '+(c[key]===v?'selected':'')+'>'+name+'</option>').join('')+'</select>';
 const input=(key,label)=>'<label>'+label+' <input style="width:5em" type="number" step=".1" min=".5" max="4" data-config-key="'+key+'" value="'+coordinate(c,key)+'"></label>';
 return '<h3>Cycle vertices</h3><label>Closed path '+select('vertices',[['3','Triangle'],['4','Quadrilateral']])+'</label><p>Set each volume and pressure relative to the base values. Each row selects the path to the next corner.</p>'+Array.from({length:n},(_,i)=>'<details><summary>Corner '+String.fromCharCode(65+i)+'</summary>'+input('v'+i,'Volume ratio')+input('p'+i,'Pressure ratio')+'<label>Outgoing stroke '+select('s'+i,[['linear','Straight line'],['power','Polytropic curve']])+'</label></details>').join('');
}
function makeStroke(a,b,curve,cvR){
 const dv=b.v-a.v,dp=b.p-a.p;
 if(Math.abs(dv)<1e-10){return {type:'Isochoric',at(f){let pressure=a.p+dp*f;return{v:a.v,p:pressure,w:0,q:cvR*dp*a.v*f}},cuts:[]}}
 const exponent=Math.log(b.p/a.p)/Math.log(b.v/a.v);
 const k=dp/dv,constant=a.p-k*a.v;
 const slopeRoot=-(cvR+1)*constant/((2*cvR+1)*k);
 const critical=(slopeRoot-a.v)/dv;
 return {
  type:Math.abs(dp)<1e-9?'Isobaric':curve==='linear'?'Linear':Math.abs(exponent+1)<1e-8?'Isothermal':'Polytropic',
  cuts:curve==='linear'&&critical>0&&critical<1?[critical]:[],
  at(f){
   const v=a.v+f*dv,logr=Math.log(v/a.v);
   const p=curve==='linear'?a.p+dp*f:a.p*Math.exp(exponent*logr);
   const w=curve==='linear'?.5*(a.p+p)*f*dv:Math.abs(exponent+1)<1e-9?a.p*a.v*logr:a.p*a.v*Math.expm1((exponent+1)*logr)/(exponent+1);
   return {v,p,w,q:cvR*(p*v-a.p*a.v)+w};
  }
 };
}
function buildCycle(p,mode,config={}){
 const c={...cfg,...config},n=c.vertices==='3'?3:4,cvR=mode==='Monatomic gas'?1.5:2.5;
 const vertices=Array.from({length:n},(_,i)=>({v:p.volume*coordinate(c,'v'+i),p:p.pressure*coordinate(c,'p'+i)}));
 const strokes=vertices.map((a,i)=>makeStroke(a,vertices[(i+1)%n],c['s'+i],cvR));
 let w=0,q=0,absorbed=0;
 const offsets=strokes.map(s=>{const origin={w,q};const last=s.at(1);w+=last.w;q+=last.q;const bounds=[0,...s.cuts,1];for(let i=1;i<bounds.length;i++)absorbed+=Math.max(0,s.at(bounds[i]).q-s.at(bounds[i-1]).q);return origin});
 const duration=2*n,v0=vertices[0];return {duration,vertices,strokes,net:w,absorbed,at(t){
  const progress=clamp(t/2,0,n),stroke=Math.min(n-1,Math.floor(progress)),s=strokes[stroke].at(progress-stroke);
  return {stroke,volume:s.v,pressure:s.p,temperature:s.p*s.v/(p.amount*R),work:offsets[stroke].w+s.w,heat:offsets[stroke].q+s.q,internal:cvR*(s.p*s.v-v0.p*v0.v),cycleWork:w,efficiency:w>0&&absorbed>0?100*w/absorbed:0};
 }};
}
function cycleScene({model,state:s,showPath,showVectors}){
 const {vertices:v,strokes}=model;const xmax=1.18*Math.max(...v.map(a=>a.v)),ymax=1.18*Math.max(...v.map(a=>a.p));
 const X=n=>62+390*n/xmax,Y=n=>321-260*n/ymax;
 let svg=ly(39,30,'PRESSURE–VOLUME PATH',cyan,12)+ly(62,48,'P (kPa)',muted,11)+ly(391,354,'V (L)',muted,11);
 for(let i=0;i<=4;i++){let f=i/4;svg+=line(X(f*xmax),61,X(f*xmax),321,grid)+line(62,Y(f*ymax),452,Y(f*ymax),grid)+ly(X(f*xmax),339,fmt(f*xmax),muted,10,'middle')+ly(56,Y(f*ymax)+3,fmt(f*ymax),muted,10,'end')}
 if(showPath)strokes.forEach((st,i)=>{const pts=Array.from({length:51},(_,k)=>{const a=st.at(k/50);return [X(a.v),Y(a.p)]});svg+=path(pts,colors[i],2.4);if(showVectors){const [x,y]=pts[25],[nx,ny]=pts[26],ang=Math.atan2(ny-y,nx-x);if(Math.hypot(nx-x,ny-y)>1e-8)svg+='<path d="M-5 -4 L4 0 L-5 4" stroke="'+colors[i]+'" fill="none" transform="translate('+x+' '+y+') rotate('+ang*180/Math.PI+')"/>'}});
 v.forEach((a,i)=>{svg+=spot(X(a.v),Y(a.p),3.5,colors[i])+ly(X(a.v)+7,Y(a.p)-6,String.fromCharCode(65+i),colors[i],13)});
 svg+=spot(X(s.volume),Y(s.pressure),8,'#ffffff48')+spot(X(s.volume),Y(s.pressure),3.5,'#fff');
 const col=colors[s.stroke];svg+=line(480,47,480,320,grid)+ly(501,72,'STROKE '+String.fromCharCode(65+s.stroke)+' → '+String.fromCharCode(65+(s.stroke+1)%v.length),col,12)+ly(501,105,strokes[s.stroke].type,'#edf3f8',21)+ly(501,140,'Temperature   '+fmt(s.temperature)+' K')+ly(501,174,'Cycle work   '+fmt(model.net)+' J')+ly(501,202,'Heat absorbed   '+fmt(model.absorbed)+' J')+ly(501,236,model.net>1e-7?'Engine efficiency   '+fmt(s.efficiency)+'%':'No net engine output',amber,13)+ly(501,274,'Energy closure',muted,11)+ly(501,296,'Q − W − ΔU = '+fmt(Math.abs(s.heat-s.work-s.internal)<1e-8?0:s.heat-s.work-s.internal)+' J',cyan,13);
 return svg;
}
const cycle={id:'cycle',module:8,title:'Gas cycle builder',intro:'Choose three or four pressure–volume states and specify the path between each pair. Follow the gas around its closed cycle and measure net work and heat absorption.',modes:['Monatomic gas','Diatomic gas'],defaultConfig:cfg,workbench:cycleBench,build:buildCycle,scene:cycleScene,
 params:[parameter('amount','Amount of gas','n','mol',.02,.2,.01,.05),parameter('volume','Base volume','V₀','L',.5,5,.1,1),parameter('pressure','Base pressure','P₀','kPa',20,150,1,100)],
 metrics:[output('temperature','Gas temperature','K'),output('work','Work by gas','J'),output('heat','Heat into gas','J')],series:[output('work','Work by gas','J'),output('heat','Heat into gas','J'),output('internal','Internal energy change','J'),output('pressure','Pressure','kPa'),output('volume','Volume','L'),output('temperature','Temperature','K')],
 assumptions:['Every stroke is quasistatic. The gas remains at a uniform pressure and temperature, with constant ideal-gas heat capacities.','The animation assigns two simulated seconds to each stroke. Rates of heating and piston motion are illustrative.','A curved stroke follows a power law fit through its endpoints. Equal-volume endpoints define a constant-volume stroke. Straight and self-intersecting paths give algebraic signed work.'],
 misconception:'Net heat equals net work over a closed cycle. During an individual stroke their difference can change the internal energy.',insight:'Moving heat into the gas on one stroke and rejecting it on another allows positive net work. To calculate efficiency, sum all positive heat increments, including any changes of heat-flow sign within one stroke.',
 formulas:[
 {tex:'W=\\int_{V_i}^{V_f}P\\,dV',variables:[['W','Work done by the gas','J'],['P','Gas pressure','Pa'],['V','Gas volume','m³'],['V_i','Starting volume','m³'],['V_f','Ending volume','m³']],meaning:'A pressure–volume path has signed area equal to the work done by the gas.',derivation:'A piston moving through a short distance changes volume by face area times distance. Multiply the pressure force by this distance and add the contributions along the path.',example:'A gas expanding from 1.0 L to 2.0 L at 200 kPa does 200 J of work.'},
 {tex:'Q=\\Delta U+W,\\qquad \\Delta U=nC_V(T_f-T_i)',variables:[['Q','Heat supplied to the gas','J'],['\\Delta U','Internal energy change','J'],['W','Work done by the gas','J'],['n','Amount of gas','mol','amount'],['C_V','Molar heat capacity at constant volume','J/(mol·K)'],['T_f','Final gas temperature','K'],['T_i','Initial gas temperature','K']],meaning:'Heat supplied increases the ideal gas’s internal energy and supplies expansion work.',derivation:'Internal energy of a fixed amount of ideal gas depends only on temperature. Conservation of energy adds the energy transferred to the surroundings by piston motion.',example:'For a monatomic gas, a change in PV of 50 J increases internal energy by 75 J. If the gas does 10 J of work, it absorbs 85 J.'},
 {tex:'\\eta=\\frac{W_{\\mathrm{net}}}{Q_{\\mathrm{in}}}',variables:[['\\eta','Thermal efficiency of a heat engine','1'],['W_{\\mathrm{net}}','Positive work per cycle','J'],['Q_{\\mathrm{in}}','Total positive heat absorbed over the cycle','J']],meaning:'The work output is a fraction of all heat absorbed by the gas.',derivation:'Sum heat over each part where the gas absorbs energy. Divide the signed area enclosed by the cycle by that positive heat input.',example:'A cycle delivering 100 J while absorbing 650 J has an efficiency of 15.4%.'}],
 challenges:[{question:'A monatomic gas starts at 1 L and 100 kPa. At constant volume its pressure doubles. It expands at constant pressure to 2 L, cools at constant volume to 100 kPa, and returns along the lower isobar. What is its efficiency in percent?',hints:['The area of the rectangle gives net work.','The gas absorbs heat on the first two strokes. For monatomic gas, internal energy change is 1.5 times the change in PV.'],answer:100/650*100,tolerance:.12,unit:'%',solution:'The isochoric heating requires 150 J. Expansion requires 300 J of internal energy increase plus 200 J of work. The 100 J output divided by 650 J absorbed gives 15.38%.'},{question:'A reversible loop contains two isotherms and two isochores. Volumes alternate between 1 L and 3 L. Values of PV are 240 J on the hot expansion and 120 J on the cool compression. Find net work per cycle.',hints:['Isochores do zero work.','For an isotherm integrate the pressure, which varies inversely with volume.'],answer:120*Math.log(3),tolerance:.5,unit:'J',solution:'The hot stroke supplies 240 ln(3) J. The cool compression takes 120 ln(3) J. The difference is 131.8 J.'}]};
const sqrtPi=Math.sqrt(Math.PI);
function speedDensity(v,a){const u=v/a;return 4/sqrtPi*u*u*Math.exp(-u*u)/a}
// Numerical Recipes erfc approximation for nonnegative arguments; absolute error < 2e-7.
function erfc(x){
 if(x===0)return 1;
 const t=1/(1+.5*x);
 return t*Math.exp(-x*x-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));
}
function buildKinetic(p,mode){
 const fixed=mode==='Equilibrium snapshot',duration=8,M=p.mass/1000;
 return {duration,at(t){
  const T=p.temperature+(fixed?0:p.final-p.temperature)*clamp(t/duration,0,1);
  const a=Math.sqrt(2*R*T/M),z=p.threshold/a;
  return {temperature:T,peak:a,mean:2*a/sqrtPi,rms:Math.sqrt(1.5)*a,tail:100*clamp(erfc(z)+2*z*Math.exp(-z*z)/sqrtPi,0,1),energy:1.5*R*T};
 }};
}
function kineticScene({p,mode,state:s,showPath,showVectors}){
 const a0=Math.sqrt(2*R*p.temperature/(p.mass/1000)),a1=mode==='Equilibrium snapshot'?a0:Math.sqrt(2*R*p.final/(p.mass/1000));
 const xmax=Math.max(3.3*Math.max(a0,a1),p.threshold*1.16),ymax=speedDensity(Math.min(a0,a1),Math.min(a0,a1))*1.13;
 const X=x=>75+630*x/xmax,Y=y=>303-222*y/ymax;
 let svg=ly(41,33,'MOLECULAR SPEED DISTRIBUTION',cyan)+ly(72,64,'Probability density (s/m)',muted,11)+ly(630,344,'Speed (m/s)',muted,11);
 for(let i=0;i<=4;i++){const f=i/4;svg+=line(X(f*xmax),81,X(f*xmax),303,grid)+line(75,Y(f*ymax),705,Y(f*ymax),grid)+ly(X(f*xmax),321,fmt(f*xmax),muted,10,'middle')+ly(69,Y(f*ymax)+4,fmt(f*ymax),muted,10,'end')}
 const pts=(a,start)=>Array.from({length:181},(_,i)=>{const x=start+(xmax-start)*i/180;return[X(x),Y(speedDensity(x,a))]});
 const region=pts(s.peak,p.threshold);svg+='<polygon points="'+[[X(p.threshold),303],...region,[705,303]].map(pt=>pt.join(',')).join(' ')+'" fill="#efad5b" opacity=".25"/>';
 if(showPath&&!Object.is(a0,s.peak))svg+=path(pts(a0,0),purple,1.5,'stroke-dasharray="4 5"');
 svg+=path(pts(s.peak,0),cyan,2.7)+line(X(p.threshold),81,X(p.threshold),303,amber,1.4,'4 4');
 if(showVectors)svg+=line(X(s.rms),Y(speedDensity(s.rms,s.peak)),X(s.rms),303,blue,1.4,'3 3')+spot(X(s.peak),Y(speedDensity(s.peak,s.peak)),4,cyan);
 svg+=ly(697,32,'T = '+fmt(s.temperature)+' K','#d5dfec',13,'end')+ly(73,368,'Fraction above '+fmt(p.threshold)+' m/s   '+fmt(s.tail)+'%',amber,12)+ly(701,368,'Dashed reference when visible: initial distribution',muted,10,'end');return svg;
}
const kinetic={id:'kinetic',module:8,title:'Molecular speed distributions',intro:'Move a speed threshold through an equilibrium gas. The area under the speed distribution gives the fraction of molecules faster than that threshold.',modes:['Temperature sweep','Equilibrium snapshot'],build:buildKinetic,scene:kineticScene,
 params:[parameter('mass','Molar mass','M','g/mol',2,140,1,28),parameter('temperature','Initial temperature','T₀','K',100,1000,5,300),{...parameter('final','Final temperature','T₁','K',100,1000,5,600),mode:'Temperature sweep'},parameter('threshold','Speed threshold','vₜ','m/s',0,3000,10,600)],
 metrics:[output('peak','Most probable speed','m/s'),output('rms','RMS speed','m/s'),output('tail','Above threshold','%')],series:[output('peak','Most probable speed','m/s'),output('mean','Mean speed','m/s'),output('rms','RMS speed','m/s'),output('tail','Above threshold','%'),output('energy','Molar kinetic energy','J/mol')],
 assumptions:['A dilute, classical, nonrelativistic ideal gas is at equilibrium in its rest frame. The distribution has three velocity dimensions.','During a temperature sweep the gas passes quasistatically through equilibrium states. Its heating rate is prescribed. The speed curve is an analytical density with a numerical complementary-error-function evaluation for tail probability.'],
 misconception:'The height of the curve at one speed has units of inverse speed. A probability comes from the area across a speed interval.',insight:'The speed distribution peaks above zero because many directions give the same nonzero speed. Heating spreads a fixed total probability across a wider range, so the peak moves right and becomes lower.',
 formulas:[{tex:'f(v)=\\frac{4v^2}{\\sqrt{\\pi}a^3}e^{-v^2/a^2},\\qquad a=\\sqrt{\\frac{2RT}{M}}',variables:[['f(v)','Probability density at speed v','s/m'],['v','Molecular speed','m/s'],['a','Most probable speed','m/s'],['R','Universal gas constant','J/(mol·K)'],['T','Absolute temperature','K','temperature'],['M','Molar mass','kg/mol','mass'],['\\pi','Circle constant','1'],['e','Base of natural logarithms','1']],meaning:'The probability density rises from zero, peaks at the most probable speed, then decreases through a high-speed tail.',derivation:'The three perpendicular velocity components have independent Gaussian distributions. Integrating over directions on a sphere of radius v contributes the factor proportional to v squared.',example:'A gas of molar mass 0.028 kg/mol at 300 K has a most probable speed of 422 m/s. At 600 K the peak moves to 597 m/s.'},{tex:'v_{\\mathrm{rms}}=\\sqrt{\\langle v^2\\rangle}=\\sqrt{\\frac{3RT}{M}}',variables:[['v_{\\mathrm{rms}}','Root mean square speed','m/s'],['\\langle v^2\\rangle','Mean of squared molecular speeds','m²/s²'],['R','Universal gas constant','J/(mol·K)'],['T','Absolute temperature','K','temperature'],['M','Molar mass','kg/mol','mass']],meaning:'The root mean square speed weights high speeds more strongly than the arithmetic mean.',derivation:'Equipartition gives molar translational energy equal to three halves of RT. Equate this to one half the molar mass times mean square speed.',example:'For 0.028 kg/mol molecules at 300 K, the RMS speed is 517 m/s while the mean is about 476 m/s.'}],
 challenges:[{question:'A 4.00 g/mol gas has the same RMS molecular speed at 120 K as a second gas at 840 K. Find the second gas’s molar mass.',hints:['Use Kelvin temperatures.','For equal RMS speeds the ratio of absolute temperature to molar mass is the same.'],answer:28,tolerance:.1,unit:'g/mol',solution:'The temperature increases by a factor of 7. To preserve the speed, the molar mass must increase by the same factor, giving 28.0 g/mol.'},{question:'A fixed gas sample at 300 K has a speed threshold of 450 m/s. It is warmed to 675 K. What threshold keeps the same fraction of molecules above it?',hints:['Write speed in units of the most probable speed.','Every corresponding percentile scales with the square root of absolute temperature.'],answer:675,tolerance:1,unit:'m/s',solution:'The temperature ratio is 2.25, so the speed at any percentile rises by a factor of 1.5. The matching threshold is 675 m/s.'}]};
export const labs=[cycle,kinetic];
