const s = { items: [], ai: null };
const $ = id => document.getElementById(id);
const form = $("f"), sheet = $("sheet");
const iconMode = $("iconMode"), emoji = $("emoji"), aiBtn = $("aiBtn"), aiStatus = $("aiStatus");

iconMode.addEventListener("change", () => {
  const useEmoji = iconMode.value === "emoji";
  emoji.disabled = !useEmoji;
});

aiBtn.addEventListener("click", async () => {
  const item = $("item").value.trim();
  if(!item){ alert("Type what it is first."); return; }
  aiStatus.textContent = "Making icon…";
  aiBtn.disabled = true;
  try{
    const res = await fetch("/api/generate-logo", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ prompt: `flat cute pastel icon for ${item}, no text, white or transparent bg` })
    });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    s.ai = data.dataUrl;
    aiStatus.textContent = "Icon ready ✓";
  }catch(e){
    console.error(e);
    aiStatus.textContent = "Icon failed.";
    s.ai = null;
  }finally{
    aiBtn.disabled = false;
  }
});

form.addEventListener("submit", e => {
  e.preventDefault();
  const name = $("item").value.trim();
  if(!name) return;

  let exp;
  const mode = [...document.querySelectorAll('input[name="mode"]')].find(r=>r.checked).value;
  if(mode==="days"){
    const d = new Date(); d.setDate(d.getDate()+ (parseInt($("days").value,10)||0));
    exp = d.toISOString().slice(0,10);
  } else {
    if(!$("date").value){ alert("Pick a date."); return; }
    exp = $("date").value;
  }

  const owner = $("owner").value.trim();
  const useAI = iconMode.value==="ai" && s.ai;

  s.items.push({
    id: crypto.randomUUID(),
    name, owner, exp,
    icon: useAI ? {type:"ai", val:s.ai} : {type:"emoji", val: emoji.value.trim() || "🥫"}
  });

  $("item").focus();
  s.ai = null; aiStatus.textContent = "";
  render();
});

$("print").addEventListener("click", ()=>window.print());
$("clear").addEventListener("click", ()=>{
  if(confirm("Clear all labels?")){ s.items = []; render(); }
});

function render(){
  sheet.innerHTML = "";
  s.items.forEach(it=>{
    const div = document.createElement("div"); div.className="label";
    const icon = document.createElement("div"); icon.className="icon";
    if(it.icon.type==="ai"){
      const img = document.createElement("img"); img.src = it.icon.val; icon.appendChild(img);
    } else {
      const span = document.createElement("span"); span.className="emoji"; span.textContent = it.icon.val; icon.appendChild(span);
    }
    const meta = document.createElement("div");
    const title = document.createElement("div"); title.className="title";
    title.textContent = it.name + (it.owner?` — ${it.owner}`:"");
    const sub   = document.createElement("div"); sub.className="sub";
    sub.textContent = "Eat by: " + new Date(it.exp+"T00:00:00").toLocaleDateString();
    meta.append(title, sub);
    div.append(icon, meta);
    sheet.appendChild(div);
  });
}

render();
