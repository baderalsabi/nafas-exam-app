export const config = {
  api: { bodyParser: false }, // ✅ مهم جدًا: نقرأ raw body بأنفسنا
};

async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  // CORS احتياط (عادة ما تحتاجه لأن نفس الدومين)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const GAS =
      "https://script.google.com/macros/s/AKfycbyPewcvtSvG5vl3lsjWe-M8PYhRqUg-DZ2wcvEcJLiapuaxHie8Q0dUdvMiS3FXoszu/exec";

    // ✅ اقرأ body الخام ثم حاول تحويله إلى JSON
    const raw = await readRawBody(req);
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      body = { _raw: raw }; // لو وصل شيء غير JSON
    }

    // ✅ بعض الأحيان يكون داخل payload
    const src =
      body && body.payload && typeof body.payload === "object"
        ? body.payload
        : body;

    const studentId = (src.studentId ?? body.studentId ?? "").toString().trim();
    const studentName = (src.studentName ?? body.studentName ?? "").toString().trim();
    const answers = Array.isArray(src.answers)
      ? src.answers
      : Array.isArray(body.answers)
      ? body.answers
      : [];

    // ✅ هذا يفيدك جدًا لو رجعت المشكلة: سيظهر في الرد ماذا استلم submit.js فعليًا
    // (لا تحذفها الآن)
    // return res.status(200).json({ ok:true, debug_received:{ raw, body, parsed:{ studentId, studentName, answersLen: answers.length } } });

    // ✅ جهّز payload النهائي للـ GAS (Top-level + payload احتياط)
    const out = {
      action: "submit",
      studentId,
      studentName,
      answers,
      payload: { studentId, studentName, answers },
    };

    const r = await fetch(GAS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(out),
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, message: text };
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.status(200).send(JSON.stringify(data));
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: "API_CRASH: " + String(e?.message || e),
    });
  }
}
