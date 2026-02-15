export default async function handler(req, res) {
  try {
    const GAS = "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";
    const r = await fetch(`${GAS}?action=quiz`, { method: "GET" });
    const text = await r.text();

    // Apps Script يرجّع JSON كنص
    let data;
    try { data = JSON.parse(text); } catch { data = { ok:false, message:text }; }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(data));
  } catch (e) {
    res.status(500).json({ ok:false, message: String(e?.message || e) });
  }
}
