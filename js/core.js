const ENTRIES_KEY = "situps-entries-v3";
const ENTRIES_KEY_V2 = "situps-entries-v2";
const ENTRIES_KEY_V1 = "situps-entries-v1";
const GOALS_KEY = "situps-goals-v1";
const GOAL_HISTORY_KEY = "situps-goalhistory-v1";
const GOAL_KEY_OLD = "situps-goal-v1";
const START_KEY = "situps-startvalues-v1";
const WEIGHT_KEY = "situps-weight-v1";
const WEIGHT_HISTORY_KEY = "situps-weight-history-v1";
const WEIGHT_GOAL_KEY = "situps-weight-goal-v1";
const WEIGHT_GOAL_DATE_KEY = "situps-weight-goal-date-v1";
const WEIGHT_GOAL_PLAN_KEY = "situps-weight-goal-plan-v1";
const PREIMPORT_SNAPSHOT_KEY = "situps-preimport-snapshot-v1";
const TOP_TYPE_KEY = "situps-toptype-v1";
const BOTTOM_MODE_KEY = "situps-bottommode-v1";
const TYPE_KEY = "situps-currenttype-v1";
const LAST_EXPORT_KEY = "situps-lastexport-v1";
const EXPORT_REMINDER_DAYS = 7;
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WD_SHORT = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const RB_CYCLE = ['#FF3D63','#FF8C1A','#FFE23D','#2FE88A','#3E8CFF','#C264FF']; // Fallback, falls CSS-Variablen mal nicht lesbar sind
function cssVar(name){
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || null;
}
function rbCycle(){
  const names = ['--rb-red','--rb-orange','--rb-yellow','--rb-green','--rb-blue','--rb-purple'];
  const vals = names.map(cssVar);
  return vals.every(Boolean) ? vals : RB_CYCLE;
}
function safeStorageGet(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
function safeStorageSet(key, value){ try{ localStorage.setItem(key, value); return true; }catch(e){ return false; } }
function loadTheme(){ const t = safeStorageGet(THEME_KEY); return THEMES.some(x=>x.id===t) ? t : 'rainbow'; }
function saveTheme(t){ storageSet(THEME_KEY, t); }
function applyTheme(id){
  if(id === 'rainbow') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
}
const TYPE_LABELS = { situps:'Situps', pushups:'Liegestütze' };
const CHIP_VALUES = { situps:[15,20,25,30,35], pushups:[10,15,20,25,30] };
const KCAL_PACE = { situps:25, pushups:20 }; // angenommene Wiederholungen/Minute
const THEMES = [
  { id:'rainbow', label:'Regenbogen' },
  { id:'richter', label:'Richter' },
  { id:'nordlicht', label:'Nordlicht' },
  { id:'bauhaus', label:'Bauhaus' },
  { id:'sumi', label:'Sumi' },
  { id:'keramik', label:'Keramik' },
  { id:'cyberpunk', label:'Cyberpunk' },
  { id:'graurosa', label:'Grau & Rosa' }
];
const THEME_KEY = "situps-theme-v1";

/* ---------- Robuste Speicherung: localStorage + IndexedDB-Spiegel ---------- */
/* localStorage bleibt die schnelle, synchrone Quelle für den normalen Betrieb.
   Zusätzlich wird jede Änderung asynchron nach IndexedDB gespiegelt (deutlich
   widerstandsfähiger gegen automatisches Löschen durch den Browser). Wird
   localStorage doch mal geleert (z.B. iOS-Bereinigung), stellt sich die App
   beim nächsten Start selbst aus dem IndexedDB-Backup wieder her. */
const IDB_NAME = 'training-backup-db';
const IDB_STORE = 'kv';
let idbReady = null;
function idbOpen(){
  if(idbReady) return idbReady;
  idbReady = new Promise((resolve)=>{
    if(!('indexedDB' in window)){ resolve(null); return; }
    try{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = ()=> req.result.createObjectStore(IDB_STORE);
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> resolve(null);
    }catch(e){ resolve(null); }
  });
  return idbReady;
}
async function idbSet(key, value){
  const db = await idbOpen(); if(!db) return;
  try{ db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key); }
  catch(e){ console.warn('IndexedDB-Backup fehlgeschlagen für', key, e); }
}
async function idbGet(key){
  const db = await idbOpen(); if(!db) return undefined;
  return new Promise((resolve)=>{
    try{
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> resolve(undefined);
    }catch(e){ resolve(undefined); }
  });
}
// Schreibt synchron in localStorage (wie bisher) und spiegelt im Hintergrund nach IndexedDB.
function storageSet(key, value){
  safeStorageSet(key, value);
  idbSet(key, value);
}
function storageValueLooksValid(key, raw){
  if(raw===null || raw===undefined) return false;
  try{
    if(key===ENTRIES_KEY){
      const x=JSON.parse(raw);
      return Array.isArray(x) && (x.length===0 || normalizeEntries(x).length>0);
    }
    if(key===GOALS_KEY){
      const x=JSON.parse(raw);
      return !!x && typeof x==='object' && !Array.isArray(x)
        && Number(x.situps)>0 && Number(x.pushups)>0;
    }
    if(key===GOAL_HISTORY_KEY){
      const x=JSON.parse(raw);
      if(!x || typeof x!=='object' || Array.isArray(x)) return false;
      const validArr=a=>Array.isArray(a) && a.every(h=>h && (h.from==='0000-01-01'||isValidDateKey(h.from)) && Number(h.goal)>0);
      return validArr(x.situps) && validArr(x.pushups);
    }
    if(key===START_KEY){
      const x=JSON.parse(raw);
      return !!x && typeof x==='object' && !Array.isArray(x)
        && Number(x.situps)>=0 && Number(x.pushups)>=0;
    }
    if(key===WEIGHT_HISTORY_KEY){
      const x=JSON.parse(raw);
      return Array.isArray(x) && (x.length===0 || normalizeWeightEntries(x).length>0);
    }
    if(key===WEIGHT_GOAL_PLAN_KEY){
      const x=JSON.parse(raw); return x===null || (!!x && typeof x==='object' && !Array.isArray(x));
    }
    if(key===WEIGHT_KEY || key===WEIGHT_GOAL_KEY){
      const n=Number.parseFloat(raw); return Number.isFinite(n) && n>=0;
    }
    if(key===WEIGHT_GOAL_DATE_KEY) return raw==='' || isValidDateKey(raw);
    if(key===TYPE_KEY) return raw==='situps' || raw==='pushups';
    if(key===TOP_TYPE_KEY) return raw==='situps' || raw==='pushups' || raw==='weight';
    if(key===BOTTOM_MODE_KEY) return raw==='log' || raw==='stats';
    if(key===THEME_KEY) return THEMES.some(x=>x.id===raw);
    if(key===LAST_EXPORT_KEY) return raw==='' || !Number.isNaN(new Date(raw).getTime());
    return true;
  }catch(e){ return false; }
}
// Self-Healing: fehlt ein Schlüssel in localStorage, aber existiert im IndexedDB-Backup,
// wird er wiederhergestellt und der App-Zustand neu geladen.
async function recoverFromIndexedDbIfNeeded(){
  const keys = [ENTRIES_KEY, GOALS_KEY, GOAL_HISTORY_KEY, START_KEY, WEIGHT_KEY, WEIGHT_HISTORY_KEY, WEIGHT_GOAL_KEY, WEIGHT_GOAL_DATE_KEY, WEIGHT_GOAL_PLAN_KEY, TYPE_KEY, THEME_KEY, LAST_EXPORT_KEY, TOP_TYPE_KEY, BOTTOM_MODE_KEY];
  let recoveredAny = false;
  for(const key of keys){
    const local=safeStorageGet(key);
    if(!storageValueLooksValid(key,local)){
      const backup = await idbGet(key);
      if(backup !== undefined && backup !== null && storageValueLooksValid(key,String(backup))){
        safeStorageSet(key, backup);
        recoveredAny = true;
      }
    }
  }
  if(recoveredAny){
    entries = loadEntries(); goals = loadGoals(); goalHistory = loadGoalHistory();
    startValues = loadStart(); weightKg = loadWeight(); weightEntries = loadWeightEntries(); weightGoalKg = loadWeightGoal(); weightGoalDate = loadWeightGoalDate(); weightGoalPlan = loadWeightGoalPlan(); currentType = loadType();
    currentTheme = loadTheme(); applyTheme(currentTheme);
    topType = loadTopType(); bottomMode = loadBottomMode();
    if(topType!=='weight') currentType=topType;
    applyTypeUI(); renderAll(); showCurrentArea();
    console.info('Daten aus IndexedDB-Backup wiederhergestellt.');
  }
}
// Bittet den Browser, die Daten nicht automatisch zu räumen (best effort, nicht auf allen Browsern verfügbar).
if('storage' in navigator && 'persist' in navigator.storage){
  navigator.storage.persist().catch(()=>{});
}
async function updatePersistentStorageStatus(){
  const el = document.getElementById('storagePersistStatus');
  if(!el) return;
  if(!navigator.storage || typeof navigator.storage.persisted !== 'function'){
    el.textContent = 'Speicherschutz: auf diesem Browser nicht prüfbar';
    return;
  }
  try{
    let isPersisted = await navigator.storage.persisted();
    if(!isPersisted && typeof navigator.storage.persist === 'function'){
      try{ isPersisted = await navigator.storage.persist(); }catch(e){}
    }
    el.textContent = isPersisted
      ? 'Speicherschutz: persistent aktiv ✓'
      : 'Speicherschutz: nicht bestätigt – regelmäßige Backups empfohlen';
  }catch(e){
    el.textContent = 'Speicherschutz: Status konnte nicht geprüft werden';
  }
}

