(function () {
  // Bağlantıdaki parametreler config.js'teki örneğin yerine geçer:
  // g=gelin, d=damat, t=tarih, m=mekân, a=adres, h=harita, f=fotoğraf,
  // ga/da=aileler, n=not, w=WhatsApp, s=tema
  const p = new URLSearchParams(location.search);
  const custom = p.has("g") || p.has("d");
  const text = (k, max) => (p.get(k) || "").trim().slice(0, max);
  const httpsUrl = (k) => {
    try {
      const u = new URL(p.get(k) || "");
      return u.protocol === "https:" ? u.href : "";
    } catch (e) { return ""; }
  };
  const TZ = "Europe/Istanbul";
  const THEMES = ["zumrut", "gul", "gece"];
  const d = {
    gelin: text("g", 40) || DAVETIYE.gelin,
    damat: text("d", 40) || DAVETIYE.damat,
    tarih: isNaN(new Date(text("t", 40))) ? DAVETIYE.tarih : text("t", 40),
    mekan: text("m", 80) || DAVETIYE.mekan,
    adres: custom ? text("a", 160) : DAVETIYE.adres,
    harita: httpsUrl("h") || DAVETIYE.harita,
    foto: httpsUrl("f") || DAVETIYE.foto,
    gelinAile: custom ? text("ga", 60) : DAVETIYE.gelinAile,
    damatAile: custom ? text("da", 60) : DAVETIYE.damatAile,
    not: text("n", 280) || DAVETIYE.not,
    whatsapp: (custom ? text("w", 20) : DAVETIYE.whatsapp).replace(/\D/g, ""),
    tema: THEMES.includes(text("s", 10)) ? text("s", 10) : DAVETIYE.tema,
  };

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const intro = $("intro");
  const envelope = $("envelope");
  const invite = $("invite");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.dataset.theme = d.tema;

  // ---------- İçerik ----------
  const initial = (s) => s.trim().charAt(0).toLocaleUpperCase("tr-TR");
  const gi = initial(d.gelin), di = initial(d.damat);
  const couple = d.gelin + " & " + d.damat;
  document.title = couple + " | Düğün Davetiyesi";
  $("bride").textContent = d.gelin;
  $("groom").textContent = d.damat;
  $("monoBride").textContent = gi;
  $("monoGroom").textContent = di;
  $("seal").textContent = gi + di;
  $("letterMono").textContent = gi + " & " + di;
  $("footMono").textContent = gi + " & " + di;
  $("note").textContent = d.not;
  $("venueName").textContent = d.mekan;
  $("venueAddr").textContent = d.adres;

  const when = new Date(d.tarih);
  const dateLong = when.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: TZ });
  const timeText = when.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  $("dateText").textContent = dateLong;
  $("calTime").textContent = when.toLocaleDateString("tr-TR", { weekday: "long", timeZone: TZ }) + " · Saat " + timeText;

  if (d.foto) {
    const img = $("photoImg");
    img.onload = () => {
      img.hidden = false;
      $("mono").hidden = true;
      $("frame").classList.toggle("wide", img.naturalWidth > img.naturalHeight);
    };
    img.src = d.foto;
  }

  if (d.gelinAile || d.damatAile) {
    $("families").hidden = false;
    $("brideFamily").textContent = d.gelinAile;
    $("groomFamily").textContent = d.damatAile;
    $("brideFamily").parentElement.hidden = !d.gelinAile;
    $("groomFamily").parentElement.hidden = !d.damatAile;
  }

  // Bağlantılar
  const place = (d.mekan + " " + d.adres).trim();
  $("mapLink").href = d.harita || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place);
  const stamp = (t) => new Date(t).toISOString().replace(/[-:]|\.\d{3}/g, "");
  $("calLink").href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(couple + " Düğünü") +
    "&dates=" + stamp(when) + "/" + stamp(when.getTime() + 4 * 36e5) +
    "&location=" + encodeURIComponent(place);

  if (d.whatsapp.length >= 10 && d.whatsapp.length <= 15) {
    const wa = (msg) => "https://wa.me/" + d.whatsapp + "?text=" + encodeURIComponent(msg);
    $("rsvp").hidden = false;
    $("rsvpYes").href = wa("Merhaba, " + couple + " düğününe katılacağım.");
    $("rsvpNo").href = wa("Merhaba, " + couple + " düğününe maalesef katılamayacağım.");
  }

  // ---------- Takvim (Türkiye saatine göre) ----------
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(when).split("-").map(Number);
  $("calTitle").textContent = when.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: TZ });
  const grid = $("calGrid");
  const cell = (label, cls) => {
    const s = document.createElement("span");
    s.textContent = label;
    if (cls) s.className = cls;
    grid.appendChild(s);
  };
  ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].forEach((n) => cell(n, "dow"));
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let i = 0; i < lead; i++) cell("");
  for (let i = 1; i <= count; i++) cell(i, i === day ? "day" : "");

  // ---------- Geri sayım ----------
  const units = { cdD: 864e5, cdH: 36e5, cdM: 6e4, cdS: 1e3 };
  const mods = { cdD: Infinity, cdH: 24, cdM: 60, cdS: 60 };
  function tick() {
    const left = when - Date.now();
    if (left <= 0) {
      $("countdown").hidden = true;
      $("cdDone").hidden = false;
      clearInterval(timer);
      return;
    }
    for (const id in units) {
      const el = $(id);
      const val = String(Math.floor(left / units[id]) % mods[id]);
      if (el.textContent !== val) {
        el.textContent = val;
        el.classList.remove("tick");
        void el.offsetWidth;
        el.classList.add("tick");
      }
    }
  }
  const timer = setInterval(tick, 1000);
  tick();

  // ---------- Açılış ----------
  let opened = false;
  function finish() {
    document.body.classList.add("opened");
    intro.hidden = true;
    root.classList.remove("locked");
    invite.removeAttribute("aria-hidden");
  }
  function open() {
    if (opened) return;
    opened = true;
    if (reduced) return finish();
    intro.classList.add("open");
    setTimeout(() => intro.classList.add("rise"), 650);
    setTimeout(() => {
      intro.classList.add("zoom");
      document.body.classList.add("opened");
    }, 1500);
    setTimeout(finish, 2700);
  }
  envelope.addEventListener("click", open);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });

  // Kaydırdıkça bölümler 3B olarak belirir
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: .18 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Fotoğraf çerçevesinde fareyle 3B eğim
  const frame = $("frame");
  if (!reduced && matchMedia("(hover: hover)").matches) {
    addEventListener("pointermove", (e) => {
      if (!document.body.classList.contains("opened") || scrollY > innerHeight) return;
      frame.classList.add("live");
      frame.style.setProperty("--ry", ((e.clientX / innerWidth - .5) * 22).toFixed(2) + "deg");
      frame.style.setProperty("--rx", ((.5 - e.clientY / innerHeight) * 16).toFixed(2) + "deg");
    });
  }

  // ---------- Altın tozu ----------
  const canvas = $("dust");
  const ctx = canvas.getContext("2d");
  if (!reduced && ctx) {
    const color = getComputedStyle(root).getPropertyValue("--accent").trim() || "#b8935a";
    let w, h, dots = [], raf = 0;
    const size = () => {
      const r = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      canvas.width = w * r; canvas.height = h * r;
      ctx.setTransform(r, 0, 0, r, 0, 0);
    };
    const spawn = (top) => ({
      x: Math.random() * w,
      y: top ? -10 : Math.random() * h,
      r: 1 + Math.random() * 2.2,
      v: .25 + Math.random() * .6,
      s: Math.random() * Math.PI * 2,
      a: .25 + Math.random() * .5,
    });
    const frameStep = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      dots.forEach((o, i) => {
        o.y += o.v;
        o.s += .012;
        o.x += Math.sin(o.s) * .35;
        if (o.y > h + 10) dots[i] = spawn(true);
        ctx.globalAlpha = o.a * (.6 + .4 * Math.sin(o.s * 3));
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(frameStep);
    };
    size();
    dots = Array.from({ length: Math.round(Math.min(46, w / 16)) }, () => spawn(false));
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frameStep);
    });
    raf = requestAnimationFrame(frameStep);
  }
})();
