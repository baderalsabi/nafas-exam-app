let QUIZ = null;
let isSubmitting = false;
let retryCount = 0;

const API_QUIZ = "/api/quiz";
const API_SUBMIT = "/api/submit";
function getGasParam(){
  const p = new URLSearchParams(location.search);
  return p.get("gas") || "";
}

// نخزن بيانات الطالب هنا فور الضغط على "ابدأ"
let STUDENT = { id: "", name: "" };

function el(id){ return document.getElementById(id); }
function show(id){ const x = el(id); if (x) x.classList.remove("hidden"); }
function hide(id){ const x = el(id); if (x) x.classList.add("hidden"); }

function setLandingMsg(t){
  const x = el("landingMsg");
  if (x) x.textContent = t || "";
}

function setHint(t){
  const x = el("hint");
  if (x) x.textContent = t || "";
}

function setResult(html){
  const box = el("result");
  if (!box) return;
  box.innerHTML = html;
  box.classList.remove("hidden");
  box.scrollIntoView({behavior:"smooth", block:"center"});
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}
const ENABLE_FRACTIONS = true;

function formatFractionsHtml(text){
  if (!ENABLE_FRACTIONS) return escapeHtml(text);
  const safe = escapeHtml(text);

  // 3/5 أو ٣/٥ أو □/□ … يدعم / أو \
  return safe.replace(/([0-9٠-٩⬜□]+)\s*[\/\\]\s*([0-9٠-٩⬜□]+)/g, (m, a, b) => {
    return `<span class="frac" aria-label="${a}/${b}">
      <span class="top">${a}</span>
      <span class="bar"></span>
      <span class="bottom">${b}</span>
    </span>`;
  });
}

// لو تبي كسر "س 1/2" داخل نص طويل (مو شرط أرقام فقط)
// شغّال مع: 1/2, ١/٢, 10/3

function buildQuestionCard(q, index){
  const qcard = document.createElement("div");
  qcard.className = "qcard";

  const qhead = document.createElement("div");
  qhead.className = "qhead";

  const qno = document.createElement("div");
  qno.className = "qno";
  qno.textContent = q.no ? q.no : ("س" + (index+1));

  const qtext = document.createElement("div");
  qtext.innerHTML = formatFractionsHtml(q.q || "");


  qhead.appendChild(qno);
  qhead.appendChild(qtext);

  const qbody = document.createElement("div");
  qbody.className = "qbody";

  const img = document.createElement("img");
  img.className = "qimg";
  if (q.imageUrl){
    img.src = q.imageUrl;
    img.style.display = "block";
  }
  qbody.appendChild(img);

  const options = document.createElement("div");
  options.className = "options";

  const opts = [q.a, q.b, q.c, q.d].map(v => (v || "").trim());
  opts.forEach((text, i) => {
    if (!text) return;

    const label = document.createElement("label");
    label.className = "opt";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "q_" + index;
    input.value = ["أ","ب","ج","د"][i];

    const span = document.createElement("div");
    span.className = "optText";
    span.innerHTML = formatFractionsHtml(text);


    label.appendChild(input);
    label.appendChild(span);
    options.appendChild(label);
  });

  qbody.appendChild(options);
  qcard.appendChild(qhead);
  qcard.appendChild(qbody);

  return qcard;
}

function renderQuiz(quiz){
  QUIZ = quiz;

  const subjectEl = el("subject");
  const metaEl = el("meta");
  if (subjectEl) subjectEl.textContent = quiz.subject || "اختبار";
  if (metaEl) metaEl.textContent = `عدد الأسئلة: ${(quiz.questions||[]).length}`;

  const wrap = el("questions");
  if (wrap){
    wrap.innerHTML = "";
    (quiz.questions || []).forEach((q, i) => wrap.appendChild(buildQuestionCard(q, i)));
  }

  const btnSubmit = el("btnSubmit");
  if (btnSubmit) btnSubmit.disabled = false;

  hide("loading");
  hide("result");

  setHint("");

  hide("landing-view");
  show("exam-view");
}

function collectAnswers(){
  if (!QUIZ) return [];
  const answers = [];
  for (let i = 0; i < (QUIZ.questions||[]).length; i++){
    const sel = document.querySelector(`input[name="q_${i}"]:checked`);
    answers.push(sel ? sel.value : "");
  }
  return answers;
}