function pad(n){ return String(n).padStart(2,'0'); }
function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function timeStr(d){ return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function todayKey(){ return dateKey(new Date()); }
function weekdayIdx(key){ const d = new Date(key+'T12:00:00'); return (d.getDay()+6)%7; }
function isValidDateKey(key){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key||'')) return false;
  const [y,m,d]=key.split('-').map(Number), x=new Date(y,m-1,d,12);
  return x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d;
}
function isValidTimeStr(t){
  if(!/^\d{2}:\d{2}$/.test(t||'')) return false;
  const [h,m]=t.split(':').map(Number); return h>=0&&h<=23&&m>=0&&m<=59;
}
function makeId(prefix='id'){ return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,9); }
function uniqueIds(list,prefix){
  const seen=new Set();
  return list.map(x=>{ let id=String(x.id||''); if(!id || seen.has(id)) id=makeId(prefix); seen.add(id); return {...x,id}; });
}
function normalizeEntries(raw, fallbackType='situps'){
  if(!Array.isArray(raw)) return [];
  const out=raw.map(e=>{
    const reps=Number.parseInt(e?.reps,10), type=e?.type==='pushups'?'pushups':(e?.type==='situps'?'situps':fallbackType);
    return {id:e?.id,date:e?.date,time:isValidTimeStr(e?.time)?e.time:'12:00',reps,type};
  }).filter(e=>isValidDateKey(e.date) && Number.isFinite(e.reps) && e.reps>0 && e.reps<=100000);
  return uniqueIds(out,'training');
}
function normalizeWeightEntries(raw){
  if(!Array.isArray(raw)) return [];
  const out=raw.map(e=>{
    const w=Number.parseFloat(e?.weightKg ?? e?.weight), bfRaw=e?.bodyFatPct ?? e?.bodyFat ?? e?.fatPct;
    const bf=bfRaw==null||bfRaw===''?null:Number.parseFloat(bfRaw);
    return {id:e?.id,date:e?.date,time:isValidTimeStr(e?.time)?e.time:'00:00',weightKg:w,bodyFatPct:Number.isFinite(bf)&&bf>=0&&bf<=100?bf:null};
  }).filter(e=>isValidDateKey(e.date) && Number.isFinite(e.weightKg) && e.weightKg>0 && e.weightKg<=1000);
  return uniqueIds(out,'weight').sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));
}

