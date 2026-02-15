export default async function handler(req, res) {
  try {
    const GAS = "ضع_رابط_exec_هنا";

    // ✅ يكسر أي كاش: يضيف وقت متغير
    const bust = Date.now();

    const r = await fetch(`${GAS}?action=quiz&v=${bust}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    const text = await r.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { ok:false, message:text }; }

    // ✅ أهم سطرين: يمنع كاش Vercel/المتصفح
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    res.status(200).send(JSON.stringify(data));
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ ok:false, message: String(e?.message || e) });
  }
}
