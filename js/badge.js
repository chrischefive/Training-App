/* Homescreen-Badge: ausschließlich heutige offene Punkte; kein Backupzustand. */
(() => {
  const $=id=>document.getElementById(id);
  const ENABLE_KEY='trainingBadgeEnabled';
  const supported=()=>typeof navigator.setAppBadge==='function'&&typeof navigator.clearAppBadge==='function';
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches===true || navigator.standalone===true;
  const permission=()=>typeof Notification==='undefined'?'unavailable':Notification.permission;
  const enabled=()=>{try{return localStorage.getItem(ENABLE_KEY)==='1';}catch(e){return false;}};
  const setEnabled=v=>{try{localStorage.setItem(ENABLE_KEY,v?'1':'0');}catch(e){}};
  function totalForDateType(k,type){return entries.reduce((sum,e)=>sum+(e.date===k&&e.type===type?e.reps:0),0);}
  function todayOpenCount(){
    const k=todayKey(); let n=0;
    if(totalForDateType(k,'situps')<effectiveGoal('situps',k)) n++;
    if(totalForDateType(k,'pushups')<effectiveGoal('pushups',k)) n++;
    if(!weightEntriesThroughToday().some(e=>e.date===k)) n++;
    return Math.max(0,Math.min(3,n));
  }
  function iosHint(){return 'Falls trotzdem keine Zahl erscheint: iPhone Einstellungen → Mitteilungen → Training → „Kennzeichen/Badges“ einschalten.';}
  function renderBadgeStatus(extra=''){
    const status=$('badgeStatus'); if(!status)return;
    const n=todayOpenCount(), api=supported()?'API verfügbar':'API fehlt', mode=standalone()?'Homescreen-App':'nicht als Web-App geöffnet', perm=permission();
    const p=perm==='granted'?'Mitteilungen erlaubt':perm==='denied'?'Mitteilungen abgelehnt':perm==='default'?'Mitteilungen noch nicht erlaubt':'Mitteilungsstatus nicht verfügbar';
    status.textContent=`${api} · ${mode} · ${p} · aktueller Zähler ${n}.${extra?' '+extra:''}`;
    status.className=(supported()&&standalone()&&perm==='granted')?'status ok':'status warn';
  }
  async function setCount(n){
    if(!supported())return {ok:false,error:'Badging API nicht verfügbar'};
    try{
      if(n>0) await navigator.setAppBadge(n); else await navigator.clearAppBadge();
      return {ok:true};
    }catch(e){return {ok:false,error:(e&&e.message)||String(e)};}
  }
  async function syncTodayBadge(force=false){
    if(!supported())return false;
    // WebKit erlaubt setAppBadge bereits vor Freigabe der Mitteilungen. Dadurch ist
    // der aktuelle Zähler sofort vorgemerkt und erscheint nach erteilter Erlaubnis.
    if(!force&&!enabled())return false;
    return (await setCount(todayOpenCount())).ok;
  }
  async function requestPermissionFromTap(){
    if(typeof Notification==='undefined')return 'unavailable';
    let p=Notification.permission;
    if(p==='default'){
      try{p=await Notification.requestPermission();}catch(e){return 'error';}
    }
    return p;
  }
  async function enableBadge(){
    if(!standalone()){
      renderBadgeStatus('Bitte die App vom Home-Bildschirm öffnen. Beim Hinzufügen muss „Als Web-App öffnen“ aktiviert sein.');
      return;
    }
    if(!supported()){
      renderBadgeStatus('Diese Installation stellt navigator.setAppBadge nicht bereit.');
      return;
    }
    // Zähler zuerst vormerken; WebKit übernimmt ihn, sobald Anzeige erlaubt ist.
    setEnabled(true); await syncTodayBadge(true);
    const p=await requestPermissionFromTap();
    if(p!=='granted'){
      renderBadgeStatus(p==='denied'?'Mitteilungen sind in iOS abgelehnt. Bitte in den Einstellungen für „Training“ erlauben.':'iOS hat keine Mitteilungsfreigabe erteilt.');
      return;
    }
    const ok=await syncTodayBadge(true);
    renderBadgeStatus(ok?`Badge wurde gesetzt. ${iosHint()}`:'Der API-Aufruf ist fehlgeschlagen.');
  }
  async function testBadge(){
    if(!standalone()){renderBadgeStatus('Badge-Test nur aus der installierten Homescreen-App möglich.');return;}
    if(!supported()){renderBadgeStatus('Badging API ist auf diesem Startweg nicht verfügbar.');return;}
    setEnabled(true);
    const p=await requestPermissionFromTap();
    if(p!=='granted'){renderBadgeStatus('Für den Test müssen Mitteilungen erlaubt sein.');return;}
    const r=await setCount(3);
    renderBadgeStatus(r.ok?`TEST: Badge 3 wurde an iOS gesendet. Jetzt zum Home-Bildschirm wechseln. ${iosHint()}`:`Badge-Test fehlgeschlagen: ${r.error}`);
  }
  async function restoreBadge(){setEnabled(true);const ok=await syncTodayBadge(true);renderBadgeStatus(ok?`Aktueller Tageszähler wurde gesetzt. ${iosHint()}`:'Aktueller Tageszähler konnte nicht gesetzt werden.');}

  const oldAll=window.renderAll;if(typeof oldAll==='function')window.renderAll=function(){const r=oldAll.apply(this,arguments);syncTodayBadge();return r;};
  const oldWeight=window.renderWeightTab;if(typeof oldWeight==='function')window.renderWeightTab=function(){const r=oldWeight.apply(this,arguments);syncTodayBadge();return r;};
  $('badgeEnableBtn')?.addEventListener('click',enableBadge);
  $('badgeTestBtn')?.addEventListener('click',testBadge);
  $('badgeRestoreBtn')?.addEventListener('click',restoreBadge);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncTodayBadge();renderBadgeStatus();}});
  window.addEventListener('focus',()=>syncTodayBadge());
  window.addEventListener('pageshow',()=>{syncTodayBadge();renderBadgeStatus();});
  syncTodayBadge();renderBadgeStatus();
  window.trainingTodayOpenBadgeCount=todayOpenCount;window.syncTodayBadge=syncTodayBadge;
})();
