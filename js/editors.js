/* ---------- Day editor modal ---------- */
function openDayEditor(key){
  dayEditorDate = key;
  document.getElementById('dayModalTitle').textContent = fmtDateHuman(key);
  document.getElementById('newSetTime').value = (key===todayKey()) ? timeStr(new Date()) : '12:00';
  document.getElementById('newSetReps').value = '';
  renderDayEditor(key);
  document.getElementById('dayOverlay').classList.add('open');
}
function closeDayEditor(){ document.getElementById('dayOverlay').classList.remove('open'); dayEditorDate = null; }
function renderDayEditor(key){
  const sets = typeEntries().filter(e=>e.date===key).slice().sort((a,b)=>a.time.localeCompare(b.time));
  const el = document.getElementById('dayEditRows');
  el.innerHTML = sets.length===0 ? '<div class="empty">Keine Sätze an diesem Tag.</div>' : sets.map(e=>`
      <div class="edit-row">
        <input type="time" value="${e.time}" data-time="${e.id}">
        <input type="number" inputmode="numeric" value="${e.reps}" data-reps="${e.id}">
        <span class="del" data-del="${e.id}">löschen</span>
      </div>`).join('');
}
document.getElementById('dayEditRows').addEventListener('change', (e)=>{
  const timeId = e.target.getAttribute('data-time'), repsId = e.target.getAttribute('data-reps');
  if(timeId) updateEntry(timeId, {time:e.target.value});
  if(repsId) updateEntry(repsId, {reps:e.target.value});
});
document.getElementById('dayEditRows').addEventListener('click', (e)=>{
  const id = e.target.getAttribute('data-del'); if(id) deleteEntry(id);
});
document.getElementById('newSetAdd').addEventListener('click', ()=>{
  const t = document.getElementById('newSetTime').value, r = document.getElementById('newSetReps').value;
  if(dayEditorDate){ addEntry(dayEditorDate, t, r); document.getElementById('newSetReps').value=''; renderDayEditor(dayEditorDate); }
});
document.getElementById('dayModalClose').addEventListener('click', closeDayEditor);
document.getElementById('dayOverlay').addEventListener('click', (e)=>{ if(e.target.id==='dayOverlay') closeDayEditor(); });

