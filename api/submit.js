export default async function handler(req, res) {
  try {
    const GAS = "ضع_رابط_exec_حقك_هنا";

    const url = `${GAS}?t=${Date.now()}`;

    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify(req.body || {}),
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
