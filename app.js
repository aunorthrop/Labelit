// Minimal state
const state = {
  items: [],         // current sheet
  saved: loadSaved(),// historical
  aiIconDataURL: null
};

const el = (id) => document.getElementById(id);

const form = el('labelForm');
const sheet = el('sheet');
const savedList = el('savedList');
const printBtn = el('printBtn');
const clearSheetBtn = el('clearSheetBtn');
const clearSavedBtn = el('clearSavedBtn');
const templateSel = el('template');
const includeQR = el('includeQR');
const iconStyleSel = el('iconStyle');
const emojiPickerWrap = el('emojiPickerWrap');
const genAiIconBtn = el('genAiIconBtn');
const aiStatus = el('aiStatus');

syncTemplate();

iconStyleSel.addEventListener('change', () => {
  const v = iconStyleSel.value;
  emojiPickerWrap.style.display = (v === 'emoji') ? 'block' : 'none';
});

templateSel.addEventListener('change', syncTemplate);

function syncTemplate(){
  sheet.className = 'sheet ' + templateSel.value;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const itemName = el('itemName').value.trim();
  if(!itemName) return;

  const ownerName = el('ownerName').value.trim();
  const notes = el('notes').value.trim();

  const mode = [...document.querySelectorAll('input[name="expiryMode"]')].find(r => r.checked)?.value || 'days';
  let expiresOn;

  if(mode === 'days'){
    const days = parseInt(el('daysUntil').value, 10) || 0;
    const d = new Date();
    d.setDate(d.getDate() + days);
    expiresOn = d.toISOString().slice(0,10);
  } else {
    const d = el('expiryDate').value;
    if(!d) { alert('Pick a date or use days.'); return; }
    expiresOn = d;
  }

  const iconStyle = iconStyleSel.value;
  const emoji = el('emoji').value.trim() || '🥫';
  let icon = { type: iconStyle, value: emoji };

  if(iconStyle === 'ai' && state.aiIconDataURL){
    icon = { type: 'ai', value: state.aiIconDataURL };
  } else if(iconStyle === 'ai' && !state.aiIconDataURL){
    if(!confirm('No AI icon generated yet. Add without icon?')) return;
    icon = { type: 'emoji', value: emoji };
  } else if(iconStyle === 'mono'){
    icon = { type: 'mono', value: 'placeholder' };
  }

  const item = {
    id: crypto.randomUUID(),
    itemName, ownerName, notes, expiresOn, created: new Date().toISOString(),
    icon
  };

  state.items.push(item);
  renderSheet();
  addSaved(item);
  form.reset();
  state.aiIconDataURL = null;
  aiStatus.textContent = '';
});

genAiIconBtn.addEventListener('click', async () => {
  const itemName = el('itemName').value.trim();
  if(!itemName){ alert('Enter “What is it?” first.'); return; }
  aiStatus.textContent = 'Generating icon…';
  genAiIconBtn.disabled = true;
  try{
    const res = await fetch('/api/generate-logo', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ prompt: `flat, cute, simple fridge-friendly icon of ${itemName}; no text; white or transparent background; cohesive pastel; minimal shadows` })
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error(t || 'Request failed');
    }
    const data = await res.json();
    state.aiIconDataURL = data.dataUrl;
    aiStatus.textContent = 'Icon ready ✓ (it will attach to the next label)';
  } catch(err){
    console.error(err);
    aiStatus.textContent = 'AI icon failed. Using emoji fallback.';
  } finally{
    genAiIconBtn.disabled = false;
  }
});

printBtn.addEventListener('click', () => {
  if(state.items.length === 0){
    if(!confirm('Sheet is empty. Print anyway?')) return;
  }
  window.print();
});

clearSheetBtn.addEventListener('click', () => {
  if(!confirm('Clear current sheet preview?')) return;
  state.items = [];
  renderSheet();
});

clearSavedBtn.addEventListener('click', () => {
  if(!confirm('Clear all saved items from this browser?')) return;
  localStorage.removeItem('fridge_saved');
  state.saved = [];
  renderSaved();
});

function renderSheet(){
  sheet.innerHTML = '';
  state.items.forEach(item => {
    const node = makeLabelNode(item);
    sheet.appendChild(node);
  });
}

function makeLabelNode(item){
  const div = document.createElement('div');
  div.className = 'label';
  const icon = document.createElement('div');
  icon.className = 'iconWrap';

  if(item.icon.type === 'emoji'){
    const span = document.createElement('span');
    span.className = 'emoji';
    span.textContent = item.icon.value;
    icon.appendChild(span);
  } else if(item.icon.type === 'ai'){
    const img = document.createElement('img');
    img.src = item.icon.value;
    img.alt = 'AI icon';
    icon.appendChild(img);
  } else {
    const img = document.createElement('img');
    img.src = 'assets/placeholder.svg';
    img.alt = 'icon';
    icon.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = item.itemName + (item.ownerName ? ` — ${item.ownerName}` : '');
  meta.appendChild(title);

  if(item.notes){
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = item.notes;
    meta.appendChild(sub);
  }

  const exp = document.createElement('div');
  exp.className = 'exp';
  exp.textContent = `Eat by: ${formatDate(item.expiresOn)}`;
  meta.appendChild(exp);

  div.appendChild(icon);
  div.appendChild(meta);

  if(el('includeQR').checked){
    const qr = document.createElement('img');
    qr.className = 'qr';
    const url = location.origin + location.pathname; // app home
    qr.src = makeTinyQR(url);
    qr.alt = 'QR';
    div.appendChild(qr);
  }

  return div;
}

function addSaved(item){
  state.saved.unshift(item);
  saveSaved(state.saved);
  renderSaved();
}

function renderSaved(){
  savedList.innerHTML = '';
  state.saved.forEach(i => {
    const row = document.createElement('div');
    row.className = 'savedItem';
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = formatDate(i.expiresOn);
    row.appendChild(chip);
    const text = document.createElement('span');
    text.textContent = `${i.itemName}${i.ownerName ? ' — '+i.ownerName : ''}`;
    row.appendChild(text);
    const readd = document.createElement('button');
    readd.textContent = 'Add to sheet';
    readd.className = 'small';
    readd.addEventListener('click', () => {
      state.items.push(i);
      renderSheet();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    row.appendChild(readd);
    savedList.appendChild(row);
  });
}

function loadSaved(){
  try{ return JSON.parse(localStorage.getItem('fridge_saved') || '[]'); }
  catch{ return [] }
}
function saveSaved(list){
  localStorage.setItem('fridge_saved', JSON.stringify(list));
}

function formatDate(iso){
  try{
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString();
  }catch{ return iso }
}

// ultra-light QR (not a real QR; just placeholder data URI so printout has scannable anchor if you swap later)
function makeTinyQR(text){
  // For MVP: data URL of 1x1 pixel placeholder. Replace with real QR lib later.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
    <rect width='100%' height='100%' fill='#000'/>
    <rect x='4' y='4' width='52' height='52' fill='#fff'/>
    <rect x='8' y='8' width='12' height='12' fill='#000'/>
    <rect x='40' y='8' width='12' height='12' fill='#000'/>
    <rect x='8' y='40' width='12' height='12' fill='#000'/>
    <rect x='28' y='28' width='8' height='8' fill='#000'/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// initial render
renderSaved();
renderSheet();
