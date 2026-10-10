(function () {
  const d = DAVETIYE;
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const envelope = $("envelope");
  const card = $("card");
  const tilt = $("tilt");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // İçerik
  const initial = (s) => s.trim().charAt(0).toLocaleUpperCase("tr-TR");
  $("bride").textContent = d.gelin;
  $("groom").textContent = d.damat;
  $("initialBride").textContent = initial(d.gelin);
  $("initialGroom").textContent = initial(d.damat);
  $("seal").textContent = initial(d.gelin) + initial(d.damat);
  $("venueName").textContent = d.mekan;
  $("venueAddr").textContent = d.adres;
  $("mapLink").href = d.harita ||
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(d.mekan + " " + d.adres);
  document.title = d.gelin + " & " + d.damat + " | Düğün Davetiyesi";

  const when = new Date(d.tarih);
  $("dateText").textContent = when.toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", weekday: "long",
  }) + " · " + when.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const photo = $("photo");
  const img = $("photoImg");
  img.onerror = () => photo.classList.add("empty");
  img.src = d.foto;

  // Geri sayım
  function tick() {
    const left = Math.max(0, when - Date.now());
    $("cdD").textContent = Math.floor(left / 864e5);
    $("cdH").textContent = Math.floor(left / 36e5) % 24;
    $("cdM").textContent = Math.floor(left / 6e4) % 60;
    $("cdS").textContent = Math.floor(left / 1e3) % 60;
  }
  tick();
  setInterval(tick, 1000);

  // Açılış: zarf kapağı -> kart yükselir -> ortaya gelir -> kapaklar açılır
  let opened = false;
  function open() {
    if (opened) return;
    opened = true;
    card.setAttribute("aria-hidden", "false");
    const step = reduced ? 0 : 1;
    stage.classList.add("open");
    setTimeout(() => stage.classList.add("rise"), 700 * step);
    setTimeout(() => stage.classList.add("show"), 1500 * step);
    setTimeout(() => stage.classList.add("unfold"), 2500 * step);
  }
  envelope.addEventListener("click", open);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });

  // Fareyle hafif 3B eğim
  if (!reduced && matchMedia("(hover: hover)").matches) {
    stage.addEventListener("pointermove", (e) => {
      if (!stage.classList.contains("unfold")) return;
      const x = e.clientX / innerWidth - .5;
      const y = e.clientY / innerHeight - .5;
      tilt.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
      tilt.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
    });
  }
})();
