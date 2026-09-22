/* ============================================================
   라운지엑스 경영관리 루프 — 라우터 + 렌더러
   외부 라이브러리 없음. 차트는 Canvas로 직접 그립니다.
   ============================================================ */
(function () {
"use strict";

/* ── 유틸 ──────────────────────────────── */
var el = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) {
  return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };
var nf = function (v) { return Math.round(v).toLocaleString("ko-KR"); };

function won(v) {
  if (v === null || v === undefined || v === "") return "—";
  var a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 100000000) return s + (a / 100000000).toFixed(a >= 1000000000 ? 0 : 1) + "억";
  if (a >= 10000) return s + Math.round(a / 10000).toLocaleString("ko-KR") + "만";
  return s + nf(a);
}
function pct(v, d) {
  if (v === null || v === undefined || v === "") return "—";
  return (v * 100).toFixed(d === undefined ? 1 : d) + "%";
}
var sgn = function (v) { return v < 0 ? "neg" : v > 0 ? "pos" : ""; };

/* ── 드릴다운 ──────────────────────────── */
function dt(key, label) {
  if (!LX.drill || !LX.drill[key]) return esc(label || key);
  return '<button class="dt" data-dk="' + esc(key) + '">' + esc(label || key) + "</button>";
}
/* 본문에서 드릴 키워드를 자동으로 버튼으로 바꿉니다 */
function lk(text) {
  var s = esc(text);
  if (!LX.drill) return s;
  Object.keys(LX.drill)
    .sort(function (a, b) { return b.length - a.length; })
    .forEach(function (k) {
      if (s.indexOf(k) < 0 || s.indexOf('data-dk="' + k) >= 0) return;
      s = s.replace(k, '<button class="dt" data-dk="' + k + '">' + k + "</button>");
    });
  return s;
}

