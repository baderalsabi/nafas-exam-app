export default async function handler(req, res) {
  try {
    const gas = (req.query.gas || "").toString().trim();
    if (!gas) {
      res.status(400).json({ ok: false, message: "MISSING_GAS: ضع ?gas= في رابط الموقع" });
      return;
    }

    const url = `${gas}?action=quiz&v=${Date.now()}`;

    const r = await fetch(url, { method: "GET" });
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