function loadEntries(){
  try{
    const v3=JSON.parse(safeStorageGet(ENTRIES_KEY));
    if(Array.isArray(v3)){ const clean=normalizeEntries(v3); if(JSON.stringify(clean)!==JSON.stringify(v3)) saveEntries(clean); return clean; }
  }catch(e){}
  try{
    const v2=JSON.parse(safeStorageGet(ENTRIES_KEY_V2));
    if(Array.isArray(v2)&&v2.length){ const m=normalizeEntries(v2.map(e=>({...e,type:'situps'}))); saveEntries(m); return m; }
  }catch(e){}
  try{
    const v1=JSON.parse(safeStorageGet(ENTRIES_KEY_V1));
    if(Array.isArray(v1)&&v1.length){
      const converted=v1.map(e=>{ const d=new Date(e.ts); return Number.isNaN(d.getTime())?null:{id:e.id,date:dateKey(d),time:timeStr(d),reps:e.reps,type:'situps'}; }).filter(Boolean);
      const m=normalizeEntries(converted); saveEntries(m); return m;
    }
  }catch(e){}
  return [];
}
function saveEntries(list){ storageSet(ENTRIES_KEY, JSON.stringify(Array.isArray(list)?list:[])); }

function loadGoals(){
  try{
    const g=JSON.parse(safeStorageGet(GOALS_KEY));
    if(g&&typeof g==='object'&&!Array.isArray(g)) return {situps:Number(g.situps)>0?Number(g.situps):50,pushups:Number(g.pushups)>0?Number(g.pushups):30};
  }catch(e){}
  const old=parseInt(safeStorageGet(GOAL_KEY_OLD),10), out={situps:(old&&old>0)?old:50,pushups:30}; saveGoals(out); return out;
}
function saveGoals(g){ storageSet(GOALS_KEY, JSON.stringify(g)); }

