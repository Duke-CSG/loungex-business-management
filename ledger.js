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
  if (d.after) h += '<div class="banner b-blue" style="margin:14px 0 0">' + esc(d.after) + "</div>";
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

/* ── 꺾은선 ──────────────────────────────
   series: [{name,color,data,dash,fill,split}]
   split = 이 인덱스부터 점선(예측 구간). 실선·점선이 한 칸 겹쳐 이어집니다.
*/
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

  var L = 58, R = 12, T = 14, B = 28;
  var pw = W - L - R, ph = H - T - B;
  var all = [];
  series.forEach(function (s) {
    s.data.forEach(function (v) { if (v !== null && v !== undefined) all.push(v); });
  });
  if (!all.length) return;
  var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
  if (opt.zero !== false) { mx = Math.max(mx, 0); mn = Math.min(mn, 0); }
  var pad = (mx - mn) * 0.1 || 1; mx += pad; mn -= pad;
  var n = labels.length;
  var px = function (i) { return L + (n < 2 ? pw / 2 : (pw * i) / (n - 1)); };
  var py = function (v) { return T + ph - ((v - mn) / (mx - mn)) * ph; };

  /* 예측 구간 음영 */
  if (opt.split !== undefined && opt.split < n - 1) {
    x.fillStyle = "#f4f5f6";
    x.fillRect(px(opt.split), T, W - R - px(opt.split), ph);
  }
  /* 격자 + y축 */
  x.font = "10.5px " + (opt.font || "system-ui, sans-serif");
  x.textBaseline = "middle";
  for (var g = 0; g <= 4; g++) {
    var v = mn + ((mx - mn) * g) / 4, y = py(v);
    var zero = Math.abs(v) < (mx - mn) / 200;
    x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y);
    x.strokeStyle = zero ? "#b8c0c7" : "#eceef0";
    x.lineWidth = 1; x.stroke();
    x.fillStyle = "#98a1aa"; x.textAlign = "right";
    x.fillText(won(v), L - 8, y);
  }
  /* x축 */
  x.textAlign = "center"; x.textBaseline = "top"; x.fillStyle = "#98a1aa";
  var step = n > 8 ? (W < 520 ? 2 : 1) : 1;
  labels.forEach(function (lb, i) {
    if (i % step) return;
    x.fillText(lb, px(i), T + ph + 8);
  });

  /* 선 그리기 — 구간별로 실선/점선을 나눕니다 */
  function stroke(s, from, to, dashed) {
    x.beginPath();
    var started = false;
    for (var i = from; i <= to; i++) {
      var v = s.data[i];
      if (v === null || v === undefined) { started = false; continue; }
      if (!started) { x.moveTo(px(i), py(v)); started = true; }
      else x.lineTo(px(i), py(v));
    }
    x.strokeStyle = s.color;
    x.lineWidth = s.thin ? 1.6 : 2.4;
    x.lineJoin = "round"; x.lineCap = "round";
    if (x.setLineDash) x.setLineDash(dashed ? [5, 4] : []);
    x.stroke();
    if (x.setLineDash) x.setLineDash([]);
  }

  series.forEach(function (s) {
    var last = s.data.length - 1;
    /* 면 채우기 */
    if (s.fill) {
      x.beginPath();
      var st = false, fi = 0, li = 0;
      for (var i = 0; i <= last; i++) {
        var v = s.data[i];
        if (v === null || v === undefined) continue;
        if (!st) { fi = i; x.moveTo(px(i), py(v)); st = true; }
        else x.lineTo(px(i), py(v));
        li = i;
      }
      if (st) {
        x.lineTo(px(li), py(Math.max(mn, 0)));
        x.lineTo(px(fi), py(Math.max(mn, 0)));
        x.closePath();
        x.fillStyle = s.fill; x.fill();
      }
    }
    if (s.dash) { stroke(s, 0, last, true); return; }
    if (s.split !== undefined && s.split < last) {
      stroke(s, 0, s.split, false);
      stroke(s, s.split, last, true);
    } else stroke(s, 0, last, false);

    /* 점 */
    s.data.forEach(function (v, i) {
      if (v === null || v === undefined) return;
      x.beginPath(); x.arc(px(i), py(v), 3.2, 0, Math.PI * 2);
      x.fillStyle = "#fff"; x.fill();
      x.strokeStyle = s.color; x.lineWidth = 2; x.stroke();
    });
  });
}
function lineBox(id, series, note, h) {
  return '<div class="linebox"><canvas id="' + id + '"' +
    (h ? ' style="height:' + h + 'px"' : "") + "></canvas></div>" +
    '<div class="chart-legend">' + series.map(function (s) {
      return '<span style="color:' + s.color + '"><i' + (s.dash ? ' class="dash"' : "") +
        ' style="background:' + s.color + '"></i><span style="color:var(--ink2)">' +
        esc(s.name) + "</span></span>";
    }).join("") + "</div>" +
    (note ? '<p class="tiny" style="margin:9px 0 0">' + esc(note) + "</p>" : "");
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
  { n: "②", t: "사업현황 및 분석" },
  { n: "③", t: "전략과제 수립" },
  { n: "④", t: "실행관리 · 지표리뷰" },
  { n: "＋", t: "부록 — 읽는 법" }
];

