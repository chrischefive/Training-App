/* ---------- Settings + Export/Import ---------- */
function renderThemeRow(){
  const row=document.getElementById('themeRow');
  row.innerHTML=`<select id="themeSelect" class="theme-select" aria-label="Design auswählen">${THEMES.map(t=>`<option value="${t.id}" ${t.id===currentTheme?'selected':''}>${t.label}</option>`).join('')}</select>`;
  document.getElementById('themeSelect').addEventListener('change',e=>selectTheme(e.target.value));
}
function selectTheme(id){
  currentTheme = id;
  applyTheme(id);
  saveTheme(id);
  renderThemeRow();
  renderAll();
  if(document.getElementById('viewStats').classList.contains('active')) renderChartAndStats();
}
document.getElementById('themeRow').addEventListener('click', (e)=>{
  const id = e.target.getAttribute('data-theme-btn');
  if(id) selectTheme(id);
});
function backupSummaryLabel(){
  const iso=loadLastExport();
  const when=iso ? lastExportLabel().replace('Zuletzt gesichert: ','') : 'noch nie';
  return `Backup: ${when} · ${entries.length} Trainingseinträge · ${weightEntries.length} Gewichtsmessungen`;
}
function openSettings(){
  document.getElementById('settingsTitle').textContent = 'Optionen';
  renderThemeRow();
  document.getElementById('goalSitupsInput').value = goals.situps || 50;
  document.getElementById('goalPushupsInput').value = goals.pushups || 30;
  document.getElementById('startSitupsInput').value = startValues.situps || 0;
  document.getElementById('startPushupsInput').value = startValues.pushups || 0;
  document.getElementById('weightGoalInput').value = weightGoalKg || '';
  document.getElementById('weightGoalDateInput').value = weightGoalDate || ''; updateWeightGoalDateClearState();
  const settingsStatus=document.getElementById('settingsSaveStatus'); if(settingsStatus) settingsStatus.textContent='';
  document.getElementById('exportArea').value = '';
  document.getElementById('importArea').value = '';
  document.getElementById('importStatus').textContent = '';
  document.getElementById('lastExportHint').textContent = lastExportLabel();
  const bs=document.getElementById('backupSummary'); if(bs) bs.textContent=backupSummaryLabel();
  updatePersistentStorageStatus();
  document.getElementById('settingsOverlay').classList.add('open');
}
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsClose').addEventListener('click', ()=>document.getElementById('settingsOverlay').classList.remove('open'));
document.getElementById('settingsOverlay').addEventListener('click', (e)=>{ if(e.target.id==='settingsOverlay') document.getElementById('settingsOverlay').classList.remove('open'); });
function updateWeightGoalDateClearState(){
  const btn=document.getElementById('weightGoalDateClear');
  const input=document.getElementById('weightGoalDateInput');
  if(btn && input) btn.disabled=!input.value && !weightGoalDate;
}
document.getElementById('weightGoalDateInput').addEventListener('change', updateWeightGoalDateClearState);
document.getElementById('weightGoalDateClear').addEventListener('click', ()=>{
  const input=document.getElementById('weightGoalDateInput');
  input.value='';
  weightGoalDate='';
  weightGoalPlan=null;
  saveWeightGoalDate('');
  saveWeightGoalPlan(null);
  updateWeightGoalDateClearState();
  const st=document.getElementById('settingsSaveStatus');
  if(st){ st.textContent='Wunschtermin entfernt. Zielgewicht bleibt bestehen.'; st.className='status ok'; }
  renderWeightTab();
});
document.getElementById('goalSave').addEventListener('click', ()=>{
  const settingsStatus=document.getElementById('settingsSaveStatus');
  const goalRaw=String(document.getElementById('weightGoalInput').value||'').trim().replace(',','.');
  const wg=goalRaw===''?0:Number.parseFloat(goalRaw);
  let gd=document.getElementById('weightGoalDateInput').value||'';
  if(!wg) gd='';
  if(goalRaw!=='' && (!Number.isFinite(wg) || wg<20 || wg>300)){
    if(settingsStatus){ settingsStatus.textContent='Bitte ein Zielgewicht zwischen 20 und 300 kg eingeben.'; settingsStatus.className='status warn'; }
    return;
  }
  if(gd && !isValidDateKey(gd)){
    if(settingsStatus){ settingsStatus.textContent='Bitte ein gültiges Wunschdatum eingeben.'; settingsStatus.className='status warn'; }
    return;
  }
  const sameExistingWeightPlan = (wg||0)===weightGoalKg && gd===weightGoalDate;
  if(gd && gd<=todayKey() && !sameExistingWeightPlan){
    if(settingsStatus){ settingsStatus.textContent='Ein neuer Wunsch-/Zieltermin muss nach heute liegen.'; settingsStatus.className='status warn'; }
    return;
  }

  const nextGoals = {
    situps: parseInt(document.getElementById('goalSitupsInput').value,10),
    pushups: parseInt(document.getElementById('goalPushupsInput').value,10)
  };
  ['situps','pushups'].forEach(type=>{
    const v=nextGoals[type];
    if(Number.isFinite(v) && v>0 && v!==goals[type]){
      goals[type]=v;
      setGoalFrom(type,v,todayKey());
    }
  });
  saveGoals(goals);
  const sitStart=parseInt(document.getElementById('startSitupsInput').value,10);
  const pushStart=parseInt(document.getElementById('startPushupsInput').value,10);
  startValues.situps=Number.isFinite(sitStart) && sitStart>0 ? sitStart : 0;
  startValues.pushups=Number.isFinite(pushStart) && pushStart>0 ? pushStart : 0;
  saveStart(startValues);

  const previousGoal=weightGoalKg, previousGoalDate=weightGoalDate;
  weightGoalKg=wg||0; saveWeightGoal(weightGoalKg);
  weightGoalDate=gd; saveWeightGoalDate(weightGoalDate);
  const planChanged=previousGoal!==weightGoalKg || previousGoalDate!==weightGoalDate;
  refreshWeightGoalPlan(planChanged);
  renderAll();
  if(settingsStatus){
    const latest=latestWeightEntry();
    settingsStatus.textContent=(weightGoalKg&&weightGoalDate&&!latest)
      ? 'Optionen gespeichert. Die Soll-Linie startet mit der ersten Gewichtsmessung.'
      : 'Optionen gespeichert.';
    settingsStatus.className='status ok';
  }
  document.getElementById('settingsOverlay').classList.remove('open');
});

