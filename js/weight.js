let weightHistoryRenderLimit=100;
function addWeightEntry(){
  const w=parseDecimalInput(document.getElementById('weightNewInput'));
  const f=parseDecimalInput(document.getElementById('fatNewInput'));
  const dateEl=document.getElementById('weightDateInput');
  const timeEl=document.getElementById('weightTimeInput');
  const status=document.getElementById('weightSaveStatus');
  const nowD=new Date();
  const d=(dateEl && dateEl.value) ? dateEl.value : dateKey(nowD);
  const t=(timeEl && timeEl.value) ? timeEl.value : timeStr(nowD);
  if(!Number.isFinite(w) || w<20 || w>300 || !Number.isFinite(f) || f<2 || f>70 || !/^\d{4}-\d{2}-\d{2}$/.test(d)){
    if(status){ status.textContent='Bitte Gewicht, Körperfett und Datum gültig eingeben.'; status.className='status warn'; }
    return;
  }
  if(d>todayKey()){
    if(status){ status.textContent='Gewichtsmessungen können nicht in der Zukunft liegen.'; status.className='status warn'; }
    return;
  }
  if(!confirmSuspiciousWeight(w,f,d)){ if(status){status.textContent='Speichern abgebrochen.';status.className='status warn';} return; }
  weightEntries.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),date:d,time:t,weightKg:w,bodyFatPct:f});
  weightEntries.sort((a,b)=>(a.date+' '+(a.time||'00:00')).localeCompare(b.date+' '+(b.time||'00:00')));
  const latest=latestWeightEntry();
  weightKg=latest ? latest.weightKg : w; saveWeight(weightKg); saveWeightEntries(weightEntries);
  if(weightGoalKg && weightGoalDate && !weightGoalPlan) refreshWeightGoalPlan(true);
  document.getElementById('weightNewInput').value=''; document.getElementById('fatNewInput').value='';
  if(dateEl) dateEl.value=todayKey(); if(timeEl) timeEl.value=timeStr(new Date());
  if(status){ status.textContent=`Gespeichert: ${fmtKg(w)} · ${fmtPct(f)} · ${fmtShort(d)}`; status.className='status ok'; }
  softFeedback(document.getElementById('weightAddBtn'));
  renderWeightTab(); renderStatsTab();
}
function weightPeriodAvg(days, field){
  const today=new Date(); today.setHours(12,0,0,0);
  const cutoff=new Date(today); cutoff.setDate(cutoff.getDate()-Math.max(days-1,0));
  const vals=weightEntries
    .filter(e=>{ const d=new Date(e.date+'T12:00:00'); return d>=cutoff && d<=today; })
    .map(e=>field(e)).filter(Number.isFinite);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
}
function drawWeightChart(){
  drawMetricChart('weightChart', weightEntriesThroughToday(), e=>e.weightKg, 'Gewicht', 'kg');
}
function drawBodyFatChart(){
  drawMetricChart('bodyFatChart', weightEntriesThroughToday(), e=>e.bodyFatPct, 'Körperfett', '%');
}
function drawFatMassChart(){
  drawMetricChart('fatMassChart', weightEntriesThroughToday(), e=>fatMassOf(e), 'Fettmasse', 'kg');
}
function chartLeftPadding(ctx, labels, minimum=42){
  ctx.save(); ctx.font='9px -apple-system,sans-serif';
  const width=Math.max(0,...labels.map(x=>ctx.measureText(String(x)).width)); ctx.restore();
  return Math.ceil(Math.max(minimum,width+10));
}
function drawGoalPlanOnTimedChart(ctx, xForTime, yForValue, fromTime, toTime, minY, maxY, labelX, labelY){
  if(!weightGoalPlan || !weightGoalKg || !weightGoalDate) return;
  const planA=new Date(weightGoalPlan.startDate+'T12:00:00').getTime(), planB=new Date(weightGoalDate+'T12:00:00').getTime();
  if(planB<=planA) return;
  const a=Math.max(fromTime,planA), b=Math.min(toTime,planB); if(b<a) return;
  const valueAt=(t)=>weightGoalPlan.startKg+(weightGoalKg-weightGoalPlan.startKg)*((t-planA)/(planB-planA));
  const va=valueAt(a), vb=valueAt(b);
  if((va<minY&&vb<minY)||(va>maxY&&vb>maxY)) return;
  ctx.save(); ctx.setLineDash([6,5]); ctx.strokeStyle=cssVar('--rb-red')||'#D92A3C'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(xForTime(a),yForValue(va)); ctx.lineTo(xForTime(b),yForValue(vb)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle=cssVar('--rb-red')||'#D92A3C'; ctx.font='bold 9px -apple-system,sans-serif'; ctx.textAlign='right'; ctx.fillText('Soll',labelX,labelY); ctx.restore();
}
function drawMetricChart(id, list, getter, label, unit, targetCanvas=null, forcedSize=null){
  const canvas=targetCanvas||document.getElementById(id); if(!canvas) return;
  const dpr=window.devicePixelRatio||1, cssW=(forcedSize&&forcedSize.width)||canvas.clientWidth||300;
  const iphone = window.innerWidth<=430, mobile = window.innerWidth<=520;
  const cssH = (forcedSize&&forcedSize.height) || (id==='weightChart' ? (iphone?164:(mobile?176:190)) : (iphone?132:(mobile?142:150)));
  canvas.style.height=cssH+'px'; canvas.width=Math.round(cssW*dpr); canvas.height=Math.round(cssH*dpr);
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cssW,cssH);
  const pts=list.map(e=>({e,v:getter(e)})).filter(p=>Number.isFinite(p.v));
  const muted=cssVar('--muted')||'#A99DC9', line=cssVar('--line')||'#3E2C5E', accent=cssVar('--accent')||'#FF8C1A';
  if(!pts.length){ctx.fillStyle=muted;ctx.font='12px -apple-system,sans-serif';ctx.textAlign='center';ctx.fillText('Noch keine Messungen',cssW/2,cssH/2);return;}
  const vals=pts.map(p=>p.v); let min=Math.min(...vals), max=Math.max(...vals);
  if(id==='weightChart' && weightGoalPlan && weightGoalKg && weightGoalDate){ min=Math.min(min,weightGoalKg,weightGoalPlan.startKg); max=Math.max(max,weightGoalKg,weightGoalPlan.startKg); }
  let span=Math.max(max-min,0.5); min-=span*.10; max+=span*.10; span=max-min;
  ctx.font='9px -apple-system,sans-serif';
  const yLabels=[max.toFixed(1)+' '+unit,min.toFixed(1)+' '+unit];
  const pl=chartLeftPadding(ctx,yLabels,44),pr=10,pt=18,pb=28,uw=Math.max(cssW-pl-pr,1),uh=Math.max(cssH-pt-pb,1);
  ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,pt);ctx.lineTo(pl,pt+uh);ctx.lineTo(pl+uw,pt+uh);ctx.stroke();
  for(let g=0;g<=4;g++){const y=pt+uh*g/4,v=max-span*g/4;ctx.save();ctx.strokeStyle=line;ctx.globalAlpha=.30;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(pl+uw,y);ctx.stroke();ctx.restore();ctx.fillStyle=muted;ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';ctx.fillText(v.toFixed(1).replace('.',',')+' '+unit,pl-5,y+3);}
  const times=pts.map(p=>new Date(p.e.date+'T'+(p.e.time||'12:00')+':00').getTime());
  let tMin=Math.min(...times),tMax=Math.max(...times);
  if(id==='weightChart' && weightGoalPlan && weightGoalDate){tMin=Math.min(tMin,new Date(weightGoalPlan.startDate+'T12:00:00').getTime());tMax=Math.max(tMax,new Date(weightGoalDate+'T12:00:00').getTime());}
  const tSpan=Math.max(tMax-tMin,1), xTime=(t)=>pl+((t-tMin)/tSpan)*uw, yVal=(v)=>pt+uh-((v-min)/span)*uh;
  ctx.fillStyle=muted;ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';
  ctx.beginPath();pts.forEach((p,i)=>{const x=xTime(times[i]),y=yVal(p.v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
  pts.forEach((p,i)=>{const x=xTime(times[i]),y=yVal(p.v);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();});
  if(id==='weightChart') drawGoalPlanOnTimedChart(ctx,xTime,yVal,tMin,tMax,min,max,pl+uw,12);
  ctx.fillStyle=muted;ctx.textAlign='center';ctx.font='9px -apple-system,sans-serif';
  const minLabelGap=forcedSize?72:82,maxLabels=Math.max(1,Math.floor(uw/minLabelGap)),candidateIdx=[];
  if(pts.length===1)candidateIdx.push(0);else{const step=Math.max(1,Math.ceil((pts.length-1)/Math.max(maxLabels-1,1)));for(let i=0;i<pts.length;i+=step)candidateIdx.push(i);if(candidateIdx.at(-1)!==pts.length-1)candidateIdx.push(pts.length-1);}
  let lastRight=-Infinity;
  candidateIdx.forEach(i=>{const txt=fmtShort(pts[i].e.date),x=xTime(times[i]),tw=ctx.measureText(txt).width,left=x-tw/2,right=x+tw/2;if(left>=pl&&right<=pl+uw&&left-lastRight>=8){ctx.fillText(txt,x,cssH-8);lastRight=right;}});
  ctx.textAlign='left';ctx.fillText(label,pl,10);
}
function startOfWeek(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setHours(12,0,0,0); x.setDate(x.getDate()-wd); return x; }
function monthKeyFromDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
function drawWeightAverageChart(id, buckets, unit, targetCanvas=null, forcedSize=null){
  const canvas=targetCanvas||document.getElementById(id); if(!canvas) return;
  const dpr=window.devicePixelRatio||1, cssW=(forcedSize&&forcedSize.width)||canvas.clientWidth||300, cssH=(forcedSize&&forcedSize.height)||(window.innerWidth<=430?154:(window.innerWidth<=520?168:180));
  canvas.style.height=cssH+'px'; canvas.width=Math.round(cssW*dpr); canvas.height=Math.round(cssH*dpr);
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cssW,cssH);
  const muted=cssVar('--muted')||'#A99DC9', line=cssVar('--line')||'#3E2C5E', accent=cssVar('--accent')||'#FF8C1A';
  const vals=buckets.map(b=>b.value).filter(Number.isFinite);
  if(!vals.length){ctx.fillStyle=muted;ctx.font='12px -apple-system,sans-serif';ctx.textAlign='center';ctx.fillText('Noch keine Messungen',cssW/2,cssH/2);return;}
  let min=Math.min(...vals),max=Math.max(...vals);
  const planVals=buckets.map(b=>b.date?plannedWeightForDate(b.date):null).filter(Number.isFinite); if(planVals.length){min=Math.min(min,...planVals);max=Math.max(max,...planVals);}
  let span=Math.max(max-min,1);min-=span*.15;max+=span*.15;span=max-min;
  ctx.font='9px -apple-system,sans-serif'; const yTexts=[max,min,(max+min)/2].map(v=>v.toFixed(1).replace('.',',')+' '+unit);
  const pl=chartLeftPadding(ctx,yTexts,46),pr=10,pt=24,pb=34,uw=Math.max(cssW-pl-pr,1),uh=Math.max(cssH-pt-pb,1);
  ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,pt);ctx.lineTo(pl,pt+uh);ctx.lineTo(pl+uw,pt+uh);ctx.stroke();
  ctx.fillStyle=muted;ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';
  for(let i=0;i<=2;i++){const v=max-span*i/2,y=pt+uh*i/2;ctx.fillText(v.toFixed(1).replace('.',',')+' '+unit,pl-5,y+3);ctx.strokeStyle=line;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(pl+uw,y);ctx.stroke();ctx.globalAlpha=1;}
  const step=buckets.length>1?uw/(buckets.length-1):0;
  const coords=buckets.map((b,i)=>({b,x:pl+(buckets.length===1?uw/2:i*step),y:Number.isFinite(b.value)?pt+(max-b.value)/span*uh:null}));
  ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();let started=false;
  coords.forEach(p=>{if(p.y==null){started=false;return;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);});ctx.stroke();
  const avgLabelEvery=Math.max(1,Math.ceil(coords.length/Math.max(1,Math.floor(uw/58))));
  coords.forEach((p,i)=>{ctx.fillStyle=muted;ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';if(i%avgLabelEvery===0||i===coords.length-1)ctx.fillText(p.b.label,p.x,cssH-8);if(p.y!=null){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle=cssVar('--text')||'#fff';ctx.font='bold 10px -apple-system,sans-serif';ctx.fillText(p.b.value.toFixed(1).replace('.',','),p.x,Math.max(pt+10,p.y-8));}});
  const goalPts=buckets.map((b,i)=>({x:coords[i].x,v:b.date?plannedWeightForDate(b.date):null})).filter(p=>Number.isFinite(p.v));
  if(goalPts.length>=2){ctx.save();ctx.setLineDash([6,5]);ctx.strokeStyle=cssVar('--rb-red')||'#D92A3C';ctx.lineWidth=1.6;ctx.beginPath();goalPts.forEach((p,i)=>{const y=pt+(max-p.v)/span*uh;i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y);});ctx.stroke();ctx.restore();ctx.fillStyle=cssVar('--rb-red')||'#D92A3C';ctx.font='bold 9px -apple-system,sans-serif';ctx.textAlign='right';ctx.fillText('Soll',pl+uw,12);}
}
function getWeightAverageBuckets(){
  const nowD=new Date();
  const months=[];
  for(let i=5;i>=0;i--){const d=new Date(nowD.getFullYear(),nowD.getMonth()-i,1,12);const key=monthKeyFromDate(d);const vals=weightEntries.filter(e=>e.date<=todayKey() && e.date.slice(0,7)===key).map(e=>e.weightKg).filter(Number.isFinite);months.push({label:MONTHS[d.getMonth()].slice(0,3),date:dateKey(new Date(d.getFullYear(),d.getMonth(),15,12)),value:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null});}
  const weeks=[]; const thisMon=startOfWeek(nowD);
  for(let i=5;i>=0;i--){const a=new Date(thisMon);a.setDate(a.getDate()-i*7);const b=new Date(a);b.setDate(b.getDate()+7);const vals=weightEntries.filter(e=>{const d=new Date(e.date+'T12:00:00');return e.date<=todayKey() && d>=a&&d<b;}).map(e=>e.weightKg).filter(Number.isFinite);const mid=new Date(a);mid.setDate(mid.getDate()+3);weeks.push({label:pad(a.getDate())+'.'+pad(a.getMonth()+1)+'.',date:dateKey(mid),value:vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null});}
  return {months,weeks};
}
function renderWeightAverageCharts(){
  const {months,weeks}=getWeightAverageBuckets();
  drawWeightAverageChart('weightMonthAvgChart',months,'kg'); drawWeightAverageChart('weightWeekAvgChart',weeks,'kg');
}
window.getWeightAverageBuckets=getWeightAverageBuckets;
function renderWeightTab(){
  const latest=latestWeightEntry();
  document.getElementById('wCurrent').textContent=latest?fmtKg(latest.weightKg):'—';
  document.getElementById('wCurrentFat').textContent=latest?fmtPct(latest.bodyFatPct):'—';
  document.getElementById('wFatMass').textContent=latest?fmtFat(fatMassOf(latest)):'—';
  document.getElementById('wGoal').textContent=weightGoalKg?fmtKg(weightGoalKg):'—';
  document.getElementById('wToGoal').textContent=latest&&weightGoalKg?fmtKg(latest.weightKg-weightGoalKg):'—';
  const goalHint=document.getElementById('weightGoalPlanHint'); if(goalHint) goalHint.textContent=weightGoalStatusText();
  document.getElementById('wAvgWeek').textContent=fmtKg(weightPeriodAvg(7,e=>e.weightKg));
  document.getElementById('wAvgMonth').textContent=fmtKg(weightPeriodAvg(30,e=>e.weightKg));
  document.getElementById('wAvgFatWeek').textContent=fmtPct(weightPeriodAvg(7,e=>e.bodyFatPct));
  document.getElementById('wAvgFatMonth').textContent=fmtPct(weightPeriodAvg(30,e=>e.bodyFatPct));
  const list=document.getElementById('weightHistoryList');
  const sorted=weightEntries.slice().sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time));
  const historyCount=document.getElementById('weightHistoryCount'); if(historyCount) historyCount.textContent=`(${sorted.length})`;
  const shown=sorted.slice(0,weightHistoryRenderLimit);
  list.innerHTML=sorted.length?shown.map(e=>`<div class="weight-history-row">
    <span class="weight-history-date">${fmtShort(e.date)} ${e.time||''}</span>
    <span class="weight-history-main">${fmtKg(e.weightKg)}</span>
    <span class="weight-history-fat">${fmtPct(e.bodyFatPct)} · ${fmtFat(fatMassOf(e))}</span>
    <span class="weight-history-actions"><button type="button" class="weight-history-action" data-weight-edit="${e.id}">Bearbeiten</button><button type="button" class="weight-history-action weight-history-del" data-weight-del="${e.id}">Löschen</button></span>
  </div>`).join('')+(sorted.length>shown.length?`<button type="button" class="weight-history-more" data-weight-more>Weitere ${Math.min(100,sorted.length-shown.length)} anzeigen</button>`:''):'<div class="weight-empty">Noch keine Gewichtsmessungen.</div>';
  drawWeightChart(); drawBodyFatChart(); drawFatMassChart(); renderWeightAverageCharts();
  if(window.syncTodayBadge) window.syncTodayBadge();
}
function deleteWeightEntry(id){
  weightEntries=weightEntries.filter(e=>e.id!==id); saveWeightEntries(weightEntries);
  reconcileGoalPlanAfterWeightChange(id);
  const latest=latestWeightEntry();
  weightKg=latest ? latest.weightKg : 0;
  saveWeight(weightKg);
  renderWeightTab(); renderStatsTab();
}