var PAGES = [
  { ph: 0, id: "goal",   t: "미션 · 비전 · 사업전략 · 2026 목표",
    s: "우리가 목표하는 바가 무엇인지 한 화면에 모았습니다. 숫자 목표만이 아니라 그 목표가 왜 그 숫자인지, 어떤 경로로 달성되는지까지 적습니다.", f: pGoal },

  { ph: 1, id: "biz",    t: "세부사업영역별 현황 — 목표 대비 실적",
    s: "다섯 사업의 1~12월 목표 대비 실적입니다. 8월까지는 실적, 9~12월은 예측입니다. 각 사업의 문제와 그 대표 원인을 함께 적었습니다.", f: pBiz },
  { ph: 1, id: "now",    t: "전사 현황",
    s: "다섯 사업을 합친 현재 스코어입니다.", f: pNow },
  { ph: 1, id: "gap",    t: "목표 대비 실적 · 원인 특정",
    s: "간격을 사업별로 쪼갠 뒤 다시 원인으로 묶습니다. 과제는 사업이 아니라 원인에 대해 만듭니다.", f: pGap },
  { ph: 1, id: "stores", t: "점포별 비교",
    s: "사업 평균에 가려진 개별 점포의 문제를 비율로 찾습니다.", f: pStores },
  { ph: 1, id: "landing", t: "연말 착지 전망",
    s: "회의에서 결정을 가르는 것은 누계가 아니라 착지입니다.", f: pLanding },

  { ph: 2, id: "plan",   t: "점포별 목표 설정 — 고정비에서 매출목표를 역산한다",
    s: "바꿀 수 없는 고정비를 먼저 놓고, 그 위에서 목표 월매출을 계산합니다. 점포마다 흑자전환 타겟인지 쇼케이스인지를 고르면 판정과 목표가 바뀝니다.", f: pPlan },
  { ph: 2, id: "csf",    t: "세부사업별 CSF와 KPI",
    s: "사업마다 성공의 조건이 다릅니다. CSF는 문장이고 KPI는 그 문장을 재는 숫자입니다.", f: pCsf },
  { ph: 2, id: "tasks",  t: "전략과제",
    s: "②에서 특정한 원인을 해소하기 위한 프로젝트와 태스크. 원인 없이 만든 과제는 올리지 않습니다.", f: pTasks },

  { ph: 3, id: "board",  t: "실행관리 규칙",
    s: "과제가 상태를 옮기는 조건. 철저한 실행관리를 위한 최소 규칙입니다.", f: pBoard },
  { ph: 3, id: "review", t: "지표리뷰 — baseline 대비",
    s: "과제 실행에 따라 지표가 실제로 움직였는지 확인합니다.", f: pReview },
  { ph: 3, id: "loop",   t: "루프 운영 규칙",
    s: "이 단계를 매달 어떻게 도는가. 경영진부터 실무진까지 같은 순서로 봅니다.", f: pLoop },

  { ph: 4, id: "tree",   t: "F&B 지표 체계와 측정 상태",
    s: "매출과 EBITDA를 무엇으로 쪼개는가. 그리고 그중 지금 실제로 측정되는 것은 무엇인가.", f: pTree },
  { ph: 4, id: "bep",    t: "점포 손익분기 배수 — 계산의 근거",
    s: "③의 목표 월매출이 어떻게 나왔는지, 로봇비용 배수와 로스터리 적용까지.", f: pBep },
  { ph: 4, id: "gates",  t: "가맹 개시 게이트 9개",
    s: "무인직영 CSF의 측정 도구이자 가맹 개시의 선행조건입니다.", f: pGates },
  { ph: 4, id: "pl",     t: "관리손익이란",
    s: "왜 원본 영업손익을 그대로 쓰지 않는가.", f: pPL },
  { ph: 4, id: "shared", t: "상품과 제품의 비용 분담",
    s: "상품 이익률 24.1%를 그대로 믿으면 안 되는 이유.", f: pShared },
  { ph: 4, id: "trust",  t: "숫자 신뢰도",
    s: "확정된 숫자와 아직 확정되지 않은 숫자를 구분합니다.", f: pTrust },
  { ph: 4, id: "tabs",   t: "대장 탭 지도",
    s: "63개 탭 중 실제로 열어야 하는 것.", f: pTabs }
];

