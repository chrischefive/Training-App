function renderStatsTab(){
  const s = computeStats();
  renderStreak();
  document.getElementById('sTotalReps').textContent = s.grandTotal;
  document.getElementById('sTotalSub').textContent = s.start>0 ? `davon ${s.start} übertragen` : '';
  document.getElementById('sTrainedDays').textContent = s.trainedDays;
  document.getElementById('sBestStreak').textContent = s.longest;

  document.getElementById('avgPerTrainedDay').textContent = Math.round(s.avgPerTrainedDay);
  document.getElementById('avgPerSet').textContent = Math.round(s.avgPerSet);
  document.getElementById('avgSetsPerDay').textContent = s.avgSetsPerDay.toFixed(1);
  document.getElementById('avgPerWeek').textContent = Math.round(s.avgPerWeek);
  document.getElementById('avgPerMonth').textContent = Math.round(s.avgPerMonth);
  document.getElementById('avgTime').textContent = s.avgTimeStr;

  const daypartTotal=s.dayparts.reduce((n,d)=>n+d.sum,0);
  renderBars('daypartBars', s.dayparts.map(d=>({label:d.label, val:daypartTotal?d.sum/daypartTotal*100:0, display:daypartTotal?Math.round(d.sum/daypartTotal*100)+'%':'0%', scaleMax:100})));
  renderBars('weekdayBars', WD_SHORT.map((w,i)=>({label:w, val:s.wdAvg[i]})));

  const wDelta = trendDeltaText(s.thisWeekTotal, s.lastWeekTotal);
  document.getElementById('trendWeekSub').textContent = `${s.thisWeekTotal} / letzte Woche ${s.lastWeekTotal}`;
  const wEl = document.getElementById('trendWeekDelta'); wEl.textContent = wDelta.txt; wEl.className = 'trend-delta '+wDelta.cls;

  const mDelta = trendDeltaText(s.thisMonthTotal, s.lastMonthTotal);
  document.getElementById('trendMonthSub').textContent = `${s.thisMonthTotal} / letzter Monat ${s.lastMonthTotal}`;
  const mEl = document.getElementById('trendMonthDelta'); mEl.textContent = mDelta.txt; mEl.className = 'trend-delta '+mDelta.cls;

  document.getElementById('kcalToday').textContent = Math.round(s.kcalToday);
  document.getElementById('kcalMonth').textContent = Math.round(s.kcalMonth);
  document.getElementById('kcalTotal').textContent = Math.round(s.kcalTotalAll);

  document.getElementById('bestSet').textContent = s.bestSet ? s.bestSet.reps : 0;
  document.getElementById('bestSetDate').textContent = s.bestSet ? fmtShort(s.bestSet.date) : '';
  document.getElementById('bestDayEver').textContent = s.bestDayVal;
  document.getElementById('bestDayEverDate').textContent = s.bestDayKey ? fmtShort(s.bestDayKey) : '';
  document.getElementById('bestStreakEver').textContent = s.longest;

  document.getElementById('sZielquote').textContent = s.zielquote+'%';
  document.getElementById('sZielquoteSub').textContent = s.trainedDays ? `${s.goalMetDays} von ${s.trainedDays} Tagen` : '';

  document.getElementById('bestWeekEver').textContent = s.bestWeekVal;
  document.getElementById('bestWeekEverDate').textContent = s.bestWeekKey ? 'KW ab '+fmtShort(s.bestWeekKey) : '';
  document.getElementById('bestMonthEver').textContent = s.bestMonthVal;
  document.getElementById('bestMonthEverDate').textContent = s.bestMonthKey ? s.bestMonthKey : '';
  document.getElementById('longestGap').textContent = s.longestGapDays;
  document.getElementById('longestGapDate').textContent = s.gapFrom ? `${fmtShort(s.gapFrom)} – ${fmtShort(s.gapTo)}` : '';

  document.getElementById('weekdayAvgStat').textContent = Math.round(s.weekdayAvgVal);
  document.getElementById('weekendAvgStat').textContent = Math.round(s.weekendAvg);

  renderBars('bucketBars', s.buckets.map(b=>({label:b.label, val:b.count})));

  renderGrowthChart(s.growth, s.start);
  renderComparison();
}

