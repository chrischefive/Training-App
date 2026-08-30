/* v1.9.0: Daily dashboard, record notices, rhythm insights, backup safety,
   visit recap and Explorer 2.0. Auxiliary state is local-only and excluded from JSON exports. */
(() => {
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DAY=86400000, VISIT_KEY='training-v190-last-visit', SNAP_KEY='training-v190-snapshots', MAX_SNAPS=3, RECORD_STATE_KEY='training-v190-record-state';
  let suppressSnapshot=false;
  function addDays(k,n){const d=new Date(k+'T12:00:00');d.setDate(d.getDate()+n);return dateKey(d);}
  function daysBetween(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/DAY);}
  function fmt(n){return Math.round(Number(n)||0).toLocaleString('de-DE');}
  function typeLabel(t){return t==='pushups'?'Liegestütze':t==='situps'?'Situps':'Beide';}
  function localGet(k){try{return safeStorageGet(k)}catch(e){try{return localStorage.getItem(k)}catch(_){return null}}}
  function localSet(k,v){try{storageSet(k,v)}catch(e){try{localStorage.setItem(k,v)}catch(_){}}}

  function ensureUi(){
    if(!$('todayDashboard') && $('viewLog')){
      const el=document.createElement('div'); el.id='todayDashboard'; el.className='v190-dashboard';
      $('viewLog').insertBefore(el,$('viewLog').firstElementChild);
    }
    if(!$('recordNotice')){const el=document.createElement('div');el.id='recordNotice';el.className='v190-record-toast';el.setAttribute('aria-live','polite');document.body.appendChild(el);}
    if(!$('rhythmInsights') && $('thenNowCard')){
      const title=document.createElement('div');title.className='section-title';title.innerHTML='<span>Dein Trainingsrhythmus</span>';
      const card=document.createElement('div');card.id='rhythmInsights';card.className='v190-insight-list';
      $('thenNowCard').insertAdjacentElement('afterend',card);card.insertAdjacentElement('beforebegin',title);
    }
    if(!$('visitRecap') && $('viewStats')){
      const title=document.createElement('div');title.id='visitRecapTitle';title.className='section-title';title.innerHTML='<span>Seit deinem letzten Besuch</span>';
      const card=document.createElement('div');card.id='visitRecap';card.className='v190-visit-card';
      const overview=$('viewStats').querySelector('.section-title'); if(overview){overview.insertAdjacentElement('beforebegin',title);title.insertAdjacentElement('afterend',card);}
    }
    if(!$('backupSafetyStatus') && $('backupSummary')){const el=document.createElement('div');el.id='backupSafetyStatus';el.className='v190-backup-status';$('backupSummary').insertAdjacentElement('afterend',el);}
    if(!$('snapshotPanel') && $('backupSafetyStatus')){const el=document.createElement('div');el.id='snapshotPanel';el.className='v190-snapshots';$('backupSafetyStatus').insertAdjacentElement('afterend',el);}
    upgradeExplorerUi();
  }

  function todayDashboard(){
    const el=$('todayDashboard'); if(!el)return;
    const k=todayKey(), sit=entries.filter(e=>e.type==='situps'&&e.date===k).reduce((s,e)=>s+e.reps,0), push=entries.filter(e=>e.type==='pushups'&&e.date===k).reduce((s,e)=>s+e.reps,0);
    const sg=effectiveGoal('situps',k),pg=effectiveGoal('pushups',k),hasWeight=weightEntries.some(e=>e.date===k);
    const sSt=computeCurrentStreak('situps'),pSt=computeCurrentStreak('pushups'),open=(sit<sg?1:0)+(push<pg?1:0)+(hasWeight?0:1);
    el.innerHTML=`<div class="v190-dashboard-head"><strong>Heute</strong><span>${open?`${open} offen`:'alles erledigt ✓'}</span></div><div class="v190-dashboard-grid"><div><b>${fmt(sit)} / ${fmt(sg)}</b><span>Situps</span><small>${sSt} Tage Streak</small></div><div><b>${fmt(push)} / ${fmt(pg)}</b><span>Liegestütze</span><small>${pSt} Tage Streak</small></div><div><b>${hasWeight?'✓':'—'}</b><span>Gewicht</span><small>${hasWeight?'heute erfasst':'noch offen'}</small></div></div>`;
  }

  function currentRecordState(){
    const out={}; ['situps','pushups'].forEach(t=>{const a=entries.filter(e=>e.type===t&&e.date<=todayKey()),day=new Map();a.forEach(e=>day.set(e.date,(day.get(e.date)||0)+e.reps));out[t]={bestSet:Math.max(0,...a.map(e=>e.reps)),bestDay:Math.max(0,...day.values())};}); return out;
  }
  function loadRecordState(){try{return JSON.parse(localGet(RECORD_STATE_KEY)||'null')}catch(e){return null}}
  let recordState=loadRecordState()||currentRecordState(),knownIds=new Set(entries.map(e=>e.id));
  function showRecord(msg){const t=$('recordNotice');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(showRecord.timer);showRecord.timer=setTimeout(()=>t.classList.remove('show'),4500);}
  function detectRecords(){
    const fresh=entries.filter(e=>!knownIds.has(e.id)&&e.date<=todayKey()),next=currentRecordState();
    for(const e of fresh){const prev=recordState[e.type]||{bestSet:0,bestDay:0},dayTotal=entries.filter(x=>x.type===e.type&&x.date===e.date).reduce((s,x)=>s+x.reps,0);if(e.reps>prev.bestSet)showRecord(`🏆 Neuer ${typeLabel(e.type)}-Satzrekord: ${fmt(e.reps)}`);else if(dayTotal>prev.bestDay)showRecord(`🏆 Neuer ${typeLabel(e.type)}-Tagesrekord: ${fmt(dayTotal)}`);}
    recordState=next;knownIds=new Set(entries.map(e=>e.id));localSet(RECORD_STATE_KEY,JSON.stringify(recordState));
  }

  function rhythmInsights(){
    const el=$('rhythmInsights');if(!el)return;const all=entries.filter(e=>e.date<=todayKey());if(all.length<8){el.innerHTML='<div>Noch etwas mehr Training nötig, bevor sich belastbare Muster zeigen.</div>';return;}
    const rows=[];
    ['situps','pushups'].forEach(t=>{const a=all.filter(e=>e.type===t);if(a.length<4)return;const byDay=Array(7).fill(0),dayN=Array(7).fill(0),dayTotals=new Map();a.forEach(e=>dayTotals.set(e.date,(dayTotals.get(e.date)||0)+e.reps));dayTotals.forEach((v,k)=>{const i=weekdayIdx(k);byDay[i]+=v;dayN[i]++});const av=byDay.map((v,i)=>dayN[i]?v/dayN[i]:0),best=Math.max(...av),wi=av.indexOf(best),hours=Array(24).fill(0);a.forEach(e=>hours[parseInt(e.time||'12',10)||0]+=e.reps);const hi=hours.indexOf(Math.max(...hours));rows.push(`<div><strong>${typeLabel(t)}</strong><span>stärkster Tag: ${WD_SHORT[wi]} · Ø ${fmt(best)}</span><span>leistungsstärkste Stunde: ${pad(hi)}:00–${pad((hi+1)%24)}:00</span></div>`);});
    const allDates=[...new Set(all.map(e=>e.date))].sort(),afterRest=[],normal=[];allDates.forEach((k,i)=>{const total=all.filter(e=>e.date===k).reduce((s,e)=>s+e.reps,0);if(i>0&&daysBetween(allDates[i-1],k)>=3)afterRest.push(total);else normal.push(total);});
    if(afterRest.length>=2&&normal.length>=2){const ar=afterRest.reduce((a,b)=>a+b,0)/afterRest.length,nr=normal.reduce((a,b)=>a+b,0)/normal.length,pct=nr?Math.round((ar-nr)/nr*100):0;rows.push(`<div><strong>Nach Pausen</strong><span>Nach mindestens 2 freien Tagen liegt dein Tagesvolumen im Schnitt ${pct>=0?'+':''}${pct}% gegenüber anderen Trainingstagen.</span></div>`);}
    el.innerHTML=rows.join('')||'<div>Noch keine stabilen Muster erkennbar.</div>';
  }

  function visitMetrics(){const valid=entries.filter(e=>e.date<=todayKey());return{at:new Date().toISOString(),date:todayKey(),reps:valid.reduce((s,e)=>s+e.reps,0),sitBest:Math.max(0,...valid.filter(e=>e.type==='situps').map(e=>e.reps)),pushBest:Math.max(0,...valid.filter(e=>e.type==='pushups').map(e=>e.reps)),weight:latestWeightEntry()?.weightKg??null};}
  let previousVisit=null;try{previousVisit=JSON.parse(localGet(VISIT_KEY)||'null')}catch(e){} localSet(VISIT_KEY,JSON.stringify(visitMetrics()));
  function visitRecap(){const el=$('visitRecap'),title=$('visitRecapTitle');if(!el||!title)return;if(!previousVisit||!previousVisit.date){el.style.display='none';title.style.display='none';return;}const gap=daysBetween(previousVisit.date,todayKey());if(gap<2){el.style.display='none';title.style.display='none';return;}title.style.display='';el.style.display='';const nowM=visitMetrics(),parts=[`${gap} Tage seit dem letzten Besuch`,`+${fmt(Math.max(0,nowM.reps-(previousVisit.reps||0)))} Wiederholungen`];if(Number.isFinite(nowM.weight)&&Number.isFinite(previousVisit.weight)){const d=nowM.weight-previousVisit.weight;parts.push(`Gewicht ${d>=0?'+':''}${d.toFixed(1).replace('.',',')} kg`);}const rec=[];if(nowM.sitBest>(previousVisit.sitBest||0))rec.push(`Situps-Satzrekord ${fmt(nowM.sitBest)}`);if(nowM.pushBest>(previousVisit.pushBest||0))rec.push(`Liegestütz-Satzrekord ${fmt(nowM.pushBest)}`);el.innerHTML=`<strong>${parts[0]}</strong><span>${parts.slice(1).join(' · ')}</span>${rec.length?`<b>🏆 ${rec.join(' · ')}</b>`:''}`;}

  function backupStatus(){const el=$('backupSafetyStatus');if(!el)return;const iso=loadLastExport(),raw=localGet('qolBackupBaseCount'),base=raw===null?null:Number(raw),count=entries.length+weightEntries.length,diff=Number.isFinite(base)?Math.max(0,count-base):0,age=iso?daysSince(iso):Infinity,cls=!iso||age>=7||diff>=20?'bad':age>=4||diff>=10?'warn':'good',when=!iso?'noch kein Datei-Backup':age<1?'heute':`vor ${Math.floor(age)} Tag${Math.floor(age)===1?'':'en'}`;el.className=`v190-backup-status ${cls}`;el.innerHTML=`<strong>${cls==='good'?'● Sicher':cls==='warn'?'● Bald sichern':'● Backup empfohlen'}</strong><span>Letztes Datei-Backup: ${when}</span><span>${diff} neue Datensätze seitdem · ${count} Datensätze insgesamt</span>`;renderSnapshots();}

  let snapshotCache=[];
  async function initSnapshots(){
    try{const raw=await idbGet(SNAP_KEY);const x=raw?JSON.parse(raw):[];snapshotCache=Array.isArray(x)?x.slice(0,MAX_SNAPS):[];}catch(e){snapshotCache=[];}
    renderSnapshots();
  }
  function persistSnapshots(){try{idbSet(SNAP_KEY,JSON.stringify(snapshotCache.slice(0,MAX_SNAPS)));}catch(e){}}
  function createSnapshot(reason='Sicherheits-Snapshot'){
    if(suppressSnapshot||typeof buildExportPayload!=='function')return;
    snapshotCache.unshift({id:'snap-'+Date.now(),createdAt:new Date().toISOString(),reason,payload:buildExportPayload()});
    snapshotCache=snapshotCache.slice(0,MAX_SNAPS);persistSnapshots();renderSnapshots();
  }
  window.createLocalSafetySnapshot=createSnapshot;
  function renderSnapshots(){
    const el=$('snapshotPanel');if(!el)return;const s=snapshotCache;
    el.innerHTML=`<div class="v190-snap-head"><strong>Lokale Wiederherstellung</strong><span>letzte ${MAX_SNAPS} Sicherheitsstände</span></div>`+
      (s.length?s.map((x,i)=>`<div class="v190-snap-row"><span>${new Date(x.createdAt).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})}<small>${esc(x.reason)}</small></span><button type="button" data-restore-snap="${i}">Wiederherstellen</button></div>`).join(''):'<div class="hint">Noch kein lokaler Sicherheits-Snapshot nötig gewesen.</div>');
    el.querySelectorAll('[data-restore-snap]').forEach(b=>b.onclick=()=>{
      const snap=snapshotCache[Number(b.dataset.restoreSnap)];if(!snap)return;
      if(!confirm(`Lokalen Stand vom ${new Date(snap.createdAt).toLocaleString('de-DE')} wiederherstellen?`))return;
      const priorExport=loadLastExport(),priorBase=localGet('qolBackupBaseCount');
      suppressSnapshot=true;window.__localSnapshotRestore=true;try{applyImportRaw(JSON.stringify(snap.payload));}finally{suppressSnapshot=false;window.__localSnapshotRestore=false;}
      saveLastExport(priorExport||'');if(priorBase!==null)localSet('qolBackupBaseCount',priorBase);
      renderSnapshots();backupStatus();
    });
  }
  function wrapDestructive(){if(typeof deleteEntry==='function'){const fn=deleteEntry;deleteEntry=function(){createSnapshot('Vor Löschen eines Trainingseintrags');return fn.apply(this,arguments);};}if(typeof deleteWeightEntry==='function'){const fn=deleteWeightEntry;deleteWeightEntry=function(){createSnapshot('Vor Löschen einer Gewichtsmessung');return fn.apply(this,arguments);};}if(typeof applyImportRaw==='function'){const fn=applyImportRaw;applyImportRaw=function(){createSnapshot('Vor Datenimport');return fn.apply(this,arguments);};}}

  function rangeStats(from,to,type){const types=type==='both'?['situps','pushups']:[type],list=entries.filter(e=>types.includes(e.type)&&e.date>=from&&e.date<=to&&e.date<=todayKey()),byDate=new Map();list.forEach(e=>byDate.set(e.date,(byDate.get(e.date)||0)+e.reps));const sum=list.reduce((s,e)=>s+e.reps,0);return{sum,sets:list.length,days:byDate.size,bestDay:Math.max(0,...byDate.values()),bestSet:Math.max(0,...list.map(e=>e.reps)),avg:byDate.size?sum/byDate.size:0};}
  function upgradeExplorerUi(){const d=document.querySelector('.data-explorer');if(!d||$('explorer2Controls'))return;const grid=$('dataExplorerGrid'),controls=document.createElement('div');controls.id='explorer2Controls';controls.className='v190-explorer-controls';const t=todayKey(),from=addDays(t,-29),compTo=addDays(from,-1),compFrom=addDays(compTo,-29);controls.innerHTML=`<div class="v190-explorer-row"><label>Training<select id="explorer2Type"><option value="both">Beide</option><option value="situps">Situps</option><option value="pushups">Liegestütze</option></select></label></div><div class="v190-explorer-period"><strong>Zeitraum A</strong><input type="date" id="explorer2FromA" value="${from}" max="${t}"><span>bis</span><input type="date" id="explorer2ToA" value="${t}" max="${t}"></div><label class="v190-check"><input type="checkbox" id="explorer2Compare"> Mit Zeitraum B vergleichen</label><div class="v190-explorer-period" id="explorer2PeriodB" style="display:none"><strong>Zeitraum B</strong><input type="date" id="explorer2FromB" value="${compFrom}" max="${t}"><span>bis</span><input type="date" id="explorer2ToB" value="${compTo}" max="${t}"></div><button type="button" id="explorer2Run">Auswerten</button><div id="explorer2Result" class="v190-explorer-result"></div>`;if(grid)grid.insertAdjacentElement('beforebegin',controls);$('explorer2Compare').onchange=e=>$('explorer2PeriodB').style.display=e.target.checked?'grid':'none';$('explorer2Run').onclick=renderExplorer2;renderExplorer2();}
  function renderExplorer2(){const out=$('explorer2Result');if(!out)return;const type=$('explorer2Type').value,fa=$('explorer2FromA').value,ta=$('explorer2ToA').value;if(!isValidDateKey(fa)||!isValidDateKey(ta)||fa>ta){out.innerHTML='<span class="warn-text">Zeitraum A ist ungültig.</span>';return;}const a=rangeStats(fa,ta,type);let html=`<div class="v190-range-card"><strong>A · ${fmtShort(fa)}–${fmtShort(ta)}</strong><span>${typeLabel(type)}</span><b>${fmt(a.sum)} Wdh.</b><small>${a.days} Trainingstage · ${a.sets} Sätze · Ø ${fmt(a.avg)}/Tag · bester Tag ${fmt(a.bestDay)} · größter Satz ${fmt(a.bestSet)}</small></div>`;if($('explorer2Compare').checked){const fb=$('explorer2FromB').value,tb=$('explorer2ToB').value;if(!isValidDateKey(fb)||!isValidDateKey(tb)||fb>tb){out.innerHTML=html+'<span class="warn-text">Zeitraum B ist ungültig.</span>';return;}const b=rangeStats(fb,tb,type),pct=b.sum?Math.round((a.sum-b.sum)/b.sum*100):null;html+=`<div class="v190-range-card"><strong>B · ${fmtShort(fb)}–${fmtShort(tb)}</strong><span>${typeLabel(type)}</span><b>${fmt(b.sum)} Wdh.</b><small>${b.days} Trainingstage · ${b.sets} Sätze · Ø ${fmt(b.avg)}/Tag · bester Tag ${fmt(b.bestDay)} · größter Satz ${fmt(b.bestSet)}</small></div><div class="v190-compare-delta">${pct===null?'B hat noch kein Volumen':`A gegenüber B: ${pct>=0?'+':''}${pct}% Volumen`}</div>`;}out.innerHTML=html;}

  ensureUi();wrapDestructive();initSnapshots();
  const oldRenderAll=window.renderAll;window.renderAll=function(){const r=oldRenderAll.apply(this,arguments);todayDashboard();detectRecords();backupStatus();return r;};
  const oldStats=window.renderStatsTab;window.renderStatsTab=function(){const r=oldStats.apply(this,arguments);rhythmInsights();visitRecap();renderExplorer2();return r;};
  $('saveFileBtn')?.addEventListener('click',()=>setTimeout(backupStatus,20));$('backupBannerSave')?.addEventListener('click',()=>setTimeout(backupStatus,20));$('settingsBtn')?.addEventListener('click',()=>setTimeout(()=>{backupStatus();renderSnapshots();},20));
  todayDashboard();rhythmInsights();visitRecap();backupStatus();detectRecords();
})();
