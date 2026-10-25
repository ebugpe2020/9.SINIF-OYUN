
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreUI = document.getElementById("score");
const messageUI = document.getElementById("message");
const startBtn = document.getElementById("start");

let w, h, dpr;
let score = 0;
let started = false;
let gameStartedBefore = false;
let lastTime = 0;
let spawnTimer = 0;
let notes = [];
let particles = [];
let feedback = "";
let feedbackTime = 0;
let questionMode = false;
let currentQuestion = null;
let usedQuestions = [];
let answerRects = [];
let questionAnswered = false;
let questionCorrect = false;
let continueRect = null;
let nextQuestionScore = 6000;
let hitPulse = 0;

const hitXRatio = 0.23;

const units = [
  {
    name: "MEKKE",
    questions: [
      {
        q: "Kâbe hangi şehirde bulunur?",
        a: ["Mekke", "Şam", "Bağdat"],
        c: 0,
        info: "Kâbe, Mekke'de bulunur ve İslam tarihinde önemli bir yere sahiptir."
      },
      {
        q: "Mekke'nin ekonomik öneminde ne etkiliydi?",
        a: ["Kervan ticareti", "Demiryolları", "Fabrikalar"],
        c: 0,
        info: "Mekke, ticaret yolları ve panayırlarla ekonomik önem kazanmıştı."
      }
    ]
  },
  {
    name: "YESRİB (MEDİNE)",
    questions: [
      {
        q: "Medine'nin İslamiyet öncesindeki adı neydi?",
        a: ["Yesrib", "Taif", "Yemen"],
        c: 0,
        info: "Medine'nin İslamiyet öncesinde bilinen adı Yesrib'di."
      },
      {
        q: "Yesrib'de yaşayan iki önemli Arap kabilesi hangileriydi?",
        a: ["Evs ve Hazrec", "Kureyş ve Sakif", "Ad ve Semud"],
        c: 0,
        info: "Evs ve Hazrec, Yesrib'de yaşayan iki önemli Arap kabilesiydi."
      }
    ]
  },
  {
    name: "TİCARET",
    questions: [
      {
        q: "Çölde uzak mesafelere mal taşıyan topluluklar ne kullanırdı?",
        a: ["Kervanlar", "Trenler", "Kamyonlar"],
        c: 0,
        info: "Develerin kullanıldığı kervanlar, çöl ticaretinde önemliydi."
      },
      {
        q: "Panayırların önemli işlevlerinden biri neydi?",
        a: ["Ticaret ve şiir", "Uçak üretimi", "Fabrika işletmek"],
        c: 0,
        info: "Panayırlarda alışveriş yapılır, şiir ve sözlü kültür de öne çıkardı."
      }
    ]
  },
  {
    name: "KÜLTÜR",
    questions: [
      {
        q: "İslamiyet öncesi Arap toplumunda hangi sözlü sanat önemliydi?",
        a: ["Şiir", "Sinema", "Radyo tiyatrosu"],
        c: 0,
        info: "Şiir, sözlü kültürün ve toplumsal anlatımın önemli bir parçasıydı."
      },
      {
        q: "Şiir ve hitabetin yaygın olması hangi kültür özelliğiyle ilişkilidir?",
        a: ["Sözlü anlatım", "Dijital yayıncılık", "Matbaa sanayisi"],
        c: 0,
        info: "Sözlü anlatım, bilgilerin ve kültürün aktarılmasında önemliydi."
      }
    ]
  },
  {
    name: "İNANÇLAR",
    questions: [
      {
        q: "İslamiyet öncesi Arabistan'da hangi inanç biçimi yaygındı?",
        a: ["Çok tanrılı inançlar", "Yalnızca tek bir inanç", "Modern bilimsel düşünce"],
        c: 0,
        info: "Arabistan'da farklı inançlar vardı; Mekke'de çok tanrılı inanç yaygındı."
      },
      {
        q: "İslamiyet öncesi Arap toplumunda kutsal kabul edilen Kâbe hangi şehirdeydi?",
        a: ["Mekke", "Yesrib", "Taif"],
        c: 0,
        info: "Kâbe, İslamiyet öncesinde de Araplar için önemli bir kutsal merkezdi."
      }
    ]
  }
];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function groundY() {
  return h * 0.78;
}

