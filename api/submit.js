export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, message: "Method Not Allowed" });
    }

    // اقرأ body يدويًا (مضمون على Vercel)
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    let bodyObj = {};
    try { bodyObj = raw ? JSON.parse(raw) : {}; } catch { bodyObj = {}; }

    const studentId = String(bodyObj.studentId || bodyObj?.payload?.studentId || "").trim();
    const studentName = String(bodyObj.studentName || bodyObj?.payload?.studentName || "").trim();

    const GAS = "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";

    // ✅ نرسلها في Query String أيضًا (لمن يعتمد على e.parameter)
    const url =
      `${GAS}?action=submit` +
      `&studentId=${encodeURIComponent(studentId)}` +
      `&studentName=${encodeURIComponent(studentName)}` +
      `&t=${Date.now()}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ ونرسلها في JSON أيضًا (لمن يعتمد على e.postData.contents)
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
    return res.status(500).json({ ok: false, message: "API_CRASH: " + String(e?.message || e) });
  }
}
