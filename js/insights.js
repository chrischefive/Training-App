
/* Insights / Rekorde / Meilensteine / Trends / Qualitätschecks */
(() => {
  const $=id=>document.getElementById(id);
  let trainingCompare=false, weightCompare=false;

  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const dayMs=86400000;
  function datePlus(key,days){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+days);return dateKey(d);}
  function daysBetween(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/dayMs);}
  function fmtSigned(n,digits=1){return `${n>0?'+':''}${n.toFixed(digits).replace('.',',')}`;}
  function currentTrainingEntries(){return entries.filter(e=>e.type===currentType&&e.date<=todayKey());}
  function dailyTotals(type=currentType){
    const m=new Map();
    entries.forEach(e=>{if(e.type===type&&e.date<=todayKey())m.set(e.date,(m.get(e.date)||0)+e.reps);});
    return m;
  }
  function regression(points){
    if(points.length<2)return null;
    const x0=points[0].x, xs=points.map(p=>p.x-x0), ys=points.map(p=>p.y);
    const xm=mean(xs),ym=mean(ys); let num=0,den=0;
    xs.forEach((x,i)=>{num+=(x-xm)*(ys[i]-ym);den+=(x-xm)*(x-xm);});
    if(!den)return null;
    return {slope:num/den,intercept:ym-(num/den)*xm,x0};
  }
  function weeklyTrainingSlope(){
    const totals=dailyTotals(), out=[];
    for(let w=7;w>=0;w--){
      const end=datePlus(todayKey(),-w*7), start=datePlus(end,-6);
      let total=0; for(const [k,v] of totals) if(k>=start&&k<=end) total+=v;
      out.push({x:out.length,y:total});
    }
    const r=regression(out); return r?r.slope:null;
  }
  function consistency(days){
    const totals=dailyTotals(); let met=0,eligible=0;
    // Nur abgeschlossene Tage; der laufende heutige Tag soll die Quote nicht künstlich drücken.
    for(let i=1;i<=days;i++){
      const k=datePlus(todayKey(),-i), goal=effectiveGoal(currentType,k);
      if(goal>0){eligible++; if((totals.get(k)||0)>=goal)met++;}
    }
    return eligible?{pct:Math.round(met/eligible*100),met,eligible}:null;
  }
  function trainingYearAgo(){
    const nowEnd=todayKey(),nowStart=datePlus(nowEnd,-29);
    const oldEnd=(()=>{const d=new Date(nowEnd+'T12:00:00');d.setFullYear(d.getFullYear()-1);return dateKey(d)})(), oldStart=datePlus(oldEnd,-29);
    const totals=dailyTotals();
    let now=0,old=0,oldDays=0;
    for(const [k,v] of totals){if(k>=nowStart&&k<=nowEnd)now+=v;if(k>=oldStart&&k<=oldEnd){old+=v;oldDays++;}}
    if(!oldDays)return 'Noch keine Daten aus dem Vergleichszeitraum vor einem Jahr.';
    const diff=now-old,pct=old?Math.round(diff/old*100):null;
    return `Letzte 30 Tage: ${now} · gleicher Zeitraum vor einem Jahr: ${old}${pct===null?'':` · ${pct>=0?'+':''}${pct}%`}.`;
  }
  function niceNext(value, series){
    for(const n of series) if(n>value) return n;
    const last=series[series.length-1]||1;
    const magnitude=10**Math.floor(Math.log10(Math.max(last,value,1)));
    const steps=[1,1.5,2,2.5,5,7.5,10].map(x=>x*magnitude);
    for(const n of steps) if(n>value) return n;
    return Math.ceil(value/(10*magnitude))*10*magnitude;
  }
  function achievedDateByCumulative(type,target){
    let sum=0; const a=entries.filter(e=>e.type===type&&e.date<=todayKey()).slice().sort((x,y)=>(x.date+' '+x.time).localeCompare(y.date+' '+y.time));
    for(const e of a){sum+=e.reps;if(sum>=target)return e.date;} return '';
  }
  function achievedDateByTrainingDays(type,target){
    const days=[...new Set(entries.filter(e=>e.type===type&&e.date<=todayKey()).map(e=>e.date))].sort();
    return days.length>=target?days[target-1]:'';
  }
  function streakAchievementDate(type,target){
    const totals=dailyTotals(type), keys=[...totals.keys()].sort(); let run=0,prev='';
    for(const k of keys){
      const met=totals.get(k)>=effectiveGoal(type,k);
      if(met) run=(prev&&daysBetween(prev,k)===1)?run+1:1;
      else run=0;
      if(run>=target)return k;
      prev=k;
    } return '';
  }
  function percent(v,t){return t>0?Math.max(0,Math.min(100,Math.round(v/t*100))):0;}
  function challengeCard(x){
    return `<div class="challenge-card"><div class="challenge-top"><span class="challenge-icon">${x.icon}</span><span class="challenge-family">${x.family}</span></div><div class="challenge-name">${x.name}</div><div class="challenge-progress"><i style="width:${percent(x.value,x.target)}%"></i></div><div class="challenge-sub">${x.sub}</div></div>`;
  }
  function ancestorCard(x){
    return `<div class="ancestor-card"><div class="ancestor-seal">${x.icon}</div><div class="ancestor-name">${x.name}</div><div class="ancestor-date">${x.date?`Erreicht ${fmtShort(x.date)}`:'Aus historischen Daten rekonstruiert'}</div></div>`;
  }
  function cumulativeThresholds(max){
    const base=[100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000];
    let a=base.slice();while(a[a.length-1]<max){a.push(a[a.length-1]*2);}return a;
  }
  function dayThresholds(max){const a=[3,7,14,30,50,100,150,250,365,500,750,1000,1500,2000,3000,5000];while(a[a.length-1]<max)a.push(a[a.length-1]+2500);return a;}
  function trainingAchievementModel(){
    const st=computeStats(),total=st.grandTotal,days=st.trainedDays,long=st.longest,type=currentType;
    const totalSeries=cumulativeThresholds(total),daySeries=dayThresholds(days),streakSeries=dayThresholds(long);
    const nextTotal=niceNext(total,totalSeries),nextDays=niceNext(days,daySeries),nextStreak=niceNext(long,streakSeries);
    const challenges=[
      {family:'Menge',icon:'⚡',name:`${nextTotal.toLocaleString('de-DE')} Wiederholungen`,value:total,target:nextTotal,sub:`${total.toLocaleString('de-DE')} / ${nextTotal.toLocaleString('de-DE')}`},
      {family:'Beständigkeit',icon:'🗓️',name:`${nextDays} Trainingstage`,value:days,target:nextDays,sub:`${days} / ${nextDays} Tage`},
      {family:'Streak',icon:'🔥',name:`${nextStreak} Tage im Ziel`,value:long,target:nextStreak,sub:`Längste Serie ${long} / ${nextStreak}`}
    ];
    const ancestors=[];
    totalSeries.filter(n=>n<=total).forEach(n=>ancestors.push({icon:n>=10000?'🏆':n>=1000?'⚡':'🌱',name:`${n.toLocaleString('de-DE')} Wiederholungen`,date:achievedDateByCumulative(type,n),rank:n}));
    daySeries.filter(n=>n<=days).forEach(n=>ancestors.push({icon:n>=100?'💯':'🗓️',name:`${n} Trainingstage`,date:achievedDateByTrainingDays(type,n),rank:n}));
    streakSeries.filter(n=>n<=long).forEach(n=>ancestors.push({icon:n>=30?'👑':'🔥',name:`${n}er Ziel-Streak`,date:streakAchievementDate(type,n),rank:n}));
    // Relative Auszeichnungen: vollständig aus historischen Daten ableitbar.
    const totals=dailyTotals(type), sorted=[...totals.keys()].sort();
    for(const pct of [80,90,95]){
      let found='';
      for(let i=29;i<sorted.length&&!found;i++){
        const end=sorted[i],start=datePlus(end,-29);let met=0;
        for(let d=0;d<30;d++){const k=datePlus(start,d);if((totals.get(k)||0)>=effectiveGoal(type,k))met++;}
        if(met/30*100>=pct)found=end;
      }
      if(found)ancestors.push({icon:'🎯',name:`30 Tage · ${pct}% Zielquote`,date:found,rank:1000000+pct});
    }
    ancestors.sort((x,y)=>(y.date||'').localeCompare(x.date||'')||y.rank-x.rank);
    return {challenges,ancestors};
  }
  function renderTrainingMilestones(){
    const c=$('trainingChallenges'),a=$('trainingAncestors'),count=$('trainingAncestorCount');if(!c||!a)return;
    const m=trainingAchievementModel();c.innerHTML=m.challenges.map(challengeCard).join('');
    a.innerHTML=m.ancestors.length?m.ancestors.map(ancestorCard).join(''):'<div class="ancestor-empty">Die Galerie wächst mit deinen Daten.</div>';
    if(count)count.textContent=`(${m.ancestors.length})`;
  }

  function renderTrainingInsights(){
    const c=consistency(30);
    if($('consistency30'))$('consistency30').textContent=c?`${c.pct}%`:'—';
    if($('consistency30Sub'))$('consistency30Sub').textContent=c?`${c.met} von ${c.eligible} abgeschlossenen Tagen im Ziel`:'keine Daten';
    const slope=weeklyTrainingSlope();
    if($('trainingSlope'))$('trainingSlope').textContent=slope==null?'—':`${fmtSigned(slope,0)} / Wo.`;
    if($('trainingSlopeSub'))$('trainingSlopeSub').textContent=slope==null?'zu wenig Daten':slope>2?'steigend':slope<-2?'fallend':'weitgehend stabil';
    if($('trainingYearAgo'))$('trainingYearAgo').textContent=trainingYearAgo();
    renderTrainingMilestones();
    if($('trainingCompareHint')){
      const totals=dailyTotals();let now=0,prev=0;
      for(let i=0;i<14;i++)now+=totals.get(datePlus(todayKey(),-i))||0;
      for(let i=14;i<28;i++)prev+=totals.get(datePlus(todayKey(),-i))||0;
      $('trainingCompareHint').textContent=trainingCompare?`Aktuell ${now} · vorherige 14 Tage ${prev} · gestrichelter Umriss = vorheriger Zeitraum.`:'Optional: aktueller Zeitraum gegen die vorherigen 14 Tage.';
    }
  }

  function validWeights(){return weightEntries.filter(e=>e.date<=todayKey()&&Number.isFinite(e.weightKg)).slice().sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));}
  function weightTrend(){
    const a=validWeights(); if(a.length<3)return null;
    const cutoff=datePlus(todayKey(),-56), pts=a.filter(e=>e.date>=cutoff);
    if(pts.length<3 || daysBetween(pts[0].date,pts[pts.length-1].date)<14)return null;
    const x0=new Date(pts[0].date+'T12:00:00').getTime();
    const r=regression(pts.map(e=>({x:(new Date(e.date+'T12:00:00').getTime()-x0)/dayMs,y:e.weightKg})));
    return r?{perWeek:r.slope*7,perDay:r.slope,pts}:null;
  }
  function weightForecast(){
    const t=weightTrend(),latest=latestWeightEntry();
    if(!weightGoalKg)return {main:'—',sub:'Kein Zielgewicht gesetzt'};
    if(!latest)return {main:'—',sub:'Noch keine Gewichtsmessung'};
    const reached=weightGoalPlan ? goalReachedAtWeight(latest.weightKg) : Math.abs(latest.weightKg-weightGoalKg)<0.05;
    if(reached)return {main:'erreicht',sub:`Aktuell ${fmtKg(latest.weightKg)}`};
    if(!t||Math.abs(t.perDay)<0.005)return {main:'—',sub:'Trend noch nicht stabil genug'};
    const delta=weightGoalKg-latest.weightKg, days=delta/t.perDay;
    if(days<=0 || days>3650)return {main:'—',sub:'Aktueller Trend bewegt sich nicht zum Ziel'};
    const forecast=datePlus(todayKey(),Math.round(days));
    let sub=`bei aktuellem Trend ca. ${fmtShort(forecast)}`;
    if(weightGoalDate){
      const dd=daysBetween(weightGoalDate,forecast);
      if(Math.abs(dd)<=3)sub+=' · ungefähr im Wunschplan';
      else sub+=dd<0?` · ca. ${Math.abs(dd)} Tage früher`:` · ca. ${dd} Tage später`;
    }
    return {main:fmtShort(forecast),sub};
  }
  function weightYearAgo(){
    const a=validWeights(); if(!a.length)return 'Noch keine Gewichtsdaten.';
    const target=(()=>{const d=new Date(todayKey()+'T12:00:00');d.setFullYear(d.getFullYear()-1);return dateKey(d)})();
    const candidates=a.map(e=>({e,dist:Math.abs(daysBetween(target,e.date))})).filter(x=>x.dist<=45).sort((x,y)=>x.dist-y.dist);
    if(!candidates.length)return 'Noch keine Messung in der Nähe des Datums vor einem Jahr.';
    const old=candidates[0].e,now=latestWeightEntry(), dw=now.weightKg-old.weightKg;
    let text=`${fmtShort(old.date)}: ${fmtKg(old.weightKg)} → heute ${fmtKg(now.weightKg)} (${fmtSigned(dw)} kg)`;
    if(Number.isFinite(old.bodyFatPct)&&Number.isFinite(now.bodyFatPct))text+=` · KFA ${fmtPct(old.bodyFatPct)} → ${fmtPct(now.bodyFatPct)}`;
    return text;
  }
  function renderWeightRecords(){
    const a=validWeights(); if(!a.length)return;
    const low=a.reduce((x,y)=>y.weightKg<x.weightKg?y:x), high=a.reduce((x,y)=>y.weightKg>x.weightKg?y:x);
    const fats=a.filter(e=>Number.isFinite(e.bodyFatPct)); const lowFat=fats.length?fats.reduce((x,y)=>y.bodyFatPct<x.bodyFatPct?y:x):null;
    $('recordLowWeight').textContent=fmtKg(low.weightKg);$('recordLowWeightDate').textContent=fmtShort(low.date);
    $('recordHighWeight').textContent=fmtKg(high.weightKg);$('recordHighWeightDate').textContent=fmtShort(high.date);
    $('recordLowFat').textContent=lowFat?fmtPct(lowFat.bodyFatPct):'—';$('recordLowFatDate').textContent=lowFat?fmtShort(lowFat.date):'';
  }
  function weightAchievementModel(){
    const a=validWeights(),n=a.length,first=a[0],last=a[a.length-1];
    const measureSeries=dayThresholds(n),nextN=niceNext(n,measureSeries);
    const challenges=[{family:'Messroutine',icon:'⚖️',name:`${nextN} Gewichtsmessungen`,value:n,target:nextN,sub:`${n} / ${nextN} Messungen`}];
    const ancestors=[];
    measureSeries.filter(x=>x<=n).forEach(x=>ancestors.push({icon:x>=100?'💎':'⚖️',name:`${x} Gewichtsmessungen`,date:a[x-1]?.date||'',rank:x}));
    if(first&&last&&weightGoalKg){
      // Für den Zielweg die gespeicherte Planbasis verwenden, falls vorhanden.
      const startKg=(weightGoalPlan&&Number.isFinite(weightGoalPlan.startKg))?weightGoalPlan.startKg:first.weightKg;
      const startDate=(weightGoalPlan&&isValidDateKey(weightGoalPlan.startDate))?weightGoalPlan.startDate:first.date;
      const totalPath=Math.abs(weightGoalKg-startKg);
      const directionalProgress=e=>{
        if(!totalPath)return Math.abs(e.weightKg-weightGoalKg)<.05?100:0;
        const moved=(weightGoalKg<startKg)?(startKg-e.weightKg):(e.weightKg-startKg);
        return Math.max(0,Math.min(100,moved/totalPath*100));
      };
      const progress=directionalProgress(last),nextPct=[25,50,75,100].find(x=>x>progress);
      if(nextPct)challenges.push({family:'Zielweg',icon:'🎯',name:`${nextPct}% zum Wunschgewicht`,value:progress,target:nextPct,sub:`${Math.round(progress)}% / ${nextPct}% des Weges`});
      for(const pct of [25,50,75,100]){
        const hit=a.find(e=>e.date>=startDate&&directionalProgress(e)>=pct);
        if(hit)ancestors.push({icon:pct===100?'🏁':'🎯',name:`${pct}% des Zielwegs`,date:hit.date,rank:10000+pct});
      }
    }
    const fat=a.filter(e=>Number.isFinite(e.bodyFatPct));
    if(fat.length>=2){
      const firstFat=fat[0],best=fat.reduce((x,y)=>y.bodyFatPct<x.bodyFatPct?y:x);
      const improvement=Math.max(0,firstFat.bodyFatPct-best.bodyFatPct),next=Math.max(1,Math.ceil(improvement+0.001));
      challenges.push({family:'Körperfett',icon:'◇',name:`${next} %-Punkte unter Start-KFA`,value:improvement,target:next,sub:`${improvement.toFixed(1).replace('.',',')} / ${next},0 %-Punkte`});
      for(let x=1;x<=Math.floor(improvement);x++){
        const hit=fat.find(e=>e.bodyFatPct<=firstFat.bodyFatPct-x);
        if(hit)ancestors.push({icon:'◇',name:`KFA −${x} %-Punkt${x===1?'':'e'} vom Start`,date:hit.date,rank:20000+x});
      }
    }
    // Relative Regelmäßigkeit: 10 Messungen mit maximal 14 Tagen Abstand.
    if(a.length>=10){
      for(let i=9;i<a.length;i++){
        let ok=true;for(let j=i-8;j<=i;j++)if(daysBetween(a[j-1].date,a[j].date)>14)ok=false;
        if(ok){ancestors.push({icon:'🧭',name:'10 regelmäßige Messungen',date:a[i].date,rank:30000});break;}
      }
    }
    while(challenges.length<3){
      const target=challenges.length===1?Math.max(4,n+4):Math.max(12,n+12);
      challenges.push({family:'Kontinuität',icon:'📈',name:`${target} Messungen insgesamt`,value:n,target,sub:`${n} / ${target}`});
    }
    ancestors.sort((x,y)=>(y.date||'').localeCompare(x.date||'')||y.rank-x.rank);
    return {challenges:challenges.slice(0,3),ancestors};
  }
  function renderWeightMilestones(){
    const c=$('weightChallenges'),a=$('weightAncestors'),count=$('weightAncestorCount');if(!c||!a)return;
    const m=weightAchievementModel();c.innerHTML=m.challenges.map(challengeCard).join('');
    a.innerHTML=m.ancestors.length?m.ancestors.map(ancestorCard).join(''):'<div class="ancestor-empty">Die Galerie wächst mit deinen Messungen.</div>';
    if(count)count.textContent=`(${m.ancestors.length})`;
  }

  function renderWeightInsights(){
    const t=weightTrend(); if($('weightSlope'))$('weightSlope').textContent=t?`${fmtSigned(t.perWeek)} kg/Wo.`:'—';
    const f=weightForecast(); if($('weightForecast'))$('weightForecast').textContent=f.main;if($('weightForecastSub'))$('weightForecastSub').textContent=f.sub;
    if($('weightYearAgo'))$('weightYearAgo').textContent=weightYearAgo();
    renderWeightRecords();renderWeightMilestones();
    if($('weightCompareHint'))$('weightCompareHint').textContent=weightCompare?'Gestrichelt = direkt vorheriger 6-Wochen-/6-Monats-Zeitraum.':'Optional: 6 Wochen/Monate gegen den direkt vorherigen Zeitraum.';
  }

  function qualityIssues(){
    const issues=[];
    const futureT=entries.filter(e=>e.date>todayKey()).length,futureW=weightEntries.filter(e=>e.date>todayKey()).length;
    if(futureT)issues.push(`${futureT} Trainingseinträge liegen in der Zukunft`);
    if(futureW)issues.push(`${futureW} Gewichtsmessungen liegen in der Zukunft`);
    const a=validWeights();
    for(let i=1;i<a.length;i++){
      const days=Math.max(1,daysBetween(a[i-1].date,a[i].date));
      if(days<=7&&Math.abs(a[i].weightKg-a[i-1].weightKg)>=5)issues.push(`großer Gewichtssprung um ${fmtShort(a[i].date)}`);
      if(days<=7&&Number.isFinite(a[i].bodyFatPct)&&Number.isFinite(a[i-1].bodyFatPct)&&Math.abs(a[i].bodyFatPct-a[i-1].bodyFatPct)>=8)issues.push(`großer KFA-Sprung um ${fmtShort(a[i].date)}`);
    }
    const missingFat=a.filter(e=>!Number.isFinite(e.bodyFatPct)).length;
    return {issues:[...new Set(issues)].slice(0,6),missingFat};
  }
  function renderHealth(){
    const q=qualityIssues(),qe=$('dataQualityCheck');
    if(qe){
      if(!q.issues.length)qe.innerHTML=`<strong>✓ Keine auffälligen Datenfehler gefunden.</strong>${q.missingFat?`<br>${q.missingFat} ältere Gewichtsmessung(en) ohne KFA – zulässig.`:''}`;
      else qe.innerHTML=`<strong>⚠ ${q.issues.length} Hinweis${q.issues.length===1?'':'e'}</strong><br>${q.issues.join('<br>')}`;
    }
    const be=$('backupHealthCheck'); if(be){
      const iso=loadLastExport(),age=iso?daysSince(iso):Infinity;
      let payloadOk=false;try{const p=JSON.parse(JSON.stringify(buildExportPayload()));payloadOk=Array.isArray(p.entries)&&Array.isArray(p.weightEntries)&&p.entries.length===entries.length&&p.weightEntries.length===weightEntries.length;}catch(e){}
      const rawBase=safeStorageGet('qolBackupBaseCount'), base=rawBase===null?NaN:Number(rawBase), current=entries.length+weightEntries.length, newCount=Number.isFinite(base)?Math.max(0,current-base):null;
      const freshness=!iso?'noch kein Datei-Backup':age<1?'heute gesichert':`vor ${Math.floor(age)} Tag${Math.floor(age)===1?'':'en'} gesichert`;
      be.innerHTML=`<strong>${payloadOk?'✓ Backup vollständig erzeugbar':'⚠ Backup-Prüfung fehlgeschlagen'}</strong><br>${freshness} · ${entries.length} Training · ${weightEntries.length} Gewicht${newCount!=null?`<br>${newCount} neue Datensätze seit Datei-Backup`:''}`;
    }
  }

  // 14-Tage-Chart: gleicher Maßstab für aktuellen + vorherigen Zeitraum.
  const baseDrawChart=drawChart;
  drawChart=function(days){
    if(!trainingCompare)return baseDrawChart(days);
    const canvas=$('chart'),dpr=window.devicePixelRatio||1,cssW=canvas.clientWidth||300,cssH=120;
    canvas.width=cssW*dpr;canvas.height=cssH*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,cssW,cssH);
    const prev=days.map((d,i)=>({k:datePlus(d.k,-14),total:totalForDate(datePlus(d.k,-14))}));
    const max=Math.max(...days.map(d=>d.total),...prev.map(d=>d.total),1),barW=cssW/days.length,padTop=6,padBottom=18,usableH=cssH-padTop-padBottom;
    days.forEach((d,i)=>{
      const x=i*barW+barW*.18,w=barW*.64,h=d.total>0?Math.max(d.total/max*usableH,3):1,y=padTop+usableH-h;
      ctx.fillStyle=d.total>0?rbCycle()[i%6]:(cssVar('--line')||'#555');ctx.globalAlpha=.9;ctx.fillRect(x,y,w,h);
      const ph=prev[i].total>0?Math.max(prev[i].total/max*usableH,3):1,py=padTop+usableH-ph;
      ctx.globalAlpha=1;ctx.strokeStyle=cssVar('--muted')||'#999';ctx.setLineDash([3,2]);ctx.lineWidth=1.5;ctx.strokeRect(x+1,py,w-2,ph);ctx.setLineDash([]);
      ctx.fillStyle=cssVar('--muted')||'#999';ctx.font='9px -apple-system,sans-serif';ctx.textAlign='center';const axisLabel=trainingAxisLabel(days,i);if(axisLabel)ctx.fillText(axisLabel,x+w/2,cssH-4);
    });
    ctx.globalAlpha=1;
  };

  // Gewicht 6W/6M: bestehende Chartfunktion bleibt unangetastet, Vergleich wird korrekt neu gezeichnet.
  const baseDrawAvg=drawWeightAverageChart;
  function previousBuckets(id,buckets){
    if(id==='weightWeekAvgChart'){
      return buckets.map(b=>{const mid=new Date(b.date+'T12:00:00');mid.setDate(mid.getDate()-42);const a=startOfWeek(mid),z=new Date(a);z.setDate(z.getDate()+7);const vals=weightEntries.filter(e=>{const d=new Date(e.date+'T12:00:00');return e.date<=todayKey()&&d>=a&&d<z;}).map(e=>e.weightKg).filter(Number.isFinite);return {value:mean(vals)};});
    }
    return buckets.map(b=>{const d=new Date(b.date+'T12:00:00');d.setMonth(d.getMonth()-6);const key=monthKeyFromDate(d),vals=weightEntries.filter(e=>e.date<=todayKey()&&e.date.slice(0,7)===key).map(e=>e.weightKg).filter(Number.isFinite);return {value:mean(vals)};});
  }
  drawWeightAverageChart=function(id,buckets,unit){
    if(!weightCompare)return baseDrawAvg(id,buckets,unit);
    const canvas=$(id);if(!canvas)return;const prev=previousBuckets(id,buckets);
    const planVals=buckets.map(b=>b.date?plannedWeightForDate(b.date):null);
    const all=[...buckets.map(b=>b.value),...prev.map(b=>b.value),...planVals].filter(Number.isFinite);
    if(!all.length)return baseDrawAvg(id,buckets,unit);
    const dpr=window.devicePixelRatio||1,cssW=canvas.clientWidth||300,cssH=window.innerWidth<=430?154:(window.innerWidth<=520?168:180);
    canvas.style.height=cssH+'px';canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);
    let min=Math.min(...all),max=Math.max(...all);let span=Math.max(max-min,1);min-=span*.15;max+=span*.15;span=max-min;
    ctx.font='9px -apple-system,sans-serif';const pl=chartLeftPadding(ctx,[`${max.toFixed(1)} kg`,`${min.toFixed(1)} kg`],46),pr=10,pt=24,pb=34,uw=cssW-pl-pr,uh=cssH-pt-pb;
    const line=cssVar('--line')||'#555',muted=cssVar('--muted')||'#999',accent=cssVar('--accent')||'#f80';
    ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(pl,pt);ctx.lineTo(pl,pt+uh);ctx.lineTo(pl+uw,pt+uh);ctx.stroke();
    ctx.fillStyle=muted;ctx.textAlign='right';for(let i=0;i<=2;i++){const v=max-span*i/2,y=pt+uh*i/2;ctx.fillText(v.toFixed(1).replace('.',',')+' kg',pl-5,y+3);}
    const step=buckets.length>1?uw/(buckets.length-1):0,x=i=>pl+i*step,y=v=>pt+(max-v)/span*uh;
    function lineSeries(vals,color,dash){
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.setLineDash(dash||[]);ctx.beginPath();let started=false;
      vals.forEach((v,i)=>{if(!Number.isFinite(v)){started=false;return;}const xx=x(i),yy=y(v);if(!started){ctx.moveTo(xx,yy);started=true}else ctx.lineTo(xx,yy);});ctx.stroke();ctx.restore();
    }
    lineSeries(prev.map(b=>b.value),muted,[5,4]);lineSeries(buckets.map(b=>b.value),accent,[]);
    if(planVals.filter(Number.isFinite).length>=2) lineSeries(planVals,cssVar('--rb-red')||'#D92A3C',[2,4]);
    buckets.forEach((b,i)=>{ctx.fillStyle=muted;ctx.textAlign='center';ctx.fillText(b.label,x(i),cssH-8);if(Number.isFinite(b.value)){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x(i),y(b.value),3,0,Math.PI*2);ctx.fill();}});
    ctx.font='bold 9px -apple-system,sans-serif';ctx.textAlign='left';ctx.fillStyle=accent;ctx.fillText('aktuell',pl,12);ctx.fillStyle=muted;ctx.fillText('gestrichelt: vorher',pl+48,12);
    if(planVals.filter(Number.isFinite).length>=2){ctx.fillStyle=cssVar('--rb-red')||'#D92A3C';ctx.textAlign='right';ctx.fillText('Soll',pl+uw,12);}
  };

  const baseRenderStats=renderStatsTab;
  renderStatsTab=function(){baseRenderStats();renderTrainingInsights();};
  const baseRenderWeight=renderWeightTab;
  renderWeightTab=function(){baseRenderWeight();renderWeightInsights();};

  $('trainingCompareToggle')?.addEventListener('click',()=>{trainingCompare=!trainingCompare;$('trainingCompareToggle').textContent=trainingCompare?'Vergleich an':'Vergleich aus';renderChartAndStats();renderTrainingInsights();});
  $('weightCompareToggle')?.addEventListener('click',()=>{weightCompare=!weightCompare;$('weightCompareToggle').textContent=weightCompare?'Vergleich an':'Vergleich aus';renderWeightAverageCharts();renderWeightInsights();});
  $('settingsBtn')?.addEventListener('click',()=>setTimeout(renderHealth,0));

  renderTrainingInsights();renderWeightInsights();renderHealth();
})();
