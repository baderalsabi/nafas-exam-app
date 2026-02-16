let QUIZ = null;
let isSubmitting = false;
let retryCount = 0;

const API_QUIZ = "/api/quiz";
const API_SUBMIT = "/api/submit";

function el(id){ return document.getElementById(id); }
function show(id){ el(id).classList.remove("hidden"); }
function hide(id){ el(id).classList.add("hidden"); }

function setLandingMsg(t){ el("landingMsg").textContent = t || ""; }

function setResult(html){
  const box = el("result");
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
  el("subject").textContent = quiz.subject || "اختبار";
  el("meta").textContent = `عدد الأسئلة: ${quiz.questions.length}`;

  const wrap = el("questions");
  wrap.innerHTML = "";
  quiz.questions.forEach((q, i) => wrap.appendChild(buildQuestionCard(q, i)));

  el("btnSubmit").disabled = false;
  el("hint").textContent = "";
  hide("loading");
  hide("result");

  hide("landing-view");
  show("exam-view");
}

function collectAnswers(){
  if (!QUIZ) return [];
  const answers = [];
  for (let i=0; i<QUIZ.questions.length; i++){
    const sel = document.querySelector(`input[name="q_${i}"]:checked`);
    answers.push(sel ? sel.value : "");
  }
  return answers;
}

function validateLanding(){
  const id = el("studentId").value.trim();
  const name = el("studentName").value.trim();
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
  const err = validateLanding();
  if (err){ setLandingMsg("❌ " + err); return; }
  if (!QUIZ){ setLandingMsg("جارٍ التحميل… اضغط تحديث إذا تأخر."); return; }
  if (isSubmitting) return;

  isSubmitting = true;
  retryCount = 0;

  const answers = collectAnswers();
  const answeredCount = answers.filter(a => a).length;

  el("hint").textContent = `تمت الإجابة على ${answeredCount} من ${answers.length} سؤال.`;
  el("btnSubmit").disabled = true;
  show("loading");

  const payload = {
    action: "submit",
    studentId: el("studentId").value.trim(),
    studentName: el("studentName").value.trim(),
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
        el("btnSubmit").disabled = false;
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
      el("btnSubmit").disabled = false;
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
  el("btnStart").addEventListener("click", async () => {
    const err = validateLanding();
    if (err){ setLandingMsg("❌ " + err); return; }
    await loadQuiz();
  });

  el("btnReload").addEventListener("click", () => location.reload());
  el("btnSubmit").addEventListener("click", submit);

  el("linkHome").addEventListener("click", () => { location.hash = "#landing-view"; });

  if (!location.hash) location.hash = "#landing-view";
});
