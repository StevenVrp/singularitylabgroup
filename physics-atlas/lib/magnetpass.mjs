// A coaxial dipole and a circular pickup coil. The linkage follows from the
// azimuthal vector potential evaluated on the wire, including at z=0.
const mu0=4e-7*Math.PI;
const p=(key,label,symbol,unit,min,max,step,value)=>({key,label,symbol,unit,min,max,step,value});
const o=(key,label,unit)=>({key,label,unit});
const label=(x,y,v,color='#abc0d4',size=12,anchor='start')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${v}</text>`;
const line=(x,y,a,b,c,w=1,dash='')=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${c}" stroke-width="${w}" stroke-dasharray="${dash}"/>`;
function model(p,mode){
 const radius=p.radius/100,amplitude=p.travel/100,omega=2*Math.PI*p.frequency;
 const prefactor=mu0*p.turns*p.moment*radius**2/2,duration=1/p.frequency;
 function at(t){
  const phase=omega*t;
  const z=mode==='Harmonic drive'?amplitude*Math.sin(phase):-amplitude+2*amplitude*t/duration;
  const v=mode==='Harmonic drive'?amplitude*omega*Math.cos(phase):2*amplitude/duration;
  const denom=radius*radius+z*z, linkage=prefactor/denom**1.5;
  const gradient=-3*prefactor*z/denom**2.5,voltage=-gradient*v, current=voltage/p.resistance;
  return {z:100*z,v,linkage:1e3*linkage,voltage:1e3*voltage,current:1e3*current,force:1e3*current*gradient,heat:1e3*current*current*p.resistance};
 }
 return {duration,at};
}
function scene({p,state:s,showPath,showVectors}){
 const X=z=>355+229*z/p.travel, cx=355,cy=183, x=X(s.z),rx=32,ry=65;
 const ell=(d,color,width)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
 let art=label(27,29,'COAXIAL PICKUP', '#c6dbea',13)+label(27,49,'Positive coil normal points right · magnet marker enlarged')+line(48,cy,703,cy,'#466477',1,'5 5');
 if(showPath)art+=line(X(-p.travel),251,X(p.travel),251,'#476375',1.3)+label(X(-p.travel),271,'−'+p.travel+' cm',undefined,10,'middle')+label(X(p.travel),271,'+'+p.travel+' cm',undefined,10,'middle')+label(cx,271,'0',undefined,10,'middle');
 for(let j=0;j<5;j++){let c=cx+(j-2)*3;art+=ell(`M${c},${cy-ry} A${rx},${ry} 0 0 0 ${c},${cy+ry}`,'#97654c',1.8)}
 const isNorthRight=p.moment>=0;
 art+=`<rect x="${x-29}" y="${cy-11}" width="58" height="22" fill="#668de1" rx="3"/><rect x="${x+(isNorthRight?0:-29)}" y="${cy-11}" width="29" height="22" fill="#f18b84"/>`+
 label(x-14,cy+4,isNorthRight?'S':'N','#172332',12,'middle')+label(x+14,cy+4,isNorthRight?'N':'S','#172332',12,'middle');
 for(let j=0;j<5;j++){let c=cx+(j-2)*3;art+=ell(`M${c},${cy-ry} A${rx},${ry} 0 0 1 ${c},${cy+ry}`,'#f1b28a',2)}
 art+=label(cx,88,p.turns+' turns', '#ffc397',12,'middle')+label(27,333,'Flux linkage',undefined,11)+label(27,357,s.linkage.toFixed(3)+' mWb·turn','#7eddd0',17)+label(278,333,'Magnetic force',undefined,11)+label(278,357,s.force.toFixed(3)+' mN','#b39af7',17)+label(540,333,'Resistive heating',undefined,11)+label(540,357,s.heat.toFixed(3)+' mW','#ffbe88',17);
 if(showVectors&&Math.abs(s.v)>1e-8){let d=Math.sign(s.v),end=x+39*d;art+=line(x,cy-29,end,cy-29,'#81dfd2',2)+line(end,cy-29,end-6*d,cy-33,'#81dfd2',2)+line(end,cy-29,end-6*d,cy-25,'#81dfd2',2)+label(x,cy-37,'v','#81dfd2',11)}
 return art;
}
const lab={id:'magnetpass',title:'Moving magnet and coil',module:11,intro:'Drive a small magnet along a coil axis. Compare flux linkage, induced voltage and mechanical drag as the magnet crosses the coil plane.',assumptions:['The moving magnet is represented by a point magnetic dipole. Its physical dimensions must be small compared with the coil radius.','All turns have the same radius, center and orientation. Positive voltage and current follow the right-hand convention around the positive axis.','The drive imposes the motion. The coil is purely resistive, and its self-inductance, radiation and back-reaction on the prescribed trajectory are neglected.'],misconception:'Peak linkage at the coil center coincides with zero induced voltage. Faraday’s law depends on how quickly the linkage changes.',insight:'The induced current creates an axial force that opposes the magnet’s motion. With negligible self-inductance, the mechanical power needed to offset this drag equals the instantaneous Joule heating.',
 params:[p('radius','Coil radius','a','cm',2,10,.1,5),p('moment','Signed magnetic moment','m','A·m²',-1.5,1.5,.05,.65),p('turns','Pickup turns','N','1',10,500,1,120),p('travel','Travel amplitude','A','cm',3,25,.5,12),p('frequency','Drive frequency','f','Hz',.05,2,.05,.5),p('resistance','Coil and load resistance','R','Ω',1,100,.5,12)],modes:['Harmonic drive','Uniform pass'],metrics:[o('z','Magnet position','cm'),o('voltage','Induced voltage','mV'),o('current','Load current','mA')],series:[o('linkage','Flux linkage','mWb·turn'),o('voltage','Induced voltage','mV'),o('heat','Resistive heating','mW')],build:model,scene,
 formulas:[{tex:'\\Lambda=\\frac{\\mu_0 N m a^2}{2(a^2+z^2)^{3/2}}',variables:[['\\Lambda','Flux linkage, summed over turns','Wb·turn'],['\\mu_0','Vacuum permeability','H/m'],['N','Number of equally linked turns','1','turns'],['m','Signed axial magnetic dipole moment','A·m²','moment'],['a','Circular coil radius','m','radius'],['z','Signed magnet position relative to coil center','m']],meaning:'Linkage peaks in magnitude at the coil center and decreases symmetrically on either side.',derivation:'On a loop centered on the dipole axis, the dipole vector potential is azimuthal and constant in magnitude. Integrate it along the circumference and multiply the single-turn flux by the number of turns.',example:'For N = 100, m = 1.0 A·m², a = 0.050 m and z = 0, the linkage is 1.26 mWb·turn.'},{tex:'\\mathcal{E}=-v\\frac{d\\Lambda}{dz}',variables:[['\\mathcal{E}','Induced voltage following the positive winding sense','V'],['v','Signed axial magnet speed','m/s'],['\\Lambda','Coil flux linkage','Wb·turn'],['z','Signed magnet position','m']],meaning:'A voltage requires motion through a nonzero linkage gradient.',derivation:'Apply Faraday’s law and the chain rule to linkage considered as a function of magnet position.',example:'If linkage increases by 0.040 Wb·turn per metre and the magnet travels at +0.50 m/s, the induced voltage is −20 mV.'}],
 challenges:[{question:'A coil of total resistance 8 Ω has a linkage gradient of −0.12 Wb·turn per metre. A magnet passes at +0.50 m/s. What external force must offset the magnetic drag at this instant?',hints:['Use the linkage gradient and speed to find the induced voltage and current.','Equate external mechanical power to Joule heating.'],answer:.9,unit:'mN',tolerance:.01,solution:'The EMF is +0.060 V, so I = 0.0075 A. Joule heating is 0.45 mW. Dividing by 0.50 m/s gives an external force of +0.90 mN.'},{question:'A magnet moves uniformly through the coil center. Relative to the coil radius, at what positive axial displacement z/a is the induced voltage magnitude greatest?',hints:['At constant speed, maximize the magnitude of the linkage gradient.','For z > 0 the shape is proportional to z/(a² + z²)^(5/2).'],answer:.5,unit:'1',tolerance:.005,solution:'Differentiating the gradient magnitude gives a factor proportional to a² − 4z². Its positive root is z/a = 1/2; the voltage vanishes at both z = 0 and large z.'}]};
export const labs=[lab];
