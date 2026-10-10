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
  const invite = $("invite");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = matchMedia("(hover: hover)").matches;

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

  // Kaydırdıkça bölümler 3B olarak belirir
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: .18 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Fareyle 3B eğim: fotoğraf çerçevesi ve cam kartlar
  const pointer = { x: 0, y: 0 };
  const frame = $("frame");
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX / innerWidth - .5;
    pointer.y = e.clientY / innerHeight - .5;
    if (reduced || !hover || !document.body.classList.contains("opened") || scrollY > innerHeight) return;
    frame.classList.add("live");
    frame.style.setProperty("--ry", (pointer.x * 22).toFixed(2) + "deg");
    frame.style.setProperty("--rx", (-pointer.y * 16).toFixed(2) + "deg");
  });
  if (!reduced && hover) {
    document.querySelectorAll(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        el.style.setProperty("--ty", (((e.clientX - b.left) / b.width - .5) * 14).toFixed(2) + "deg");
        el.style.setProperty("--tx", ((.5 - (e.clientY - b.top) / b.height) * 12).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--tx", "0deg");
        el.style.setProperty("--ty", "0deg");
      });
    });
  }

  // ---------- Açılış ----------
  let state = "enter"; // enter -> idle -> open -> bg
  let openAt = 0;
  function finish() {
    document.body.classList.add("opened");
    intro.hidden = true;
    root.classList.remove("locked");
    invite.removeAttribute("aria-hidden");
  }
  function open() {
    if (state === "flat") { state = "bg"; return finish(); }
    if (state !== "idle") return;
    state = "open";
    openAt = performance.now();
    intro.classList.add("going");
  }
  intro.addEventListener("click", open);
  intro.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });

  // ---------- 3B uzay sahnesi ----------
  const T = window.THREE;
  const canvas = $("space");
  let renderer = null;
  if (!reduced && T) {
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true }); } catch (e) { renderer = null; }
  }
  if (!renderer) {
    // WebGL yoksa: yıldızsız sade açılış
    document.body.classList.add("flat");
    intro.classList.add("ready");
    state = "flat";
    return;
  }

  const css = getComputedStyle(root);
  const color = (name) => new T.Color(css.getPropertyValue(name).trim());
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const seg = (t, a, b) => ease(clamp((t - a) / (b - a)));
  const lerp = (a, b, t) => a + (b - a) * t;

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(color("--bg"));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(50, 1, .5, 300);
  camera.position.z = 6;
  scene.add(new T.AmbientLight(0xffffff, .52));
  const sun = new T.DirectionalLight(0xffffff, .5);
  sun.position.set(-2.5, 3.5, 4);
  scene.add(sun);

  // Yumuşak nokta dokusu: yıldızlar, bulutsu ve parıltı için
  function glowTexture(stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach((s) => grad.addColorStop(s[0], s[1]));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  const dot = glowTexture([[0, "rgba(255,255,255,1)"], [.25, "rgba(255,255,255,.8)"], [1, "rgba(255,255,255,0)"]]);
  const haze = glowTexture([[0, "rgba(255,255,255,.9)"], [.4, "rgba(255,255,255,.28)"], [1, "rgba(255,255,255,0)"]]);

  // Yıldızlar: kameraya doğru akar, öne geçen arkaya sarar
  const NEAR = -2, DEPTH = 128;
  const sky = new T.Group();
  scene.add(sky);
  function starLayer(n, size, col, opacity) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - .5) * 110;
      pos[i * 3 + 1] = (Math.random() - .5) * 110;
      pos[i * 3 + 2] = NEAR - Math.random() * DEPTH;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({
      map: dot, color: col, size, sizeAttenuation: true,
      transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending,
    }));
    sky.add(pts);
    return pts;
  }
  const small = innerWidth < 700;
  const layers = [
    starLayer(small ? 1100 : 2000, .12, new T.Color(0xffffff), .9),
    starLayer(small ? 220 : 380, .26, color("--accent"), .85),
  ];
  function flow(dist) {
    layers.forEach((pts) => {
      const a = pts.geometry.attributes.position;
      for (let i = 2; i < a.array.length; i += 3) {
        a.array[i] += dist;
        if (a.array[i] > NEAR) a.array[i] -= DEPTH;
      }
      a.needsUpdate = true;
    });
  }

  // Bulutsular
  const nebula = new T.Group();
  scene.add(nebula);
  [["--neb", -26, 12, -70, 95, .5], ["--neb2", 30, -18, -85, 80, .22], ["--neb", 8, -30, -95, 110, .3]].forEach((n) => {
    const s = new T.Sprite(new T.SpriteMaterial({
      map: haze, color: color(n[0]), transparent: true, opacity: n[5],
      depthWrite: false, blending: T.AdditiveBlending,
    }));
    s.position.set(n[1], n[2], n[3]);
    s.scale.set(n[4], n[4], 1);
    nebula.add(s);
  });

  // ----- Zarf -----
  const W = 3.2, H = 2.1;
  const env = new T.Group();
  scene.add(env);
  const paper = (hex) => new T.MeshStandardMaterial({ color: hex, roughness: .92, metalness: 0, side: T.DoubleSide, transparent: true });
  const shell = new T.Group(); // kartın dışında kalan her şey: arka, ön cep, kapak
  env.add(shell);

  const back = new T.Mesh(new T.PlaneGeometry(W, H), paper(0xb9aa88));
  back.position.z = -.02;
  shell.add(back);

  const pocketShape = new T.Shape();
  pocketShape.moveTo(-W / 2, -H / 2);
  pocketShape.lineTo(W / 2, -H / 2);
  pocketShape.lineTo(W / 2, H / 2);
  pocketShape.lineTo(0, -.12);
  pocketShape.lineTo(-W / 2, H / 2);
  pocketShape.closePath();
  const pocketGeo = new T.ShapeGeometry(pocketShape);
  const pocket = new T.Mesh(pocketGeo, paper(0xe6d9bd));
  pocket.position.z = .02;
  shell.add(pocket);
  const fold = new T.LineSegments(new T.EdgesGeometry(pocketGeo), new T.LineBasicMaterial({ color: 0x8f7a50, transparent: true, opacity: .9 }));
  fold.position.z = .021;
  shell.add(fold);

  // Kapak arka panelin üst kenarından menteşeli; açılınca kartın arkasında kalır
  const flapPivot = new T.Group();
  flapPivot.position.set(0, H / 2, -.02);
  shell.add(flapPivot);
  const flapShape = new T.Shape();
  flapShape.moveTo(-W / 2, 0);
  flapShape.lineTo(W / 2, 0);
  flapShape.lineTo(0, -1.22);
  flapShape.closePath();
  const flap = new T.Mesh(new T.ShapeGeometry(flapShape), paper(0xd3c4a2));
  flap.position.z = .05;
  flapPivot.add(flap);

  // Mühür: çiftin baş harfleri
  const sealCanvas = document.createElement("canvas");
  sealCanvas.width = sealCanvas.height = 256;
  const sealTex = new T.CanvasTexture(sealCanvas);
  const seal = new T.Group();
  seal.position.set(0, -1.02, .08);
  flapPivot.add(seal);
  const sealBody = new T.Mesh(
    new T.CylinderGeometry(.3, .32, .07, 48),
    new T.MeshStandardMaterial({ color: 0xb8935a, roughness: .38, metalness: .55, transparent: true })
  );
  sealBody.rotation.x = Math.PI / 2;
  seal.add(sealBody);
  const sealFace = new T.Mesh(new T.CircleGeometry(.29, 48), new T.MeshBasicMaterial({ map: sealTex, transparent: true }));
  sealFace.position.z = .037;
  seal.add(sealFace);

  // Kart: zarftan çıkan davetiye
  const cardCanvas = document.createElement("canvas");
  cardCanvas.width = 1160; cardCanvas.height = 760;
  const cardTex = new T.CanvasTexture(cardCanvas);
  cardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const card = new T.Group();
  env.add(card);
  const cardFront = new T.Mesh(new T.PlaneGeometry(2.9, 1.9), new T.MeshBasicMaterial({ map: cardTex, transparent: true }));
  const cardBack = new T.Mesh(new T.PlaneGeometry(2.9, 1.9), new T.MeshBasicMaterial({ color: 0xf3ead8, transparent: true }));
  cardBack.rotation.y = Math.PI;
  card.add(cardFront, cardBack);

  // Zarfın arkasındaki parıltı
  const halo = new T.Sprite(new T.SpriteMaterial({
    map: haze, color: color("--accent"), transparent: true, opacity: .34,
    depthWrite: false, blending: T.AdditiveBlending,
  }));
  halo.position.z = -.6;
  halo.scale.set(8.5, 8.5, 1);
  env.add(halo);

  function paint() {
    // Mühür
    let g = sealCanvas.getContext("2d");
    g.clearRect(0, 0, 256, 256);
    const grad = g.createRadialGradient(96, 84, 10, 128, 128, 128);
    grad.addColorStop(0, "#e6c88f");
    grad.addColorStop(.6, "#b8935a");
    grad.addColorStop(1, "#8a6a3c");
    g.fillStyle = grad;
    g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,248,234,.55)"; g.lineWidth = 3;
    g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#fff8ea";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '112px "Great Vibes", cursive';
    g.fillText(gi + di, 128, 138);
    sealTex.needsUpdate = true;

    // Kart
    g = cardCanvas.getContext("2d");
    const cw = cardCanvas.width, ch = cardCanvas.height;
    g.fillStyle = "#f7f1e5";
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = "#b8935a";
    g.lineWidth = 4; g.strokeRect(34, 34, cw - 68, ch - 68);
    g.lineWidth = 1.5; g.strokeRect(50, 50, cw - 100, ch - 100);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#b8935a";
    g.font = '600 34px "Cormorant Garamond", Georgia, serif';
    g.fillText("D Ü Ğ Ü N Ü M Ü Z E   D A V E T L İ S İ N İ Z", cw / 2, 170);
    g.fillStyle = "#1f3a34";
    let size = 170;
    do {
      g.font = size + 'px "Great Vibes", cursive';
      size -= 8;
    } while (g.measureText(couple).width > cw - 180 && size > 60);
    g.fillText(couple, cw / 2, ch / 2 + 12);
    g.fillStyle = "#2c2a26";
    g.font = '600 42px "Cormorant Garamond", Georgia, serif';
    g.fillText(dateLong, cw / 2, ch - 180);
    cardTex.needsUpdate = true;
  }
  paint();
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('112px "Great Vibes"', couple),
      document.fonts.load('600 34px "Cormorant Garamond"', dateLong),
    ]).then(paint, () => {});
  }

  let fit = 1;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    // Zarf dar ekrana sığsın
    const visibleW = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(25)) * camera.aspect;
    fit = Math.min(1, visibleW * .82 / W);
  }
  resize();
  addEventListener("resize", resize);

  const fade = (obj, o) => obj.traverse((n) => { if (n.material) n.material.opacity = o; });
  const start = performance.now();
  let last = start, raf = 0, rotX = 0, rotY = 0;

  function frameStep(now) {
    raf = requestAnimationFrame(frameStep);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    let speed = .7;

    if (state === "enter") {
      // Zarf uzayın derinliğinden dönerek gelir
      const a = seg(t, .2, 2.6);
      env.scale.setScalar(fit);
      env.position.set(0, 0, lerp(-70, 0, a));
      env.rotation.set((1 - a) * 1.3, (1 - a) * Math.PI * 3, (1 - a) * .6);
      speed = lerp(26, .7, a);
      if (a >= 1) { state = "idle"; intro.classList.add("ready"); }
    } else if (state === "idle") {
      rotY += ((Math.sin(t * .6) * .2 + pointer.x * .5) - rotY) * .06;
      rotX += ((Math.cos(t * .5) * .07 + pointer.y * .35) - rotX) * .06;
      env.scale.setScalar(fit);
      env.position.set(0, Math.sin(t * 1.1) * .09, 0);
      env.rotation.set(rotX, rotY, 0);
    } else if (state === "open") {
      const u = (now - openAt) / 1000;
      const a = seg(u, 0, .5);
      env.rotation.set(rotX * (1 - a), rotY * (1 - a), 0);
      env.position.y *= (1 - a);
      camera.position.z = lerp(6, 5.2, a);
      // Mühür kopar
      seal.position.z = .08 + a * 2.4;
      seal.rotation.z = a * 2.5;
      // Kapak açılır
      flapPivot.rotation.x = -seg(u, .4, 1.3) * Math.PI * .98;
      // Kart yükselir, sonra zarf uzaya düşer
      const rise = seg(u, 1.15, 2.1);
      const drop = seg(u, 2.0, 3.0);
      shell.position.y = -drop * 7;
      shell.rotation.z = drop * .7;
      shell.rotation.x = drop * 1.1;
      fade(shell, 1 - seg(u, 2.3, 3.0));
      fade(seal, 1 - seg(u, .15, .5));
      seal.visible = u < .5;
      halo.material.opacity = .34 * (1 - drop);
      // Kart ortaya gelip döner, kameranın içinden geçer
      const fly = seg(u, 2.9, 3.9);
      card.position.set(0, lerp(rise * 1.25, 0, drop), lerp(.001, (camera.position.z - 1.1) / fit, fly));
      card.rotation.y = drop * Math.PI * 2;
      fade(card, 1 - seg(u, 3.45, 3.9));
      speed = .7 + 70 * Math.sin(Math.PI * clamp((u - 2.5) / 1.7));
      if (u >= 3.35) document.body.classList.add("opened");
      if (u >= 4.2) {
        state = "bg";
        scene.remove(env);
        camera.position.z = 6;
        finish();
      }
    } else {
      // Davetiyenin arkasında: kaydırdıkça yıldızlar kayar
      sky.position.y += (scrollY * .004 - sky.position.y) * .1;
      nebula.position.y += (scrollY * .012 - nebula.position.y) * .1;
      sky.rotation.z += dt * .004;
    }

    flow(speed * dt * 4);
    nebula.rotation.z += dt * .01;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frameStep);
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frameStep); }
  });
})();
