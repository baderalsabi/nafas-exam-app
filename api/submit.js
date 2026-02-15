export default async function handler(req, res) {
  try {
    const GAS =
      "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, message: "Method Not Allowed" });
    }

    // body من المتصفح عادة يكون object جاهز
    const payload = req.body || {};
payload.action = "submit";

const r = await fetch(`${GAS}?action=submit&t=${Date.now()}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});


    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, message: text };
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).send(JSON.stringify(data));
  } catch (e) {
    return res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
}