function validateLandingAndStore(){
  const idEl = el("studentId");
  const nameEl = el("studentName");
  const id = idEl ? idEl.value.trim() : "";
  const name = nameEl ? nameEl.value.trim() : "";

  if (!id) return "رقم الطالب مطلوب.";
  if (!name) return "اسم الطالب مطلوب.";

  STUDENT.id = id;
  STUDENT.name = name;
  return "";
}

async function loadQuiz(){
  setLandingMsg("جارٍ تحميل الأسئلة…");
  try{
    const r = await fetch(`${API_QUIZ}?t=${Date.now()}`, { method:"GET", cache:"no-store" });
    const data = await r.json();

    if (!data || !data.ok) {
      setLandingMsg(data?.message || "تعذر تحميل الأسئلة. حدّث الصفحة.");
      return;
    }

    const quiz = data.data || data.quiz || data || {};
    if (!quiz.questions || !quiz.questions.length) {
      setLandingMsg("لا توجد أسئلة الآن. تأكد من اختيار النموذج ووضع المفتاح.");
      return;
    }

    setLandingMsg("");
    renderQuiz(quiz);

  }catch(e){
    setLandingMsg("خطأ في تحميل الأسئلة. جرّب تحديث الصفحة.");
  }
}

async function submit(){
  // ✅ لا نقرأ الحقول هنا، نعتمد على STUDENT الذي خزناه وقت البداية
  if (!STUDENT.id)   { setResult("❌ رقم الطالب مطلوب."); return; }
  if (!STUDENT.name) { setResult("❌ اسم الطالب مطلوب."); return; }

  if (!QUIZ){
    setResult("❌ لم يتم تحميل الأسئلة بعد.");
    return;
  }

  if (isSubmitting) return;
  isSubmitting = true;
  retryCount = 0;

  const answers = collectAnswers();
  const answeredCount = answers.filter(a => a).length;

  setHint(`تمت الإجابة على ${answeredCount} من ${answers.length} سؤال.`);

  const btnSubmit = el("btnSubmit");
  if (btnSubmit) btnSubmit.disabled = true;

  show("loading");
  hide("result");

  async function attemptSend(){
    try{
      const bodyObj = {
        action: "submit",
        studentId: STUDENT.id,
        studentName: STUDENT.name,
        answers
      };

      const r = await fetch(API_SUBMIT, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        cache: "no-store",
        body: JSON.stringify(bodyObj)
      });

      const res = await r.json();

      if (res && res.retry && retryCount < 3){
        retryCount++;
        await new Promise(ok => setTimeout(ok, 900));
        return attemptSend();
      }

      hide("loading");

      if (!res || !res.ok){
        setResult(res?.message || "❌ حدث خطأ غير معروف.");
        if (btnSubmit) btnSubmit.disabled = false;
        isSubmitting = false;
        return;
      }

      const score = Number(res.score);
      const total = Number(res.total);

      if (!isNaN(score) && !isNaN(total) && total > 0){
        const percent = Math.round((score/total)*100);
        setResult(
          `✅ تم الاستلام بنجاح<br>
           <span style="font-size:18px">درجتك: ${score} / ${total}</span><br>
           النسبة: ${percent}%`
        );
      } else {
        setResult("✅ تم الاستلام.");
      }

      isSubmitting = false;

    }catch(e){
      hide("loading");
      setResult("❌ حدث خطأ أثناء الإرسال. جرّب مرة أخرى.");
      if (btnSubmit) btnSubmit.disabled = false;
      isSubmitting = false;
    }
  }

  attemptSend();
}

function goHome(){
  hide("exam-view");
  show("landing-view");
  hide("result");
  hide("loading");
  setLandingMsg("");
  setHint("");
}

document.addEventListener("DOMContentLoaded", () => {
  const btnStart = el("btnStart");
  if (btnStart){
    btnStart.addEventListener("click", async () => {
      const err = validateLandingAndStore();
      if (err){ setLandingMsg("❌ " + err); return; }
      await loadQuiz();
    });
  }

  const btnReload = el("btnReload");
  if (btnReload) btnReload.addEventListener("click", () => location.reload());

  const btnSubmit = el("btnSubmit");
  if (btnSubmit) btnSubmit.addEventListener("click", submit);

  const linkHome = el("linkHome");
  if (linkHome) linkHome.addEventListener("click", () => { location.hash = "#landing-view"; goHome(); });

  if (!location.hash) location.hash = "#landing-view";
});
