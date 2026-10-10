(function () {
  const form = document.getElementById("form");
  const error = document.getElementById("error");
  const result = document.getElementById("result");
  const link = document.getElementById("link");
  const copy = document.getElementById("copy");

  const today = new Date();
  form.tarih.min = new Date(today - today.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  function fail(message, field) {
    error.textContent = message;
    error.hidden = false;
    field.focus();
  }

  // 05xx… ve 5xx… biçimlerini 905xx… biçimine çevirir
  function phone(raw) {
    let n = raw.replace(/\D/g, "");
    if (n.length === 11 && n.startsWith("0")) n = "9" + n;
    else if (n.length === 10 && n.startsWith("5")) n = "90" + n;
    return n;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    error.hidden = true;
    const v = (name) => form[name].value.trim();

    if (!v("g")) return fail("Gelinin adını yazın.", form.g);
    if (!v("d")) return fail("Damadın adını yazın.", form.d);
    if (!v("tarih")) return fail("Düğün tarihini seçin.", form.tarih);
    if (!v("saat")) return fail("Düğün saatini seçin.", form.saat);
    if (!v("m")) return fail("Mekân adını yazın.", form.m);
    if (v("h") && !/^https:\/\//i.test(v("h"))) {
      return fail("Harita bağlantısı https:// ile başlamalı.", form.h);
    }
    const wa = phone(v("w"));
    if (v("w") && (wa.length < 10 || wa.length > 15)) {
      return fail("WhatsApp numarasını 05xx xxx xx xx biçiminde yazın.", form.w);
    }

    // Türkiye saati sabit UTC+3
    const params = new URLSearchParams({ g: v("g"), d: v("d"), t: v("tarih") + "T" + v("saat") + ":00+03:00", m: v("m") });
    ["a", "h", "ga", "da", "n"].forEach((k) => { if (v(k)) params.set(k, v(k)); });
    if (wa) params.set("w", wa);
    if (form.s.value !== "zumrut") params.set("s", form.s.value);
    if (photoUrl) params.set("f", photoUrl);

    const url = new URL("./", location.href).href + "?" + params;
    link.value = url;
    document.getElementById("preview").href = url;
    document.getElementById("whatsapp").href = "https://wa.me/?text=" +
      encodeURIComponent(v("g") + " & " + v("d") + " düğün davetiyesi: " + url);
    copy.textContent = "Bağlantıyı kopyala";
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- Yüz değiştirme (fal.ai) ----------
  // Tek yüz değiştiren model kullanılır: sahnede işaretlenen her yüz ayrı kırpılır,
  // değiştirilir ve yumuşak kenarla sahneye geri yerleştirilir.
  const FAL = "https://queue.fal.run/fal-ai/face-swap";
  const FAL_UPLOAD = "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3";
  const swap = document.getElementById("swap");
  const status = document.getElementById("swapStatus");
  const swapResult = document.getElementById("swapResult");
  const pick = document.getElementById("scenePick");
  const pickHelp = document.getElementById("pickHelp");
  const pctx = pick.getContext("2d");
  let photoUrl = "";
  let sceneBmp = null;
  let taps = []; // [gelin, damat], sahne pikseli cinsinden

  try { form.key.value = localStorage.getItem("falKey") || ""; } catch (e) {}

  function say(message, bad) {
    status.textContent = message;
    status.classList.toggle("bad", !!bad);
  }

  function drawPick() {
    pctx.drawImage(sceneBmp, 0, 0, pick.width, pick.height);
    const r = Math.max(14, pick.width * .028);
    taps.forEach((t, i) => {
      pctx.beginPath();
      pctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      pctx.fillStyle = i ? "#1f3a34" : "#b8935a";
      pctx.fill();
      pctx.lineWidth = r * .18;
      pctx.strokeStyle = "#fff";
      pctx.stroke();
      pctx.fillStyle = "#fff";
      pctx.font = "600 " + r * 1.1 + "px sans-serif";
      pctx.textAlign = "center";
      pctx.textBaseline = "middle";
      pctx.fillText(i ? "D" : "G", t.x, t.y + r * .06);
    });
    pickHelp.textContent = taps.length === 0 ? "Sahnede gelinin yüzüne dokunun."
      : taps.length === 1 ? "Şimdi damadın yüzüne dokunun."
      : "Yüzler işaretlendi (G: gelin, D: damat). Değiştirmek için tekrar dokunun.";
  }

  form.fotoSahne.addEventListener("change", async () => {
    taps = [];
    sceneBmp = null;
    pick.hidden = pickHelp.hidden = true;
    const file = form.fotoSahne.files[0];
    if (!file) return;
    try {
      sceneBmp = await createImageBitmap(file);
    } catch (e) {
      return say("Sahne görseli açılamadı. JPG ya da PNG deneyin.", true);
    }
    const k = Math.min(1, 1536 / Math.max(sceneBmp.width, sceneBmp.height));
    pick.width = Math.round(sceneBmp.width * k);
    pick.height = Math.round(sceneBmp.height * k);
    pick.hidden = pickHelp.hidden = false;
    drawPick();
  });

  pick.addEventListener("click", (e) => {
    const box = pick.getBoundingClientRect();
    if (taps.length >= 2) taps = [];
    taps.push({
      x: (e.clientX - box.left) / box.width * pick.width,
      y: (e.clientY - box.top) / box.height * pick.height,
    });
    drawPick();
  });

  // Fotoğrafı küçültüp JPEG veri adresine çevirir
  async function dataUri(file, max) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", .92);
  }

  async function fal(url, key, body) {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: Object.assign({ Authorization: "Key " + key }, body && { "Content-Type": "application/json" }),
      body: body && JSON.stringify(body),
    });
    if (res.status === 401) throw new Error("fal.ai anahtarı geçersiz ya da süresi dolmuş.");
    if (res.status === 403) throw new Error("fal.ai hesabında yetki ya da bakiye yok.");
    if (res.status === 422) throw new Error("Yüz bulunamadı. Yüzlerin net göründüğü fotoğraflar seçin ve sahnede yüzlerin tam üstüne dokunun.");
    if (!res.ok) throw new Error("fal.ai hatası (" + res.status + "). Biraz sonra tekrar deneyin.");
    return res.json();
  }

  // Bir yüzü kırpar, değiştirir; sahneye yapıştırılacak yumuşak kenarlı parçayı döndürür
  async function swapFace(scene, me, other, d, faceUri, key) {
    const half = 1.1 * d;
    const x0 = Math.max(0, Math.round(me.x - half)), y0 = Math.max(0, Math.round(me.y - half));
    const w = Math.min(scene.width, Math.round(me.x + half)) - x0;
    const h = Math.min(scene.height, Math.round(me.y + half)) - y0;
    const crop = document.createElement("canvas");
    crop.width = w; crop.height = h;
    const cx = crop.getContext("2d");
    cx.drawImage(scene, x0, y0, w, h, 0, 0, w, h);
    // Diğer yüzü kapat ki model yalnızca bu yüzü görsün
    cx.fillStyle = "#808080";
    cx.beginPath();
    cx.arc(other.x - x0, other.y - y0, .5 * d, 0, Math.PI * 2);
    cx.fill();

    const job = await fal(FAL, key, { base_image_url: crop.toDataURL("image/jpeg", .92), swap_image_url: faceUri });
    const until = Date.now() + 4 * 60e3;
    for (;;) {
      await new Promise((r) => setTimeout(r, 2500));
      const st = await fal(job.status_url, key);
      if (st.status === "COMPLETED") break;
      if (st.status !== "IN_QUEUE" && st.status !== "IN_PROGRESS") throw new Error("İşlem tamamlanamadı. Farklı fotoğraflarla deneyin.");
      if (Date.now() > until) throw new Error("İşlem çok uzun sürdü. Tekrar deneyin.");
    }
    const out = await fal(job.response_url, key);
    if (!out.image || !out.image.url) throw new Error("Sonuç alınamadı. Tekrar deneyin.");
    const bmp = await createImageBitmap(await (await fetch(out.image.url)).blob());

    cx.clearRect(0, 0, w, h);
    cx.drawImage(bmp, 0, 0, w, h);
    cx.globalCompositeOperation = "destination-in";
    const g = cx.createRadialGradient(me.x - x0, me.y - y0, .5 * d, me.x - x0, me.y - y0, .78 * d);
    g.addColorStop(0, "#000");
    g.addColorStop(1, "rgba(0,0,0,0)");
    cx.fillStyle = g;
    cx.fillRect(0, 0, w, h);
    return { patch: crop, x0, y0 };
  }

  swap.addEventListener("click", async () => {
    const bride = form.fotoGelin.files[0], groom = form.fotoDamat.files[0];
    const key = form.key.value.trim();
    if (!bride || !groom || !sceneBmp) return say("Gelin, damat ve sahne görsellerinin üçünü de seçin.", true);
    if (taps.length < 2) return say("Sahnede önce gelinin, sonra damadın yüzüne dokunun.", true);
    const d = Math.hypot(taps[0].x - taps[1].x, taps[0].y - taps[1].y);
    if (d < pick.width * .05) return say("İki yüz aynı yere işaretlenmiş. Sahneye tekrar dokunup her yüzü ayrı işaretleyin.", true);
    if (!key) return say("fal.ai anahtarını girin.", true);
    try { localStorage.setItem("falKey", key); } catch (e) {}

    swap.disabled = true;
    try {
      say("Fotoğraflar hazırlanıyor…");
      const scene = document.createElement("canvas");
      scene.width = pick.width; scene.height = pick.height;
      const sx = scene.getContext("2d");
      sx.drawImage(sceneBmp, 0, 0, scene.width, scene.height);
      const [fb, fg] = await Promise.all([dataUri(bride, 1024), dataUri(groom, 1024)]);

      say("Yüzler yerleştiriliyor, bu bir dakika kadar sürebilir…");
      const parts = await Promise.all([
        swapFace(scene, taps[0], taps[1], d, fb, key),
        swapFace(scene, taps[1], taps[0], d, fg, key),
      ]);
      parts.forEach((p) => sx.drawImage(p.patch, p.x0, p.y0));

      say("Fotoğraf kaydediliyor…");
      const blob = await new Promise((r) => scene.toBlob(r, "image/jpeg", .9));
      const up = await fal(FAL_UPLOAD, key, { content_type: "image/jpeg", file_name: "davetiye.jpg" });
      const put = await fetch(up.upload_url, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
      if (!put.ok) throw new Error("Fotoğraf kaydedilemedi. Tekrar deneyin.");
      photoUrl = up.file_url;
      swapResult.src = URL.createObjectURL(blob);
      swapResult.hidden = false;
      say("Hazır. “Davetiyeyi oluştur”a bastığınızda fotoğraf davetiyeye eklenir.");
    } catch (err) {
      say(err instanceof TypeError ? "Bağlantı kurulamadı. İnternetinizi kontrol edin." : err.message, true);
    } finally {
      swap.disabled = false;
    }
  });

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link.value);
    } catch (e) {
      link.select();
      document.execCommand("copy");
    }
    copy.textContent = "Kopyalandı";
  });

  link.addEventListener("focus", () => link.select());
})();
