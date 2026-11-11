export const colors=['#67b9ff','#69dbc8','#ffaf75','#ff87b2','#d3a5ef','#e1cf80'];
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function number(n,d=2){
 if(!Number.isFinite(n))return '—';
 if(n===0)return '0';
 if(Math.abs(n)>=1e7 || Math.abs(n)<0.001)return n.toExponential(d);
 return Number(n.toFixed(Math.abs(n)<0.1?Math.max(3,d):d)).toLocaleString('en-US',{maximumFractionDigits:8});
}
export function sample(model,count=200){
 return Array.from({length:count+1},(_,i)=>{const t=model.duration*i/count;return {t,...model.at(t)}})
}
function niceStep(raw){const scale=10**Math.floor(Math.log10(raw));return ([1,2,2.5,5,10].find(n=>n*scale>=raw)||10)*scale}
export function drawPlot(data,series,range,time,cursor,opts={}){
 const W=610,H=144,L=68,R=16,T=12,B=30,w=W-L-R,h=H-T-B;
 const [lo,hi]=range,span=hi-lo;const x=t=>L+w*(t-lo)/span;
 const points=data.filter(d=>d.t>=lo&&d.t<=hi&&Number.isFinite(d[series.key]));
 let ys=points.map(d=>d[series.key]); if(!ys.length)return '<p>No finite samples in this interval.</p>';
 let a=Math.min(...ys),b=Math.max(...ys);if(opts.area){a=Math.min(0,a);b=Math.max(0,b)}if(a===b){let pad=Math.abs(a)*.08||1;a-=pad;b+=pad}
 const step=niceStep((b-a)/3);a=Math.floor(a/step)*step;b=Math.ceil(b/step)*step;
 const y=v=>T+h*(b-v)/(b-a),col=opts.color||colors[0];
 const path=points.map((d,i)=>(i?'L':'M')+x(d.t).toFixed(2)+' '+y(d[series.key]).toFixed(2)).join(' ');
 let grid='';for(let v=a,i=0;i<10&&v<=b+step*.001;v+=step,i++){grid+='<path d="M'+L+' '+y(v)+'H'+(W-R)+'" stroke="#527087" opacity=".26"/><text x="'+(L-9)+'" y="'+(y(v)+4)+'" text-anchor="end">'+number(v,3)+'</text>'}
 for(let i=0;i<=4;i++){let t=lo+i*span/4;grid+='<path d="M'+x(t)+' '+T+'v'+h+'" stroke="#527087" opacity=".17"/><text x="'+x(t)+'" y="'+(H-9)+'" text-anchor="'+(i===0?'start':i===4?'end':'middle')+'">'+number(t,2)+'</text>'}
 const ti=cursor??time; const inspect=opts.model.at(ti)[series.key]; const xy=x(ti);
 const area=opts.area&&a<=0&&b>=0?'<path d="'+path+' L'+x(points.at(-1).t)+' '+y(0)+' L'+x(points[0].t)+' '+y(0)+'Z" fill="'+col+'" opacity=".18"/>':'';
 let marker='';if(ti>=lo&&ti<=hi&&Number.isFinite(inspect)){marker='<path d="M'+xy+' '+T+'v'+h+'" stroke="'+col+'" stroke-dasharray="3 4" opacity=".7"/><circle cx="'+xy+'" cy="'+y(inspect)+'" r="4" fill="'+col+'" stroke="#0b2031" stroke-width="2"/>'}
 return '<div class="plot-head"><span><i class="dot" style="--c:'+col+'"></i>'+escape(series.label)+' <small>('+escape(series.unit||'1')+')</small></span><b>'+number(inspect,3)+' '+escape(series.unit)+'</b></div><svg class="plot-svg" data-plot="'+escape(series.key)+'" viewBox="0 0 '+W+' '+H+'" aria-label="'+escape(series.label)+' against time">'+grid+area+'<path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"/>'+marker+'</svg>';
}