const CURRENT_EXPORT_VERSION = 8;
const MAX_BACKUP_CHARS = 20_000_000;
const MAX_BACKUP_FILE_BYTES = 20_000_000;
const MAX_TRAINING_ENTRIES = 250_000;
const MAX_WEIGHT_ENTRIES = 100_000;
function buildExportPayload(){
  // Nur Rohdaten und Einstellungen exportieren. Diagramme/Statistiken werden
  // beim Import aus diesen Daten neu aufgebaut.
  return {
    exportVersion: CURRENT_EXPORT_VERSION,
    entries,
    goals,
    goalHistory,
    startValues,
    weightKg,
    weightEntries,
    weightGoalKg,
    weightGoalDate,
    weightGoalPlan
  };
}
// Löst den nativen "Sichern unter…"-Dialog aus (auf iOS: Teilen-Menü mit "In Dateien sichern" -> iCloud Drive möglich).
function downloadPayloadFile(payload, filename, markAsRegularBackup=true){
  const json=JSON.stringify(payload,null,2), blob=new Blob([json],{type:'application/json'}), url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  if(markAsRegularBackup){ saveLastExport(new Date().toISOString()); hideBackupBanner(); }
}
function downloadBackupFile(){ downloadPayloadFile(buildExportPayload(),`training-backup-${todayKey()}.json`,true); }
function downloadSafetyBackupBeforeImport(){
  const stamp=new Date(), ts=`${dateKey(stamp)}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}`;
  downloadPayloadFile(buildExportPayload(),`training-vor-import-${ts}.json`,false);
}
document.getElementById('exportBtn').addEventListener('click', ()=>{
  document.getElementById('exportArea').value = JSON.stringify(buildExportPayload());
});
document.getElementById('copyBtn').addEventListener('click', async ()=>{
  const area = document.getElementById('exportArea');
  if(!area.value){ area.value = JSON.stringify(buildExportPayload()); }
  area.select();
  try{ await navigator.clipboard.writeText(area.value); }
  catch(e){ document.execCommand('copy'); }
});
document.getElementById('saveFileBtn').addEventListener('click', downloadBackupFile);

