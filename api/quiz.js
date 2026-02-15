export default async function handler(req, res) {
  try {
    const GAS = "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";

    const url = `${GAS}?action=quiz&v=${Date.now()}`;
    const r = await fetch(url, { method: "GET" });

    const text = await r.text();

    let data;
    try { data = JSON.parse(text); }
    catch { data = { ok: false, message: text }; }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(data));
  } catch (e) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(500).send(JSON.stringify({
      ok: false,
      message: "API_CRASH: " + String(e?.message || e)
    }));
  }
}
