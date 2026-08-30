/* Daten-Explorer, flexible Diagrammzeiträume, Rekordmarker, Damals-vs-heute und Performance-Test. UI-only; kein Backupzustand. */
(() => {
  const $=id=>document.getElementById(id), DAY=86400000;
  let range='14';
  function addDays(k,n){const d=new Date(k+'T12:00:00');d.setDate(d.getDate()+n);return dateKey(d);}
  function rangeStart(){if(range==='all'){const a=typeEntriesThroughToday();return a.length?a.reduce((m,e)=>e.date<m?e.date:m,a[0].date):todayKey();}return addDays(todayKey(),-(Number(range)-1));}
  function daysForRange(){const start=rangeStart(),out=[];for(let k=start;k<=todayKey();k=addDays(k,1))out.push({k,total:totalForDate(k)});return out;}
  window.getFlexibleTrainingDays=()=>daysForRange().map(x=>({...x}));
  function fmtNum(n){return Math.round(n||0).toLocaleString('de-DE');}
  function renderRange(){
    const days=daysForRange(); drawChart(days);
    const vals=days.map(x=>x.total),sum=vals.reduce((a,b)=>a+b,0),active=vals.filter(x=>x>0).length;
    $('statBest').textContent=Math.max(...vals,0);$('statAvg').textContent=fmtNum(sum/Math.max(days.length,1));$('statTotal').textContent=fmtNum(sum);
    $('rangeBestLabel').textContent=`Bester Tag (${range==='all'?'alles':range+'T'})`;$('rangeAvgLabel').textContent=`Ø / Tag (${range==='all'?'alles':range+'T'})`;$('rangeTotalLabel').textContent=`Gesamt (${range==='all'?'alles':range+'T'})`;
    const best=Math.max(...vals,0),bestDay=days.find(x=>x.total===best&&best>0);
    const rec=computeStats();$('recordMarkerHint').textContent=bestDay&&best===rec.bestDayVal?`🏆 Rekordmarke: ${fmtShort(bestDay.k)} · ${fmtNum(best)} Wiederholungen`:'Rekordtage werden im Diagramm mit 🏆 markiert.';
  }
  window.renderFlexibleTrainingRange=renderRange;
  document.querySelectorAll('[data-chart-range]').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.chartRange;document.querySelectorAll('[data-chart-range]').forEach(x=>x.classList.toggle('active',x===b));renderRange();}));

  function explorer(){
    const s=computeStats(), list=typeEntriesThroughToday(), byHour=Array(24).fill(0), byWd=Array(7).fill(0),wdDays=Array(7).fill(0), dates=new Set();
    list.forEach(e=>{byHour[parseInt(e.time||'12',10)||0]+=e.reps;dates.add(e.date)}); dates.forEach(k=>{const i=weekdayIdx(k);byWd[i]+=totalForDate(k);wdDays[i]++});
    const hour=byHour.indexOf(Math.max(...byHour)), wi=byWd.map((x,i)=>wdDays[i]?x/wdDays[i]:0).indexOf(Math.max(...byWd.map((x,i)=>wdDays[i]?x/wdDays[i]:0)));
    const rows=[['Stärkster Monat',s.bestMonthKey?`${s.bestMonthKey} · ${fmtNum(s.bestMonthVal)}`:'—'],['Stärkste Woche',s.bestWeekKey?`${fmtShort(s.bestWeekKey)} · ${fmtNum(s.bestWeekVal)}`:'—'],['Stärkster Wochentag',s.trainedDays?`${WD_SHORT[wi]} · Ø ${fmtNum(wdDays[wi]?byWd[wi]/wdDays[wi]:0)}`:'—'],['Häufigste Leistungsstunde',list.length?`${pad(hour)}:00–${pad((hour+1)%24)}:00`:'—'],['Ø Sätze / Trainingstag',s.avgSetsPerDay.toFixed(1).replace('.',',')],['Ø Wiederholungen / Satz',fmtNum(s.avgPerSet)],['Zielquote',`${s.zielquote}%`],['Längste Pause',`${s.longestGapDays} Tage`]];
    $('dataExplorerGrid').innerHTML=rows.map(([a,b])=>`<div class="explorer-card"><span>${a}</span><strong>${b}</strong></div>`).join('');
  }
  window.renderDataExplorer=explorer;

  function compareWindow(end,days,offset=0){let sum=0,active=0,met=0;for(let i=offset;i<offset+days;i++){const k=addDays(end,-i),v=totalForDate(k);sum+=v;if(v>0){active++;if(v>=effectiveGoal(currentType,k))met++;}}return{sum,active,met};}
  function thenNow(){
    const now=compareWindow(todayKey(),30),oldEnd=addDays(todayKey(),-365),old=compareWindow(oldEnd,30),hasOld=typeEntriesThroughToday().some(e=>e.date>=addDays(oldEnd,-29)&&e.date<=oldEnd);
    if(!hasOld){$('thenNowCard').innerHTML='<strong>Damals vs. heute</strong><span>Noch kein passender 30-Tage-Zeitraum vor einem Jahr.</span>';return;}
    const pct=old.sum?Math.round((now.sum-old.sum)/old.sum*100):null;
    $('thenNowCard').innerHTML=`<strong>Damals vs. heute · 30 Tage</strong><span>Heute: ${fmtNum(now.sum)} Wiederholungen an ${now.active} Trainingstagen</span><span>Vor einem Jahr: ${fmtNum(old.sum)} an ${old.active} Tagen</span><b>${pct===null?'damals noch kein Volumen':`${pct>=0?'+':''}${pct}% Volumen`}</b>`;
  }
  window.renderThenNow=thenNow;

  async function perf(){
    const out=$('performanceResult'),btn=$('performanceTestBtn');btn.disabled=true;out.textContent='Test läuft … echte Daten bleiben unangetastet.';
    await new Promise(r=>setTimeout(r,30));
    const sizes=[10000,50000,100000],rows=[];
    for(const n of sizes){
      const t0=performance.now(),fake=[];for(let i=0;i<n;i++)fake.push({id:'p'+i,date:'2025-01-01',time:pad(i%24)+':'+pad(i%60),reps:10+(i%31),type:i%2?'pushups':'situps'});const gen=performance.now()-t0;
      const t1=performance.now(),json=JSON.stringify({exportVersion:CURRENT_EXPORT_VERSION,entries:fake,weightEntries:[]}),ser=performance.now()-t1;
      const t2=performance.now(),parsed=JSON.parse(json),parse=performance.now()-t2;
      let sum=0;const t3=performance.now();for(const e of parsed.entries)sum+=e.reps;const calc=performance.now()-t3;
      rows.push(`${n.toLocaleString('de-DE')}: erzeugen ${gen.toFixed(0)} ms · JSON ${ser.toFixed(0)} ms · lesen ${parse.toFixed(0)} ms · rechnen ${calc.toFixed(0)} ms · ${(json.length/1048576).toFixed(1)} MB`);
      await new Promise(r=>setTimeout(r,20));
    }
    out.innerHTML='<strong>Performance-Test abgeschlossen</strong><br>'+rows.join('<br>')+'<br><small>Nur Arbeitsspeicher: nichts gespeichert, importiert oder exportiert.</small>';btn.disabled=false;
  }
  $('performanceTestBtn')?.addEventListener('click',perf);

  const oldStats=window.renderStatsTab;window.renderStatsTab=function(){oldStats();explorer();thenNow();};
  const oldChart=window.renderChartAndStats;window.renderChartAndStats=function(){oldChart();renderRange();};
  explorer();thenNow();renderRange();
})();