/* ---------- Wöchentliche Backup-Erinnerung ---------- */
function daysSince(iso){
  if(!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}
function lastExportLabel(){
  const iso = loadLastExport();
  if(!iso) return 'Noch nie gesichert.';
  const d = new Date(iso);
  return `Zuletzt gesichert: ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}
function showBackupBanner(){
  const iso = loadLastExport();
  const text = iso
    ? `Letztes Backup vor ${Math.floor(daysSince(iso))} Tagen — kurz sichern?`
    : 'Noch kein Backup vorhanden — jetzt einmal sichern?';
  document.getElementById('backupBannerText').textContent = text;
  document.getElementById('backupBanner').style.display = 'flex';
}
function hideBackupBanner(){
  document.getElementById('backupBanner').style.display = 'none';
}
function checkBackupReminder(){
  if(daysSince(loadLastExport()) >= EXPORT_REMINDER_DAYS) showBackupBanner();
}
document.getElementById('backupBannerSave').addEventListener('click', downloadBackupFile);
document.getElementById('backupBannerLater').addEventListener('click', hideBackupBanner);
function applyImportRaw(raw){
  const statusEl = document.getElementById('importStatus');
  try{
    raw=String(raw||'');
    if(raw.length>MAX_BACKUP_CHARS) throw new Error('Backup zu groß');
    const data = JSON.parse(raw.trim());
    if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('ungültig');
    const knownFields=['entries','goals','goalHistory','startValues','weightKg','weightEntries','weights','weightGoalKg','goalWeightKg','targetWeightKg','weightGoalDate','goalWeightDate','targetWeightDate','weightGoalPlan','exportVersion'];
    if(!knownFields.some(k=>Object.prototype.hasOwnProperty.call(data,k))) throw new Error('kein Backup');
    // Wenn ein bekanntes Feld vorhanden ist, aber den falschen Grundtyp hat, lieber abbrechen
    // als einen Teilbestand stillschweigend leer zu importieren.
    if(Object.prototype.hasOwnProperty.call(data,'entries') && !Array.isArray(data.entries)) throw new Error('entries beschädigt');
    if(Object.prototype.hasOwnProperty.call(data,'weightEntries') && !Array.isArray(data.weightEntries)) throw new Error('Gewichtsdaten beschädigt');
    if(Object.prototype.hasOwnProperty.call(data,'weights') && !Array.isArray(data.weights)) throw new Error('Gewichtsdaten beschädigt');
    if(Object.prototype.hasOwnProperty.call(data,'goals') && (!data.goals || typeof data.goals!=='object' || Array.isArray(data.goals))) throw new Error('Ziele beschädigt');
    if(Object.prototype.hasOwnProperty.call(data,'goalHistory') && (!data.goalHistory || typeof data.goalHistory!=='object' || Array.isArray(data.goalHistory))) throw new Error('Zielhistorie beschädigt');
    if(Object.prototype.hasOwnProperty.call(data,'startValues') && (!data.startValues || typeof data.startValues!=='object' || Array.isArray(data.startValues))) throw new Error('Startwerte beschädigt');

    if(Array.isArray(data.entries) && data.entries.length>MAX_TRAINING_ENTRIES) throw new Error('zu viele Trainingseinträge');
    const sizeWeightList=Array.isArray(data.weightEntries)?data.weightEntries:(Array.isArray(data.weights)?data.weights:[]);
    if(sizeWeightList.length>MAX_WEIGHT_ENTRIES) throw new Error('zu viele Gewichtsmessungen');

    // Vorab normalisieren, damit wir Datenverlust durch beschädigte Einzelzeilen sichtbar machen.
    const normalizedTrainingCheck=Array.isArray(data.entries)?normalizeEntries(data.entries):[];
    const normalizedWeightCheck=sizeWeightList.length?normalizeWeightEntries(sizeWeightList):[];
    if(Array.isArray(data.entries) && data.entries.length && normalizedTrainingCheck.length===0) throw new Error('Trainingseinträge vollständig ungültig');
    if(sizeWeightList.length && normalizedWeightCheck.length===0) throw new Error('Gewichtsmessungen vollständig ungültig');

    const droppedTraining=Array.isArray(data.entries)?data.entries.length-normalizedTrainingCheck.length:0;
    const droppedWeight=sizeWeightList.length-normalizedWeightCheck.length;
    if(droppedTraining>0 || droppedWeight>0){
      const parts=[];
      if(droppedTraining) parts.push(`${droppedTraining} Trainingseintrag${droppedTraining===1?'':'e'}`);
      if(droppedWeight) parts.push(`${droppedWeight} Gewichtsmessung${droppedWeight===1?'':'en'}`);
      const proceed=window.confirm(
        `Dieses Backup enthält ungültige Datensätze. ${parts.join(' und ')} würden beim Import verworfen.\n\n`+
        `Die übrigen gültigen Daten können übernommen werden. Trotzdem fortfahren?`
      );
      if(!proceed){
        statusEl.textContent='Import abgebrochen: Es wurden ungültige Datensätze im Backup gefunden. Bestehende Daten wurden nicht verändert.';
        statusEl.className='status warn';
        return;
      }
    }

    const parsedVersion=Number.parseInt(data.exportVersion,10);
    const importVersion=Number.isFinite(parsedVersion)&&parsedVersion>0 ? parsedVersion : 1;
    if(importVersion>CURRENT_EXPORT_VERSION){
      const proceed=window.confirm(
        `Dieses Backup ist neuer als diese App (Backup v${importVersion}, App unterstützt bis v${CURRENT_EXPORT_VERSION}).\n\n`+
        `Die bekannten Daten können importiert werden, aber neuere Datenfelder könnten von dieser älteren App nicht verstanden werden und bei einem späteren Export verloren gehen.\n\n`+
        `Trotzdem importieren?`
      );
      if(!proceed){
        statusEl.textContent=`Import abgebrochen: Backup v${importVersion} ist neuer als diese App (bis v${CURRENT_EXPORT_VERSION}).`;
        statusEl.className='status warn';
        return;
      }
    }
    // Vor dem Überschreiben den aktuellen Stand doppelt sichern: intern + als Datei.
    // Der interne Snapshot bleibt auch erhalten, falls iOS einen automatischen Download blockiert.
    storageSet(PREIMPORT_SNAPSHOT_KEY, JSON.stringify(buildExportPayload()));
    if(!window.__localSnapshotRestore) downloadSafetyBackupBeforeImport();
    // Versions-toleranter Import: unbekannte zukünftige Felder werden ignoriert;
    // Felder, die in älteren Backups noch nicht existierten, werden leer/default gesetzt.
    const importedEntries = Array.isArray(data.entries) ? data.entries : [];
    entries = Array.isArray(data.entries) ? normalizedTrainingCheck : normalizeEntries(importedEntries);

    const defaultGoals={situps:50,pushups:30};
    const rawGoals=(data.goals && typeof data.goals==='object') ? data.goals : {};
    goals={
      situps: Number(rawGoals.situps)>0 ? Number(rawGoals.situps) : defaultGoals.situps,
      pushups: Number(rawGoals.pushups)>0 ? Number(rawGoals.pushups) : defaultGoals.pushups
    };
    const rawHistory=(data.goalHistory && typeof data.goalHistory==='object') ? data.goalHistory : {};
    goalHistory=cleanGoalHistory(rawHistory);
    const rawStart=(data.startValues && typeof data.startValues==='object') ? data.startValues : {};
    startValues={
      situps: Number(rawStart.situps)>0 ? Number(rawStart.situps) : 0,
      pushups: Number(rawStart.pushups)>0 ? Number(rawStart.pushups) : 0
    };

    const importedWeight = Number.parseFloat(data.weightKg);
    weightKg = Number.isFinite(importedWeight) && importedWeight>0 ? importedWeight : 0;
    const rawWeightEntries = Array.isArray(data.weightEntries) ? data.weightEntries : (Array.isArray(data.weights) ? data.weights : []);
    weightEntries = rawWeightEntries===sizeWeightList ? normalizedWeightCheck : normalizeWeightEntries(rawWeightEntries);
    // Sehr alte Backups hatten nur weightKg und noch keine Gewichtshistorie.
    // Diesen Wert als einzelne historische Messung übernehmen, damit die Kalorienlogik weiter funktioniert.
    if(!weightEntries.length && Number.isFinite(weightKg) && weightKg>0){
      let legacyDate=todayKey();
      if(data.exportedAt){ const x=new Date(data.exportedAt); if(!Number.isNaN(x.getTime())) legacyDate=dateKey(x); }
      weightEntries=[{id:'import-legacy-weight-'+Date.now(),date:legacyDate,time:'00:00',weightKg,bodyFatPct:null}];
    }
    weightEntries.sort((a,b)=>(a.date+' '+(a.time||'00:00')).localeCompare(b.date+' '+(b.time||'00:00')));
    weightKg=weightEntries.length ? (latestWeightEntry()?.weightKg || 0) : 0;

    const importedGoal = Number.parseFloat(data.weightGoalKg ?? data.goalWeightKg ?? data.targetWeightKg);
    weightGoalKg = Number.isFinite(importedGoal) && importedGoal>0 ? importedGoal : 0;

    // UI-Zustand (Theme, gewählter Bereich, Log/Statistik) ist bewusst kein Bestandteil
    // eines Daten-Backups. Auch wenn ältere Backups diese Felder enthalten, werden
    // sie ignoriert und die aktuellen App-Einstellungen auf diesem Gerät beibehalten.

    saveEntries(entries); saveGoals(goals); saveGoalHistory(goalHistory); saveStart(startValues);
    saveWeight(weightKg); saveWeightEntries(weightEntries); saveWeightGoal(weightGoalKg);
    const rawGoalDate=data.weightGoalDate ?? data.goalWeightDate ?? data.targetWeightDate ?? '';
    weightGoalDate=isValidDateKey(rawGoalDate)?rawGoalDate:''; saveWeightGoalDate(weightGoalDate);
    const rp=data.weightGoalPlan;
    weightGoalPlan=(rp&&isValidDateKey(rp.startDate)&&Number(rp.startKg)>0)
      ? {startDate:rp.startDate,startKg:Number(rp.startKg),sourceEntryId:rp.sourceEntryId?String(rp.sourceEntryId):null}
      : null;
    if(weightGoalPlan && (!weightGoalDate || weightGoalDate<=weightGoalPlan.startDate || weightGoalPlan.startDate>todayKey())) weightGoalPlan=null;
    if(!weightGoalPlan && weightGoalKg && weightGoalDate){
      const latest=latestWeightEntry();
      if(latest && weightGoalDate>latest.date) weightGoalPlan={startDate:latest.date,startKg:latest.weightKg,sourceEntryId:latest.id||null};
    }
    saveWeightGoalPlan(weightGoalPlan);
    // Ein erfolgreicher Import IST ein gesicherter Datenstand. Deshalb beginnen
    // Zeit- und Mengen-Erinnerung ab hier neu; erst spätere Änderungen sind ungesichert.
    saveLastExport(new Date().toISOString());
    try{ if(typeof storageSet==='function') storageSet('qolBackupBaseCount',String(entries.length+weightEntries.length)); }catch(e){}
    hideBackupBanner();
    const backupSummaryEl=document.getElementById('backupSummary');
    if(backupSummaryEl){backupSummaryEl.dataset.coreText='';backupSummaryEl.textContent=backupSummaryLabel();}
    applyTypeUI(); renderAll(); showCurrentArea();
    const version = importVersion;
    const versionNote = version<CURRENT_EXPORT_VERSION
      ? `Älteres Backup v${version} wurde auf das aktuelle Format v${CURRENT_EXPORT_VERSION} übernommen; fehlende Felder wurden leer/default angelegt.`
      : version>CURRENT_EXPORT_VERSION
        ? `Neueres Backup v${version} wurde mit Kompatibilitätswarnung importiert; unbekannte Felder wurden ignoriert. Vor erneutem Export möglichst die neuere App verwenden.`
        : `Backupformat v${version} entspricht dieser App.`;
    statusEl.textContent = `Importiert: ${entries.length} Trainingseinträge, ${weightEntries.length} Gewichtsmessungen. ${versionNote}`;
    statusEl.className = version>CURRENT_EXPORT_VERSION ? 'status warn' : 'status ok';
  }catch(e){
    const msg=String(e&&e.message||'').toLowerCase();
    const detail=msg.includes('zu groß')||msg.includes('zu viele') ? 'Backup ist ungewöhnlich groß.'
      : msg.includes('vollständig ungültig') ? 'Backup enthält einen Datenbereich, dessen Einträge vollständig ungültig sind.'
      : msg.includes('beschädigt') ? 'Ein bekanntes Backup-Feld ist beschädigt.'
      : 'Konnte den Text nicht als gültiges Backup lesen.';
    statusEl.textContent = detail+' Bestehende Daten wurden nicht verändert.';
    statusEl.className = 'status warn';
  }
}
document.getElementById('importBtn').addEventListener('click', ()=>{
  applyImportRaw(document.getElementById('importArea').value);
});
document.getElementById('importFileBtn').addEventListener('click', ()=>{
  document.getElementById('importFileInput').click();
});
document.getElementById('importFileInput').addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(Number(file.size)>MAX_BACKUP_FILE_BYTES){
    document.getElementById('importStatus').textContent='Backup-Datei ist ungewöhnlich groß und wurde aus Sicherheitsgründen nicht eingelesen. Bestehende Daten wurden nicht verändert.';
    document.getElementById('importStatus').className='status warn';
    e.target.value='';
    return;
  }
  const reader = new FileReader();
  reader.onload = ()=>{
    // Nur laden/vorschauen. Der eigentliche Import erfolgt bewusst erst
    // über den separaten Button „Importieren“.
    document.getElementById('importArea').value = reader.result;
    document.getElementById('importArea').dispatchEvent(new Event('input',{bubbles:true}));
    e.target.value = ''; // gleiche Datei erneut auswählbar machen
  };
  reader.onerror = ()=>{
    document.getElementById('importStatus').textContent = 'Datei konnte nicht gelesen werden.';
    document.getElementById('importStatus').className = 'status warn';
  };
  reader.readAsText(file);
});

document.getElementById('weightAddBtn').addEventListener('click', addWeightEntry);
const weightDateInput=document.getElementById('weightDateInput'); if(weightDateInput) weightDateInput.value=todayKey();
const weightTimeInput=document.getElementById('weightTimeInput'); if(weightTimeInput) weightTimeInput.value=timeStr(new Date());
document.getElementById('weightHistoryList').addEventListener('click', e=>{
  const more=e.target.closest('[data-weight-more]');
  if(more){ weightHistoryRenderLimit+=100; renderWeightTab(); return; }
  const edit=e.target.closest('[data-weight-edit]');
  if(edit){ openWeightEditor(edit.getAttribute('data-weight-edit')); return; }
  const del=e.target.closest('[data-weight-del]');
  if(del && confirm('Diese Gewichtsmessung wirklich löschen?')) deleteWeightEntry(del.getAttribute('data-weight-del'));
});
document.getElementById('weightEditClose').addEventListener('click', closeWeightEditor);
document.getElementById('weightEditOverlay').addEventListener('click', e=>{ if(e.target.id==='weightEditOverlay') closeWeightEditor(); });
document.getElementById('weightEditSave').addEventListener('click', saveWeightEdit);
document.getElementById('weightEditDelete').addEventListener('click', deleteEditingWeight);

