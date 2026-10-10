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
  const FAL = "https://queue.fal.run/easel-ai/advanced-face-swap";
  const swap = document.getElementById("swap");
  const status = document.getElementById("swapStatus");
  const swapResult = document.getElementById("swapResult");
  let photoUrl = "";

  try { form.key.value = localStorage.getItem("falKey") || ""; } catch (e) {}

  function say(message, bad) {
    status.textContent = message;
    status.classList.toggle("bad", !!bad);
  }

  // Fotoğrafı küçültüp JPEG veri adresine çevirir
  async function dataUri(file, max) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", .9);
  }

  async function fal(url, key, body) {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: Object.assign({ Authorization: "Key " + key }, body && { "Content-Type": "application/json" }),
      body: body && JSON.stringify(body),
    });
    if (res.status === 401) throw new Error("fal.ai anahtarı geçersiz.");
    if (res.status === 403) throw new Error("fal.ai hesabında yetki ya da bakiye yok.");
    if (!res.ok) throw new Error("fal.ai hatası (" + res.status + "). Biraz sonra tekrar deneyin.");
    return res.json();
  }

  swap.addEventListener("click", async () => {
    const bride = form.fotoGelin.files[0], groom = form.fotoDamat.files[0], scene = form.fotoSahne.files[0];
    const key = form.key.value.trim();
    if (!bride || !groom || !scene) return say("Gelin, damat ve sahne görsellerinin üçünü de seçin.", true);
    if (!key) return say("fal.ai anahtarını girin.", true);
    try { localStorage.setItem("falKey", key); } catch (e) {}

    swap.disabled = true;
    try {
      say("Fotoğraflar hazırlanıyor…");
      const [f0, f1, target] = await Promise.all([dataUri(bride, 1024), dataUri(groom, 1024), dataUri(scene, 1536)]);
      say("Yüzler yerleştiriliyor, bu bir dakika kadar sürebilir…");
      const job = await fal(FAL, key, {
        face_image_0: f0, gender_0: "female",
        face_image_1: f1, gender_1: "male",
        target_image: target,
        workflow_type: form.sac.value,
      });
      const until = Date.now() + 4 * 60e3;
      for (;;) {
        await new Promise((r) => setTimeout(r, 2500));
        const st = await fal(job.status_url, key);
        if (st.status === "COMPLETED") break;
        if (st.status !== "IN_QUEUE" && st.status !== "IN_PROGRESS") throw new Error("İşlem tamamlanamadı. Farklı fotoğraflarla deneyin.");
        if (Date.now() > until) throw new Error("İşlem çok uzun sürdü. Tekrar deneyin.");
      }
      const out = await fal(job.response_url, key);
      if (!out.image || !out.image.url) throw new Error("Sonuç alınamadı. Yüzlerin net göründüğü fotoğraflar deneyin.");
      photoUrl = out.image.url;
      swapResult.src = photoUrl;
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
