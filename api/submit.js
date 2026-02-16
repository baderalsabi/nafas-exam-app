export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(405).send(JSON.stringify({ ok: false, message: "Method Not Allowed" }));
    }

    // ✅ قراءة body يدويًا (لأن req.body أحيانًا تكون فاضية في Vercel)
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    let bodyObj = {};
    try { bodyObj = raw ? JSON.parse(raw) : {}; } catch { bodyObj = {}; }

    const GAS = "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";
    const url = `${GAS}?t=${Date.now()}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", ...bodyObj })
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { ok: false, message: text }; }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(JSON.stringify(data));

  } catch (e) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).send(JSON.stringify({
      ok: false,
      message: "API_CRASH: " + String(e?.message || e)
    }));
  }
}