/* ---------- Vergleich Situps vs. Liegestütze (typunabhängig) ---------- */
function renderComparison(){
  ['situps','pushups'].forEach(t=>{
    const list = typeEntriesThroughToday(t);
    const total = list.reduce((s,e)=>s+e.reps,0) + (startValues[t]||0);
    const days = new Set(list.filter(e=>e.reps>0).map(e=>e.date)).size;
    const totalEl = document.getElementById(t==='situps' ? 'cmpSitupsTotal' : 'cmpPushupsTotal');
    const daysEl = document.getElementById(t==='situps' ? 'cmpSitupsDays' : 'cmpPushupsDays');
    if(totalEl) totalEl.textContent = total;
    if(daysEl) daysEl.textContent = days;
  });
}

/* ---------- Fortschrittskurve ---------- */
function renderGrowthChart(growth, start, targetCanvas=null, forcedSize=null, updateHint=true){
  const canvas=targetCanvas||document.getElementById('growthChart');
  const dpr=window.devicePixelRatio||1, cssW=(forcedSize&&forcedSize.width)||canvas.clientWidth||300, cssH=(forcedSize&&forcedSize.height)||150;
  canvas.width=cssW*dpr; canvas.height=cssH*dpr;
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cssW,cssH);
  const filtered=growth;
  if(updateHint && document.getElementById('growthHint')) document.getElementById('growthHint').textContent =
    start>0 ? `Der einmalig eingetragene Startwert (${start}) ist aus der Kurve entfernt; er wird nur noch als Hinweis unter der Grafik berücksichtigt.` :
    'Kumulierte Gesamtzahl über die Zeit.';
  const muted=cssVar('--muted')||'#A99DC9', line=cssVar('--line')||'#3E2C5E';
  const pl=40,pr=10,pt=14,pb=28,uw=Math.max(cssW-pl-pr,1),uh=Math.max(cssH-pt-pb,1);
  ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,pt);ctx.lineTo(pl,pt+uh);ctx.lineTo(pl+uw,pt+uh);ctx.stroke();
  if(!filtered.length){
    ctx.save();ctx.strokeStyle=line;ctx.globalAlpha=.28;ctx.lineWidth=1;for(let g=0;g<=4;g++){const y=pt+uh*g/4;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(pl+uw,y);ctx.stroke();}ctx.restore();
    ctx.fillStyle=muted;ctx.font='12px -apple-system,sans-serif';ctx.textAlign='center';ctx.fillText('Noch keine neuen Daten',cssW/2,cssH/2);return;
  }
  const vals=filtered.map(p=>p.cum), max=Math.max(...vals,1), min=Math.min(...vals,0), span=Math.max(max-min,1);
  ctx.fillStyle=muted;ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';
  for(let g=0;g<=4;g++){const y=pt+uh*g/4,v=max-span*g/4;ctx.save();ctx.strokeStyle=line;ctx.globalAlpha=.28;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pl,y);ctx.lineTo(pl+uw,y);ctx.stroke();ctx.restore();ctx.fillStyle=muted;ctx.fillText(String(Math.round(v)),pl-5,y+3);}
  const pts=filtered;
  const rc=rbCycle();
  let growthStroke=cssVar('--accent')||rc[0];
  if(currentTheme==='rainbow' || currentTheme==='nordlicht'){
    const grad=ctx.createLinearGradient(pl,0,pl+uw,0);
    grad.addColorStop(0,rc[0]);grad.addColorStop(.33,rc[2]);grad.addColorStop(.66,rc[3]);grad.addColorStop(1,rc[5]);
    growthStroke=grad;
  }
  const times=pts.map(p=>new Date(p.date+'T12:00:00').getTime()), tMin=Math.min(...times), tMax=Math.max(...times), tSpan=Math.max(tMax-tMin,1);
  ctx.beginPath();pts.forEach((p,i)=>{const x=pts.length===1?pl+uw/2:pl+((times[i]-tMin)/tSpan)*uw,y=pt+uh-((p.cum-min)/span)*uh;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.strokeStyle=growthStroke;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
  ctx.fillStyle=muted;ctx.textAlign='center';
  ctx.fillText(fmtShort(pts[0].date),pl,cssH-8);ctx.fillText(fmtShort(pts.at(-1).date),pl+uw,cssH-8);
  ctx.textAlign='left';ctx.fillText('Wiederholungen gesamt',pl,10);
}

function renderChartAndStats(){
  const days = [];
  for(let i=13;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); days.push({k:dateKey(d), total: totalForDate(dateKey(d))}); }
  drawChart(days);
  const totals = days.map(d=>d.total);
  document.getElementById('statBest').textContent = Math.max(...totals,0);
  document.getElementById('statAvg').textContent = Math.round(totals.reduce((a,b)=>a+b,0)/14);
  document.getElementById('statTotal').textContent = totals.reduce((a,b)=>a+b,0);
}
function trainingAxisLabel(days,i){
  const d=new Date(days[i].k+'T12:00:00'), n=days.length;
  if(n<=14) return d.toLocaleDateString('de-DE',{weekday:'short'}).slice(0,2);
  if(n<=31) return (i===0||i===n-1||i%5===0)?`${pad(d.getDate())}.${pad(d.getMonth()+1)}.`:'';
  if(n<=100) return (i===0||i===n-1||d.getDate()===1||i%14===0)?`${pad(d.getDate())}.${pad(d.getMonth()+1)}.`:'';
  if(n<=400) return (i===0||i===n-1||d.getDate()===1)?MONTHS[d.getMonth()].slice(0,3):'';
  return (i===0||i===n-1||(d.getMonth()===0&&d.getDate()===1))?String(d.getFullYear()):'';
}
function drawChart(days, targetCanvas=null, forcedSize=null){
  const canvas = targetCanvas || document.getElementById('chart');
  const dpr = window.devicePixelRatio || 1;
  const cssW = (forcedSize&&forcedSize.width) || canvas.clientWidth || 300, cssH = (forcedSize&&forcedSize.height) || 120;
  canvas.width = cssW*dpr; canvas.height = cssH*dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr); ctx.clearRect(0,0,cssW,cssH);
  const max = Math.max(...days.map(d=>d.total), 1);
  const allBest=computeStats().bestDayVal;
  ctx.font='9px -apple-system,sans-serif';
  const yLabelWidth=Math.max(...[0,1,2,3,4].map(g=>ctx.measureText(String(Math.round(max*(1-g/4)))).width),0);
  const padLeft=Math.ceil(yLabelWidth+8),padRight=4,plotW=Math.max(cssW-padLeft-padRight,1);
  const barW=plotW/days.length,padTop=6,padBottom=18,usableH=cssH-padTop-padBottom;
  const grid=cssVar('--line')||'#33353B',muted=cssVar('--muted')||'#A99DC9';
  for(let g=0;g<=4;g++){const y=padTop+usableH*g/4,v=Math.round(max*(1-g/4));ctx.save();ctx.strokeStyle=grid;ctx.globalAlpha=.25;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padLeft,y);ctx.lineTo(cssW-padRight,y);ctx.stroke();ctx.restore();ctx.fillStyle=muted;ctx.font='9px -apple-system,sans-serif';ctx.textAlign='right';ctx.fillText(String(v),padLeft-4,y+3);}
  days.forEach((d,i)=>{
    const h = d.total>0 ? Math.max((d.total/max)*usableH,3) : 1;
    const x = padLeft+i*barW + barW*0.22, w = barW*0.56;
    const y = padTop + (usableH-h);
    const isToday = i===days.length-1;
    const rc = rbCycle();
    ctx.fillStyle = isToday ? (cssVar('--rb-purple')||'#C264FF') : (d.total>0 ? rc[i % 6] : (cssVar('--line')||'#33353B'));
    ctx.beginPath();
    const r = Math.min(4,w/2);
    ctx.moveTo(x,y+h); ctx.arcTo(x,y,x+r,y,r); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cssVar('--muted') || '#A99DC9'; ctx.font='9px -apple-system, sans-serif'; ctx.textAlign='center';
    const axisLabel=trainingAxisLabel(days,i);
    if(axisLabel) ctx.fillText(axisLabel, x+w/2, cssH-4);
    const allBest=computeStats().bestDayVal;
    if(d.total>0 && d.total===allBest){ctx.font='11px -apple-system,sans-serif';ctx.fillText('🏆',x+w/2,Math.max(11,y-3));}
  });
}

function renderAll(){
  renderDial(); renderTodayList(); renderCalendar(); renderStreak();
  renderChartAndStats(); renderStatsTab(); renderWeightTab();
  if(dayEditorDate) renderDayEditor(dayEditorDate);
  if(window.syncTodayBadge) window.syncTodayBadge();
}

