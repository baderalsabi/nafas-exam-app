let QUIZ = null;
let isSubmitting = false;
let retryCount = 0;

// ✅ تخزين بيانات الطالب بعد الضغط على "ابدأ"
let STUDENT = { id: "", name: "" };

const API_QUIZ = "/api/quiz";
const API_SUBMIT = "/api/submit";

function el(id){ return document.getElementById(id); }
function show(id){ const x = el(id); if (x) x.classList.remove("hidden"); }
function hide(id){ const x = el(id); if (x) x.classList.add("hidden"); }

function setLandingMsg(t){
  const x = el("landingMsg");
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

function buildQuestionCard(q, index){
  const qcard = document.createElement("div");
  qcard.className = "qcard";

  const qhead = document.createElement("div");
  qhead.className = "qhead";

  const qno = document.createElement("div");
  qno.className = "qno";
  qno.textContent = q.no ? q.no : ("س" + (index+1));

  const qtext = document.createElement("div");
  qtext.innerHTML = escapeHtml(q.q || "");

  qhead.appendChild(qno);
  qhead.appendChild(qtext);

  const qbody = document.createElement("div");
  qbody.className = "qbody";

  // ✅ لا ننشئ img إلا إذا فيه رابط (حتى لا تظهر صورة مكسورة)
  if (q.imageUrl){
    const img = document.createElement("img");
    img.className = "qimg";
    img.src = q.imageUrl;
    img.style.display = "block";
    qbody.appendChild(img);
  }

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
    span.innerHTML = escapeHtml(text);

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

  const hint = el("hint");
  if (hint) hint.textContent = "";

  hide("loading");
  hide("result");

  hide("landing-view");
  show("exam-view");
}

function collectAnswers(){
  if (!QUIZ) return [];
  const answers = [];
  for (let i=0; i<(QUIZ.questions||[]).length; i++){
    const sel = document.querySelector(`input[name="q_${i}"]:checked`);
    answers.push(sel ? sel.value : "");
  }
  return answers;
}

function validateLanding(){
  const idEl = el("studentId");
  const nameEl = el("studentName");
  const id = idEl ? idEl.value.trim() : "";
  const name = nameEl ? nameEl.value.trim() : "";
  if (!id) return "رقم الطالب مطلوب.";
  if (!name) return "اسم الطالب مطلوب.";
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

    const quiz = data.data || data; // احتياط
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
  // ✅ لا نرجع نقرأ الحقول من صفحة البداية
  // نستخدم STUDENT الذي خزّناه عند الضغط على "ابدأ"
  if (!STUDENT.id || !STUDENT.name){
    setResult("❌ رجاءً ارجع للرئيسية واكتب رقمك واسمك ثم ابدأ الاختبار.");
    return;
  }

  if (!QUIZ){
    setResult("❌ لم يتم تحميل الأسئلة بعد. جرّب تحديث الصفحة.");
    return;
  }

  if (isSubmitting) return;
  isSubmitting = true;
  retryCount = 0;

  const answers = collectAnswers();
  const answeredCount = answers.filter(a => a).length;

  const hint = el("hint");
  if (hint) hint.textContent = `تمت الإجابة على ${answeredCount} من ${answers.length} سؤال.`;

  const btnSubmit = el("btnSubmit");
  if (btnSubmit) btnSubmit.disabled = true;

  show("loading");

  const payload = {
    action: "submit",
    studentId: STUDENT.id,
    studentName: STUDENT.name,
    answers
  };

  async function attemptSend(){
    try{
      const r = await fetch(API_SUBMIT, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload)
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
}

window.addEventListener("hashchange", () => {
  if (location.hash === "#landing-view") goHome();
});

document.addEventListener("DOMContentLoaded", () => {
  const btnStart = el("btnStart");
  if (btnStart){
    btnStart.addEventListener("click", async () => {
      const err = validateLanding();
      if (err){ setLandingMsg("❌ " + err); return; }

      // ✅ خزّن بيانات الطالب مرة واحدة
      STUDENT.id = el("studentId").value.trim();
      STUDENT.name = el("studentName").value.trim();

      await loadQuiz();
    });
  }

  const btnReload = el("btnReload");
  if (btnReload) btnReload.addEventListener("click", () => location.reload());

  const btnSubmit = el("btnSubmit");
  if (btnSubmit) btnSubmit.addEventListener("click", submit);

  const linkHome = el("linkHome");
  if (linkHome) linkHome.addEventListener("click", () => { location.hash = "#landing-view"; });

  if (!location.hash) location.hash = "#landing-view";
});