function loadStart(){
  try{ const x=JSON.parse(safeStorageGet(START_KEY)); if(x&&typeof x==='object'&&!Array.isArray(x)) return {situps:Number(x.situps)>0?Number(x.situps):0,pushups:Number(x.pushups)>0?Number(x.pushups):0}; }catch(e){}
  return {situps:0,pushups:0};
}
function saveStart(s){ storageSet(START_KEY, JSON.stringify(s)); }

function cleanGoalHistory(raw){
  const clean=(arr, fallback)=>{
    const a=Array.isArray(arr)?arr.filter(h=>h&&(h.from==='0000-01-01'||isValidDateKey(h.from))&&Number(h.goal)>0).map(h=>({from:h.from,goal:Number(h.goal)})):[];
    const byFrom=new Map(); a.forEach(h=>byFrom.set(h.from,h)); // bei Duplikaten gewinnt der letzte Eintrag
    const out=[...byFrom.values()];
    if(!out.length) out.push({from:'0000-01-01',goal:fallback});
    return out.sort((x,y)=>x.from.localeCompare(y.from));
  };
  return {situps:clean(raw?.situps,goals.situps),pushups:clean(raw?.pushups,goals.pushups)};
}
function loadGoalHistory(){
  try{ const h=JSON.parse(safeStorageGet(GOAL_HISTORY_KEY)); if(h&&typeof h==='object'&&!Array.isArray(h)) return cleanGoalHistory(h); }catch(e){}
  const h=cleanGoalHistory({}); saveGoalHistory(h); return h;
}
function saveGoalHistory(h){ storageSet(GOAL_HISTORY_KEY, JSON.stringify(h)); }
function effectiveGoal(type, key){
  const hist=(goalHistory[type]||[]).filter(h=>h.from==='0000-01-01'||h.from<=key).sort((a,b)=>a.from.localeCompare(b.from));
  if(hist.length===0) return goals[type]||0; return hist[hist.length-1].goal;
}
function setGoalFrom(type,newGoal,fromKey){
  const hist=goalHistory[type]||[], existing=hist.find(h=>h.from===fromKey);
  if(existing) existing.goal=newGoal; else hist.push({from:fromKey,goal:newGoal});
  goalHistory[type]=hist.sort((a,b)=>a.from.localeCompare(b.from)); saveGoalHistory(goalHistory);
}

