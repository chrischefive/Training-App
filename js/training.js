/* ---------- Log tab ---------- */
function renderDial(){
  const total = totalForDate(todayKey());
  document.getElementById('todayTotal').textContent = total;
  const ring = document.getElementById('ringProgress');
  const themedStroke = currentTheme==='rainbow' ? 'url(#rbGrad)' : (currentTheme==='bauhaus' ? (cssVar('--accent-2')||'#0758A6') : (cssVar('--accent')||'#FF8C1A'));
  ring.style.stroke=themedStroke;
  const circumference = 2*Math.PI*107;
  ring.setAttribute('stroke-dasharray', String(circumference));
  const target=Math.max(Number(goal())||0,0);
  const pct = target>0 ? Math.max(0,Math.min(total/target,1)) : 0;
  ring.setAttribute('stroke-dashoffset', String(circumference*(1-pct)));
  document.getElementById('goalLine').innerHTML = total>=goal()
    ? `Ziel erreicht · <b>${total} / ${goal()}</b>`
    : `noch <b>${Math.max(goal()-total,0)}</b> bis zum Ziel (${goal()})`;
}
function renderTodayList(){
  const sets = typeEntries().filter(e=>e.date===todayKey()).slice().sort((a,b)=>a.time.localeCompare(b.time));
  const el = document.getElementById('todayList');
  el.innerHTML = sets.length===0
    ? '<div class="empty">Noch keine Sätze heute — leg los.</div>'
    : sets.slice().reverse().map(e=>`<div class="set-row"><span class="set-time">${e.time}</span><span class="set-reps">${e.reps}</span></div>`).join('');
}
function renderCalendar(){
  document.getElementById('monthLabel').textContent = `${MONTHS[calMonth]} ${calYear}`;
  const calendarNow=new Date(); const isCurrentMonth = (calYear===calendarNow.getFullYear() && calMonth===calendarNow.getMonth());
  document.getElementById('monthNext').classList.toggle('disabled', isCurrentMonth);
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const leading = (firstOfMonth.getDay()+6)%7;
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const tKey = todayKey();
  let cells = '';
  for(let i=0;i<leading;i++) cells += '<div class="cal-cell blank"></div>';
  let mTotal=0, mDaysTrained=0, mGoalDays=0;
  for(let day=1; day<=daysInMonth; day++){
    const k = `${calYear}-${pad(calMonth+1)}-${pad(day)}`;
    const total = totalForDate(k);
    const isFuture = k > tKey;
    const isToday = k === tKey;
    const dayGoal = effectiveGoal(currentType, k);
    if(!isFuture){ mTotal += total; if(total>0) mDaysTrained++; if(total>=dayGoal && total>0) mGoalDays++; }
    let cls = 'cal-cell';
    if(isFuture) cls += ' future';
    if(isToday) cls += ' today';
    if(total>0 && total<dayGoal) cls += ' some';
    if(total>=dayGoal && total>0) cls += ' goal';
    cells += `<div class="${cls}" data-day="${k}" data-future="${isFuture}"><span class="d">${day}</span><span class="r">${total>0?total:''}</span></div>`;
  }
  document.getElementById('calGrid').innerHTML = cells;
  document.getElementById('mGesamt').textContent = mTotal;
  document.getElementById('mTage').textContent = mDaysTrained;
  document.getElementById('mZiel').textContent = mGoalDays;
}
function computeCurrentStreak(type=currentType, referenceKey=todayKey()){
  // Tageswerte einmalig indexieren. Die Serie wird bis zum ältesten vorhandenen
  // Trainingstag geprüft – keine künstliche 10-Jahres-Grenze.
  const totals=new Map();
  entries.forEach(e=>{
    if(e.type===type && e.date<=referenceKey) totals.set(e.date,(totals.get(e.date)||0)+e.reps);
  });
  if(!totals.size) return 0;
  const oldest=[...totals.keys()].sort()[0];
  const refDate=new Date(referenceKey+'T12:00:00');
  const oldestDate=new Date(oldest+'T12:00:00');
  const maxDays=Math.max(1,Math.round((refDate-oldestDate)/86400000)+1);
  let streak=0;
  for(let i=0;i<maxDays;i++){
    const d=new Date(refDate); d.setDate(d.getDate()-i);
    const k=dateKey(d);
    const total=totals.get(k)||0;
    const need=effectiveGoal(type,k);
    const met=need>0 && total>=need;
    if(met){ streak++; continue; }
    if(i===0) continue; // heutiger Tag ist noch nicht abgeschlossen
    break;
  }
  return streak;
}
function renderStreak(){
  const streak=computeCurrentStreak(currentType);
  document.getElementById('streak').textContent = streak + (streak===1 ? ' Tag Streak' : ' Tage Streak');
  const curEl=document.getElementById('sCurStreak');
  if(curEl) curEl.textContent=streak;
  return streak;
}

