// Davetiyenin paylaşılabilir görseli ve QR kodu. Hem davetiye hem oluşturma sayfası kullanır.
window.DavetiyeKart = (function () {
  const TZ = "Europe/Istanbul";
  const THEMES = {
    zumrut: { bg: "#04100d", neb: "#1c6b58", neb2: "#b8935a", accent: "#d1ab6e", head: "#f1e2bd" },
    gul: { bg: "#12050a", neb: "#8a2f4c", neb2: "#d39a7c", accent: "#dba888", head: "#f6ddd0" },
    gece: { bg: "#040714", neb: "#2a3f8f", neb2: "#7a5bd1", accent: "#cfae74", head: "#efdcae" },
  };
  const INK = "#efe8da", MUTED = "#b5ad9e";
  const W = 1080, H = 1920;
  const SCRIPT = '"Great Vibes", cursive';
  const SERIF = '"Cormorant Garamond", Georgia, serif';

  const initial = (s) => s.trim().charAt(0).toLocaleUpperCase("tr-TR");
  const spaced = (s) => s.toLocaleUpperCase("tr-TR").split("").join(" ");

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Bağlantının QR kodu; kütüphane yüklenmediyse ya da bağlantı sığmıyorsa null
  function qrCanvas(url, size, dark, light) {
    if (!window.qrcode) return null;
    let qr;
    try {
      qr = window.qrcode(0, "M");
      qr.addData(url);
      qr.make();
    } catch (e) { return null; }
    const n = qr.getModuleCount();
    const quiet = 4;
    const cell = Math.max(1, Math.floor(size / (n + quiet * 2)));
    const c = document.createElement("canvas");
    c.width = c.height = cell * (n + quiet * 2);
    const g = c.getContext("2d");
    g.fillStyle = light || "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = dark || "#000000";
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(r, col)) g.fillRect((col + quiet) * cell, (r + quiet) * cell, cell, cell);
      }
    }
    return c;
  }

  function archPath(g, x, y, w, h, wide) {
    const r = wide ? 26 : w / 2;
    g.beginPath();
    g.moveTo(x, y + h - (wide ? r : 14));
    g.lineTo(x, y + r);
    g.arcTo(x, y, x + r, y, r);
    g.lineTo(x + w - r, y);
    g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - (wide ? r : 14));
    g.arcTo(x + w, y + h, x + w - (wide ? r : 14), y + h, wide ? r : 14);
    g.lineTo(x + (wide ? r : 14), y + h);
    g.arcTo(x, y + h, x, y + h - (wide ? r : 14), wide ? r : 14);
    g.closePath();
  }

  function fitFont(g, text, family, max, maxWidth, weight) {
    let size = max;
    do {
      g.font = (weight || "") + " " + size + "px " + family;
      if (g.measureText(text).width <= maxWidth) break;
      size -= 4;
    } while (size > 28);
    return size;
  }

  function wrap(g, text, maxWidth, maxLines) {
    const words = text.split(/\s+/), lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (g.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,3}$/, "…");
    }
    return lines;
  }

  // data: { gelin, damat, tarih, mekan, adres, foto, tema }, url: davetiye bağlantısı (QR için)
  async function draw(data, url) {
    const th = THEMES[data.tema] || THEMES.zumrut;
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([
          document.fonts.load("120px " + SCRIPT, data.gelin + data.damat + "&"),
          document.fonts.load("600 40px " + SERIF, "Düğünümüze"),
          document.fonts.load("400 40px " + SERIF, "Düğünümüze"),
        ]);
      } catch (e) {}
    }
    const photo = await loadImage(data.foto);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");

    // Uzay arka planı
    g.fillStyle = th.bg;
    g.fillRect(0, 0, W, H);
    [[th.neb, 240, 420, 760, .55], [th.neb2, 900, 1250, 620, .2], [th.neb, 620, 1750, 800, .35]].forEach((n) => {
      const grad = g.createRadialGradient(n[1], n[2], 0, n[1], n[2], n[3]);
      grad.addColorStop(0, n[0]);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = n[4];
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    });
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 420; i++) {
      g.globalAlpha = .25 + rnd() * .65;
      g.fillStyle = rnd() > .82 ? th.accent : "#ffffff";
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, .6 + rnd() * 1.9, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = th.accent;
    g.lineWidth = 2;
    g.strokeRect(44, 44, W - 88, H - 88);
    g.globalAlpha = .45;
    g.strokeRect(58, 58, W - 116, H - 116);
    g.globalAlpha = 1;

    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = th.accent;
    g.font = "600 34px " + SERIF;
    g.fillText(spaced("Düğünümüze davetlisiniz"), W / 2, 170);

    // Fotoğraf ya da baş harfler
    const wide = !!photo && photo.naturalWidth > photo.naturalHeight;
    const fw = wide ? 900 : 520, fh = wide ? 650 : 660;
    const fx = (W - fw) / 2, fy = 250;
    g.save();
    archPath(g, fx, fy, fw, fh, wide);
    g.clip();
    if (photo) {
      const k = Math.max(fw / photo.naturalWidth, fh / photo.naturalHeight);
      const pw = photo.naturalWidth * k, ph = photo.naturalHeight * k;
      g.drawImage(photo, fx + (fw - pw) / 2, fy + (fh - ph) / 2, pw, ph);
    } else {
      const grad = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
      grad.addColorStop(0, th.neb);
      grad.addColorStop(1, th.bg);
      g.fillStyle = grad;
      g.fillRect(fx, fy, fw, fh);
      g.fillStyle = "rgba(0,0,0,.35)";
      g.fillRect(fx, fy, fw, fh);
      g.fillStyle = th.accent;
      g.font = "150px " + SCRIPT;
      g.fillText(initial(data.gelin) + " & " + initial(data.damat), W / 2, fy + fh / 2 + 48);
    }
    g.restore();
    g.strokeStyle = th.accent;
    g.lineWidth = 2;
    archPath(g, fx - 16, fy - 16, fw + 32, fh + 32, wide);
    g.stroke();

    // İsimler: sığmazsa iki satır
    let yy = fy + fh + 16;
    g.fillStyle = th.head;
    g.shadowColor = th.accent;
    g.shadowBlur = 26;
    const couple = data.gelin + " & " + data.damat;
    g.font = "128px " + SCRIPT;
    if (g.measureText(couple).width <= 940) {
      fitFont(g, couple, SCRIPT, 150, 940);
      yy += 150;
      g.fillText(couple, W / 2, yy);
    } else {
      const size = Math.min(fitFont(g, data.gelin + " &", SCRIPT, 132, 940), fitFont(g, data.damat, SCRIPT, 132, 940));
      g.font = size + "px " + SCRIPT;
      yy += 130;
      g.fillText(data.gelin + " &", W / 2, yy);
      yy += 124;
      g.fillText(data.damat, W / 2, yy);
    }
    g.shadowBlur = 0;

    const when = new Date(data.tarih);
    g.fillStyle = INK;
    g.font = "600 48px " + SERIF;
    yy += 104;
    g.fillText(when.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: TZ }), W / 2, yy);
    g.fillStyle = th.accent;
    g.font = "600 42px " + SERIF;
    yy += 62;
    g.fillText("Saat " + when.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }), W / 2, yy);

    yy += 44;
    g.fillRect(W / 2 - 60, yy, 120, 2);

    g.fillStyle = th.head;
    yy += 66;
    fitFont(g, data.mekan, SERIF, 46, 900, "600");
    g.fillText(data.mekan, W / 2, yy);
    if (data.adres) {
      g.fillStyle = MUTED;
      g.font = "400 34px " + SERIF;
      wrap(g, data.adres, 860, 2).forEach((line) => {
        yy += 46;
        g.fillText(line, W / 2, yy);
      });
    }

    // QR: 3B davetiyeye götürür
    const qr = url && qrCanvas(url, 420, "#14100a", "#f7f1e5");
    if (qr) {
      const s = 190, qx = (W - s) / 2, qy = H - 96 - s - 44;
      g.fillStyle = "#f7f1e5";
      g.fillRect(qx - 10, qy - 10, s + 20, s + 20);
      g.imageSmoothingEnabled = false;
      g.drawImage(qr, qx, qy, s, s);
      g.imageSmoothingEnabled = true;
      g.fillStyle = MUTED;
      g.font = "italic 400 30px " + SERIF;
      g.fillText("3 boyutlu davetiye için okutun", W / 2, H - 92);
    }
    return c;
  }

  // Baskıya uygun, beyaz zeminli büyük QR
  function qrImage(url) {
    return qrCanvas(url, 1200, "#000000", "#ffffff");
  }

  const toBlob = (canvas, type) => new Promise((r) => canvas.toBlob(r, type, .92));

  async function download(canvas, type, name) {
    const blob = await toBlob(canvas, type);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + (type === "image/jpeg" ? ".jpg" : ".png");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  // Telefonun paylaşım menüsü (WhatsApp vb.); desteklenmiyorsa false döner
  async function share(canvas, name, text) {
    const file = new File([await toBlob(canvas, "image/jpeg")], name + ".jpg", { type: "image/jpeg" });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
    try {
      await navigator.share({ files: [file], text });
    } catch (e) { /* kullanıcı vazgeçti */ }
    return true;
  }

  const canShare = () => !!(navigator.canShare && navigator.share);
  const fileName = (data) => ("davetiye-" + data.gelin + "-" + data.damat)
    .toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/g, "-").replace(/-+$/, "");

  return { draw, qrImage, download, share, canShare, fileName };
})();