function hitX() {
  return w * hitXRatio;
}

function startGame() {
  if (!gameStartedBefore) {
    score = 0;
    nextQuestionScore = 6000;
    usedQuestions = [];
    gameStartedBefore = true;
  }

  notes = [];
  particles = [];
  spawnTimer = 0.5;
  started = true;
  questionMode = false;
  currentQuestion = null;
  questionAnswered = false;
  continueRect = null;
  feedback = "";
  feedbackTime = 0;
  lastTime = 0;

  if (scoreUI) scoreUI.textContent = "SKOR: " + Math.floor(score);
  if (messageUI) messageUI.textContent = "";

  draw();
}

function makeParticles(x, y, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 150;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.4,
      maxLife: 0.75,
      size: 2 + Math.random() * 4
    });
  }
}

function addNote() {
  notes.push({
    x: w + 40,
    y: h * (0.28 + Math.random() * 0.32),
    r: 16 + Math.random() * 6
  });
}

function judgeNote() {
  if (!started || questionMode || !notes.length) {
    feedback = "NOTAYI BEKLE";
    feedbackTime = 0.6;
    return;
  }

  let nearestIndex = -1;
  let nearestDistance = Infinity;

  for (let i = 0; i < notes.length; i++) {
    const distance = Math.abs(notes[i].x - hitX());

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  if (nearestIndex !== -1 && nearestDistance < Math.max(42, w * 0.09)) {
    const note = notes.splice(nearestIndex, 1)[0];

    if (nearestDistance < 18) {
      score += 100;
      feedback = "PERFECT!";
      makeParticles(hitX(), note.y, 24);
      hitPulse = 1;
    } else {
      score += 50;
      feedback = "GOOD!";
      makeParticles(hitX(), note.y, 12);
      hitPulse = 0.5;
    }

    feedbackTime = 0.7;
  } else {
    feedback = "KAÇTI!";
    feedbackTime = 0.5;
  }
}

function openRandomQuestion() {
  if (questionMode) return;

  const all = [];

  units.forEach((unit, unitIndex) => {
    unit.questions.forEach((question, questionIndex) => {
      all.push({
        ...question,
        unitName: unit.name,
        id: unitIndex + "-" + questionIndex
      });
    });
  });

  let available = all.filter(q => !usedQuestions.includes(q.id));

  if (available.length === 0) {
    usedQuestions = [];
    available = all;
  }

  const selected = available[Math.floor(Math.random() * available.length)];

  usedQuestions.push(selected.id);
  currentQuestion = selected;
  questionMode = true;
  questionAnswered = false;
  questionCorrect = false;
  continueRect = null;
  answerRects = [];
  started = false;

  if (messageUI) messageUI.textContent = "";

  draw();
}

function chooseAnswer(index) {
  if (!questionMode || !currentQuestion || questionAnswered) return;

  questionCorrect = index === currentQuestion.c;
  questionAnswered = true;

  if (questionCorrect) {
    score += 150;
    feedback = "DOĞRU! +150";
  } else {
    feedback = "YANLIŞ";
  }

  feedbackTime = 1.2;

  if (scoreUI) scoreUI.textContent = "SKOR: " + Math.floor(score);

  draw();
}

function continueGame() {
  if (!questionMode || !questionAnswered) return;

  questionMode = false;
  currentQuestion = null;
  questionAnswered = false;
  continueRect = null;
  answerRects = [];
  started = true;
  spawnTimer = 0.5;
  lastTime = 0;

  if (messageUI) messageUI.textContent = "";

  draw();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? line + " " + word : word;

    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, currentY);

  return currentY + lineHeight;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#d5ad77");
  sky.addColorStop(0.6, "#e8c99a");
  sky.addColorStop(1, "#bd8955");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Güneş
  ctx.fillStyle = "#f4dfad";
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.2, Math.min(w, h) * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Uzak dağlar
  ctx.fillStyle = "#c49a6c";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  ctx.lineTo(w * 0.17, h * 0.37);
  ctx.lineTo(w * 0.34, h * 0.56);
  ctx.lineTo(w * 0.52, h * 0.4);
  ctx.lineTo(w * 0.76, h * 0.58);
  ctx.lineTo(w, h * 0.42);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Kum tepeleri
  ctx.fillStyle = "#b9834f";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.69);
  ctx.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.53, h * 0.7);
  ctx.quadraticCurveTo(w * 0.78, h * 0.82, w, h * 0.65);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#93643e";
  ctx.fillRect(0, groundY(), w, h - groundY());

  ctx.strokeStyle = "#e2bd83";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY());
  ctx.lineTo(w, groundY());
  ctx.stroke();
}