function openDrill(key) {
  var d = LX.drill[key]; if (!d) return;
  var h = "<h2>" + esc(d.title) + "</h2>";
  if (d.desc) h += '<p class="dsub">' + esc(d.desc) + "</p>";
  if (d.items) {
    var tot = d.items.reduce(function (a, b) { return a + b.v; }, 0);
    h += '<div class="bars">' + d.items.map(function (it) {
      var p = tot ? it.v / tot : 0;
      return '<div class="bar"><div class="bar-h"><b>' + esc(it.n) +
        (it.note ? ' <span class="tiny">' + esc(it.note) + "</span>" : "") +
        "</b><span>" + won(it.v) + " · " + pct(p) + '</span></div>' +
        '<div class="bar-t"><div class="bar-f" style="width:' +
        (p * 100).toFixed(1) + '%;background:var(--navy)"></div></div></div>';
    }).join("") + "</div>";
  }
  if (d.table) h += tbl(d.table.head, d.table.rows);
  if (d.notes) h += '<div class="banner b-blue" style="margin:14px 0 0"><b>참고</b>' +
    d.notes.map(esc).join("<br>") + "</div>";
  el("drillBody").innerHTML = h;
  el("drillLayer").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeDrill() {
  el("drillLayer").hidden = true;
  document.body.style.overflow = "";
}
function tbl(head, rows) {
  return '<div class="tw"><table><thead><tr>' +
    head.map(function (h, i) { return "<th" + (i ? ' class="num"' : "") + ">" + esc(h) + "</th>"; }).join("") +
    "</tr></thead><tbody>" + rows.map(function (r) {
      return "<tr>" + r.map(function (c, i) {
        var neg = typeof c === "string" && c.indexOf("−") === 0;
        return "<td" + (i ? ' class="num' + (neg ? " neg" : "") + '"' : "") + ">" + esc(c) + "</td>";
      }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>";
}

/* ── 도넛 ──────────────────────────────── */
function donut(id, items, size) {
  var c = el(id); if (!c || !c.getContext) return;
  var S = size || 230, dpr = window.devicePixelRatio || 1;
  c.width = S * dpr; c.height = S * dpr;
  c.style.width = S + "px"; c.style.height = S + "px";
  var x = c.getContext("2d"); if (!x) return;
  try { x.scale(dpr, dpr); } catch (e) {}
  var tot = items.reduce(function (a, b) { return a + Math.abs(b.value); }, 0) || 1;
  var cx = S / 2, cy = S / 2, R = S / 2 - 4, r = R * 0.58, a0 = -Math.PI / 2;
  items.forEach(function (it) {
    var p = Math.abs(it.value) / tot, a1 = a0 + p * Math.PI * 2;
    x.beginPath(); x.arc(cx, cy, R, a0, a1); x.arc(cx, cy, r, a1, a0, true);
    x.closePath(); x.fillStyle = it.color; x.fill();
    if (p > 0.05) {
      var am = (a0 + a1) / 2, rr = (R + r) / 2;
      x.fillStyle = "#fff"; x.font = "bold 12px sans-serif";
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText((p * 100).toFixed(1) + "%", cx + Math.cos(am) * rr, cy + Math.sin(am) * rr);
    }
    a0 = a1;
  });
}
function legend(items) {
  var tot = items.reduce(function (a, b) { return a + Math.abs(b.value); }, 0) || 1;
  return '<div class="legend">' + items.map(function (it) {
    return '<div class="lg"><span class="lg-c" style="background:' + it.color + '"></span>' +
      '<span class="lg-n">' + lk(it.name) + '</span>' +
      '<span class="lg-v">' + won(it.value) + '</span>' +
      '<span class="lg-p">' + pct(Math.abs(it.value) / tot) + "</span></div>";
  }).join("") + "</div>";
}

/* ── 꺾은선 ────────────────────────────── */
function line(id, series, labels, opt) {
  var c = el(id); if (!c || !c.getContext) return;
  opt = opt || {};
  var W = (c.parentNode && c.parentNode.clientWidth) || c.clientWidth || 760;
  if (W < 300) W = 760;
  var H = opt.h || 250, dpr = window.devicePixelRatio || 1;
  c.width = W * dpr; c.height = H * dpr;
  c.style.width = "100%"; c.style.height = H + "px";
  var x = c.getContext("2d"); if (!x) return;
  try { x.scale(dpr, dpr); } catch (e) {}

  var L = 54, R = 10, T = 12, B = 26;
  var pw = W - L - R, ph = H - T - B;
  var all = [];
  series.forEach(function (s) { s.data.forEach(function (v) { if (v !== null && v !== undefined) all.push(v); }); });
  if (!all.length) return;
  var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
  if (opt.zero !== false) { mx = Math.max(mx, 0); mn = Math.min(mn, 0); }
  var pad = (mx - mn) * 0.08 || 1; mx += pad; mn -= pad;
  var px = function (i) { return L + (labels.length < 2 ? pw / 2 : (pw * i) / (labels.length - 1)); };
  var py = function (v) { return T + ph - ((v - mn) / (mx - mn)) * ph; };

  /* 격자 + y축 */
  x.font = "10px sans-serif"; x.textBaseline = "middle";
  for (var g = 0; g <= 4; g++) {
    var v = mn + ((mx - mn) * g) / 4, y = py(v);
    x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y);
    x.strokeStyle = Math.abs(v) < (mx - mn) / 100 ? "#c9d0d6" : "#eef1f3";
    x.lineWidth = 1; x.stroke();
    x.fillStyle = "#9aa3ab"; x.textAlign = "right";
    x.fillText(won(v), L - 7, y);
  }
  /* x축 라벨 */
  x.textAlign = "center"; x.textBaseline = "top"; x.fillStyle = "#9aa3ab";
  var step = labels.length > 8 ? (W < 480 ? 3 : 1) : 1;
  labels.forEach(function (lb, i) {
    if (i % step) return;
    x.fillText(lb, px(i), T + ph + 7);
  });
  /* 선 */
  series.forEach(function (s) {
    x.strokeStyle = s.color; x.lineWidth = s.dash ? 1.8 : 2.4;
    if (x.setLineDash) x.setLineDash(s.dash ? [5, 4] : []);
    x.beginPath();
    var started = false;
    s.data.forEach(function (v, i) {
      if (v === null || v === undefined) { started = false; return; }
      if (!started) { x.moveTo(px(i), py(v)); started = true; }
      else x.lineTo(px(i), py(v));
    });
    x.stroke();
    if (x.setLineDash) x.setLineDash([]);
    if (!s.dash) s.data.forEach(function (v, i) {
      if (v === null || v === undefined) return;
      x.beginPath(); x.arc(px(i), py(v), 3, 0, Math.PI * 2);
      x.fillStyle = s.color; x.fill();
    });
  });
}
function lineBox(id, series, note) {
  return '<div class="linebox"><canvas id="' + id + '"></canvas></div>' +
    '<div class="chart-legend">' + series.map(function (s) {
      return "<span><i" + (s.dash ? ' class="dash"' : "") + ' style="' +
        (s.dash ? "border-top-color:" : "background:") + s.color + '"></i>' + esc(s.name) + "</span>";
    }).join("") + "</div>" +
    (note ? '<p class="tiny" style="margin:8px 0 0">' + esc(note) + "</p>" : "");
}

/* ── 막대 ──────────────────────────────── */
function bars(items, color) {
  var mxv = Math.max.apply(null, items.map(function (i) { return Math.abs(i.v); })) || 1;
  return '<div class="bars">' + items.map(function (i) {
    return '<div class="bar"><div class="bar-h"><b>' + lk(i.n) + "</b><span>" +
      (i.t || won(i.v)) + "</span></div><div class=\"bar-t\"><div class=\"bar-f\" style=\"width:" +
      ((Math.abs(i.v) / mxv) * 100).toFixed(1) + "%;background:" +
      (i.c || color || "var(--navy)") + '"></div></div></div>';
  }).join("") + "</div>";
}

/* ══ 페이지 정의 ═══════════════════════════ */
var PHASES = [
  { n: "①", t: "목표수립" },
  { n: "②", t: "CSF · KPI 수립" },
  { n: "③", t: "사업현황 및 분석" },
  { n: "④", t: "전략과제 · 실행관리" },
  { n: "⑤", t: "지표리뷰" },
  { n: "＋", t: "부록 — 읽는 법" }
];

var PAGES = [
  { ph: 0, id: "goal",   t: "미션 · 비전 · 2026 목표",
    s: "우리가 목표하는 바가 무엇인지 명확히 합니다. 숫자 목표만이 아니라 그 목표가 왜 그 숫자인지까지 적습니다.", f: pGoal },
  { ph: 0, id: "structure", t: "사업 분류 체계",
    s: "모든 화면이 이 분류를 따릅니다. 매장운영 3개 + 식자재유통 2개 + 가맹.", f: pStruct },
  { ph: 0, id: "ramp",   t: "2026 월별 상승 기조",
    s: "연간 80억을 12개월에 어떻게 깔았는지, 그리고 실제가 그 선을 따라갔는지.", f: pRamp },

  { ph: 1, id: "tree",   t: "F&B 지표 체계와 측정 상태",
    s: "매출과 EBITDA를 무엇으로 쪼개는가. 그리고 그중 지금 실제로 측정되는 것은 무엇인가.", f: pTree },
  { ph: 1, id: "csf",    t: "세부사업별 CSF와 KPI",
    s: "사업마다 성공의 조건이 다릅니다. CSF는 문장이고 KPI는 그 문장을 재는 숫자입니다.", f: pCsf },
  { ph: 1, id: "gates",  t: "가맹 개시 게이트 9개",
    s: "무인직영 CSF의 측정 도구이자 가맹 개시의 선행조건입니다.", f: pGates },

  { ph: 2, id: "now",    t: "전사 현황",
    s: "현재 스코어를 분명히 인식합니다. 1~8월 실적입니다.", f: pNow },
  { ph: 2, id: "segs",   t: "세부사업별 월별 현황",
    s: "다섯 사업의 매출·손익 월별 추이와 계획선 대비.", f: pSegs },
  { ph: 2, id: "gap",    t: "목표 대비 실적 · 원인 특정",
    s: "현황에서 어떤 점이 가장 문제인지 분명히 공유합니다. 간격을 쪼개 원인까지 내려갑니다.", f: pGap },
  { ph: 2, id: "stores", t: "점포별 비교",
    s: "사업 평균에 가려진 개별 점포의 문제를 비율로 찾습니다.", f: pStores },
  { ph: 2, id: "landing", t: "연말 착지 전망",
    s: "회의에서 결정을 가르는 것은 누계가 아니라 착지입니다.", f: pLanding },

  { ph: 3, id: "tasks",  t: "전략과제",
    s: "③에서 특정한 원인을 해소하기 위한 프로젝트와 태스크. 원인 없이 만든 과제는 올리지 않습니다.", f: pTasks },
  { ph: 3, id: "board",  t: "실행관리 규칙",
    s: "과제가 상태를 옮기는 조건. 철저한 실행관리를 위한 최소 규칙입니다.", f: pBoard },

  { ph: 4, id: "review", t: "지표리뷰 — baseline 대비",
    s: "과제 실행에 따라 지표가 실제로 움직였는지 확인합니다.", f: pReview },
  { ph: 4, id: "loop",   t: "루프 운영 규칙",
    s: "이 다섯 단계를 매달 어떻게 도는가. 경영진부터 실무진까지 같은 순서로 봅니다.", f: pLoop },

  { ph: 5, id: "pl",     t: "관리손익이란",
    s: "왜 원본 영업손익을 그대로 쓰지 않는가.", f: pPL },
  { ph: 5, id: "shared", t: "상품과 제품의 비용 분담",
    s: "상품 이익률 24.1%를 그대로 믿으면 안 되는 이유.", f: pShared },
  { ph: 5, id: "trust",  t: "숫자 신뢰도",
    s: "확정된 숫자와 아직 확정되지 않은 숫자를 구분합니다.", f: pTrust },
  { ph: 5, id: "tabs",   t: "대장 탭 지도",
    s: "63개 탭 중 실제로 열어야 하는 것.", f: pTabs }
];

/* ══ ① 목표수립 ═══════════════════════════ */
function pGoal() {
  var g = LX.goal;
  var h = '<div class="banner b-blue"><b>이 사이트의 목적</b>' +
    "우리가 목표하는 바가 무엇인지 명확히 하고 · 현재 스코어를 분명히 인식하고 · " +
    "현황에서 무엇이 가장 문제인지 공유하고 · 그 문제를 풀 전략과제를 세우고 · " +
    "실행관리를 통해 지표를 개선한다. 이 루프를 경영진과 실무진이 같은 화면으로 도는 도구입니다.</div>";

  h += '<div class="flow">' + PHASES.slice(0, 5).map(function (p, i) {
    var first = PAGES.filter(function (x) { return x.ph === i; })[0];
    return '<a class="flow-s" href="#/' + first.id + '"><div class="flow-n">' + p.n + "</div>" +
      "<b>" + esc(p.t) + "</b><span>" + esc(first.t) + "</span></a>";
  }).join("") + "</div>";

  h += '<div class="card"><h2>MISSION</h2><p style="font-size:16px;line-height:1.85">' +
    esc(g.mission) + "</p>" +
    '<h2 style="margin-top:22px">VISION</h2><p style="font-size:16px;line-height:1.85">' +
    esc(g.vision) + "</p></div>";

  h += '<div class="kpis">' +
    '<div class="kpi"><div class="k-l">2026 매출 목표</div><div class="k-v">80억</div>' +
    '<div class="k-s">1~8월 실적 ' + won(LX.status.company.revenue) + " · 계획 대비 " +
    pct(LX.status.company.achieve) + "</div></div>" +
    '<div class="kpi"><div class="k-l">2026 EBITDA 목표</div><div class="k-v">20억</div>' +
    '<div class="k-s">매출의 25% · 현재 ' + won(LX.status.company.ebitda) + "</div></div>" +
    '<div class="kpi neg"><div class="k-l">현재 페이스 착지</div><div class="k-v">' +
    won(LX.status.landing[1].v) + '</div><div class="k-s">목표의 ' +
    pct(LX.status.landing[1].v / g.target.revenue) + "</div></div></div>";

  h += '<div class="card"><h2>사업전략 — 목표를 어떻게 달성하는가</h2>' +
    '<p class="sec-d">숫자 목표만 있고 경로가 없으면 전략과제를 만들 수 없습니다. ' +
    "80억이라는 숫자는 아래 네 가지가 성립할 때만 가능한 숫자입니다.</p>";
  g.strategy.forEach(function (s) {
    h += '<div class="act"><div class="act-h"><span class="act-id">' + esc(s.id) + "</span>" +
      "<b>" + esc(s.name) + '</b><span class="bg bg-gy">' + esc(s.owner) + "</span></div>" +
      '<div class="act-b">' + lk(s.why) + '<p class="tiny" style="margin:7px 0 0">검증 지점 — ' +
      esc(s.link) + "</p></div></div>";
  });
  h += "</div>";

  h += '<div class="banner b-red"><b>지금 이 목표는 성립하지 않습니다</b>' +
    "80억 중 " + won(Math.abs(LX.status.gap.roots[0].v)) + "(" + pct(LX.status.gap.roots[0].s) +
    ")가 가맹에서 나오게 설계되어 있는데, 가맹 개시 게이트 9개 중 통과한 것이 0개입니다. " +
    "그중 4개는 측정조차 시작되지 않았습니다. 목표를 낮추거나 게이트를 통과시키거나 둘 중 하나입니다.</div>";
  return h;
}

function pStruct() {
  var h = '<p class="sec-d">이 분류는 관리회계대장 44_프로젝션엔진 §A의 사업계층과 같습니다. ' +
    "모든 화면·표·차트가 이 다섯(가맹 포함 여섯) 단위로만 쪼개집니다.</p>";
  LX.goal.structure.forEach(function (d) {
    h += '<div class="card"><h2>' + esc(d.div) + "</h2>";
    h += '<div class="tw"><table><thead><tr><th>세부사업</th><th>정의</th><th class="num">규모</th></tr></thead><tbody>';
    d.subs.forEach(function (s) {
      h += "<tr><td><b>" + esc(s.name) + "</b></td><td>" + lk(s.desc) +
        '</td><td class="num">' + esc(s.cnt) + "</td></tr>";
    });
    h += "</tbody></table></div></div>";
  });
  h += '<div class="banner b-amber"><b>용어 규칙</b>' +
    "매장운영은 반드시 <b>유인직영 · 무인직영 · 투자모델</b> 셋으로만 부릅니다. " +
    "'직영매장', '무인매장' 같은 상위 묶음은 세 모델의 손익 구조가 전혀 달라 평균이 왜곡되므로 쓰지 않습니다. " +
    "23_경영지표의 '참고 — 무인계'는 과거 운영방식 기준의 잔존 분류이며 공식 분류가 아닙니다.</div>";
  return h;
}

function pRamp() {
  var r = LX.goal.ramp;
  var h = '<div class="card"><h2>계획선과 실적선</h2>' +
    '<p class="sec-d">' + esc(r.note) + "</p>" +
    lineBox("rampC", [
      { name: "계획", color: "#9aa3ab", data: r.plan, dash: true },
      { name: "실적", color: "#16283c", data: r.actual }
    ], "단위 원 · 1~8월 실적, 9~12월은 계획만 표시") + "</div>";

  var rows = r.plan.map(function (p, i) {
    var a = r.actual[i];
    return [LX.meta.months[i], won(p), a === null ? "—" : won(a),
      a === null ? "—" : (a - p < 0 ? "−" : "") + won(Math.abs(a - p)).replace("−", ""),
      a === null ? "—" : pct(a / p, 0)];
  });
  h += '<div class="card"><h2>월별 계획 대 실적</h2>' +
    tbl(["월", "계획", "실적", "차이", "달성률"], rows) +
    '<p class="tiny" style="margin:12px 0 0">6월에 계획이 2.9배로 뛰는 것은 가맹 개설매출 5.1억이 들어가기 때문입니다. ' +
    "가맹이 열리지 않으면 이 계획선은 6월 이후 전부 미달로 남습니다.</p></div>";
  return h;
}
function pRampAfter() { line("rampC", [
  { name: "계획", color: "#9aa3ab", data: LX.goal.ramp.plan, dash: true },
  { name: "실적", color: "#16283c", data: LX.goal.ramp.actual }
], LX.meta.months, { h: 260 }); }

/* ══ ② CSF · KPI ═══════════════════════════ */
function pTree() {
  var t = LX.kpi.tree;
  var okN = 0, noN = 0;
  t.branches.forEach(function (b) { b.items.forEach(function (i) { i.ok ? okN++ : noN++; }); });

  var h = '<div class="kpis">' +
    '<div class="kpi pos"><div class="k-l">측정되는 지표</div><div class="k-v">' + okN +
    '개</div><div class="k-s">원본 P&L·원장에서 자동 계산</div></div>' +
    '<div class="kpi neg"><div class="k-l">측정 체계가 없는 지표</div><div class="k-v">' + noN +
    '개</div><div class="k-s">입력 탭이 비어 있거나 수집 자체가 없음</div></div>' +
    '<div class="kpi"><div class="k-l">측정률</div><div class="k-v">' +
    Math.round((okN / (okN + noN)) * 100) + '%</div><div class="k-s">' + okN + " / " + (okN + noN) + "</div></div></div>";

  h += '<div class="banner b-red"><b>이 페이지가 이 사이트에서 가장 중요합니다</b>' +
    "매출을 쪼개는 축(주문 건수 · 방문자 수 · 주문율 · 객단가 · 재방문율)이 전부 비어 있고, " +
    "비용을 쪼개는 축만 살아 있습니다. 그래서 지금 이 대장에서 나오는 과제는 " +
    "<b>전부 비용을 줄이는 과제</b>입니다. 매출을 올리는 과제는 '점포당 매출을 올린다'는 문장 이상으로 " +
    "구체화될 수 없습니다. 무엇을 올릴지 모르기 때문입니다.</div>";

  h += '<p class="sec-d">' + esc(t.note) + "</p>";
  h += '<div class="tree">' + t.branches.map(function (b) {
    return '<div class="tree-b"><div class="tree-h">' + esc(b.root) + " 분해</div>" +
      b.items.map(function (i) {
        return '<div class="tree-i ' + (i.ok ? "ok" : "no") + '"><span class="ti-d"></span>' +
          '<span class="ti-n">' + esc(i.n) + '</span><span class="ti-s">' + esc(i.src) + "</span></div>";
      }).join("") + "</div>";
  }).join("") + "</div>";

  h += '<div class="card" style="margin-top:18px"><h2>그래서 0순위 과제</h2>' +
    "<p>측정되지 않는 것은 개선할 수 없습니다. 운영지표 수집 체계 구축(P-000)이 다른 모든 " +
    "매출 과제의 선행조건입니다. 이것이 끝나기 전에는 P-001(무인 점포당 매출)과 " +
    "P-003(유인 매출 회복)은 <b>무엇을 할지 정할 수 없는 상태</b>로 남습니다.</p>" +
    '<p class="tiny">관련 탭 — 19_운영지표입력 · 24_전략운영입력 · 31_KPI정의</p></div>';
  return h;
}

function pCsf() {
  var cmap = {}; LX.status.segs.forEach(function (s) { cmap[s.key] = s.color; });
  var h = '<div class="banner b-amber"><b>CSF와 KPI는 다릅니다</b>' +
    "CSF(핵심성공요인)는 <b>이 사업이 성공하려면 반드시 되어야 하는 것</b>을 한 문장으로 쓴 것입니다. " +
    "KPI는 그 문장이 되고 있는지를 재는 숫자입니다. CSF 없이 KPI만 나열하면 " +
    "지표가 왜 중요한지 설명할 수 없어, 개선과제의 우선순위를 정하지 못합니다.</div>";

  LX.kpi.csf.forEach(function (c) {
    h += '<div class="csf"><div class="csf-h">' +
      '<span class="csf-seg" style="background:' + (cmap[c.key] || "#6b757e") + '">' + esc(c.seg) + "</span>" +
      "<b>" + esc(c.csf) + "</b></div>" +
      '<div class="csf-why">' + lk(c.why) + "</div><div class=\"csf-k\">" +
      '<div class="tw"><table><thead><tr><th>KPI</th><th class="num">현재</th><th class="num">목표</th>' +
      '<th class="num">측정</th><th>비고</th></tr></thead><tbody>' +
      c.kpis.map(function (k) {
        return "<tr><td><b>" + esc(k.n) + '</b></td><td class="num">' + esc(k.now) +
          '</td><td class="num">' + esc(k.target) + '</td><td class="num">' +
          '<span class="bg ' + (k.ok ? "bg-ok\">측정됨" : "bg-no\">미측정") + "</span></td><td class=\"small muted\">" +
          esc(k.note || "") + "</td></tr>";
      }).join("") + "</tbody></table></div></div></div>";
  });

  h += '<div class="banner b-blue"><b>가맹사업에는 CSF를 아직 쓸 수 없습니다</b>' +
    "가맹은 무인직영의 단위경제가 증명된 뒤에야 성립하는 사업입니다. " +
    "무인직영 CSF가 달성되기 전에 가맹 CSF를 세우면 선후가 뒤집힙니다. " +
    "대신 게이트 9개가 그 자리를 대신합니다.</div>";
  return h;
}

function pGates() {
  var g = LX.kpi.gates;
  var pass = g.rows.filter(function (r) { return r.st === "통과"; }).length;
  var h = '<div class="kpis">' +
    '<div class="kpi neg"><div class="k-l">통과</div><div class="k-v">' + pass + " / 9</div>" +
    '<div class="k-s">전부 통과해야 가맹 모집 개시</div></div>' +
    '<div class="kpi neg"><div class="k-l">미측정</div><div class="k-v">' +
    g.rows.filter(function (r) { return r.st === "미측정"; }).length +
    '개</div><div class="k-s">기준값조차 없는 항목</div></div>' +
    '<div class="kpi neg"><div class="k-l">걸려 있는 매출</div><div class="k-v">' +
    won(Math.abs(LX.status.gap.roots[0].v)) + '</div><div class="k-s">목표 간격의 ' +
    pct(LX.status.gap.roots[0].s) + "</div></div></div>";
  h += '<p class="sec-d">' + esc(g.note) + "</p>";
  h += '<div class="card">' + '<div class="tw"><table><thead><tr><th>게이트</th><th>통과 기준</th>' +
    '<th class="num">현재</th><th class="num">판정</th></tr></thead><tbody>' +
    g.rows.map(function (r) {
      var cls = r.st === "통과" ? "bg-ok" : r.st === "미달" ? "bg-no" : "bg-wa";
      return "<tr><td><b>" + esc(r.n) + "</b></td><td class=\"small muted\">" + esc(r.t) +
        '</td><td class="num">' + esc(r.now) + '</td><td class="num"><span class="bg ' +
        cls + '">' + esc(r.st) + "</span></td></tr>";
    }).join("") + "</tbody></table></div></div>";
  h += '<div class="banner b-red"><b>읽는 법</b>' +
    "'미달'은 측정은 되는데 기준에 못 미친다는 뜻이고, '미측정'은 숫자가 아예 없다는 뜻입니다. " +
    "미측정 4개와 미완 3개는 데이터가 아니라 <b>일을 하지 않은 것</b>입니다. " +
    "따라서 가맹 미개시의 원인은 '시장이 안 좋아서'가 아니라 '준비를 시작하지 않아서'입니다.</div>";
  return h;
}

/* ══ ③ 사업현황 및 분석 ════════════════════ */
function pNow() {
  var c = LX.status.company;
  var h = '<div class="banner b-amber"><b>비교 주의</b>' + lk(LX.trust.warning) + "</div>";
  h += '<div class="kpis">' +
    '<div class="kpi"><div class="k-l">누계 매출</div><div class="k-v">' + won(c.revenue) +
    '</div><div class="k-s">계획 ' + won(c.planToDate) + " · 달성 " + pct(c.achieve) + "</div></div>" +
    '<div class="kpi neg"><div class="k-l">관리 영업손익</div><div class="k-v">' + won(c.op) +
    '</div><div class="k-s">' + pct(c.opMargin) + " · 별도 추가비용 반영</div></div>" +
    '<div class="kpi neg"><div class="k-l">EBITDA</div><div class="k-v">' + won(c.ebitda) +
    '</div><div class="k-s">' + pct(c.ebitdaMargin) + " · 상각 " + won(c.depreciation) + " 가산</div></div>" +
    '<div class="kpi neg"><div class="k-l">별도 추가비용</div><div class="k-v">' + won(c.addCost) +
    '</div><div class="k-s">원본 영업손익 밖에 있던 실제 지출</div></div></div>';

  h += '<div class="grid2">' +
    '<div class="card"><h2>사업별 매출 구성</h2><p class="sec-d">매장운영이 ' +
    pct(LX.status.segs.slice(0, 3).reduce(function (a, b) { return a + b.share; }, 0)) +
    '입니다.</p><div class="chart-wrap"><canvas id="revD"></canvas>' +
    legend(LX.status.segs.map(function (s) { return { name: s.name, value: s.rev, color: s.color }; })) +
    "</div></div>" +
    '<div class="card"><h2>비용 구성</h2><p class="sec-d">항목 이름을 누르면 구성이 펼쳐집니다.</p>' +
    '<div class="chart-wrap"><canvas id="cstD"></canvas>' + legend(LX.status.costMix) + "</div></div></div>";

  h += '<div class="card"><h2>전사 매출 — 계획선 대비</h2>' +
    lineBox("nowRev", [
      { name: "계획", color: "#9aa3ab", data: LX.goal.ramp.plan.slice(0, 8), dash: true },
      { name: "실적", color: "#16283c", data: LX.goal.ramp.actual.slice(0, 8) }
    ]) + "</div>";

  h += '<div class="card"><h2>사업별 손익</h2>' +
    '<div class="tw"><table><thead><tr><th>세부사업</th><th class="num">매출</th><th class="num">비중</th>' +
    '<th class="num">영업손익</th><th class="num">이익률</th><th>한 줄 진단</th></tr></thead><tbody>' +
    LX.status.segs.map(function (s) {
      return "<tr><td><b>" + esc(s.name) + '</b></td><td class="num">' + won(s.rev) +
        '</td><td class="num">' + pct(s.share) + '</td><td class="num ' + sgn(s.op) + '">' +
        won(s.op) + '</td><td class="num ' + sgn(s.op) + '">' + pct(s.margin) +
        '</td><td class="small muted">' + lk(s.dx) + "</td></tr>";
    }).join("") +
    '<tr class="tot"><td>합계</td><td class="num">' + won(c.revenue) +
    '</td><td class="num">100.0%</td><td class="num neg">' + won(c.op) +
    '</td><td class="num neg">' + pct(c.opMargin) +
    '</td><td class="small">공통비 배부 전 기준입니다</td></tr></tbody></table></div></div>';
  return h;
}
function pNowAfter() {
  donut("revD", LX.status.segs.map(function (s) { return { name: s.name, value: s.rev, color: s.color }; }));
  donut("cstD", LX.status.costMix);
  line("nowRev", [
    { name: "계획", color: "#9aa3ab", data: LX.goal.ramp.plan.slice(0, 8), dash: true },
    { name: "실적", color: "#16283c", data: LX.goal.ramp.actual.slice(0, 8) }
  ], LX.meta.months.slice(0, 8), { h: 230 });
}

function pSegs() {
  var m8 = LX.meta.months.slice(0, 8);
  var h = '<p class="sec-d">왼쪽은 매출(계획 점선 대비), 오른쪽은 영업손익입니다. ' +
    "손익 차트의 0선 위에 있는 달만 흑자입니다.</p>";
  LX.status.segs.forEach(function (s) {
    h += '<div class="card"><h2><span class="csf-seg" style="background:' + s.color +
      ';margin-right:8px">' + esc(s.div) + "</span>" + esc(s.name) + "</h2>" +
      '<p class="sec-d">' + lk(s.dx) + "</p>" +
      '<div class="kpis" style="margin-bottom:14px">' +
      '<div class="kpi"><div class="k-l">누계 매출</div><div class="k-v">' + won(s.rev) + "</div></div>" +
      '<div class="kpi ' + sgn(s.op) + '"><div class="k-l">영업손익</div><div class="k-v">' +
      won(s.op) + '</div><div class="k-s">' + pct(s.margin) + "</div></div>" +
      '<div class="kpi"><div class="k-l">계획 대비</div><div class="k-v">' +
      pct(s.rev / s.mPlan.reduce(function (a, b) { return a + b; }, 0), 0) + "</div></div></div>" +
      '<div class="grid2">' +
      "<div>" + lineBox("sr_" + s.key, [
        { name: "계획", color: "#9aa3ab", data: s.mPlan, dash: true },
        { name: "매출", color: s.color, data: s.mRev }
      ]) + "</div>" +
      "<div>" + lineBox("so_" + s.key, [
        { name: "영업손익", color: s.color, data: s.mOp }
      ]) + "</div></div></div>";
  });
  return h;
}
function pSegsAfter() {
  var m8 = LX.meta.months.slice(0, 8);
  LX.status.segs.forEach(function (s) {
    line("sr_" + s.key, [
      { name: "계획", color: "#9aa3ab", data: s.mPlan, dash: true },
      { name: "매출", color: s.color, data: s.mRev }
    ], m8, { h: 200 });
    line("so_" + s.key, [{ name: "영업손익", color: s.color, data: s.mOp }], m8, { h: 200 });
  });
}

function pGap() {
  var g = LX.status.gap;
  var h = '<div class="kpis">' +
    '<div class="kpi"><div class="k-l">8월 누계 계획</div><div class="k-v">' + won(g.plan) + "</div></div>" +
    '<div class="kpi"><div class="k-l">실적</div><div class="k-v">' + won(g.actual) + "</div></div>" +
    '<div class="kpi neg"><div class="k-l">간격</div><div class="k-v">' + won(g.total) +
    '</div><div class="k-s">달성률 ' + pct(g.actual / g.plan) + "</div></div></div>";

  h += '<div class="card"><h2>1단계 — 간격을 사업별로 쪼갭니다</h2>' +
    '<p class="sec-d">어디서 벌어졌는가. 금액 순입니다.</p>' +
    '<div class="tw"><table><thead><tr><th>세부사업 · 항목</th><th class="num">간격</th>' +
    '<th class="num">비중</th><th>왜 벌어졌는가</th></tr></thead><tbody>' +
    g.items.map(function (i) {
      return "<tr><td><b>" + esc(i.n) + '</b></td><td class="num neg">' + won(i.v) +
        '</td><td class="num">' + pct(i.s) + '</td><td class="small muted">' + lk(i.why) + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";

  h += '<div class="card"><h2>2단계 — 사업이 아니라 원인으로 다시 묶습니다</h2>' +
    '<p class="sec-d">사업별로 보면 여섯 군데가 문제로 보이지만, 원인으로 묶으면 세 개입니다. ' +
    "과제는 사업이 아니라 원인에 대해 만듭니다.</p>" +
    g.roots.map(function (r) {
      return '<div class="act' + (r.s > 0.5 ? " top" : "") + '"><div class="act-h">' +
        '<b>' + esc(r.n) + '</b><span class="bg ' + (r.s > 0.5 ? "bg-no" : "bg-gy") + '">' +
        pct(r.s) + " · " + won(r.v) + "</span></div>" +
        '<div class="act-b">' + lk(r.detail) + "</div></div>";
    }).join("") + "</div>";

  h += '<div class="card"><h2>3단계 — 원인의 깊이는 여기까지입니다</h2>' +
    "<p>현재 대장으로 내려갈 수 있는 최대 깊이는 <b>계정 단위</b>입니다. " +
    "예를 들어 무인직영 적자의 원인이 " + dt("기계렌탈료") + "라는 것까지는 특정되지만, " +
    "그 렌탈료가 왜 4월에 2.9배로 뛰었는지는 <b>계약서가 없어 확인되지 않습니다</b>.</p>" +
    "<p>매출 쪽은 더 얕습니다. '점포당 매출이 계획보다 낮다'까지만 나오고, " +
    "그것이 손님이 덜 와서인지 · 와서 안 사서인지 · 사는데 싸게 사서인지 구분되지 않습니다. " +
    "방문자 수 · 주문율 · 객단가가 측정되지 않기 때문입니다.</p>" +
    '<p class="tiny">원인을 더 깊이 파려면 P-000(운영지표 수집 체계)과 P-007(렌탈 계약서 확보)이 선행되어야 합니다.</p></div>';

  h += '<div class="card"><h2>손익 간격 — 계정별</h2>' +
    '<p class="sec-d">매출 간격과 달리, 손익을 무너뜨리는 것은 매출과 무관하게 나가는 비용입니다.</p>' +
    bars([
      { n: "기계렌탈료 (무인직영)", v: 119178843, c: "var(--red)" },
      { n: "투자모델 임차료", v: 156680, t: "매출의 34.8%", c: "var(--amber)" },
      { n: "투자모델 위탁수수료", v: 84778269, c: "var(--amber)" },
      { n: "투자모델 건물관리비", v: 32635919, c: "var(--ink3)" },
      { n: "투자모델 광고선전비 · 지급수수료 · 로봇지원금", v: 33907921, c: "var(--ink3)" }
    ]) + "</div>";
  return h;
}

function pStores() {
  var h = '<p class="sec-d">금액만으로는 점포를 비교할 수 없습니다. 매출 규모가 다르기 때문입니다. ' +
    "비율로 보아야 어느 점포의 어떤 항목이 튀는지 보입니다. 붉을수록 나쁩니다.</p>";

  ["man", "unm", "inv"].forEach(function (k) {
    var d = LX.storeDetail[k]; if (!d) return;
    h += '<div class="card"><h2>' + esc(d.name) + " — 점포별</h2>";
    if (k === "man") {
      h += '<div class="tw"><table><thead><tr><th>점포</th><th class="num">매출</th>' +
        '<th class="num">영업손익</th><th class="num">이익률</th><th>비고</th></tr></thead><tbody>' +
        d.rows.map(function (r) {
          return "<tr><td><b>" + esc(r.s) + '</b></td><td class="num">' + won(r.rev) +
            '</td><td class="num ' + sgn(r.op) + '">' + won(r.op) + '</td><td class="num ' +
            sgn(r.op) + '">' + pct(r.op / r.rev) + '</td><td class="small muted">' +
            esc(r.note || "") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    } else {
      var keys = k === "unm"
        ? [["mat", "원재료"], ["lab", "인건비"], ["rent", "임차료"], ["dep", "감가상각"], ["bld", "건물관리"], ["lease", "기계렌탈"]]
        : [["mat", "원재료"], ["lab", "인건비"], ["rent", "임차료"], ["fee", "위탁수수료"], ["bld", "건물관리"]];
      h += '<div class="tw"><table class="heat"><thead><tr><th>점포</th><th class="num">매출</th>' +
        keys.map(function (c) { return '<th class="num">' + c[1] + "</th>"; }).join("") +
        '<th class="num">영업이익률</th></tr></thead><tbody>' +
        d.rows.map(function (r) {
          var cells = keys.map(function (c) {
            var p = r.rev ? r[c[0]] / r.rev : 0;
            var lv = p >= 0.4 ? 4 : p >= 0.3 ? 3 : p >= 0.2 ? 2 : p >= 0.12 ? 1 : 0;
            return '<td class="h h' + lv + '">' + pct(p) + "</td>";
          }).join("");
          return "<tr><td><b>" + esc(r.s) + '</b></td><td class="num">' + won(r.rev) + "</td>" +
            cells + '<td class="num ' + sgn(r.op) + '">' + pct(r.op / r.rev) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      h += d.rows.filter(function (r) { return r.note; }).map(function (r) {
        return '<p class="small muted" style="margin-top:10px"><b>' + esc(r.s) + "</b> — " + lk(r.note) + "</p>";
      }).join("");
    }
    if (d.note) h += '<div class="banner b-blue" style="margin:14px 0 0">' + lk(d.note) + "</div>";
    h += "</div>";
  });

  h += '<div class="card"><h2>이 표를 회의에서 쓰는 법</h2>' +
    "<p>가장 붉은 칸 하나를 고르고, 그 점포의 그 항목이 왜 그런지만 묻습니다. " +
    "전 점포를 훑지 않습니다. 현재 기준으로 가장 붉은 칸은 " +
    "<b>강남 임차료 50.9%</b>와 <b>성수 기계렌탈 74.6%</b>입니다. 이 둘이 각각 P-006과 P-007입니다.</p></div>";
  return h;
}

function pLanding() {
  var L = LX.status.landing;
  var h = '<p class="sec-d">다섯 가지 착지 시나리오입니다. ④는 현재 제안된 과제가 모두 실현된다고 ' +
    "가정한 값이고, ⑤는 그래도 남는 금액입니다.</p>";
  h += '<div class="card">' + bars(L.map(function (l) {
    return { n: l.l, v: l.v, t: won(l.v), c: l.k === "gap" ? "var(--red)" : l.k === "plan" ? "var(--green)" : "var(--navy)" };
  })) + '<div class="tw" style="margin-top:14px"><table><thead><tr><th>시나리오</th>' +
    '<th class="num">금액</th><th>산출 방식</th></tr></thead><tbody>' +
    L.map(function (l) {
      return "<tr><td><b>" + esc(l.l) + '</b></td><td class="num' + (l.k === "gap" ? " neg" : "") +
        '">' + won(l.v) + '</td><td class="small muted">' + esc(l.how) + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";

  h += '<div class="banner b-red"><b>결론</b>' +
    "현재 제안된 과제를 전부 성공시켜도 목표의 " + pct(L[3].v / LX.goal.target.revenue) +
    "에 머무릅니다. 남는 " + won(L[4].v) + "은 과제로 메울 수 있는 크기가 아닙니다. " +
    "선택지는 둘입니다 — <b>가맹 게이트를 통과시켜 가맹을 열거나</b>, <b>목표를 현실적으로 다시 세우거나</b>. " +
    "이 결정은 이 사이트가 아니라 경영진 회의에서 해야 합니다.</div>";
  return h;
}

/* ══ ④ 전략과제 ════════════════════════════ */
function pTasks() {
  var P = LX.project;
  var rootName = {}; LX.status.gap.roots.forEach(function (r) { rootName[r.key] = r.n; });
  var totRev = P.rows.reduce(function (a, b) { return a + (b.revT || 0); }, 0);
  var totOp = P.rows.reduce(function (a, b) { return a + (b.opY || 0); }, 0);

  var h = '<div class="kpis">' +
    '<div class="kpi"><div class="k-l">과제 수</div><div class="k-v">' + P.rows.length + "개</div>" +
    '<div class="k-s">전부 \'제안\' 상태 · 승인 0건</div></div>' +
    '<div class="kpi"><div class="k-l">올해 매출 기대효과</div><div class="k-v">' + won(totRev) + "</div></div>" +
    '<div class="kpi"><div class="k-l">연환산 손익 기대효과</div><div class="k-v">' + won(totOp) + "</div></div>" +
    '<div class="kpi neg"><div class="k-l">미커버 간격</div><div class="k-v">' +
    won(LX.status.landing[4].v) + "</div></div></div>";

  h += '<div class="banner b-amber"><b>과제 등재 규칙</b>' + esc(P.rule) + "</div>";
  h += '<p class="sec-d">' + esc(P.note) + " 원인별로 묶었습니다.</p>";

  ["gate", "measure", "cost"].forEach(function (rk) {
    var rows = P.rows.filter(function (r) { return r.root === rk; });
    if (!rows.length) return;
    h += '<div class="card"><h2>원인 — ' + esc(rootName[rk] || rk) + "</h2>";
    rows.forEach(function (a) {
      h += '<div class="act' + (a.top ? " top" : "") + '"><div class="act-h">' +
        '<span class="act-id">' + esc(a.id) + "</span><b>" + esc(a.name) + "</b>" +
        '<span class="bg bg-gy">' + esc(a.lever) + "</span>" +
        '<span class="bg ' + (a.hold ? "bg-wa\">보류" : "bg-bl\">" + esc(a.status)) + "</span></div>" +
        '<div class="act-m">' +
        "<span>사업 <b>" + esc(a.seg) + "</b></span>" +
        "<span>담당 <b>" + esc(a.owner) + "</b></span>" +
        "<span>기한 <b>" + esc(a.due) + "</b></span>" +
        "<span>올해 매출 <b>" + (a.revT ? won(a.revT) : "—") + "</b></span>" +
        "<span>연환산 손익 <b>" + (a.opY ? won(a.opY) : "—") + "</b></span></div>" +
        '<div class="act-b"><span class="lbl">산출 근거</span>' + lk(a.basis) +
        '<p style="margin:8px 0 0"><span class="lbl">측정지표</span>' + esc(a.metric) + "</p></div></div>";
    });
    h += "</div>";
  });

  h += '<div class="banner b-red"><b>담당이 부서로 되어 있습니다</b>' +
    "'경영기획', '매장운영'은 사람이 아닙니다. 부서가 담당인 과제는 아무도 담당이 아닙니다. " +
    "첫 회의에서 열 개 전부 <b>개인 이름</b>으로 바꾸고 42_의사결정기록에 등재해야 '승인' 상태로 넘어갑니다.</div>";
  return h;
}

function pBoard() {
  var h = '<div class="card"><h2>과제의 다섯 상태</h2>' +
    '<p class="sec-d">상태를 옮기는 조건이 명확해야 주간회의가 "어떻게 되고 있나요" 로 끝나지 않습니다.</p>' +
    '<div class="tw"><table><thead><tr><th>상태</th><th>이 상태에 있다는 뜻</th></tr></thead><tbody>' +
    LX.project.board.map(function (b) {
      return "<tr><td><b>" + esc(b.st) + "</b></td><td>" + esc(b.desc) + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";

  h += '<div class="card"><h2>주간 운영</h2>' +
    "<p><b>월요일 — 진척 갱신.</b> 과제 담당이 43_주간진척에 한 줄씩 씁니다. " +
    "쓴 것이 없으면 '진행'이 아니라 '제안'으로 되돌립니다.</p>" +
    "<p><b>주간회의 — 이탈한 것만.</b> 기한을 넘겼거나 측정지표가 안 움직인 과제만 다룹니다. " +
    "전체 과제를 순서대로 훑지 않습니다.</p>" +
    "<p><b>결정은 그 자리에서 기록.</b> 회의에서 기준·범위·담당이 바뀌면 42_의사결정기록에 " +
    "날짜·결정내용·근거를 남깁니다. 남기지 않으면 다음 달에 같은 논의를 반복합니다.</p></div>";

  h += '<div class="card"><h2>월간 운영 — 경영진 회의</h2>' +
    "<p>실무진 화면과 경영진 화면이 같으면 둘 다 안 봅니다. 경영진 회의에서는 이 사이트의 " +
    "<b>③ 목표 대비 실적 · ③ 연말 착지 전망 · ④ 전략과제</b> 세 페이지만 봅니다. " +
    "점포별 비교와 지표 체계는 실무진이 보고 결론만 올립니다.</p>" +
    '<p class="tiny">월간 회의의 산출물은 "잘 이해했다"가 아니라 ' +
    "<b>승인된 과제 목록의 변화</b>와 <b>42_의사결정기록에 추가된 줄 수</b>입니다.</p></div>";
  return h;
}

/* ══ ⑤ 지표리뷰 ════════════════════════════ */
function pReview() {
  var R = LX.review;
  var h = '<div class="banner b-amber"><b>baseline을 고정해야 합니다</b>' + esc(R.note) + "</div>";
  h += '<div class="card"><h2>과제별 측정지표 추적표</h2>' +
    '<p class="sec-d">과제를 승인하는 날, baseline 열에 그날의 지표값을 숫자로 적어 넣습니다. ' +
    "다음 달부터 현재값이 baseline에서 움직였는지만 봅니다.</p>" +
    '<div class="tw"><table><thead><tr><th>측정지표</th><th>사업</th><th class="num">baseline</th>' +
    '<th class="num">현재</th><th class="num">목표</th><th class="num">과제</th>' +
    '<th class="num">상태</th></tr></thead><tbody>' +
    R.baseline.map(function (b) {
      var moved = b.base !== b.now;
      return "<tr><td><b>" + esc(b.kpi) + "</b></td><td class=\"small muted\">" + esc(b.seg) +
        '</td><td class="num">' + esc(b.base) + '</td><td class="num' + (moved ? " pos" : "") + '">' +
        esc(b.now) + '</td><td class="num muted">' + esc(b.target) + '</td><td class="num">' +
        esc(b.pid) + '</td><td class="num"><span class="bg bg-gy">' + esc(b.st) + "</span></td></tr>";
    }).join("") + "</tbody></table></div></div>";

  h += '<div class="card"><h2>지금 이 표가 비어 있는 이유</h2>' +
    "<p>과제가 아직 하나도 승인되지 않았습니다. baseline과 현재값이 같은 것은 오류가 아니라 " +
    "<b>아직 아무것도 시작되지 않았다</b>는 뜻입니다. 이 표가 의미를 갖는 것은 다음 달부터입니다.</p></div>";

  h += '<div class="card"><h2>이 루프가 지금 할 수 없는 것</h2>' +
    '<p class="sec-d">할 수 있다고 착각하면 회의에서 잘못된 결론이 나옵니다.</p><ul>' +
    R.cannot.map(function (c) { return "<li>" + lk(c) + "</li>"; }).join("") + "</ul></div>";
  return h;
}

function pLoop() {
  var h = '<div class="flow">' + PHASES.slice(0, 5).map(function (p, i) {
    var first = PAGES.filter(function (x) { return x.ph === i; })[0];
    return '<a class="flow-s" href="#/' + first.id + '"><div class="flow-n">' + p.n + "</div>" +
      "<b>" + esc(p.t) + "</b><span>" + esc(first.t) + "</span></a>";
  }).join("") + "</div>";

  h += '<div class="card"><h2>매달 도는 순서</h2><ol style="line-height:2">' +
    LX.review.loopRule.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ol></div>";

  h += '<div class="card"><h2>누가 어디를 보는가</h2>' +
    '<div class="tw"><table><thead><tr><th>역할</th><th>보는 페이지</th><th>산출물</th></tr></thead><tbody>' +
    "<tr><td><b>경영진</b></td><td>③ 목표 대비 실적 · ③ 연말 착지 · ④ 전략과제</td>" +
    "<td>과제 승인 / 목표 조정 결정</td></tr>" +
    "<tr><td><b>사업 책임자</b></td><td>② CSF·KPI · ③ 세부사업별 현황 · ⑤ 지표리뷰</td>" +
    "<td>담당 사업의 KPI 설명과 과제 제안</td></tr>" +
    "<tr><td><b>실무진</b></td><td>③ 점포별 비교 · ④ 실행관리 · 부록 전체</td>" +
    "<td>주간 진척 · 원인 규명</td></tr>" +
    "<tr><td><b>재무</b></td><td>부록 숫자 신뢰도 · 관리손익이란</td>" +
    "<td>미확정 항목 해소</td></tr></tbody></table></div></div>";

  h += '<div class="banner b-blue"><b>이 루프가 실패하는 전형적인 방식</b>' +
    "① 현황만 보고 원인까지 안 내려간다 → 과제가 '열심히 하자'가 된다. " +
    "② 과제에 기대효과 금액이 없다 → 우선순위를 못 정하고 전부 동시에 한다. " +
    "③ baseline을 안 남긴다 → 다음 달에 효과를 증명하지 못한다. " +
    "④ 결정을 기록 안 한다 → 같은 논의를 반복한다. 네 가지를 막기 위해 이 사이트가 " +
    "원인·기대효과·baseline·의사결정기록을 각각 별도 페이지로 두고 있습니다.</div>";
  return h;
}

/* ══ 부록 ══════════════════════════════════ */
function pPL() {
  var h = "";
  if (LX.mgmtPL && LX.mgmtPL.blocks) {
    LX.mgmtPL.blocks.forEach(function (b) {
      var ps = b.p === undefined ? [] : (typeof b.p === "string" ? [b.p] : b.p);
      h += '<div class="card"><h2>' + esc(b.h || b.t || "") + "</h2>" +
        ps.map(function (p) { return "<p>" + lk(p) + "</p>"; }).join("") +
        (b.table ? tbl(b.table.head, b.table.rows) : "") + "</div>";
    });
  }
  h += '<div class="card"><h2>세 가지 손익을 구분합니다</h2>' +
    '<div class="tw"><table><thead><tr><th>이름</th><th>정의</th><th class="num">1~8월</th></tr></thead><tbody>' +
    "<tr><td><b>원본 영업손익</b></td><td>원본 손익계산서가 계산한 값. " + dt("별도 추가비용") +
    '이 빠져 있습니다</td><td class="num neg">' + won(LX.status.company.op + LX.status.company.addCost) + "</td></tr>" +
    "<tr><td><b>관리 영업손익</b></td><td>별도 추가비용까지 뺀 값. 경영 판단은 이것으로 합니다</td>" +
    '<td class="num neg">' + won(LX.status.company.op) + "</td></tr>" +
    "<tr><td><b>EBITDA</b></td><td>관리 영업손익에 " + dt("감가상각비") +
    '를 다시 더한 값. 현금이 도는지 봅니다</td><td class="num neg">' + won(LX.status.company.ebitda) +
    "</td></tr></tbody></table></div></div>";
  return h;
}

function pShared() {
  var S = LX.sharedCost; if (!S) return "<p>데이터 없음</p>";
  var h = '<div class="banner b-red"><b>결론부터</b>' +
    "상품(B2B 원부자재)은 인건비 · 지급임차료 · 감가상각비 · 수도광열비 · 건물관리비를 " +
    "<b>한 푼도 부담하지 않습니다</b>. 모든 공유 자원 비용이 제품(로스터리)에 붙어 있습니다. " +
    "그래서 상품 이익률 24.1%는 과대, 로스터리 적자는 과대입니다.</div>";
  h += '<div class="card"><h2>판관비 계정별 부담</h2>' + tbl(S.head, S.rows) + "</div>";
  h += '<div class="card"><h2>그래서 무엇이 문제인가</h2><ul style="line-height:2">' +
    S.findings.map(function (f) { return "<li>" + lk(f) + "</li>"; }).join("") + "</ul>" +
    '<p class="tiny">관련 과제 — P-011 상품·제품 공유비용 배부 기준 수립</p></div>';
  return h;
}

function pTrust() {
  var T = LX.trust;
  var h = '<div class="banner b-amber"><b>2026-09-22 기준 변경</b>' + lk(T.warning) + "</div>";
  h += '<div class="card"><h2>확정된 것</h2><ul style="line-height:2">' +
    T.fixed.map(function (f) { return "<li>" + lk(f) + "</li>"; }).join("") + "</ul></div>";
  h += '<div class="card"><h2>아직 확정되지 않은 것</h2>' +
    '<p class="sec-d">아래 항목이 바뀌면 이 사이트의 숫자도 바뀝니다. 회의에서 이 항목에 걸린 ' +
    "결론은 잠정으로 다룹니다.</p><ul style=\"line-height:2\">" +
    T.open.map(function (o) { return "<li>" + lk(o) + "</li>"; }).join("") + "</ul>" +
    '<p class="tiny">전체 목록 — 대장 90_보완필요사항 탭</p></div>';
  return h;
}

function pTabs() {
  var h = '<p class="sec-d">대장은 63개 탭입니다. 전부 볼 필요는 없습니다. ' +
    "색으로 역할이 나뉩니다.</p><div class=\"card\">" +
    '<div class="tw"><table><thead><tr><th>구분</th><th>언제 보는가</th><th>탭</th></tr></thead><tbody>' +
    LX.tabs.map(function (t) {
      return "<tr><td><b>" + esc(t.tier) + "</b></td><td class=\"nowrap small\">" + esc(t.when) +
        '</td><td class="small muted">' + esc(t.list) + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";
  h += '<div class="card"><h2>이 사이트와 대장의 관계</h2>' +
    "<p>이 사이트는 대장의 <b>결론만</b> 옮긴 것입니다. 숫자를 고치거나 계정을 다시 분류하는 일은 " +
    "전부 대장에서 합니다. 여기서는 읽기만 합니다.</p>" +
    "<p>월 마감이 끝나면 <code>data.js</code> 와 <code>data2.js</code> 두 파일만 고치면 " +
    "이 사이트 전체가 갱신됩니다. HTML과 JS는 건드리지 않습니다.</p></div>";
  return h;
}

/* ══ 라우터 ════════════════════════════════ */
var AFTER = { ramp: pRampAfter, now: pNowAfter, segs: pSegsAfter };

function buildNav(cur) {
  var h = "";
  PHASES.forEach(function (p, i) {
    var list = PAGES.filter(function (x) { return x.ph === i; });
    if (!list.length) return;
    var on = list.some(function (x) { return x.id === cur; });
    h += '<div class="nav-phase' + (on ? " on" : "") + '"><div class="nav-ph-head">' +
      '<span class="nav-ph-num">' + p.n + "</span>" + esc(p.t) + "</div>" +
      list.map(function (x) {
        return '<a class="nav-a' + (x.id === cur ? " on" : "") + '" href="#/' + x.id +
          '"><span class="nd"></span>' + esc(x.t) + "</a>";
      }).join("") + "</div>";
  });
  el("sideNav").innerHTML = h;
}

function route() {
  var id = (location.hash || "").replace(/^#\/?/, "") || PAGES[0].id;
  var idx = PAGES.map(function (p) { return p.id; }).indexOf(id);
  if (idx < 0) { idx = 0; id = PAGES[0].id; }
  var p = PAGES[idx];

  buildNav(id);
  el("crumb").textContent = PHASES[p.ph].n + " " + PHASES[p.ph].t;
  el("pageTitle").textContent = p.t;
  el("pageSub").textContent = p.s;

  var html;
  try { html = p.f(); }
  catch (e) {
    html = '<div class="banner b-red"><b>이 페이지를 그리지 못했습니다</b>' +
      esc(e.message) + "</div>";
  }
  el("pageBody").innerHTML = html;

  if (AFTER[id]) { try { AFTER[id](); } catch (e) {} }

  var pv = PAGES[idx - 1], nx = PAGES[idx + 1];
  el("pager").innerHTML =
    (pv ? '<a class="pg" href="#/' + pv.id + '"><span>← ' + PHASES[pv.ph].n + " " +
      esc(PHASES[pv.ph].t) + "</span><b>" + esc(pv.t) + "</b></a>" : "<span></span>") +
    (nx ? '<a class="pg next" href="#/' + nx.id + '"><span>' + PHASES[nx.ph].n + " " +
      esc(PHASES[nx.ph].t) + " →</span><b>" + esc(nx.t) + "</b></a>" : "");

  if (el("side").classList) el("side").classList.remove("open");
  if (el("scrim").classList) el("scrim").classList.remove("on");
  if (window.scrollTo) window.scrollTo(0, 0);
}

/* ── 시작 ──────────────────────────────── */
function init() {
  el("asofChip").textContent = LX.meta.period + " · " + LX.meta.asOf + " 기준";
  el("sideMeta").innerHTML = esc(LX.meta.source) + "<br>" + esc(LX.meta.note);

  document.addEventListener("click", function (e) {
    var t = e.target;
    var b = t && t.closest ? t.closest("[data-dk]") : null;
    if (b) { openDrill(b.dataset.dk); return; }
    if (t && (t.id === "drillX" || t.id === "drillLayer")) closeDrill();
    if (t && t.id === "menuBtn") {
      el("side").classList.toggle("open");
      el("scrim").classList.toggle("on");
    }
    if (t && t.id === "scrim") {
      el("side").classList.remove("open");
      el("scrim").classList.remove("on");
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrill(); });
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", function () {
    var id = (location.hash || "").replace(/^#\/?/, "");
    if (AFTER[id]) { try { AFTER[id](); } catch (e) {} }
  });
  route();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();