/* ══ ① 목표수립 ═══════════════════════════ */
function pGoal() {
  var g = LX.goal;
  var h = '<div class="banner b-blue"><b>이 사이트의 목적</b>' +
    "우리가 목표하는 바가 무엇인지 명확히 하고 · 현재 스코어를 분명히 인식하고 · " +
    "현황에서 무엇이 가장 문제인지 공유하고 · 그 문제를 풀 전략과제를 세우고 · " +
    "실행관리를 통해 지표를 개선한다. 이 루프를 경영진과 실무진이 같은 화면으로 도는 도구입니다.</div>";

  h += '<div class="flow">' + PHASES.slice(0, 4).map(function (p, i) {
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

  /* ── 사업 분류 체계 ── */
  h += '<div class="card"><h2>사업 분류 체계</h2>' +
    '<p class="sec-d">모든 화면·표·차트가 이 다섯(가맹 포함 여섯) 단위로만 쪼개집니다. ' +
    "44_프로젝션엔진 §A의 사업계층과 같습니다.</p>";
  LX.goal.structure.forEach(function (d, di) {
    h += (di ? '<h3 style="margin-top:22px">' : "<h3>") + esc(d.div) + "</h3>" +
      '<div class="tw"><table><thead><tr><th>세부사업</th><th>정의</th>' +
      '<th class="num">규모</th></tr></thead><tbody>' +
      d.subs.map(function (s) {
        return "<tr><td><b>" + esc(s.name) + "</b></td><td>" + lk(s.desc) +
          '</td><td class="num">' + esc(s.cnt) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  });
  h += '<div class="banner b-amber" style="margin:20px 0 0"><b>용어 규칙</b>' +
    "매장운영은 반드시 <b>유인직영 · 무인직영 · 투자모델</b> 셋으로만 부릅니다. " +
    "'직영매장', '무인매장' 같은 상위 묶음은 세 모델의 손익 구조가 전혀 달라 평균이 왜곡되므로 쓰지 않습니다.</div></div>";

  /* ── 월별 상승 기조 ── */
  var r = LX.goal.ramp;
  h += '<div class="card"><h2>2026 월별 상승 기조 — 전사</h2>' +
    '<p class="sec-d">' + esc(r.note) + "</p>" +
    lineBox("rampC", [
      { name: "계획", color: "#98a1aa", data: r.plan, dash: true, thin: true },
      { name: "실적", color: "#15293e", data: r.actual, fill: "rgba(21,41,62,.06)" }
    ], "6월에 계획이 2.9배로 뛰는 것은 가맹 개설매출 5.1억이 들어가기 때문입니다. 가맹이 열리지 않으면 이 계획선은 6월 이후 전부 미달로 남습니다.") +
    "</div>";

  var rows = r.plan.map(function (p, i) {
    var a = r.actual[i];
    return [LX.meta.months[i], won(p), a === null ? "—" : won(a),
      a === null ? "—" : (a - p < 0 ? "−" : "+") + won(Math.abs(a - p)),
      a === null ? "—" : pct(a / p, 0)];
  });
  h += '<div class="card"><h2>월별 계획 대 실적</h2>' +
    tbl(["월", "계획", "실적", "차이", "달성률"], rows) + "</div>";
  return h;
}
function pGoalAfter() {
  line("rampC", [
    { name: "계획", color: "#98a1aa", data: LX.goal.ramp.plan, dash: true, thin: true },
    { name: "실적", color: "#15293e", data: LX.goal.ramp.actual, fill: "rgba(21,41,62,.06)" }
  ], LX.meta.months, { h: 280 });
}

/* ══ ② 세부사업영역별 현황 ═══════════════ */
function bizSeries(s) {
  var act12 = s.act.concat([null, null, null, null]);
  var fc12 = [];
  for (var i = 0; i < 12; i++) fc12.push(i < s.act.length - 1 ? null : null);
  /* 실적 마지막 점에서 예측선이 이어지도록 8월 값을 예측선 시작점으로 둡니다 */
  fc12[s.act.length - 1] = s.act[s.act.length - 1];
  s.fcst.forEach(function (v, i) { fc12[s.act.length + i] = v; });
  return [
    { name: "계획", color: "#98a1aa", data: s.plan, dash: true, thin: true },
    { name: "실적 (1~8월)", color: s.color, data: act12, fill: "rgba(21,41,62,.05)" },
    { name: "예측 (9~12월)", color: s.color, data: fc12, dash: true }
  ];
}

function pBiz() {
  var B = LX.biz, M = LX.meta.months;
  var h = '<div class="banner b-blue"><b>이 화면을 읽는 법</b>' + esc(B.note) + " " +
    esc(B.fcstHow) + "</div>";

  /* 요약 표 */
  h += '<div class="card"><h2>다섯 사업 한눈에</h2>' +
    '<div class="tw"><table><thead><tr><th>세부사업</th><th class="num">1~8월 실적</th>' +
    '<th class="num">1~8월 계획</th><th class="num">달성률</th>' +
    '<th class="num">연말 예측</th><th class="num">연간 계획</th><th class="num">착지 달성률</th>' +
    "</tr></thead><tbody>" +
    B.segs.map(function (s) {
      var a8 = s.act.reduce(function (a, b) { return a + b; }, 0);
      var p8 = s.plan.slice(0, 8).reduce(function (a, b) { return a + b; }, 0);
      var py = s.plan.reduce(function (a, b) { return a + b; }, 0);
      var fy = a8 + s.fcst.reduce(function (a, b) { return a + b; }, 0);
      return "<tr><td><b>" + esc(s.name) + '</b><span class="mini">' + esc(s.div) +
        '</span></td><td class="num">' + won(a8) + '</td><td class="num muted">' + won(p8) +
        '</td><td class="num ' + (a8 / p8 >= 0.9 ? "pos" : "neg") + '">' + pct(a8 / p8, 0) +
        '</td><td class="num">' + won(fy) + '</td><td class="num muted">' + won(py) +
        '</td><td class="num ' + (fy / py >= 0.9 ? "pos" : "neg") + '">' + pct(fy / py, 0) +
        "</td></tr>";
    }).join("") + "</tbody></table></div></div>";

  /* 사업별 진단 카드 */
  B.segs.forEach(function (s) {
    var sg = LX.status.segs.filter(function (x) { return x.key === s.key; })[0] || {};
    var badge = s.sev === "bad" ? '<span class="bg bg-no">문제 심각</span>'
      : '<span class="bg bg-wa">주의</span>';
    h += '<div class="dx"><div class="dx-h">' +
      '<span class="dx-dot" style="background:' + s.color + '"></span>' +
      '<b>' + esc(s.name) + '</b><span class="dx-div">' + esc(s.div) + "</span>" + badge +
      "</div><div class=\"dx-body\">" +
      lineBox("bz_" + s.key, bizSeries(s), null) +
      '<div class="dx-pc">' +
      '<div class="dx-lb p">문제</div><div class="v"><b>' + esc(s.problem) + "</b></div>" +
      '<div class="dx-lb c">원인</div><div class="v">' + lk(s.cause) + "</div>" +
      '<div class="dx-lb s">덧붙임</div><div class="v sub">' + lk(s.sub) + "</div>" +
      "</div></div>" +
      '<div class="dx-kpi">' +
      "<div><span>1~8월 매출</span><b>" + won(sg.rev || 0) + "</b></div>" +
      "<div><span>관리 영업손익</span><b class=\"" + sgn(sg.op || 0) + '">' + won(sg.op || 0) + "</b></div>" +
      "<div><span>영업이익률</span><b class=\"" + sgn(sg.op || 0) + '">' + pct(sg.margin || 0) + "</b></div>" +
      "<div><span>전사 매출 비중</span><b>" + pct(sg.share || 0) + "</b></div>" +
      "</div></div>";
  });

  /* 각주 인사이트 */
  h += '<div class="card"><h2>각주 — 이 화면에서 읽어야 할 것</h2>' +
    '<p class="sec-d">표와 차트만 보면 놓치는 것들입니다. 회의에서 결론이 갈리는 지점이 여기입니다.</p>';
  B.insights.forEach(function (i, n) {
    h += '<div style="padding:16px 0;border-bottom:1px solid var(--line2)' +
      (n === B.insights.length - 1 ? ";border-bottom:0" : "") + '">' +
      '<b style="display:block;margin-bottom:6px;letter-spacing:-.02em">' + esc(i.n) + "</b>" +
      '<span class="small muted">' + lk(i.d) + "</span></div>";
  });
  h += "</div>";
  return h;
}
function pBizAfter() {
  var M = LX.meta.months;
  LX.biz.segs.forEach(function (s) {
    line("bz_" + s.key, bizSeries(s), M, { h: 250, split: 7 });
  });
}

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

function pBep() {
  var B = LX.bep;
  var band = function (g) {
    for (var i = 0; i < B.bands.length; i++) if (g > B.bands[i].lo && g <= B.bands[i].hi) return B.bands[i];
    return B.bands[B.bands.length - 1];
  };
  var cnt = {};
  B.rows.forEach(function (r) { var b = band(r.gap); cnt[b.n] = (cnt[b.n] || 0) + 1; });

  var h = '<div class="kpis">' + B.bands.map(function (b) {
    var c = b.cls === "no" ? "neg" : b.cls === "ok" ? "pos" : "";
    return '<div class="kpi ' + c + '"><div class="k-l">' + esc(b.n.split(" — ")[0]) +
      '</div><div class="k-v">' + (cnt[b.n] || 0) + '개점</div><div class="k-s">' +
      esc(b.n.split(" — ")[1] || "") + "</div></div>";
  }).join("") + "</div>";

  h += '<div class="card"><h2>계산 방법</h2><p>' + lk(B.note) + "</p>" +
    '<p style="background:#f2f4f6;border-radius:8px;padding:12px 15px;font-weight:600;text-align:center">' +
    esc(B.formula) + "</p><p class=\"small muted\">" + lk(B.assume) + "</p></div>";

  h += '<div class="card"><h2>점포별 손익분기 배수</h2>' +
    '<p class="sec-d">\'필요 배수\'가 목표이고 \'현재 배수\'가 스코어입니다. 둘의 간격을 매출로 환산한 것이 \'필요 매출 증가율\'이며, 판정은 이 숫자 하나로 합니다.</p>' +
    '<div class="tw"><table><thead><tr><th>점포</th><th>사업</th><th class="num">1~8월 매출</th>' +
    '<th class="num">공헌이익률</th><th class="num">자리값</th><th class="num">BEP 월매출</th>' +
    '<th class="num">필요 배수</th><th class="num">현재 배수</th><th class="num">필요 증가율</th>' +
    "<th>판정</th></tr></thead><tbody>" +
    B.rows.map(function (r) {
      var b = band(r.gap);
      return "<tr><td><b>" + esc(r.s) + "</b>" +
        (r.note ? '<br><span class="tiny">' + esc(r.note) + "</span>" : "") +
        '</td><td class="small muted">' + esc(r.seg) + '</td><td class="num">' + won(r.rev) +
        '</td><td class="num">' + pct(r.cm) + '</td><td class="num">' + won(r.rent) +
        '</td><td class="num">' + won(r.bep / 8) + '</td><td class="num">' + r.need.toFixed(2) +
        '배</td><td class="num ' + (r.now >= r.need ? "pos" : "neg") + '">' + r.now.toFixed(2) +
        '배</td><td class="num ' + (r.gap > 0 ? "neg" : "pos") + '">' +
        (r.gap > 0 ? "+" : "") + pct(r.gap) + '</td><td><span class="bg bg-' +
        b.cls + '">' + esc(b.n.split(" — ")[0]) + "</span></td></tr>";
    }).join("") + "</tbody></table></div></div>";

  h += '<div class="card"><h2>판정 구간과 의사결정 룰</h2>' +
    '<p class="sec-d">구간 경계는 F&B에서 한 분기 내 달성 가능한 매출 개선 폭을 30%로 보는 통념을 쓴 것입니다. 경영진이 기준을 바꾸면 판정도 바뀝니다.</p>' +
    '<div class="tw"><table><thead><tr><th>필요 매출 증가율</th><th>판정</th><th>해야 할 일</th>' +
    '<th>의사결정 주체</th><th>현재 해당 점포</th></tr></thead><tbody>' +
    B.bands.map(function (b) {
      var list = B.rows.filter(function (r) { return band(r.gap).n === b.n; }).map(function (r) { return r.s; });
      var lbl = b.lo === -99 ? "0% 이하" : b.hi === 99 ? "60% 초과" :
        (b.lo * 100) + "~" + (b.hi * 100) + "%";
      return "<tr><td class=\"nowrap\"><b>" + lbl + '</b></td><td><span class="bg bg-' + b.cls +
        '">' + esc(b.n) + '</span></td><td class="small">' + esc(b.todo) +
        '</td><td class="small muted nowrap">' + esc(b.who) + '</td><td class="small">' +
        (list.length ? esc(list.join(" · ")) : "—") + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="banner b-red" style="margin:16px 0 0"><b>\'달성 불가\'는 자동으로 철수가 아닙니다</b>' +
    "두 갈래입니다. ① 흑자전환을 포기하고 철수한다. ② 흑자전환을 타겟하지 않는 전략 목적 점포로 재정의한다. " +
    "②를 고르면 손익 KPI를 떼고 아래의 대체 KPI로 관리합니다. " +
    "<b>고르지 않고 두는 것이 가장 나쁜 선택입니다</b> — 적자는 계속 나는데 아무도 책임지지 않습니다.</div>" +
    '<p class="tiny" style="margin:12px 0 0">★철수 판단에는 이 표에 없는 숫자가 두 개 더 필요합니다 — 임대차 잔여 기간·중도해지 위약벌, 그리고 보증금·인테리어 잔존가액. 둘 다 계약서가 없어 대장에서 계산되지 않습니다. 이 표는 <b>철수 후보를 골라내는</b> 도구이지 <b>철수를 결정하는</b> 도구가 아닙니다.</p></div>';

  h += '<div class="card"><h2>로봇비용 배수 — 같은 개념을 로봇에 적용하면</h2>' +
    '<p class="sec-d">' + lk(B.robot.note) + "</p>" +
    '<div class="banner b-blue">' + esc(B.robot.base) + "</div>" +
    '<div class="tw"><table><thead><tr><th>점포</th><th>사업</th><th class="num">로봇비용</th>' +
    '<th class="num">매출</th><th class="num">로봇비용 배수</th><th class="num">매출 대비</th>' +
    "<th>판정</th></tr></thead><tbody>" +
    B.robot.rows.map(function (r) {
      var cls = r.m >= 8 ? "ok" : r.m >= 5 ? "ok" : r.m >= 3 ? "wa" : "no";
      var lbl = r.m >= 8 ? "양호 — 유인 수준" : r.m >= 5 ? "계약기준 충족" :
        r.m >= 3 ? "주의" : "★심각 — 매출의 1/3 초과";
      return "<tr><td><b>" + esc(r.s) + '</b></td><td class="small muted">' + esc(r.seg) +
        '</td><td class="num">' + won(r.cost) + '</td><td class="num">' + won(r.rev) +
        '</td><td class="num ' + (r.m >= 5 ? "pos" : "neg") + '"><b>' + r.m.toFixed(2) +
        '배</b></td><td class="num ' + (r.r > 0.33 ? "neg" : "") + '">' + pct(r.r) +
        '</td><td><span class="bg bg-' + cls + '">' + esc(lbl) + "</span></td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="banner b-red" style="margin:16px 0 0">' + esc(B.robot.after) + "</div></div>";

  h += '<div class="card"><h2>흑자를 타겟하지 않는 점포의 대체 KPI</h2>' +
    '<p class="sec-d">' + esc(B.showcase.note) + "</p>" +
    '<div class="tw"><table><thead><tr><th>전략 목적</th><th>대체 KPI</th>' +
    '<th>허용 적자 한도를 정하는 방식</th><th class="num">재판정 주기</th></tr></thead><tbody>' +
    B.showcase.rows.map(function (r) {
      return "<tr><td><b>" + esc(r.p) + '</b></td><td class="small">' + esc(r.k) +
        '</td><td class="small muted">' + esc(r.cap) + '</td><td class="num nowrap">' +
        esc(r.cyc) + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="banner b-amber" style="margin:16px 0 0">' + esc(B.showcase.rule) + "</div>" +
    '<p class="small muted" style="margin:12px 0 0">' + esc(B.showcase.now) + "</p></div>";

  h += '<div class="card"><h2>제품(로스터리)에 적용하면</h2>' +
    '<p class="sec-d">' + esc(B.roastery.note) + "</p>" +
    '<div class="tw"><table><thead><tr><th>항목</th><th class="num">값</th><th>설명</th></tr></thead><tbody>' +
    B.roastery.rows.map(function (r) {
      var hi = r.n.indexOf("▸") === 0;
      return "<tr" + (hi ? ' class="tot"' : "") + "><td><b>" + esc(r.n) +
        '</b></td><td class="num">' + esc(r.v) + '</td><td class="small muted">' +
        esc(r.d || "") + "</td></tr>";
    }).join("") + "</tbody></table></div>" +
    '<div class="banner b-blue" style="margin:16px 0 0"><b>같은 계산, 다른 결론</b>' +
    "점포에서는 자리값이 고정비의 중심이라 자리값 배수가 곧 관리지표가 됩니다. " +
    "로스터리는 자리값이 매출의 10.2%뿐이고 인건비가 38.4%입니다. " +
    "그래서 <b>자리값 배수 15.53배</b>라는 숫자는 크게 보일 뿐 행동으로 연결되지 않고, " +
    "<b>인건비 배수 2.61배 → 4.13배</b>가 실제로 움직여야 하는 지표입니다. " +
    "지표를 사업 특성에 맞게 갈아끼운 예입니다.</div></div>";

  h += '<div class="card"><h2>이 숫자를 목표·KPI로 바꾸는 규칙</h2><ol style="line-height:2">' +
    "<li>점포마다 매달 두 숫자를 봅니다 — 필요 배수(목표)와 현재 배수(스코어).</li>" +
    "<li>목표 월매출은 감으로 정하지 않고 'BEP 월매출' 열에서 그대로 가져옵니다. 점포 담당에게는 <b>'이 자리값의 ○배를 팔아야 합니다'</b>로 전달합니다. 금액보다 배수가 기억되고 행동으로 연결됩니다.</li>" +
    "<li>목표 월매출을 다시 객단가 × 주문수로 쪼개야 실행 과제가 나옵니다. ★현재는 둘 다 측정되지 않아 이 분해가 불가능합니다(P-000). 그때까지 목표는 금액으로만 내려갑니다.</li>" +
    "<li>분기 마감 때 판정을 다시 돌립니다. 판정이 한 단계 나빠지면 그것이 경고입니다 — 개선 과제가 실패했거나 자리값이 올랐다는 뜻입니다.</li>" +
    "<li>'달성 불가'가 두 분기 연속 나오면 자동으로 경영진 안건이 됩니다. 담당자가 올릴 때까지 기다리지 않습니다.</li>" +
    "<li>신규 출점 검토에도 같은 계산을 먼저 합니다. 후보 자리의 임차료+관리비에 그 모델의 평균 배수를 곱한 값이 최소 매출이고, 그 매출이 상권에서 현실적인지를 먼저 봅니다. 이 검증 없이 연 계약은 하지 않습니다.</li>" +
    "</ol><p class=\"tiny\">KPI 정의 — 31_KPI정의 BEP-RENT · RENT-MULT · BEP-GAP · ROBOT-MULT · CM-STORE · LABOR-MULT-R · SHOWCASE-KPI. 계산 원자료 — 47_점포BEP배수.</p></div>";
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

/* ══ ③ 전략과제 워크벤치 ═══════════════════ */
var WB = { mode: "bep", goal: 5000000, roy: 0.03, adv: 1000, cut: 2.0, pick: {} };

function wbLoad() {
  try {
    var raw = localStorage.getItem("lx-wb");
    if (raw) { var o = JSON.parse(raw); for (var k in o) if (o[k] !== undefined) WB[k] = o[k]; }
  } catch (e) {}
  if (LX.work) {
    if (!Object.keys(WB.pick).length) LX.work.rows.forEach(function (r) { WB.pick[r.s] = "target"; });
  }
}
function wbSave() { try { localStorage.setItem("lx-wb", JSON.stringify(WB)); } catch (e) {} }

function wbCalc(r) {
  var mRev = r.rev / r.mo, mFix = r.fix / r.mo;
  var bep = r.cm > 0 ? mFix / r.cm : null;
  var frCm = r.cm - WB.roy;
  var fr = frCm > 0 ? (mFix + WB.goal) / frCm : null;
  var tgt = WB.mode === "bep" ? bep : fr;
  return {
    mRev: mRev, mFix: mFix, mRent: r.rent / r.mo, mRobot: r.robot / r.mo,
    bep: bep, fr: fr, tgt: tgt,
    mult: tgt && mRev ? tgt / mRev : null,
    op: mRev * r.cm - mFix
  };
}
function wbVerdict(r, c) {
  if (WB.pick[r.s] === "showcase") return { k: "sc", n: "쇼케이스", cls: "bl" };
  if (c.mult === null) return { k: "na", n: "계산 불가", cls: "gy" };
  if (c.mult <= 1) return { k: "ok", n: "달성 — 유지", cls: "ok" };
  if (c.mult <= WB.cut) return { k: "go", n: "개선실행", cls: "wa" };
  return { k: "cut", n: "개선불가 — 폐점", cls: "no" };
}

function pPlan() {
  var W = LX.work;
  var h = '<div class="banner b-blue"><b>이 화면은 계산기입니다</b>' +
    "점포마다 유형을 고르면 목표와 판정이 즉시 다시 계산됩니다. 선택은 이 브라우저에 저장되므로 " +
    "다시 열어도 유지되고, 회의 중에 바꿔 가며 볼 수 있습니다.</div>";

  h += '<div class="card"><h2>1단계 — 바꿀 수 없는 것을 먼저 고정합니다</h2>' +
    '<p class="sec-d">' + lk(W.fixedNote) + "</p>" +
    '<div class="tw"><table><thead><tr><th>고정 항목</th><th>왜 고정인가</th>' +
    '<th class="num">1~8월 합계</th><th class="num">매출 대비</th>' +
    "<th>바꾸려면</th></tr></thead><tbody>" +
    "<tr><td><b>임차료 + 건물관리비</b></td><td class=\"small muted\">임대차 계약 기간 중에는 바꿀 수 없습니다</td>" +
    '<td class="num">' + won(W.rows.reduce(function (a, b) { return a + b.rent; }, 0)) +
    '</td><td class="num">27.5%</td><td class="small">P-006 임대차 재협상 · 철수</td></tr>' +
    "<tr><td><b>로봇 대가</b></td><td class=\"small muted\">렌탈 약정·투자계약·XYZ 위탁계약으로 정해져 있습니다</td>" +
    '<td class="num">' + won(W.rows.reduce(function (a, b) { return a + b.robot; }, 0)) +
    '</td><td class="num">15.7%</td><td class="small">P-007 렌탈 전환 · P-014 배수 5배</td></tr>' +
    "<tr><td><b>인건비</b></td><td class=\"small muted\">무인은 최소 수준, 유인은 영업시간에 묶여 있습니다</td>" +
    '<td class="num">' + won(343075676) + '</td><td class="num">18.2%</td>' +
    "<td class=\"small\">영업시간·배치 조정(미착수)</td></tr>" +
    "</tbody></table></div>" +
    '<p class="tiny" style="margin:13px 0 0">이번 분기에 우리가 실제로 움직일 수 있는 변수는 <b>매출</b>과 <b>매장 유형 선택</b> 둘뿐입니다. 그래서 아래에서 매출 목표를 역산합니다.</p></div>';

  h += '<div class="card"><h2>2단계 — 목표에서 필요 월매출을 역산합니다</h2>' +
    '<p class="sec-d">' + esc(W.goalNote) + "</p>" +
    '<p style="background:var(--navy-soft);border-radius:8px;padding:14px 18px;font-weight:650;text-align:center;letter-spacing:-.02em">' +
    "필요 월매출 = (월 고정비 + 목표이익) ÷ (공헌이익률 − 로열티율)</p>" +
    '<div class="wb-ctl">' +
    '<div class="wb-f"><label for="wbMode">판정 기준</label>' +
    '<select id="wbMode"><option value="bep">중간목표 — 매장 BEP 전환</option>' +
    '<option value="fr">최종목표 — 가맹 전환 시 점주 월수입</option></select></div>' +
    '<div class="wb-f"><label for="wbGoal">점주 목표 월수입 (원)</label>' +
    '<input id="wbGoal" type="number" step="500000" min="0"></div>' +
    '<div class="wb-f"><label for="wbRoy">로열티율 (%)</label>' +
    '<input id="wbRoy" type="number" step="0.5" min="0" max="50"></div>' +
    '<div class="wb-f"><label for="wbCut">폐점 판정 배수</label>' +
    '<input id="wbCut" type="number" step="0.1" min="1" max="10"></div>' +
    '<div class="wb-f"><label for="wbAdv">노출 1인당 가치 (원)</label>' +
    '<input id="wbAdv" type="number" step="100" min="0"></div>' +
    '<p class="wb-hint">로열티율은 가맹 조건이 확정되지 않아 3%를 가정값으로 둡니다. ' +
    "폐점 판정 배수 2배는 '현재 매출의 두 배를 팔아야 한다면 사실상 불가능하다'는 기준입니다. " +
    "노출 1인당 가치는 쇼케이스 매장의 방문자 목표를 계산할 때만 씁니다.</p>" +
    "</div><div id=\"wbOut\"></div></div>";

  h += '<div class="card"><h2>4단계 — 이 표에서 실행계획으로</h2>' +
    "<p><b>'개선실행'</b> 점포는 목표 월매출이 손에 잡히는 숫자로 나왔으니, 그 숫자를 객단가 × 주문수로 쪼개는 것이 다음 단계입니다. " +
    "★현재 두 지표가 측정되지 않아 이 분해가 불가능합니다(P-000). 그때까지 목표는 금액으로만 내려갑니다.</p>" +
    "<p><b>'개선불가 — 폐점'</b> 점포는 경영진 안건입니다. 폐점을 확정하기 전에 <b>쇼케이스로 전환</b>하는 선택지가 있고, " +
    "그 경우 매출 목표를 떼고 방문자 목표로 갈아끼웁니다. 드롭다운을 바꿔 보면 그 숫자가 바로 나옵니다.</p>" +
    "<p><b>'쇼케이스'</b>로 고른 점포는 손익 지표로 평가하지 않습니다. 대신 반드시 두 가지를 함께 등록해야 합니다 — " +
    "허용 적자 한도(월 얼마까지 감수하는가)와 재판정 시점. 이 둘이 없으면 '전략 목적'은 적자를 정당화하는 말이 될 뿐입니다.</p>" +
    '<p class="tiny">쇼케이스 대체 KPI 후보 — ' + esc(W.showcaseKpis.join(" · ")) + "</p></div>";

  h += '<div class="card"><h2>5단계 — 역산해서 입점 기준을 만듭니다</h2>' +
    '<p class="sec-d">' + esc(W.entryNote) + "</p><div id=\"wbEntry\"></div>" +
    '<div class="banner b-amber" style="margin:18px 0 0"><b>이것이 이 작업의 진짜 결과물입니다</b>' +
    "개별 점포를 살리거나 닫는 것보다 중요한 것은 <b>같은 실수를 반복하지 않는 기준</b>입니다. " +
    "매출 상승 데이터가 쌓이면 '이 모델에서 월매출은 아무리 잘해도 얼마까지'라는 내부 상한이 생기고, " +
    "그 상한을 넣으면 '이 금액을 넘는 자리값 물건에는 입점하지 않는다'가 자동으로 나옵니다. " +
    "지금은 관측 최대치를 임시 상한으로 쓰고 있으므로, 실측이 쌓일수록 이 기준은 정확해집니다.</div></div>";
  return h;
}

function wbRender() {
  var W = LX.work; if (!W) return;
  var box = el("wbOut"); if (!box) return;

  /* 컨트롤 값 반영 */
  var m = el("wbMode"), g = el("wbGoal"), r = el("wbRoy"), cu = el("wbCut"), a = el("wbAdv");
  if (m && m.value !== WB.mode) m.value = WB.mode;
  if (g && g.value === "") g.value = WB.goal;
  if (r && r.value === "") r.value = (WB.roy * 100).toFixed(1);
  if (cu && cu.value === "") cu.value = WB.cut;
  if (a && a.value === "") a.value = WB.adv;

  var cnt = { ok: 0, go: 0, cut: 0, sc: 0 };
  var rows = W.rows.map(function (row) {
    var c = wbCalc(row), v = wbVerdict(row, c);
    cnt[v.k] = (cnt[v.k] || 0) + 1;
    return { row: row, c: c, v: v };
  });

  var h = '<div class="kpis" style="margin-bottom:18px">' +
    '<div class="kpi pos"><div class="k-l">달성 — 유지</div><div class="k-v">' + cnt.ok +
    '개점</div><div class="k-s">현재 매출로 목표 충족</div></div>' +
    '<div class="kpi"><div class="k-l">개선실행</div><div class="k-v">' + cnt.go +
    '개점</div><div class="k-s">목표배수 ' + WB.cut.toFixed(1) + "배 이하</div></div>" +
    '<div class="kpi neg"><div class="k-l">개선불가 — 폐점</div><div class="k-v">' + cnt.cut +
    '개점</div><div class="k-s">경영진 결정 대상</div></div>' +
    '<div class="kpi"><div class="k-l">쇼케이스</div><div class="k-v">' + cnt.sc +
    '개점</div><div class="k-s">매출 대신 방문자 목표</div></div></div>';

  h += '<div class="tw"><table><thead><tr><th>점포</th><th>사업</th><th>유형 선택</th>' +
    '<th class="num">자리값(월)</th><th class="num">로봇 대가(월)</th><th class="num">고정비(월)</th>' +
    '<th class="num">공헌이익률</th><th class="num">현재 월매출</th><th class="num">목표 월매출</th>' +
    '<th class="num">배수</th><th>판정 · 목표</th></tr></thead><tbody>';

  ["유인직영", "무인직영", "투자모델"].forEach(function (seg) {
    rows.filter(function (x) { return x.row.seg === seg; }).forEach(function (x, i) {
      var row = x.row, c = x.c, v = x.v;
      var isSc = v.k === "sc";
      var visit = Math.max(0, -c.op) / 30 / (WB.adv || 1);
      var cls = v.k === "cut" ? "row-cut" : isSc ? "row-sc" : "";
      h += "<tr" + (cls ? ' class="' + cls + '"' : "") + (i === 0 ? "" : "") + ">" +
        "<td><b>" + esc(row.s) + "</b>" +
        (row.note ? '<span class="mini">' + esc(row.note) + "</span>" : "") + "</td>" +
        '<td class="small muted nowrap">' + esc(row.seg) + "</td>" +
        '<td><select class="pick' + (isSc ? " sc" : "") + '" data-s="' + esc(row.s) + '">' +
        '<option value="target"' + (isSc ? "" : " selected") + ">흑자전환 타겟</option>" +
        '<option value="showcase"' + (isSc ? " selected" : "") + ">쇼케이스</option></select></td>" +
        '<td class="num">' + won(c.mRent) + "</td>" +
        '<td class="num">' + won(c.mRobot) + "</td>" +
        '<td class="num">' + won(c.mFix) + "</td>" +
        '<td class="num">' + pct(row.cm) + "</td>" +
        '<td class="num">' + won(c.mRev) + "</td>" +
        (isSc
          ? '<td class="num muted">—</td><td class="num muted">—</td>'
          : '<td class="num"><b>' + won(c.tgt) + "</b></td>" +
            '<td class="num ' + (c.mult > WB.cut ? "neg" : c.mult <= 1 ? "pos" : "") + '"><b>' +
            (c.mult === null ? "—" : c.mult.toFixed(2) + "배") + "</b></td>") +
        '<td><span class="bg bg-' + v.cls + '">' + esc(v.n) + "</span>" +
        (isSc
          ? '<span class="mini">월 적자 ' + won(Math.max(0, -c.op)) +
            " → 1일 방문자 <b>" + Math.round(visit).toLocaleString("ko-KR") + "명</b> 이상</span>"
          : '<span class="mini">' + (c.mult === null ? "" :
              c.mult <= 1 ? "여유 " + won(c.mRev - c.tgt) + "/월"
              : "부족 " + won(c.tgt - c.mRev) + "/월 (+" + pct(c.mult - 1, 0) + ")") + "</span>") +
        "</td></tr>";
    });
  });
  h += "</tbody></table></div>";

  h += '<p class="tiny" style="margin:14px 0 0">목표 월매출은 ' +
    (WB.mode === "bep"
      ? "<b>중간목표(BEP 전환)</b> 기준입니다 — 월 고정비를 공헌이익으로 정확히 덮는 매출입니다."
      : "<b>최종목표(가맹 전환 시 점주 월수입 " + won(WB.goal) + ")</b> 기준입니다 — 고정비를 덮고 점주가 " +
        won(WB.goal) + "을 남기며 LX에 로열티 " + pct(WB.roy, 1) + "를 내는 매출입니다.") +
    " 쇼케이스로 고른 점포는 매출 목표를 계산하지 않고 월 적자를 노출가치로 나눈 1일 방문자 목표를 냅니다.</p>";
  box.innerHTML = h;

  /* 역산 입점 기준 */
  var eb = el("wbEntry"); if (!eb) return;
  var models = ["유인직영", "무인직영", "투자모델"];
  var e = '<div class="tw"><table><thead><tr><th>모델</th><th class="num">관측 최대 월매출</th>' +
    '<th class="num">공헌이익률</th><th class="num">자리값 외 월 고정비</th>' +
    '<th class="num">허용 자리값 상한(월)</th><th class="num">허용 배수</th>' +
    "<th>해석</th></tr></thead><tbody>";
  models.forEach(function (mo) {
    var list = W.rows.filter(function (x) { return x.seg === mo; });
    var maxRev = 0, othFix = 0, cmA = 0;
    list.forEach(function (x) {
      var c = wbCalc(x);
      if (c.mRev > maxRev) maxRev = c.mRev;
      othFix += c.mFix - c.mRent; cmA += x.cm;
    });
    othFix /= list.length; cmA /= list.length;
    var cap = maxRev * (cmA - WB.roy) - othFix - WB.goal;
    var mult = cap > 0 ? maxRev / cap : null;
    e += "<tr><td><b>" + esc(mo) + '</b></td><td class="num">' + won(maxRev) +
      '</td><td class="num">' + pct(cmA) + '</td><td class="num">' + won(othFix) +
      '</td><td class="num ' + (cap > 0 ? "pos" : "neg") + '"><b>' + won(cap) +
      '</b></td><td class="num">' + (mult ? mult.toFixed(1) + "배" : "—") +
      '</td><td class="small muted">' +
      (cap > 0
        ? "월 자리값이 <b>" + won(cap) + "</b>을 넘는 물건에는 입점하지 않습니다"
        : "★현재 원가 구조로는 자리값이 0원이어도 목표를 못 맞춥니다. 자리값이 아니라 로봇비용·인건비를 먼저 손대야 합니다") +
      "</td></tr>";
  });
  e += "</tbody></table></div>" +
    '<p class="tiny" style="margin:13px 0 0">허용 자리값 = 관측 최대 월매출 × (공헌이익률 − 로열티율) − 자리값 외 월 고정비 − 점주 목표 월수입. ' +
    "위 컨트롤의 목표 월수입·로열티율을 바꾸면 이 표도 함께 움직입니다.</p>";
  eb.innerHTML = e;
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
  var h = '<div class="flow">' + PHASES.slice(0, 4).map(function (p, i) {
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
var AFTER = { goal: pGoalAfter, biz: pBizAfter, now: pNowAfter, plan: wbRender };

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
  wbLoad();
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

  /* 워크벤치 — 드롭다운·입력이 바뀌면 표만 다시 그립니다 */
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t || !t.id && !t.className) return;
    var hit = false;
    if (t.className && String(t.className).indexOf("pick") >= 0 && t.dataset && t.dataset.s) {
      WB.pick[t.dataset.s] = t.value; hit = true;
    } else if (t.id === "wbMode") { WB.mode = t.value; hit = true; }
    else if (t.id === "wbGoal") { WB.goal = Math.max(0, +t.value || 0); hit = true; }
    else if (t.id === "wbRoy") { WB.roy = Math.max(0, (+t.value || 0) / 100); hit = true; }
    else if (t.id === "wbCut") { WB.cut = Math.max(1, +t.value || 2); hit = true; }
    else if (t.id === "wbAdv") { WB.adv = Math.max(1, +t.value || 1000); hit = true; }
    if (hit) { wbSave(); wbRender(); }
  });
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