function drawNote(note) {
  ctx.save();

  ctx.fillStyle = "#f7e2b9";
  ctx.strokeStyle = "#825633";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(note.x, note.y, note.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawHitLine() {
  const x = hitX();

  ctx.strokeStyle = "#6e4629";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, h * 0.18);
  ctx.lineTo(x, groundY());
  ctx.stroke();

  ctx.strokeStyle = "#f3d7a7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, h * 0.48, 25 + hitPulse * 12, 0, Math.PI * 2);
  ctx.stroke();
}

function updateParticles(dt) {
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 110 * dt;
    p.life -= dt;
  });

  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = "#fff0c9";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

function drawQuestion() {
  ctx.fillStyle = "rgba(36, 25, 17, 0.72)";
  ctx.fillRect(0, 0, w, h);

  const panelW = Math.min(w * 0.9, 620);
  const panelH = Math.min(h * 0.86, 560);
  const px = (w - panelW) / 2;
  const py = (h - panelH) / 2;

  ctx.fillStyle = "#f1dfbd";
  ctx.strokeStyle = "#815b36";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#704726";
  ctx.font = "bold 18px Arial";
  ctx.fillText(currentQuestion.unitName, w / 2, py + 35);

  ctx.fillStyle = "#382719";
  ctx.font = "bold 20px Arial";

  let questionBottom = wrapText(
    currentQuestion.q,
    w / 2,
    py + 75,
    panelW - 40,
    27
  );

  answerRects = [];
  continueRect = null;

  if (!questionAnswered) {
    const optionTop = Math.max(questionBottom + 12, py + 145);
    const optionH = Math.min(54, panelH * 0.115);
    const gap = 10;

    currentQuestion.a.forEach((answer, i) => {
      const ay = optionTop + i * (optionH + gap);
      const rect = {
        x: px + 20,
        y: ay,
        w: panelW - 40,
        h: optionH
      };

      answerRects.push(rect);

      ctx.fillStyle = "#dfc397";
      ctx.strokeStyle = "#a47a4e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#382719";
      ctx.font = "bold 16px Arial";
      ctx.fillText(answer, w / 2, ay + optionH / 2 + 6);
    });

    ctx.font = "14px Arial";
    ctx.fillStyle = "#704726";
    ctx.fillText(
      "Doğru cevap: +150 puan",
      w / 2,
      py + panelH - 18
    );
  } else {
    ctx.fillStyle = questionCorrect ? "#3e713c" : "#a13c2c";
    ctx.font = "bold 23px Arial";
    ctx.fillText(
      questionCorrect ? "DOĞRU! +150 PUAN" : "YANLIŞ CEVAP",
      w / 2,
      questionBottom + 20
    );

    ctx.fillStyle = "#382719";
    ctx.font = "16px Arial";

    const infoY = wrapText(
      currentQuestion.info,
      w / 2,
      questionBottom + 55,
      panelW - 48,
      23
    );

    const buttonW = Math.min(panelW - 50, 300);
    const buttonH = 48;
    const buttonY = Math.min(
      Math.max(infoY + 10, py + panelH - 75),
      py + panelH - buttonH - 12
    );

    continueRect = {
      x: w / 2 - buttonW / 2,
      y: buttonY,
      w: buttonW,
      h: buttonH
    };

    ctx.fillStyle = "#825633";
    ctx.beginPath();
    ctx.roundRect(
      continueRect.x,
      continueRect.y,
      continueRect.w,
      continueRect.h,
      10
    );
    ctx.fill();

    ctx.fillStyle = "#fff0d0";
    ctx.font = "bold 17px Arial";
    ctx.fillText(
      "DEVAM ET",
      w / 2,
      continueRect.y + 30
    );
  }

  ctx.textAlign = "left";
}

