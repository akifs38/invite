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

    // Türkiye saati sabit UTC+3
    const params = new URLSearchParams({ g: v("g"), d: v("d"), t: v("tarih") + "T" + v("saat") + ":00+03:00", m: v("m") });
    if (v("a")) params.set("a", v("a"));
    if (v("h")) params.set("h", v("h"));

    const url = new URL("./", location.href).href + "?" + params;
    link.value = url;
    document.getElementById("preview").href = url;
    document.getElementById("whatsapp").href = "https://wa.me/?text=" +
      encodeURIComponent(v("g") + " & " + v("d") + " düğün davetiyesi: " + url);
    copy.textContent = "Bağlantıyı kopyala";
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
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
