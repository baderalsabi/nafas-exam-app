export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, message:"Method not allowed" });
    }

    const GAS = "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";

    const payload = req.body || {};
    payload.action = "submit";

    const r = await fetch(GAS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok:false, message:text }; }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(JSON.stringify(data));
  } catch (e) {
    return res.status(500).json({ ok:false, message: String(e?.message || e) });
  }
}
