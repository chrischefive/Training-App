
/* Diagnose + Import-Vorschau. Keine Nutzdaten werden hier verändert. */
(() => {
  const APP_VERSION='1.9.3';
  const OFFLINE_CACHE_VERSION='v23';
  const $=id=>document.getElementById(id);
  const fmtDate=d=>{ if(!d) return '—'; const p=String(d).split('-'); return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(d); };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const versionOf=d=>{ const v=Number.parseInt(d?.exportVersion,10); return Number.isFinite(v)&&v>0?v:1; };

  function parseBackup(raw){
    raw=String(raw||'');
    if(raw.length>MAX_BACKUP_CHARS) throw new Error('Backup zu groß');
    const d=JSON.parse(raw.trim());
    if(!d||typeof d!=='object'||Array.isArray(d)) throw new Error('Kein gültiges Backup-Objekt');
    const known=['entries','goals','goalHistory','startValues','weightKg','weightEntries','weights','weightGoalKg','goalWeightKg','targetWeightKg','weightGoalDate','goalWeightDate','targetWeightDate','weightGoalPlan','exportVersion'];
    if(!known.some(k=>Object.prototype.hasOwnProperty.call(d,k))) throw new Error('Keine bekannten Backup-Daten gefunden');
    return d;
  }
  function backupSummaryData(d){
    const e=Array.isArray(d.entries)?d.entries:[];
    const w=Array.isArray(d.weightEntries)?d.weightEntries:(Array.isArray(d.weights)?d.weights:[]);
    const dates=[...e.map(x=>x?.date),...w.map(x=>x?.date)].filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
    const goal=Number.parseFloat(d.weightGoalKg??d.goalWeightKg??d.targetWeightKg);
    const goalDate=d.weightGoalDate??d.goalWeightDate??d.targetWeightDate??'';
    const version=versionOf(d);
    return {version,e,w,first:dates[0]||'',last:dates[dates.length-1]||'',goal:Number.isFinite(goal)&&goal>0?goal:null,goalDate};
  }
  function renderPreview(raw){
    const el=$('importPreview'); if(!el) return;
    if(!String(raw||'').trim()){ el.className='import-preview'; el.textContent='Noch kein Backup ausgewählt.'; return; }
    try{
      const x=backupSummaryData(parseBackup(raw));
      const compat=x.version<CURRENT_EXPORT_VERSION?'älter – wird migriert':x.version===CURRENT_EXPORT_VERSION?'voll kompatibel':'neuer als diese App – Warnung beim Import';
      el.className='import-preview '+(x.version>CURRENT_EXPORT_VERSION?'warn':'ok');
      el.innerHTML=`<strong>Backup v${x.version}</strong> · ${esc(compat)}<br>`+
        `${x.e.length} Trainingseinträge · ${x.w.length} Gewichtsmessungen`+
        `${x.first?`<br>Zeitraum: ${fmtDate(x.first)} – ${fmtDate(x.last)}`:''}`+
        `${x.goal?`<br>Zielgewicht: ${x.goal.toFixed(1).replace('.',',')} kg${x.goalDate?' · Termin '+fmtDate(x.goalDate):''}`:''}`;
    }catch(err){
      el.className='import-preview warn'; el.textContent='Backup-Vorschau: Datei/Text konnte nicht als gültiges Backup erkannt werden.';
    }
  }
  function diagnostics(){
    const el=$('diagnosticsPanel'); if(!el) return;
    const last=typeof loadLastExport==='function'?loadLastExport():null;
    let lastText='noch nie';
    if(last){ const d=new Date(last); if(!Number.isNaN(d.getTime())) lastText=d.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}); }
    const offline=('serviceWorker' in navigator)?'Offline-Funktion verfügbar':'kein Service Worker';
    let storage='lokaler Speicher verfügbar';
    try{ const k='__diag__'; localStorage.setItem(k,'1');localStorage.removeItem(k); }catch(e){storage='lokaler Speicher eingeschränkt';}
    el.innerHTML=`<strong>App ${APP_VERSION} · Daten v${CURRENT_EXPORT_VERSION} · Cache ${OFFLINE_CACHE_VERSION}</strong><br>`+
      `<span id="appUpdateStatus">Update-Status wird geprüft …</span><br>`+
      `${entries.length} Trainingseinträge · ${weightEntries.length} Gewichtsmessungen<br>`+
      `Letztes Datei-Backup: ${esc(lastText)}<br>${esc(storage)} · ${esc(offline)}`+
      `<div class="diagnostic-actions"><button type="button" id="checkUpdateBtn">Auf Update prüfen</button><button type="button" id="reloadAppBtn">App neu laden</button></div>`;
    $('checkUpdateBtn')?.addEventListener('click',checkForUpdate);
    $('reloadAppBtn')?.addEventListener('click',()=>window.location.reload());
    checkForUpdate();
  }

  async function checkForUpdate(){
    const status=$('appUpdateStatus'); if(!status) return;
    status.textContent='Update-Status: prüfe …'; status.className='';
    if(!navigator.onLine){ status.textContent='Update-Status: offline – Prüfung beim nächsten Online-Start.'; status.className='update-warning'; return; }
    try{
      // Erst direkt beim Server anklopfen. Der Cache-Buster verhindert, dass iOS nur
      // eine alte Manifest-/HTML-Antwort aus seinem Cache zurückgibt.
      const probe=await fetch(`./manifest.webmanifest?updateCheck=${Date.now()}`,{cache:'no-store'});
      if(!probe.ok) throw new Error('HTTP '+probe.status);
      if(!('serviceWorker' in navigator)){ status.textContent=`Update-Status: Server erreichbar · App ${APP_VERSION}`; status.className='update-current'; return; }
      const reg=await navigator.serviceWorker.getRegistration();
      if(!reg){ status.textContent='Update-Status: Server erreichbar · Offline-Service wird beim nächsten Start eingerichtet.'; status.className='update-current'; return; }
      // Safari kann update() gelegentlich mit einer Netzwerk-Ausnahme ablehnen,
      // obwohl die App online ist. Das ist kein Grund für eine rote Fehlermeldung.
      try{ await reg.update(); }catch(updateErr){ console.warn('Service-Worker-Updatecheck:',updateErr); }
      if(reg.waiting){
        status.textContent='Update-Status: neue Version bereit – App neu laden.'; status.className='update-available';
      }else{
        status.textContent=`Update-Status: Server geprüft · App ${APP_VERSION}`; status.className='update-current';
      }
    }catch(e){
      status.textContent='Update-Status: Server gerade nicht erreichbar. Deine App und Daten funktionieren weiter.'; status.className='update-warning';
    }
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      const status=$('appUpdateStatus');
      if(status) status.textContent='Update installiert – App wird neu geladen …';
      setTimeout(()=>window.location.reload(),120);
    });
  }

  $('importArea')?.addEventListener('input',e=>renderPreview(e.target.value));
  $('importFileInput')?.addEventListener('change',e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    if(Number(f.size)>MAX_BACKUP_FILE_BYTES){
      const el=$('importPreview'); if(el){el.className='import-preview warn';el.textContent='Backup ist ungewöhnlich groß und wird nicht eingelesen.';}
      return;
    }
    const r=new FileReader(); r.onload=()=>renderPreview(r.result); r.onerror=()=>renderPreview(''); r.readAsText(f);
  });
  $('settingsBtn')?.addEventListener('click',()=>setTimeout(diagnostics,0));
  $('saveFileBtn')?.addEventListener('click',()=>setTimeout(diagnostics,0));
  diagnostics(); renderPreview($('importArea')?.value||'');
})();
