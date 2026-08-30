/* ---------- Diagramme vergrößern ---------- */
function chartTitleFor(canvas){
  const wrap=canvas.closest('.chart-wrap'); if(!wrap) return 'Diagramm';
  let el=wrap.previousElementSibling;
  while(el){ if(el.classList && el.classList.contains('section-title')) return (el.textContent||'Diagramm').trim(); el=el.previousElementSibling; }
  return 'Diagramm';
}
let zoomSourceCanvas=null;
let zoomResizeTimer=null;

function zoomSize(){
  const body=document.querySelector('#chartZoomOverlay .chart-zoom-body');
  return {width:Math.max(280,body?.clientWidth||window.innerWidth-16),height:Math.max(260,body?.clientHeight||window.innerHeight-70)};
}
function clearZoomCanvas(target,size){
  const dpr=window.devicePixelRatio||1;
  target.style.width=size.width+'px';target.style.height=size.height+'px';
  target.width=Math.round(size.width*dpr);target.height=Math.round(size.height*dpr);
  const ctx=target.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size.width,size.height);
}
function redrawZoomChart(source){
  const target=document.getElementById('chartZoomCanvas'); if(!source||!target)return;
  const size=zoomSize(), id=source.id;
  clearZoomCanvas(target,size);
  if(id==='chart'){
    const days=window.getFlexibleTrainingDays?window.getFlexibleTrainingDays():(()=>{const out=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=dateKey(d);out.push({k,total:totalForDate(k)});}return out;})();
    drawChart(days,target,size); return;
  }
  if(id==='growthChart'){
    const st=computeStats(); renderGrowthChart(st.growth,st.start,target,size,false); return;
  }
  if(id==='weightChart'){drawMetricChart(id,weightEntriesThroughToday(),e=>e.weightKg,'Gewicht','kg',target,size);return;}
  if(id==='bodyFatChart'){drawMetricChart(id,weightEntriesThroughToday(),e=>e.bodyFatPct,'Körperfett','%',target,size);return;}
  if(id==='fatMassChart'){drawMetricChart(id,weightEntriesThroughToday(),e=>fatMassOf(e),'Fettmasse','kg',target,size);return;}
  if(id==='weightWeekAvgChart'||id==='weightMonthAvgChart'){
    const b=window.getWeightAverageBuckets?window.getWeightAverageBuckets():{weeks:[],months:[]};
    drawWeightAverageChart(id,id==='weightWeekAvgChart'?b.weeks:b.months,'kg',target,size);return;
  }
}
function openChartZoom(canvas){
  try{
    zoomSourceCanvas=canvas;
    document.getElementById('chartZoomTitle').textContent=chartTitleFor(canvas);
    document.getElementById('chartZoomOverlay').classList.add('open');
    requestAnimationFrame(()=>requestAnimationFrame(()=>redrawZoomChart(canvas)));
  }catch(e){}
}
document.querySelectorAll('.chart-wrap canvas').forEach(c=>{
  c.setAttribute('role','button');c.setAttribute('tabindex','0');c.setAttribute('aria-label','Diagramm vergrößern');
  c.addEventListener('click',()=>openChartZoom(c));
  c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openChartZoom(c);}});
});
function closeChartZoom(){document.getElementById('chartZoomOverlay').classList.remove('open');zoomSourceCanvas=null;}
document.getElementById('chartZoomClose').addEventListener('click',closeChartZoom);
document.getElementById('chartZoomOverlay').addEventListener('click',e=>{if(e.target.id==='chartZoomOverlay')closeChartZoom();});
function scheduleZoomRedraw(){
  if(!zoomSourceCanvas||!document.getElementById('chartZoomOverlay').classList.contains('open'))return;
  clearTimeout(zoomResizeTimer);zoomResizeTimer=setTimeout(()=>requestAnimationFrame(()=>redrawZoomChart(zoomSourceCanvas)),80);
}
window.addEventListener('resize',scheduleZoomRedraw);
window.addEventListener('orientationchange',()=>setTimeout(scheduleZoomRedraw,180));

/* ---------- Tabs (Log / Statistik) ---------- */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    bottomMode = btn.dataset.tab==='stats' ? 'stats' : 'log'; saveBottomMode(bottomMode);
    showCurrentArea();
  });
});


/* ---------- Lokaler Tageswechsel ---------- */
let activeLocalDay=todayKey(),midnightTimer=null;
function scheduleLocalMidnightRefresh(){
  clearTimeout(midnightTimer);
  const d=new Date(),next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0,1,0);
  midnightTimer=setTimeout(()=>{refreshLocalDay(true);scheduleLocalMidnightRefresh();},Math.max(1000,next.getTime()-d.getTime()));
}
function refreshLocalDay(force=false){
  const fresh=new Date(),key=dateKey(fresh),changed=key!==activeLocalDay;
  now=fresh;
  if(changed){activeLocalDay=key;calYear=fresh.getFullYear();calMonth=fresh.getMonth();}
  if(changed||force){renderAll();if(bottomMode==='stats')renderStatsTab();if(window.syncTodayBadge)window.syncTodayBadge();}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshLocalDay();scheduleLocalMidnightRefresh();}});
window.addEventListener('focus',()=>refreshLocalDay());
window.addEventListener('pageshow',()=>{refreshLocalDay();scheduleLocalMidnightRefresh();});
scheduleLocalMidnightRefresh();

/* ---------- Wiring ---------- */
document.getElementById('dialBtn').addEventListener('click', ()=> document.getElementById('customInput').focus());
document.getElementById('customAdd').addEventListener('click', ()=>{
  const inp = document.getElementById('customInput'); addEntry(todayKey(), timeStr(new Date()), inp.value); inp.value='';
});
document.getElementById('customInput').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ addEntry(todayKey(), timeStr(new Date()), e.target.value); e.target.value=''; }
});
document.getElementById('editTodayBtn').addEventListener('click', ()=> openDayEditor(todayKey()));
document.getElementById('calGrid').addEventListener('click', (e)=>{
  const cell = e.target.closest('.cal-cell');
  if(!cell || cell.classList.contains('blank') || cell.dataset.future==='true') return;
  openDayEditor(cell.dataset.day);
});
document.getElementById('monthPrev').addEventListener('click', ()=>{ calMonth--; if(calMonth<0){ calMonth=11; calYear--; } renderCalendar(); });
document.getElementById('monthNext').addEventListener('click', ()=>{
  const currentNow=new Date(); if(calYear===currentNow.getFullYear() && calMonth===currentNow.getMonth()) return;
  calMonth++; if(calMonth>11){ calMonth=0; calYear++; } renderCalendar();
});
let resizeRAF=null;
window.addEventListener('resize', ()=>{
  if(resizeRAF) cancelAnimationFrame(resizeRAF);
  resizeRAF=requestAnimationFrame(()=>{
    resizeRAF=null;
    if(bottomMode==='stats' && topType==='weight') renderWeightTab();
    else if(bottomMode==='stats') { renderStatsTab(); renderChartAndStats(); }
  });
});

applyTypeUI();
renderAll();
recoverFromIndexedDbIfNeeded();
checkBackupReminder();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW-Registrierung fehlgeschlagen', e));
  });
}