/* ---------- Stats tab ---------- */
function isoWeekKey(key){
  const d = new Date(key+'T12:00:00');
  const day = (d.getDay()+6)%7;
  d.setDate(d.getDate()-day);
  return dateKey(d);
}
function monthKeyOf(key){ return key.slice(0,7); }

function computeStats(){
  const list = typeEntriesThroughToday();
  const byDate = {};
  list.forEach(e=>{ (byDate[e.date] = byDate[e.date] || []).push(e); });
  const dateKeys = Object.keys(byDate).filter(k=>byDate[k].reduce((s,e)=>s+e.reps,0)>0);
  const totalReps = list.reduce((s,e)=>s+e.reps,0);
  const totalSets = list.length;
  const trainedDays = dateKeys.length;
  const start = startValues[currentType] || 0;

  const sortedDates = dateKeys.filter(k=>{
    const total = byDate[k].reduce((s,e)=>s+e.reps,0);
    const need = effectiveGoal(currentType, k);
    return need>0 && total>=need;
  }).sort();
  let longest=0, run=0, prev=null;
  sortedDates.forEach(k=>{
    if(prev){
      const prevD = new Date(prev+'T12:00:00'), curD = new Date(k+'T12:00:00');
      const diffDays = Math.round((curD-prevD)/86400000);
      run = diffDays===1 ? run+1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = k;
  });

  let bestDayKey=null, bestDayVal=0;
  dateKeys.forEach(k=>{ const t = byDate[k].reduce((s,e)=>s+e.reps,0); if(t>bestDayVal){ bestDayVal=t; bestDayKey=k; } });
  let bestSet=null;
  list.forEach(e=>{ if(!bestSet || e.reps>bestSet.reps) bestSet=e; });

  const avgPerTrainedDay = trainedDays? totalReps/trainedDays : 0;
  const avgPerSet = totalSets? totalReps/totalSets : 0;
  const avgSetsPerDay = trainedDays? totalSets/trainedDays : 0;

  const weekMap={}; dateKeys.forEach(k=>{ const wk=isoWeekKey(k); weekMap[wk]=(weekMap[wk]||0)+byDate[k].reduce((s,e)=>s+e.reps,0); });
  const weekKeys = Object.keys(weekMap);
  const avgPerWeek = weekKeys.length? weekKeys.reduce((s,k)=>s+weekMap[k],0)/weekKeys.length : 0;

  const monthMap={}; dateKeys.forEach(k=>{ const mk=monthKeyOf(k); monthMap[mk]=(monthMap[mk]||0)+byDate[k].reduce((s,e)=>s+e.reps,0); });
  const monthKeys = Object.keys(monthMap);
  const avgPerMonth = monthKeys.length? monthKeys.reduce((s,k)=>s+monthMap[k],0)/monthKeys.length : 0;

  let avgTimeStr = '—';
  if(list.length){
    // Uhrzeiten zyklisch mitteln, damit z. B. 23:50 + 00:10 korrekt etwa 00:00 ergibt.
    const angles=list.map(e=>{ const [h,m]=String(e.time||'12:00').split(':').map(Number); return ((h*60+m)/1440)*Math.PI*2; });
    const sx=angles.reduce((s,a)=>s+Math.cos(a),0), sy=angles.reduce((s,a)=>s+Math.sin(a),0);
    let a=Math.atan2(sy,sx); if(a<0) a+=Math.PI*2;
    const avgMin=Math.round((a/(Math.PI*2))*1440)%1440;
    avgTimeStr = `${pad(Math.floor(avgMin/60))}:${pad(avgMin%60)}`;
  }

  const dayparts = [
    {label:'Morgens', from:5, to:11, sum:0},
    {label:'Mittags', from:11, to:14, sum:0},
    {label:'Nachm.', from:14, to:18, sum:0},
    {label:'Abends', from:18, to:22, sum:0},
    {label:'Nachts', from:22, to:5, sum:0},
  ];
  list.forEach(e=>{
    const h = parseInt(e.time.split(':')[0],10);
    const bucket = dayparts.find(b=> b.from<b.to ? (h>=b.from && h<b.to) : (h>=b.from || h<b.to));
    if(bucket) bucket.sum += e.reps;
  });

  const wdSum = [0,0,0,0,0,0,0], wdCount = [0,0,0,0,0,0,0];
  dateKeys.forEach(k=>{ const wi = weekdayIdx(k); wdSum[wi]+=byDate[k].reduce((s,e)=>s+e.reps,0); wdCount[wi]++; });
  const wdAvg = wdSum.map((s,i)=> wdCount[i]? s/wdCount[i] : 0);

  const thisWeekKey = isoWeekKey(todayKey());
  const lastWeekKey = dateKey(new Date(new Date(thisWeekKey+'T12:00:00').getTime()-7*86400000));
  const thisWeekTotal = weekMap[thisWeekKey]||0;
  const lastWeekTotal = weekMap[lastWeekKey]||0;

  const thisMonthKey = monthKeyOf(todayKey());
  const lm = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthKey = `${lm.getFullYear()}-${pad(lm.getMonth()+1)}`;
  const thisMonthTotal = monthMap[thisMonthKey]||0;
  const lastMonthTotal = monthMap[lastMonthKey]||0;

  const pace = KCAL_PACE[currentType] || 25;
  const kcalPerRep = (8*3.5*effectiveWeightKg()/200)/pace;
  const kcalToday = totalForDate(todayKey())*kcalPerRep;
  const kcalMonth = (monthMap[thisMonthKey]||0)*kcalPerRep;
  const kcalTotalAll = (totalReps+start)*kcalPerRep;

  // Zielquote
  let goalMetDays = 0;
  dateKeys.forEach(k=>{
    const total = byDate[k].reduce((s,e)=>s+e.reps,0);
    const need = effectiveGoal(currentType, k);
    if(need>0 && total>=need) goalMetDays++;
  });
  const zielquote = trainedDays ? Math.round((goalMetDays/trainedDays)*100) : 0;

  // Rekordwoche / Rekordmonat
  let bestWeekKey=null, bestWeekVal=0;
  weekKeys.forEach(k=>{ if(weekMap[k]>bestWeekVal){ bestWeekVal=weekMap[k]; bestWeekKey=k; } });
  let bestMonthKey=null, bestMonthVal=0;
  monthKeys.forEach(k=>{ if(monthMap[k]>bestMonthVal){ bestMonthVal=monthMap[k]; bestMonthKey=k; } });

  // Längste Pause
  const sortedAllDates = dateKeys.slice().sort();
  let longestGapDays=0, gapFrom=null, gapTo=null;
  for(let i=1;i<sortedAllDates.length;i++){
    const prevD = new Date(sortedAllDates[i-1]+'T12:00:00');
    const curD = new Date(sortedAllDates[i]+'T12:00:00');
    const gap = Math.round((curD-prevD)/86400000)-1;
    if(gap>longestGapDays){ longestGapDays=gap; gapFrom=sortedAllDates[i-1]; gapTo=sortedAllDates[i]; }
  }

  // Satzgrößen-Verteilung
  const buckets = [
    {label:'<10', min:0, max:9, count:0},
    {label:'10-19', min:10, max:19, count:0},
    {label:'20-29', min:20, max:29, count:0},
    {label:'30-39', min:30, max:39, count:0},
    {label:'40+', min:40, max:Infinity, count:0},
  ];
  list.forEach(e=>{ const b = buckets.find(b=>e.reps>=b.min && e.reps<=b.max); if(b) b.count++; });

  // Wochenende vs. Werktage
  let weekendSum=0, weekendDays=0, weekdaySum=0, weekdayDays=0;
  dateKeys.forEach(k=>{
    const wi = weekdayIdx(k); const total = byDate[k].reduce((s,e)=>s+e.reps,0);
    if(wi>=5){ weekendSum+=total; weekendDays++; } else { weekdaySum+=total; weekdayDays++; }
  });
  const weekendAvg = weekendDays? weekendSum/weekendDays : 0;
  const weekdayAvgVal = weekdayDays? weekdaySum/weekdayDays : 0;

  // Fortschrittskurve (kumuliert) – ausschließlich tatsächlich in der App erfasste Werte.
  // Der einmalige Startwert gehört nur zur Gesamtzahl, nicht in die Verlaufskurve.
  let running = 0;
  const growth = sortedAllDates.map(k=>{ running += byDate[k].reduce((s,e)=>s+e.reps,0); return {date:k, cum:running}; });

  return { totalReps, totalSets, trainedDays, longest, bestDayKey, bestDayVal, bestSet, start,
    grandTotal: totalReps+start,
    avgPerTrainedDay, avgPerSet, avgSetsPerDay, avgPerWeek, avgPerMonth, avgTimeStr,
    dayparts, wdAvg, thisWeekTotal, lastWeekTotal, thisMonthTotal, lastMonthTotal,
    kcalToday, kcalMonth, kcalTotalAll, zielquote, goalMetDays,
    bestWeekKey, bestWeekVal, bestMonthKey, bestMonthVal,
    longestGapDays, gapFrom, gapTo, buckets, weekendAvg, weekdayAvgVal, growth };
}

function trendDeltaText(cur, prev){
  if(prev===0 && cur===0) return {txt:'—', cls:'flat'};
  if(prev===0) return {txt:'neu', cls:'up'};
  const pct = Math.round(((cur-prev)/prev)*100);
  if(pct>0) return {txt:`+${pct}%`, cls:'up'};
  if(pct<0) return {txt:`${pct}%`, cls:'down'};
  return {txt:'±0%', cls:'flat'};
}
function renderBars(containerId, items){
  const max = items.some(i=>Number.isFinite(i.scaleMax)) ? Math.max(...items.map(i=>Number.isFinite(i.scaleMax)?i.scaleMax:0),1) : Math.max(...items.map(i=>i.val), 1);
  document.getElementById(containerId).innerHTML = items.map((i,idx)=>{
    const h = i.val>0 ? Math.max((i.val/max)*100,4) : 2;
    const col = i.val>0 ? rbCycle()[idx % 6] : 'var(--surface-2)';
    return `<div class="bar-col">
      <div class="bar" style="height:${h}%; background:${col}"></div>
      <div class="bar-val">${i.display!=null?i.display:Math.round(i.val)}</div>
      <div class="bar-lbl">${i.label}</div>
    </div>`;
  }).join('');
}
function fmtShort(key){ const d = new Date(key+'T12:00:00'); return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}); }

function fmtKg(v){ return v==null || !isFinite(v) ? '—' : v.toFixed(1).replace('.',',')+' kg'; }
function fmtPct(v){ return v==null || !isFinite(v) ? '—' : v.toFixed(1).replace('.',',')+' %'; }
function fmtFat(v){ return v==null || !isFinite(v) ? '—' : v.toFixed(1).replace('.',',')+' kg'; }

function parseDecimalInput(el){
  const raw = String(el?.value ?? '').trim().replace(',', '.');
  const v = Number(raw);
  return Number.isFinite(v) ? v : NaN;
}