function loadWeight(){ const w=parseFloat(safeStorageGet(WEIGHT_KEY)); return Number.isFinite(w)&&w>0?w:0; }
function saveWeight(w){ storageSet(WEIGHT_KEY, String(Number.isFinite(Number(w))?Number(w):0)); }
function loadWeightEntries(){
  try{
    const v=JSON.parse(safeStorageGet(WEIGHT_HISTORY_KEY));
    if(Array.isArray(v)){ const clean=normalizeWeightEntries(v); if(JSON.stringify(clean)!==JSON.stringify(v)) saveWeightEntries(clean); return clean; }
  }catch(e){}
  const legacy=parseFloat(safeStorageGet(WEIGHT_KEY));
  if(Number.isFinite(legacy)&&legacy>0){
    const entry={id:makeId('legacy-weight'),date:todayKey(),time:timeStr(new Date()),weightKg:legacy,bodyFatPct:null}; saveWeightEntries([entry]); return [entry];
  }
  return [];
}
function saveWeightEntries(list){ storageSet(WEIGHT_HISTORY_KEY, JSON.stringify(Array.isArray(list)?list:[])); }
function loadWeightGoal(){ const w=parseFloat(safeStorageGet(WEIGHT_GOAL_KEY)); return Number.isFinite(w)&&w>0?w:0; }
function saveWeightGoal(w){ storageSet(WEIGHT_GOAL_KEY, String(Number.isFinite(Number(w))?Number(w):0)); }
function loadWeightGoalDate(){ const d=safeStorageGet(WEIGHT_GOAL_DATE_KEY)||''; return isValidDateKey(d)?d:''; }
function saveWeightGoalDate(d){ storageSet(WEIGHT_GOAL_DATE_KEY, isValidDateKey(d)?d:''); }
function loadWeightGoalPlan(){
  try{
    const p=JSON.parse(safeStorageGet(WEIGHT_GOAL_PLAN_KEY));
    if(p && isValidDateKey(p.startDate) && p.startDate<=todayKey() && Number.isFinite(Number(p.startKg)) && Number(p.startKg)>0){
      return {startDate:p.startDate,startKg:Number(p.startKg),sourceEntryId:p.sourceEntryId?String(p.sourceEntryId):null};
    }
  }catch(e){}
  return null;
}
function saveWeightGoalPlan(p){
  storageSet(WEIGHT_GOAL_PLAN_KEY, JSON.stringify(
    p&&isValidDateKey(p.startDate)&&Number(p.startKg)>0
      ? {startDate:p.startDate,startKg:Number(p.startKg),sourceEntryId:p.sourceEntryId||null}
      : null
  ));
}
function latestWeightEntryAtOrBefore(key=todayKey()){
  for(let i=weightEntries.length-1;i>=0;i--){ if(weightEntries[i].date<=key) return weightEntries[i]; }
  return null;
}
function latestWeightEntry(){ return latestWeightEntryAtOrBefore(todayKey()); }
function plannedWeightForDate(key){
  if(!weightGoalPlan || !weightGoalKg || !weightGoalDate || !isValidDateKey(key)) return null;
  const a=new Date(weightGoalPlan.startDate+'T12:00:00').getTime(), b=new Date(weightGoalDate+'T12:00:00').getTime(), x=new Date(key+'T12:00:00').getTime();
  if(b<=a || x<a || x>b) return null;
  const pct=(x-a)/(b-a); return weightGoalPlan.startKg+(weightGoalKg-weightGoalPlan.startKg)*pct;
}
function goalDirection(){
  if(!weightGoalPlan || !weightGoalKg) return 0;
  return weightGoalKg<weightGoalPlan.startKg ? -1 : (weightGoalKg>weightGoalPlan.startKg ? 1 : 0);
}
function goalReachedAtWeight(w){
  if(!Number.isFinite(w) || !weightGoalPlan || !weightGoalKg) return false;
  const dir=goalDirection();
  if(dir<0) return w<=weightGoalKg;
  if(dir>0) return w>=weightGoalKg;
  return Math.abs(w-weightGoalKg)<0.05;
}
function refreshWeightGoalPlan(force=false){
  if(!weightGoalKg || !weightGoalDate){ weightGoalPlan=null; saveWeightGoalPlan(null); return; }
  if(force || !weightGoalPlan){
    const latest=latestWeightEntry();
    if(latest && weightGoalDate>latest.date){
      weightGoalPlan={startDate:latest.date,startKg:latest.weightKg,sourceEntryId:latest.id||null};
      saveWeightGoalPlan(weightGoalPlan);
    } else if(force){
      weightGoalPlan=null; saveWeightGoalPlan(null);
    }
  }
}
function reconcileGoalPlanAfterWeightChange(changedOrDeletedId){
  if(!weightGoalPlan || !weightGoalDate || !weightGoalKg) return;
  if(weightGoalPlan.sourceEntryId && weightGoalPlan.sourceEntryId===changedOrDeletedId){
    const source=weightEntries.find(e=>e.id===changedOrDeletedId) || null;
    const baseline=source || latestWeightEntry();
    if(baseline && baseline.date<=todayKey() && weightGoalDate>baseline.date){
      weightGoalPlan={startDate:baseline.date,startKg:baseline.weightKg,sourceEntryId:baseline.id||null};
    }else weightGoalPlan=null;
    saveWeightGoalPlan(weightGoalPlan);
  }
}
function weightGoalStatusText(){
  if(!weightGoalKg) return '';
  const current=latestWeightEntry();
  if(!weightGoalDate) return current ? `Ziel: ${fmtKg(weightGoalKg)} · ohne Termin` : `Ziel: ${fmtKg(weightGoalKg)} · noch keine Gewichtsmessung`;
  if(!weightGoalPlan){
    if(!current) return `Ziel: ${fmtKg(weightGoalKg)} bis ${fmtShort(weightGoalDate)} · Plan startet mit der ersten Gewichtsmessung.`;
    return `Zieltermin ${fmtShort(weightGoalDate)} ist nicht nach dem Ausgangspunkt – keine Soll-Linie möglich.`;
  }
  const start=weightGoalPlan.startDate, deadline=weightGoalDate;
  if(deadline<=start) return 'Ungültiger Zielplan: Der Termin muss nach dem Ausgangspunkt liegen.';
  const dir=goalDirection();
  const directionText=dir<0?'Abnahme':(dir>0?'Zunahme':'Gewicht halten');
  const today=todayKey();
  if(today<deadline){
    if(!current) return `${directionText}: ${fmtKg(weightGoalPlan.startKg)} → ${fmtKg(weightGoalKg)} bis ${fmtShort(deadline)}.`;
    if(goalReachedAtWeight(current.weightKg)) return `Ziel bereits vorzeitig erreicht · aktuell ${fmtKg(current.weightKg)} · Termin ${fmtShort(deadline)}.`;
    const planned=plannedWeightForDate(today);
    if(Number.isFinite(planned)){
      const delta=Math.abs(current.weightKg-planned);
      if(delta<0.05) return `${directionText}: aktuell ${fmtKg(current.weightKg)} · Soll heute ${fmtKg(planned)} · genau im Plan.`;
      const ahead=dir<0 ? current.weightKg<planned : (dir>0 ? current.weightKg>planned : Math.abs(current.weightKg-weightGoalKg)<0.05);
      return `${directionText}: aktuell ${fmtKg(current.weightKg)} · Soll heute ${fmtKg(planned)} · ${delta.toFixed(1).replace('.',',')} kg ${ahead?'vor':'hinter'} Plan.`;
    }
  }
  const atDeadline=latestWeightEntryAtOrBefore(deadline);
  if(!atDeadline) return `Zieltermin ${fmtShort(deadline)} erreicht · kein Messwert bis zum Termin vorhanden.`;
  const met=goalReachedAtWeight(atDeadline.weightKg);
  const miss=Math.abs(atDeadline.weightKg-weightGoalKg);
  if(atDeadline.date===deadline){
    const base=`Termin ${fmtShort(deadline)}: ${fmtKg(atDeadline.weightKg)}`;
    if(met) return `${base} · Ziel erreicht.`;
    return `${base} · Ziel um ${miss.toFixed(1).replace('.',',')} kg verfehlt.`;
  }
  const base=`Zieltermin ${fmtShort(deadline)}: letzter Messwert davor ${fmtKg(atDeadline.weightKg)} vom ${fmtShort(atDeadline.date)}`;
  if(met) return `${base} · lag im Zielbereich; keine Messung direkt am Termin.`;
  return `${base} · lag ${miss.toFixed(1).replace('.',',')} kg vom Ziel entfernt; keine Messung direkt am Termin.`;
}
function effectiveWeightKg(){ const e=latestWeightEntry(); return e&&Number.isFinite(e.weightKg)?e.weightKg:0; }
function weightEntriesThroughToday(){ return weightEntries.filter(e=>e.date<=todayKey()); }
function fatMassOf(e){ return e&&Number.isFinite(e.weightKg)&&e.bodyFatPct!=null&&Number.isFinite(e.bodyFatPct)?e.weightKg*e.bodyFatPct/100:null; }
function loadType(){ const t=safeStorageGet(TYPE_KEY); return t==='pushups'?'pushups':'situps'; }
function saveType(t){ storageSet(TYPE_KEY,t); }
function loadLastExport(){ return safeStorageGet(LAST_EXPORT_KEY); }
function saveLastExport(iso){ storageSet(LAST_EXPORT_KEY,iso); }
function loadTopType(){ const t=safeStorageGet(TOP_TYPE_KEY); return t==='weight'||t==='pushups'||t==='situps'?t:loadType(); }
function saveTopType(t){ storageSet(TOP_TYPE_KEY,t); }
function loadBottomMode(){ return safeStorageGet(BOTTOM_MODE_KEY)==='stats'?'stats':'log'; }
function saveBottomMode(m){ storageSet(BOTTOM_MODE_KEY,m); }

