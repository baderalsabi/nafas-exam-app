export default async function handler(req, res) {
  try {
    const gas = (req.query.gas || "").toString().trim();
    if (!gas) {
      res.status(400).json({ ok: false, message: "MISSING_GAS: ضع ?gas= في رابط الموقع" });
      return;
    }

    const url = `${gas}?t=${Date.now()}`;

    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify({ action: "submit", ...(req.body || {}) }),
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok:false, message:text }; }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).send(JSON.stringify(data));
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ ok:false, message: String(e?.message || e) });
  }
}