let editingWeightId=null;
function openWeightEditor(id){
  const e=weightEntries.find(x=>x.id===id); if(!e) return;
  editingWeightId=id;
  document.getElementById('weightEditDate').value=e.date||todayKey();
  document.getElementById('weightEditTime').value=e.time||'';
  document.getElementById('weightEditKg').value=Number(e.weightKg).toFixed(1);
  document.getElementById('weightEditFat').value=Number(e.bodyFatPct).toFixed(1);
  const st=document.getElementById('weightEditStatus'); st.textContent=''; st.className='status';
  document.getElementById('weightEditOverlay').classList.add('open');
}
function closeWeightEditor(){
  editingWeightId=null;
  document.getElementById('weightEditOverlay').classList.remove('open');
}
function saveWeightEdit(){
  if(!editingWeightId) return;
  const w=parseDecimalInput(document.getElementById('weightEditKg'));
  const f=parseDecimalInput(document.getElementById('weightEditFat'));
  const d=document.getElementById('weightEditDate').value;
  const t=document.getElementById('weightEditTime').value||'00:00';
  const st=document.getElementById('weightEditStatus');
  if(!Number.isFinite(w)||w<20||w>300||!Number.isFinite(f)||f<2||f>70||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!/^\d{2}:\d{2}$/.test(t)){
    st.textContent='Bitte alle Werte gültig eingeben.'; st.className='status warn'; return;
  }
  if(d>todayKey()){ st.textContent='Gewichtsmessungen können nicht in der Zukunft liegen.'; st.className='status warn'; return; }
  if(!confirmSuspiciousWeight(w,f,d)){ st.textContent='Änderung abgebrochen.'; st.className='status warn'; return; }
  const idx=weightEntries.findIndex(x=>x.id===editingWeightId); if(idx<0) return;
  weightEntries[idx]={...weightEntries[idx],date:d,time:t,weightKg:w,bodyFatPct:f};
  weightEntries.sort((a,b)=>(a.date+' '+(a.time||'00:00')).localeCompare(b.date+' '+(b.time||'00:00')));
  saveWeightEntries(weightEntries);
  reconcileGoalPlanAfterWeightChange(editingWeightId);
  const latest=latestWeightEntry(); weightKg=latest?latest.weightKg:0; saveWeight(weightKg);
  closeWeightEditor(); renderWeightTab(); renderStatsTab();
}
function deleteEditingWeight(){
  if(!editingWeightId) return;
  const id=editingWeightId;
  if(!confirm('Diese Gewichtsmessung wirklich löschen?')) return;
  closeWeightEditor(); deleteWeightEntry(id);
}