let entries = loadEntries();
let goals = loadGoals();
let goalHistory = loadGoalHistory();
let startValues = loadStart();
let weightKg = loadWeight();
let weightEntries = loadWeightEntries();
let weightGoalKg = loadWeightGoal();
let weightGoalDate = loadWeightGoalDate();
let weightGoalPlan = loadWeightGoalPlan();
weightKg = effectiveWeightKg();
let currentType = loadType();
let topType = loadTopType();
if(topType!=='weight') currentType=topType;
let bottomMode = loadBottomMode(); // bleibt beim Wechsel Situps / Liegestütze / Gewicht erhalten
let currentTheme = loadTheme();
applyTheme(currentTheme);
let now = new Date();
let calYear = now.getFullYear();
let calMonth = now.getMonth();
let dayEditorDate = null;

function typeEntries(){ return entries.filter(e=>e.type===currentType); }
function typeEntriesThroughToday(type=currentType){ return entries.filter(e=>e.type===type && e.date<=todayKey()); }
function goal(){ return goals[currentType] || 50; }
function fmtDateHuman(key){ const d = new Date(key+'T12:00:00'); return d.toLocaleDateString('de-DE',{weekday:'long', day:'2-digit', month:'2-digit'}); }
function totalForDate(key){ return typeEntries().filter(e=>e.date===key).reduce((s,e)=>s+e.reps,0); }

