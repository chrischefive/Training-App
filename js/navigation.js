/* ---------- Type switch ---------- */
function activateTopView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(view).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
}
function applyTypeUI(){
  document.querySelectorAll('.type-btn').forEach(b=> b.classList.toggle('active', b.dataset.type===currentType));
  document.getElementById('typeLabel').textContent = TYPE_LABELS[currentType];
  document.getElementById('quickChips').innerHTML = CHIP_VALUES[currentType].map((v,i)=>
    `<div class="chip" data-add="${v}" style="background:${rbCycle()[i % 6]}">+${v}</div>`).join('');
  document.querySelectorAll('#quickChips .chip').forEach(c=>
    c.addEventListener('click', ()=> addEntry(todayKey(), timeStr(new Date()), c.dataset.add)));
}
function syncBottomNav(){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===bottomMode));
}
function syncHeaderMode(){
  const modeLabel = bottomMode==='stats' ? 'Statistik' : 'Log';
  const label = topType==='weight' ? 'Gewicht' : TYPE_LABELS[currentType];
  document.getElementById('typeLabel').textContent = label;
  const brand = document.querySelector('.brand');
  if(brand) brand.innerHTML = `<b id="typeLabel">${label}</b> · ${modeLabel}`;
}
function showCurrentArea(){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  if(topType==='weight'){
    document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active', b.dataset.type==='weight'));
    const target = bottomMode==='stats' ? 'viewWeightStats' : 'viewWeight';
    document.getElementById(target).classList.add('active');
    if(bottomMode==='stats') renderWeightTab();
  } else {
    applyTypeUI();
    const target = bottomMode==='stats' ? 'viewStats' : 'viewLog';
    document.getElementById(target).classList.add('active');
    if(bottomMode==='stats'){ renderStatsTab(); renderChartAndStats(); }
    else renderAll();
  }
  syncBottomNav();
  syncHeaderMode();
}
document.querySelectorAll('.type-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    topType = btn.dataset.type; saveTopType(topType);
    if(topType!=='weight'){
      currentType = topType;
      saveType(currentType);
    }
    showCurrentArea();
  });
});