function draw() {
  if (!w || !h) return;

  drawBackground();

  if (questionMode && currentQuestion) {
    drawQuestion();
    return;
  }

  drawHitLine();
  notes.forEach(drawNote);
  drawParticles();

  if (feedbackTime > 0 && feedback) {
    ctx.textAlign = "center";
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "#fff0c9";
    ctx.fillText(feedback, hitX(), h * 0.15);
    ctx.textAlign = "left";
  }

  if (!gameStartedBefore) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff0c9";
    ctx.font = "bold 24px Arial";
    ctx.fillText("BAŞLAMAK İÇİN DOKUN", w / 2, h * 0.45);
    ctx.textAlign = "left";
  }
}

function loop(time) {
  if (!lastTime) lastTime = time;

  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (started && !questionMode) {
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
      addNote();
      spawnTimer = 0.75 + Math.random() * 0.45;
    }

    notes.forEach(note => {
      note.x -= Math.max(210, w * 0.5) * dt;
    });

    notes = notes.filter(note => {
      if (note.x < hitX() - 55) {
        return false;
      }
      return true;
    });

    score += dt * 2;

    if (score >= nextQuestionScore) {
      nextQuestionScore += 6000;
      openRandomQuestion();
    }
  }

  updateParticles(dt);
  hitPulse = Math.max(0, hitPulse - dt * 2.5);
  feedbackTime = Math.max(0, feedbackTime - dt);

  if (scoreUI) {
    scoreUI.textContent = "SKOR: " + Math.floor(score);
  }

  draw();
  requestAnimationFrame(loop);
}

function handleInput(e) {
  if (e.type === "keydown") {
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
  }

  const rect = canvas.getBoundingClientRect();
  const px = e.clientX !== undefined ? e.clientX - rect.left : w / 2;
  const py = e.clientY !== undefined ? e.clientY - rect.top : h / 2;

  if (questionMode && currentQuestion) {
    if (questionAnswered) {
      if (
        continueRect &&
        px >= continueRect.x &&
        px <= continueRect.x + continueRect.w &&
        py >= continueRect.y &&
        py <= continueRect.y + continueRect.h
      ) {
        continueGame();
      }
      return;
    }

    for (let i = 0; i < answerRects.length; i++) {
      const r = answerRects[i];

      if (
        px >= r.x &&
        px <= r.x + r.w &&
        py >= r.y &&
        py <= r.y + r.h
      ) {
        chooseAnswer(i);
        return;
      }
    }

    return;
  }

  if (!started) {
    startGame();
    return;
  }

  judgeNote();
}

canvas.addEventListener("pointerdown", handleInput);
window.addEventListener("keydown", handleInput);
window.addEventListener("resize", resize);

if (startBtn) {
  startBtn.addEventListener("click", startGame);
}

resize();
requestAnimationFrame(loop);