let goalCelebrated = {};
function softFeedback(el){
  try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
  if(el){ el.classList.remove('tap-feedback'); void el.offsetWidth; el.classList.add('tap-feedback'); }
}
function celebrateGoal(type){
  const key=type+'-'+todayKey(); if(goalCelebrated[key]) return; goalCelebrated[key]=true;
  softFeedback(document.getElementById('dialBtn'));
  const fx=document.getElementById('celebrationFx'); if(!fx) return;
  fx.classList.remove('show'); void fx.offsetWidth; fx.classList.add('show');
  setTimeout(()=>fx.classList.remove('show'),1050);
}
function maybeCelebrateGoal(before, after){ if(before<goal() && after>=goal()) celebrateGoal(currentType); }
function confirmSuspiciousWeight(w,f,d){
  const latest=latestWeightEntry(); const warnings=[];
  if(w<35 || w>220) warnings.push(`Gewicht ${fmtKg(w)}`);
  if(f<5 || f>50) warnings.push(`Körperfett ${fmtPct(f)}`);
  if(latest){ const dw=Math.abs(w-latest.weightKg); if(dw>=5) warnings.push(`Gewichtssprung ${dw.toFixed(1).replace('.',',')} kg`);
    if(latest.bodyFatPct!=null && Math.abs(f-latest.bodyFatPct)>=8) warnings.push(`Körperfett-Sprung ${Math.abs(f-latest.bodyFatPct).toFixed(1).replace('.',',')} %`); }
  if(d>todayKey()) warnings.push('Datum liegt in der Zukunft');
  return !warnings.length || window.confirm('Auffällige Eingabe:\n\n'+warnings.join('\n')+'\n\nTrotzdem speichern?');
}

function addEntry(date, time, reps){
  reps = parseInt(reps,10);
  if(!reps || reps<=0) return;
  const before = date===todayKey() ? totalForDate(date) : 0;
  entries.push({ id: Date.now()+"-"+Math.random().toString(36).slice(2,7), date, time: time||timeStr(new Date()), reps, type: currentType });
  saveEntries(entries); renderAll();
  softFeedback(document.getElementById('dialBtn'));
  if(date===todayKey()) maybeCelebrateGoal(before,totalForDate(date));
}
function updateEntry(id, opts){
  const e = entries.find(x=>x.id===id);
  if(!e) return;
  if(opts.time) e.time = opts.time;
  if(opts.reps!==undefined){ const r = parseInt(opts.reps,10); if(r && r>0) e.reps = r; }
  saveEntries(entries); renderAll();
}
function deleteEntry(id){
  entries = entries.filter(e=>e.id!==id);
  saveEntries(entries); renderAll();
}

