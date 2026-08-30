
/* QoL-Erweiterungen: bewusst additiv, ohne Änderung des Datenformats. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let undoTimer = null, undoAction = null;

  function ensureQolUi(){
    if(!$('qolToast')){
      const t=document.createElement('div'); t.id='qolToast'; t.className='qol-toast'; t.setAttribute('aria-live','polite');
      document.body.appendChild(t);
    }
    if(!$('liveProgress') && $('goalLine')){
      const el=document.createElement('div'); el.id='liveProgress'; el.className='live-progress';
      $('goalLine').insertAdjacentElement('afterend',el);
    }
    if(!$('repeatLastBtn') && $('quickChips')){
      const row=document.createElement('div'); row.id='trainingQuickActions'; row.className='training-quick-actions';
      const repeat=document.createElement('button'); repeat.type='button'; repeat.id='repeatLastBtn'; repeat.className='repeat-last'; repeat.textContent='Letzten Satz wiederholen';
      const edit=document.createElement('button'); edit.type='button'; edit.id='qolEditTodayBtn'; edit.className='repeat-last'; edit.textContent='Heute bearbeiten';
      row.appendChild(repeat); row.appendChild(edit);
      $('quickChips').insertAdjacentElement('afterend',row);
    }
    if(!$('weightNowBtn') && $('weightTimeInput')){
      const b=document.createElement('button'); b.type='button'; b.id='weightNowBtn'; b.className='weight-now'; b.textContent='Jetzt';
      $('weightTimeInput').closest('.weight-input-row').insertAdjacentElement('afterend',b);
    }
    if(!$('weightPlanCompact') && $('viewWeightStats')){
      const el=document.createElement('div'); el.id='weightPlanCompact'; el.className='weight-plan-compact';
      const first=$('viewWeightStats').querySelector('.section-title');
      if(first) first.insertAdjacentElement('afterend',el);
    }
    if(!$('chartZoomDetail') && $('chartZoomTitle')){
      const d=document.createElement('div'); d.id='chartZoomDetail'; d.className='chart-zoom-detail';
      $('chartZoomTitle').insertAdjacentElement('afterend',d);
    }
  }

  function toast(message, actionLabel, action){
    const t=$('qolToast'); if(!t) return;
    clearTimeout(undoTimer); undoAction=action||null;
    t.innerHTML=`<span>${esc(message)}</span>${action?`<button type="button" id="qolUndo">${esc(actionLabel||'Rückgängig')}</button>`:''}`;
    t.classList.add('show');
    if(action){
      $('qolUndo').onclick=()=>{ const fn=undoAction; undoAction=null; t.classList.remove('show'); if(fn) fn(); };
    }
    undoTimer=setTimeout(()=>{t.classList.remove('show');undoAction=null;},8000);
  }

  function currentTypeEntriesToday(){
    const d=todayKey();
    return entries.filter(e=>e.type===currentType && e.date===d);
  }
  function lastSet(){
    const arr=entries.filter(e=>e.type===currentType && e.date<=todayKey()).slice().sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
    return arr[arr.length-1]||null;
  }
  function updateTrainingQol(){
    if(!$('liveProgress')) return;
    const total=totalForDate(todayKey()), g=Math.max(1,goal()), remaining=Math.max(0,g-total), pct=Math.round(total/g*100);
    $('liveProgress').textContent= total>=g ? `${total} / ${g} · ${pct} % · +${total-g} über Ziel` : `${total} / ${g} · noch ${remaining}`;
    const last=lastSet(), btn=$('repeatLastBtn');
    if(btn){ btn.disabled=!last; btn.textContent=last?`Letzten Satz wiederholen · ${last.reps}`:'Letzten Satz wiederholen'; }
    const ring=$('ringProgress');
    if(ring) ring.classList.toggle('over-goal', total>g);
  }

  function prefillWeight(){
    const latest=typeof latestWeightEntry==='function'?latestWeightEntry():null;
    const w=$('weightNewInput'), f=$('fatNewInput');
    if(latest){
      if(w && !w.value) w.value=Number(latest.weightKg).toFixed(1);
      if(f && !f.value && Number.isFinite(Number(latest.bodyFatPct))) f.value=Number(latest.bodyFatPct).toFixed(1);
    }
  }

  function setWeightNow(){
    const n=new Date();
    if($('weightDateInput')) $('weightDateInput').value=dateKey(n);
    if($('weightTimeInput')) $('weightTimeInput').value=timeStr(n);
  }

  function updateWeightPlanCompact(){
    const el=$('weightPlanCompact'); if(!el) return;
    if(!weightGoalKg){ el.style.display='none'; return; }
    el.style.display='block';
    const latest=latestWeightEntry();
    if(!latest){ el.textContent=`Ziel ${fmtKg(weightGoalKg)} · noch keine Messung`; return; }
    const delta=latest.weightKg-(weightGoalPlan?weightGoalPlan.startKg:latest.weightKg);
    const remain=weightGoalKg-latest.weightKg;
    const reached=weightGoalPlan ? goalReachedAtWeight(latest.weightKg) : Math.abs(remain)<0.05;
    let parts=[`${delta>=0?'+':''}${delta.toFixed(1).replace('.',',')} kg seit Planstart`, reached?'Ziel erreicht':`noch ${Math.abs(remain).toFixed(1).replace('.',',')} kg`];
    if(weightGoalDate && weightGoalPlan){
      const planned=plannedWeightForDate(todayKey());
      if(planned!=null){
        const dir=goalDirection(), diff=latest.weightKg-planned, ad=Math.abs(diff);
        if(ad<0.05) parts.push('genau im Plan');
        else{
          const ahead=dir<0 ? diff<0 : (dir>0 ? diff>0 : false);
          parts.push(`${ad.toFixed(1).replace('.',',')} kg ${ahead?'vor':'hinter'} Plan`);
        }
      }
      const days=Math.ceil((new Date(weightGoalDate+'T12:00:00')-new Date(todayKey()+'T12:00:00'))/86400000);
      parts.push(days>=0?`${days} Tage bis Termin`:'Termin erreicht');
    }
    el.textContent=parts.join(' · ');
  }

  function nearestByX(items, target, getX){
    if(!items.length) return null;
    return items.reduce((best,x)=>Math.abs(getX(x)-target)<Math.abs(getX(best)-target)?x:best,items[0]);
  }
  function exactChartDetail(canvas, ev){
    const id=canvas.id, rect=canvas.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(ev.clientX-rect.left)/Math.max(1,rect.width)));

    if(['weightChart','bodyFatChart','fatMassChart'].includes(id)){
      const getter=id==='weightChart'?(e=>e.weightKg):(id==='bodyFatChart'?(e=>e.bodyFatPct):(e=>fatMassOf(e)));
      const unit=id==='bodyFatChart'?'%':'kg';
      const data=weightEntriesThroughToday().filter(e=>Number.isFinite(getter(e))).slice().sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
      if(!data.length) return 'Keine Messwerte';
      const times=data.map(e=>new Date(e.date+'T'+(e.time||'12:00')+':00').getTime());
      let tMin=Math.min(...times),tMax=Math.max(...times);
      if(id==='weightChart' && weightGoalPlan && weightGoalDate){
        tMin=Math.min(tMin,new Date(weightGoalPlan.startDate+'T12:00:00').getTime());
        tMax=Math.max(tMax,new Date(weightGoalDate+'T12:00:00').getTime());
      }
      const target=tMin+ratio*Math.max(1,tMax-tMin);
      const e=nearestByX(data,target,x=>new Date(x.date+'T'+(x.time||'12:00')+':00').getTime());
      const val=getter(e);
      return `${fmtShort(e.date)}${e.time?' · '+e.time:''} · ${Number(val).toFixed(1).replace('.',',')} ${unit}`;
    }

    if(id==='weightWeekAvgChart' || id==='weightMonthAvgChart'){
      const nowD=new Date(), buckets=[];
      if(id==='weightMonthAvgChart'){
        for(let i=5;i>=0;i--){
          const d=new Date(nowD.getFullYear(),nowD.getMonth()-i,1,12), key=monthKeyFromDate(d);
          const vals=weightEntries.filter(e=>e.date<=todayKey()&&e.date.slice(0,7)===key).map(e=>e.weightKg).filter(Number.isFinite);
          buckets.push({label:`${MONTHS[d.getMonth()]} ${d.getFullYear()}`,value:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null});
        }
      }else{
        const thisMon=startOfWeek(nowD);
        for(let i=5;i>=0;i--){
          const a=new Date(thisMon);a.setDate(a.getDate()-i*7);const b=new Date(a);b.setDate(b.getDate()+7);
          const vals=weightEntries.filter(e=>{const d=new Date(e.date+'T12:00:00');return e.date<=todayKey()&&d>=a&&d<b;}).map(e=>e.weightKg).filter(Number.isFinite);
          buckets.push({label:`Woche ab ${pad(a.getDate())}.${pad(a.getMonth()+1)}.`,value:vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null});
        }
      }
      const idx=Math.max(0,Math.min(buckets.length-1,Math.round(ratio*(buckets.length-1)))),b=buckets[idx];
      return Number.isFinite(b.value)?`${b.label} · Ø ${b.value.toFixed(1).replace('.',',')} kg`:`${b.label} · keine Messung`;
    }

    if(id==='chart'){
      const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=dateKey(d);days.push({k,total:totalForDate(k)});}
      const idx=Math.max(0,Math.min(days.length-1,Math.round(ratio*(days.length-1)))),d=days[idx];
      return `${fmtShort(d.k)} · ${d.total} Wiederholungen`;
    }

    if(id==='growthChart'){
      const growth=computeStats().growth||[];
      if(!growth.length) return 'Keine Daten';
      const times=growth.map(p=>new Date(p.date+'T12:00:00').getTime()),tMin=Math.min(...times),tMax=Math.max(...times),target=tMin+ratio*Math.max(1,tMax-tMin);
      const p=nearestByX(growth,target,x=>new Date(x.date+'T12:00:00').getTime());
      return `${fmtShort(p.date)} · ${Math.round(p.cum)} Wiederholungen gesamt`;
    }
    return '';
  }

  ensureQolUi();

  // Additive wrappers: same storage format, immediate re-render.
  const originalAddEntry=addEntry;
  addEntry=function(date,time,reps){
    const before=entries.length; originalAddEntry(date,time,reps);
    if(entries.length>before){
      updateTrainingQol(); markBackupChange();
      if(date===todayKey()){ const i=$('customInput'); if(i){i.value=''; i.blur();} }
    }
  };

  const originalDeleteEntry=deleteEntry;
  deleteEntry=function(id){
    const old=entries.find(e=>e.id===id); if(!old) return originalDeleteEntry(id);
    originalDeleteEntry(id); updateTrainingQol(); markBackupChange();
    toast(`${old.reps} Wiederholungen gelöscht`,'Rückgängig',()=>{
      if(!entries.some(e=>e.id===old.id)){
        entries.push(old);
        entries.sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
        saveEntries(entries); renderAll(); updateTrainingQol(); markBackupChange();
      }
    });
  };

  const originalDeleteWeightEntry=deleteWeightEntry;
  deleteWeightEntry=function(id){
    const old=weightEntries.find(e=>e.id===id); if(!old) return originalDeleteWeightEntry(id);
    const oldPlan=weightGoalPlan ? JSON.parse(JSON.stringify(weightGoalPlan)) : null;
    originalDeleteWeightEntry(id); markBackupChange();
    toast(`Gewichtsmessung ${fmtKg(old.weightKg)} gelöscht`,'Rückgängig',()=>{
      if(!weightEntries.some(e=>e.id===old.id)){
        weightEntries.push(old); weightEntries.sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
        saveWeightEntries(weightEntries);
        weightGoalPlan=oldPlan; saveWeightGoalPlan(weightGoalPlan);
        const latest=latestWeightEntry(); weightKg=latest?latest.weightKg:0; saveWeight(weightKg);
        renderWeightTab(); renderStatsTab(); updateWeightPlanCompact(); markBackupChange();
      }
    });
  };

  const originalRenderAll=renderAll;
  renderAll=function(){ originalRenderAll(); updateTrainingQol(); };

  const originalRenderWeightTab=renderWeightTab;
  renderWeightTab=function(){ originalRenderWeightTab(); prefillWeight(); updateWeightPlanCompact(); };

  $('repeatLastBtn')?.addEventListener('click',()=>{
    const e=lastSet(); if(e) addEntry(todayKey(),timeStr(new Date()),e.reps);
  });
  $('qolEditTodayBtn')?.addEventListener('click',()=>openDayEditor(todayKey()));
  $('weightNowBtn')?.addEventListener('click',()=>{setWeightNow();prefillWeight();});
  $('weightNewInput')?.addEventListener('focus',prefillWeight);
  $('fatNewInput')?.addEventListener('focus',prefillWeight);

  // Backup-QoL: zusätzliche Datenmengen-Erinnerung; 7-Tage-Logik bleibt führend.
  const BASE_KEY='qolBackupBaseCount';
  function dataCount(){ return entries.length+weightEntries.length; }
  function backupBase(){
    const raw=typeof safeStorageGet==='function' ? safeStorageGet(BASE_KEY) : null;
    const n=Number(raw); return Number.isFinite(n)?n:null;
  }
  function setBackupBase(n){
    try{ if(typeof storageSet==='function') storageSet(BASE_KEY,String(n)); else localStorage.setItem(BASE_KEY,String(n)); }catch(e){}
  }
  function updateBackupQolText(){
    let baseCount=backupBase();
    if(baseCount===null){ baseCount=dataCount(); setBackupBase(baseCount); }
    const diff=Math.max(0,dataCount()-baseCount);
    const summary=$('backupSummary');
    if(summary){
      const core=summary.dataset.coreText||summary.textContent||'';
      if(!summary.dataset.coreText) summary.dataset.coreText=core;
      summary.textContent=diff>=20 ? `${core}${core?' · ':''}${diff} neue Datensätze seit Datei-Backup – Backup empfohlen` : core;
    }
    if(diff>=20 && $('backupBanner') && $('backupBanner').style.display==='none'){
      $('backupBannerText').textContent=`${diff} neue Datensätze seit dem letzten Datei-Backup – kurz sichern?`;
      $('backupBanner').style.display='flex';
    }
  }
  function markBackupChange(){ updateBackupQolText(); }
  function markBackedUp(){ setBackupBase(dataCount()); setTimeout(updateBackupQolText,0); }
  $('saveFileBtn')?.addEventListener('click',markBackedUp);
  $('settingsBtn')?.addEventListener('click',()=>setTimeout(updateBackupQolText,0));
  $('backupBannerSave')?.addEventListener('click',markBackedUp);
  updateBackupQolText();

  // Diagramm-Tap: Zoom bleibt bestehen; für Gewicht zusätzlich exakter nächster Messwert.
  document.querySelectorAll('.chart-wrap canvas').forEach(c=>{
    c.addEventListener('click',ev=>{
      const d=exactChartDetail(c,ev); if($('chartZoomDetail')) $('chartZoomDetail').textContent=d;
    },true);
  });

  // iPhone-Eingabefluss.
  $('customInput')?.addEventListener('focus',()=>setTimeout(()=>$('customInput')?.scrollIntoView({block:'center',behavior:'smooth'}),120));
  $('weightAddBtn')?.addEventListener('click',()=>setTimeout(()=>{
    if($('weightSaveStatus')?.classList.contains('ok') && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    prefillWeight(); updateWeightPlanCompact(); markBackupChange();
  },0));


  setWeightNow(); prefillWeight(); updateTrainingQol(); updateWeightPlanCompact();
})();
