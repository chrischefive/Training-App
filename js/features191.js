/* v1.9.1: global Today card, Today visibility preference and cohesive themed form controls. */
(() => {
  const TODAY_PREF_KEY='training-v191-show-today';
  const $=id=>document.getElementById(id);
  function getPref(){
    try{
      const v=safeStorageGet(TODAY_PREF_KEY);
      return v===null ? true : v!=='0';
    }catch(e){
      try{const v=localStorage.getItem(TODAY_PREF_KEY);return v===null?true:v!=='0';}catch(_){return true;}
    }
  }
  function setPref(on){
    try{storageSet(TODAY_PREF_KEY,on?'1':'0');}
    catch(e){try{localStorage.setItem(TODAY_PREF_KEY,on?'1':'0');}catch(_){}}
  }
  function ensureGlobalToday(){
    const dashboard=$('todayDashboard'), switcher=document.querySelector('.type-switch');
    if(!dashboard||!switcher)return;
    let slot=$('globalTodaySlot');
    if(!slot){slot=document.createElement('div');slot.id='globalTodaySlot';slot.className='global-today-slot';switcher.insertAdjacentElement('afterend',slot);}
    if(dashboard.parentElement!==slot)slot.appendChild(dashboard);
    dashboard.classList.add('v191-dashboard');
    applyTodayVisibility();
  }
  function applyTodayVisibility(){
    const on=getPref(),slot=$('globalTodaySlot'),box=$('todayShowToggle');
    if(slot){slot.hidden=!on;slot.setAttribute('aria-hidden',on?'false':'true');}
    if(box)box.checked=on;
  }
  function ensureSetting(){
    if($('todayShowToggle'))return;
    const themeField=$('themeRow')?.closest('.settings-field');
    if(!themeField)return;
    const field=document.createElement('div');field.className='settings-field v191-today-setting';
    field.innerHTML='<label class="v191-switch-row"><span><strong>Heute anzeigen</strong></span><input type="checkbox" id="todayShowToggle" aria-label="Heute anzeigen"></label>';
    const divider=document.createElement('hr');divider.className='divider v191-today-divider';
    themeField.insertAdjacentElement('afterend',divider);divider.insertAdjacentElement('afterend',field);
    const oldDivider=field.nextElementSibling;
    if(oldDivider?.classList.contains('divider')) oldDivider.remove();
    const box=$('todayShowToggle');box.checked=getPref();
    box.addEventListener('change',()=>{setPref(box.checked);applyTodayVisibility();});
  }
  function repairExplorer(){
    const root=$('explorer2Controls');if(!root)return;
    root.classList.add('v191-explorer');
    root.querySelectorAll('.v190-explorer-period').forEach((period,i)=>{
      period.classList.add('v191-period-card');
      const inputs=period.querySelectorAll('input[type="date"]');
      if(inputs.length===2 && !period.querySelector('.v191-date-fields')){
        const title=period.querySelector('strong');
        const middle=period.querySelector('span');
        const fields=document.createElement('div');fields.className='v191-date-fields';
        const a=document.createElement('label');a.className='v191-date-field';a.innerHTML='<span>Von</span>';a.appendChild(inputs[0]);
        const b=document.createElement('label');b.className='v191-date-field';b.innerHTML='<span>Bis</span>';b.appendChild(inputs[1]);
        fields.append(a,b);if(middle)middle.remove();
        if(title)title.insertAdjacentElement('afterend',fields);else period.appendChild(fields);
      }
    });
    const cmp=$('explorer2Compare'), b=$('explorer2PeriodB');
    if(cmp&&b){cmp.onchange=()=>{b.style.display=cmp.checked?'flex':'none';};b.style.display=cmp.checked?'flex':'none';}
  }
  function refresh(){ensureSetting();ensureGlobalToday();repairExplorer();applyTodayVisibility();}
  refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('pageshow',refresh);
  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==='function')window.renderAll=function(){const r=oldRenderAll.apply(this,arguments);ensureGlobalToday();return r;};
})();
