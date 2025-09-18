aiBtn.addEventListener("click", async () => {
  const item = $("item").value.trim();
  if(!item){ alert("Type what it is first."); return; }

  aiStatus.textContent = "Checking key…";
  aiBtn.disabled = true;

  try {
    // quick ping so we can tell if Netlify passed the env var
    const ping = await fetch("/api/generate-logo", { method: "GET" });
    const pingData = await ping.json().catch(()=>({}));
    if (!ping.ok || !pingData?.keyFound) {
      aiStatus.textContent = "Server missing OPENAI_API_KEY.";
      aiBtn.disabled = false;
      return;
    }

    aiStatus.textContent = "Making icon…";
    const res = await fetch("/api/generate-logo", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        prompt: `flat cute pastel icon for ${item}, no text, white or transparent bg`
      })
    });

    if(!res.ok){
      const msg = await res.text();
      aiStatus.textContent = `Icon failed: ${truncate(msg, 140)}`;
      s.ai = null;
      aiBtn.disabled = false;
      return;
    }

    const data = await res.json();
    s.ai = data.dataUrl;
    aiStatus.textContent = "Icon ready ✓";
  } catch (e) {
    console.error(e);
    aiStatus.textContent = `Icon failed: ${e.message}`;
    s.ai = null;
  } finally {
    aiBtn.disabled = false;
  }
});

function truncate(str, n){
  if(typeof str !== "string") return "";
  return str.length > n ? str.slice(0, n-1) + "…" : str;
}
