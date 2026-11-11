// Coordinates are in the original, unzoomed 760 × 390 SVG viewBox.
export function lengthCalibration(id,model,view){
 if(view!=='2D')return null;
 if(id==='orbit'){const kmPerPixel=model.a/(154*1.08*1000);return {x:kmPerPixel,y:kmPerPixel,unit:'km'}}
 if(id==='projectile')return {x:Math.max(1,model.range*1.08)/646,y:Math.max(.2,model.at(model.apexTime).y*1.27)/263,unit:'m'};
 return null;
}
export function overlay(points,type,calibration){
 if(!points.length)return '';
 const [a,b,c]=points;
 const circles=points.map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3.6" fill="#ffc491" stroke="#301f21"/>').join('');
 const path='<polyline points="'+points.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="#ffc491" stroke-width="1.7" stroke-dasharray="4 3"/>';
 let value='';
 if(b&&type==='ruler'&&calibration){value=Number(Math.hypot((b[0]-a[0])*calibration.x,(b[1]-a[1])*calibration.y).toPrecision(4))+' '+calibration.unit}
 if(c&&type==='protractor'){const u=[a[0]-b[0],a[1]-b[1]],v=[c[0]-b[0],c[1]-b[1]],len=Math.hypot(...u)*Math.hypot(...v);value=len?(Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/len)))*180/Math.PI).toFixed(2)+'°':'Select distinct points'}
 const p=c||b||a;
 return path+circles+(value?'<g transform="translate('+Math.min(632,Math.max(5,p[0]+8))+' '+Math.max(26,Math.min(373,p[1]-7))+')"><rect x="-3" y="-15" rx="3" width="'+(value.length*7+12)+'" height="21" fill="#292028"/><text fill="#ffd0a5" font-size="12">'+value+'</text></g>':'');
}
export function events(id,model){
 if(id==='projectile')return [['Release',0],['Apex',model.apexTime],['Impact',model.duration]];
 if(id==='orbit')return [['Periapsis',0],['Apoapsis',model.duration/2],['One period',model.duration]];
 if(id==='rc'){const s=model.at(0);return [['Switch',0],['One time constant',s.tau],['Run end',model.duration]].filter(pair=>pair[1]>=0&&pair[1]<=model.duration)}
 return [];
}
