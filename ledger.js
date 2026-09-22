/* ============================================================
   라운지엑스 관리회계 포털 — 라우터 + 렌더러
   의존성 없음. data.js · data2.js 의 LX 객체만 사용합니다.
   ============================================================ */
(function () {
  "use strict";

  /* ── 공용 ─────────────────────────────── */
  const nf = new Intl.NumberFormat("ko-KR");
  const won = (n) => nf.format(Math.round(n)) + "원";
  const pct = (r, d = 1) => (r * 100).toFixed(d) + "%";
  const pp  = (r, d = 1) => (r * 100).toFixed(d) + "%p";
  function eok(n) {
    const a = Math.abs(n);
    if (a >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억원";
    if (a >= 1e4) return Math.round(n / 1e4).toLocaleString("ko-KR") + "만원";
    return nf.format(n) + "원";
  }
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* 본문 텍스트 안의 드릴 용어를 버튼으로 바꿉니다 */
  const DRILL_KEYS = Object.keys(LX.drill).sort((a, b) => b.length - a.length);
  function linkify(text) {
    let out = esc(text);
    DRILL_KEYS.forEach((k) => {
      const ek = esc(k);
      // 이미 버튼으로 감싼 부분은 건드리지 않도록 단순 1회 치환
      const i = out.indexOf(ek);
      if (i >= 0 && out.indexOf("drill-t") === -1) {
        out = out.slice(0, i) + `<button class="drill-t" data-drill="${ek}">${ek}</button>` + out.slice(i + ek.length);
      }
    });
    return out;
  }
  const dt = (k, label) =>
    `<button class="drill-t" data-drill="${esc(k)}">${esc(label || k)}</button>`;

  /* ── 페이지 정의 ──────────────────────── */
  const PAGES = [
    { id: "overview",  group: "무슨 회사인가", n: "1",  title: "개요",              sub: "돈이 들어오는 다섯 갈래와 2026년 목표입니다. 회계 숫자는 이 경로를 그대로 옮겨 적은 것입니다.", fn: pOverview },
    { id: "glossary",  group: "무슨 회사인가", n: "2",  title: "관리손익이란",      sub: "대시보드에 뜨는 '관리 영업손익'이 원본 회계의 영업손익과 왜 다른지 설명합니다.", fn: pGlossary },
    { id: "exception", group: "지금 상태",     n: "3",  title: "예외보고",          sub: "기준을 벗어난 항목만 봅니다. 모든 지표를 훑는 화면이 아닙니다.", fn: pException, warn: true },
    { id: "landing",   group: "지금 상태",     n: "4",  title: "연말 착지 전망",    sub: "회의에서 결정을 가르는 것은 누계 실적이 아니라 착지 전망입니다.", fn: pLanding },
    { id: "portfolio", group: "지금 상태",     n: "5",  title: "사업 포트폴리오",   sub: "매출 순위와 손익 순위가 다릅니다. 구성비만 보고 자원을 배분하면 적자를 키웁니다.", fn: pPortfolio },
    { id: "gap",       group: "왜 이런가",     n: "6",  title: "계획 대 실적",      sub: "간격의 크기를 재는 것이 아니라 어느 약속이 지켜지지 않았는지를 가립니다.", fn: pGap },
    { id: "cause",     group: "왜 이런가",     n: "7",  title: "사업별 원인 분해",  sub: "사업을 골라 계정 단위로 펼쳐 봅니다. 원본 회계자료에는 이 숫자가 처음부터 다 있었습니다.", fn: pCause },
    { id: "stores",    group: "왜 이런가",     n: "8",  title: "점포별 비교",       sub: "금액은 규모가 다른 점포끼리 비교할 수 없습니다. 각 점포의 자기 매출로 나눈 비율로 봅니다.", fn: pStores },
    { id: "shared",    group: "왜 이런가",     n: "9",  title: "상품과 제품의 비용 분담", sub: "계정 체계는 같은데 금액이 들어간 자리가 다릅니다. 수익성 비교에 직접 영향을 줍니다.", fn: pShared },
    { id: "actions",   group: "무엇을 할까",   n: "10", title: "개선과제",          sub: "원인을 찾는 것으로는 끝나지 않습니다. 과제에 금액이 붙어야 목표 간격과 연결됩니다.", fn: pActions },
    { id: "targets",   group: "무엇을 할까",   n: "11", title: "목표 배분",         sub: "80억 원이 사업별로 어떻게 나뉘고, 가맹점이 몇 개 필요한지 계산합니다.", fn: pTargets },
    { id: "decisions", group: "무엇을 할까",   n: "12", title: "결정과 신뢰도",     sub: "지금 결정이 필요한 것과, 숫자를 어디까지 믿어도 되는지입니다.", fn: pDecisions },
    { id: "tabs",      group: "부록",          n: "13", title: "대장 탭 지도",      sub: "탭은 62개이지만 평소에 읽는 것은 초록 다섯 개입니다.", fn: pTabs }
  ];

  /* ── 사이드바 ─────────────────────────── */
  (function nav() {
    let html = "", g = "";
    PAGES.forEach((p) => {
      if (p.group !== g) { g = p.group; html += `<div class="side-sep">${esc(g)}</div>`; }
      html += `<a href="#/${p.id}" data-p="${p.id}" class="${p.warn ? "warn-dot" : ""}">
        <span class="n">${p.n}</span><span>${esc(p.title)}</span></a>`;
    });
    el("sideNav").innerHTML = html;
    el("asofChip").textContent = `${LX.meta.asOf} · ${LX.meta.periodLabel}`;
    el("sideMeta").textContent = `${LX.meta.source}\n${LX.meta.note}`;
  })();

  /* ── 라우터 ───────────────────────────── */
  function route() {
    const id = (location.hash.replace(/^#\/?/, "") || "overview").split("?")[0];
    const p = PAGES.find((x) => x.id === id) || PAGES[0];
    const i = PAGES.indexOf(p);

    el("crumb").textContent = p.group;
    el("pageTitle").textContent = p.title;
    el("pageSub").textContent = p.sub;
    el("pageBody").innerHTML = p.fn();

    document.querySelectorAll("#sideNav a").forEach((a) =>
      a.classList.toggle("on", a.dataset.p === p.id));

    const prev = PAGES[i - 1], next = PAGES[i + 1];
    el("pager").innerHTML =
      (prev ? `<a href="#/${prev.id}"><span>← 이전</span><b>${esc(prev.title)}</b></a>` : "<span></span>") +
      (next ? `<a class="next" href="#/${next.id}"><span>다음 →</span><b>${esc(next.title)}</b></a>` : "");

    window.scrollTo(0, 0);
    el("side").classList.remove("open");
    el("scrim").classList.remove("show");
    if (p.after) p.after();
    if (p.id === "portfolio") drawDonuts();
  }
  window.addEventListener("hashchange", route);

  /* ── 페이지: 개요 ─────────────────────── */
  function pOverview() {
    const c = LX.company, h = LX.headline;
    const rate = h.revenue.actual / h.revenue.target;
    const planRate = h.revenue.actual / h.revenue.planToDate;
    const barc = (r) => (r >= 0.9 ? "" : r >= 0.6 ? "low" : "bad");

    let s = `<div class="blk"><div class="grid2">
      <div class="mv-card"><span class="mv-label">미션</span><p>${esc(c.mission)}</p></div>
      <div class="mv-card"><span class="mv-label">비전</span><p>${esc(c.vision)}</p></div>
    </div></div>`;

    s += `<div class="blk"><h2>2026년 목표와 현재 스코어</h2>
      <p class="h-sub">목표는 매출 80억 원과 EBITDA 20억 원입니다.</p><div class="kpis">`;
    [
      { n: "누계 매출", v: eok(h.revenue.actual), s: `연간 목표 대비 ${pct(rate)}`, bar: Math.min(rate, 1), bc: barc(rate) },
      { n: "누계 계획 달성률", v: pct(planRate), s: `계획 ${eok(h.revenue.planToDate)}`, bar: Math.min(planRate, 1), bc: barc(planRate) },
      { n: "누계 관리 영업손익", v: eok(h.op.actual), c: "neg", s: `영업이익률 ${pct(h.opMargin.actual, 2)}` },
      { n: "누계 관리 EBITDA", v: eok(h.ebitda.actual), c: "neg", s: `EBITDA율 ${pct(h.ebitdaMargin.actual, 2)}` }
    ].forEach((k) => {
      s += `<div class="kpi"><div class="k-name">${esc(k.n)}</div>
        <div class="k-val ${k.c || ""}">${esc(k.v)}</div><div class="k-sub">${esc(k.s)}</div>
        ${k.bar !== undefined ? `<div class="bar"><i class="${k.bc}" style="width:${(k.bar * 100).toFixed(1)}%"></i></div>` : ""}</div>`;
    });
    s += `</div></div>`;

    s += `<div class="blk"><h2>돈이 들어오는 갈래</h2><div class="grid3">`;
    c.lines.forEach((l) => {
      s += `<div class="card"><h4>${esc(l.name)}<span class="badge">${esc(l.stores)}</span></h4><p>${esc(l.desc)}</p></div>`;
    });
    s += `</div></div>`;

    s += `<div class="blk"><div class="callout"><b>사업 간의 관계</b><p>${esc(c.logic)}</p></div></div>`;
    return s;
  }

  /* ── 페이지: 관리손익 설명 ────────────── */
  function pGlossary() {
    const m = LX.mgmtPL;
    let s = `<div class="blk"><div class="expl">`;
    m.blocks.forEach((b) => { s += `<h4>${esc(b.h)}</h4><p>${esc(b.p)}</p>`; });
    s += `</div></div>`;

    s += `<div class="blk"><h2>영업손익 밖에 놓인 네 항목</h2>
      <p class="h-sub">클릭하면 자세한 내용이 열립니다.</p>
      <div class="bars">`;
    const d = LX.drill["별도 추가비용"].items;
    const max = Math.max(...d.map((x) => x.v));
    d.forEach((x) => {
      s += `<div class="barrow"><div class="b-top">
        <span class="b-name">${x.n.indexOf("기계렌탈") >= 0 ? dt("기계렌탈료", x.n) : esc(x.n)}</span>
        <span class="b-val neg">${eok(x.v)}</span></div>
        <div class="b-track"><i style="width:${(x.v / max * 100).toFixed(1)}%;background:var(--red)"></i></div>
        ${x.note ? `<div class="b-why">${esc(x.note)}</div>` : ""}</div>`;
    });
    s += `</div></div>`;

    s += `<div class="blk"><h2>자주 쓰는 용어</h2><p class="h-sub">클릭하면 구성과 숫자가 열립니다.</p>
      <div class="callout"><p>`
      + DRILL_KEYS.slice().sort().map((k) => dt(k)).join(" · ")
      + `</p></div></div>`;
    return s;
  }

  /* ── 페이지: 예외보고 ─────────────────── */
  function pException() {
    const rows = LX.exceptions, bad = rows.filter((r) => !r.ok);
    const fmt = (v, u) => u === "pct" ? pct(v) : u === "cnt" ? nf.format(v) + "개" : won(v);

    let s = `<div class="blk"><div class="callout bad">
      <b>이탈 ${bad.length}건 / 점검 ${rows.length}건</b>
      <p>${esc(bad.map((b) => b.name).join(" · "))}</p></div></div>`;

    s += `<div class="blk"><div class="table-scroll"><table class="tbl"><thead><tr>
      <th>점검 항목</th><th class="num">현재값</th><th class="num">기준</th><th class="mid">판정</th><th>이탈이면 무엇을 결정하나</th>
      </tr></thead><tbody>`;
    rows.forEach((r) => {
      s += `<tr class="${r.ok ? "" : "flag"}"><td>${linkify(r.name)}</td>
        <td class="num ${r.ok ? "" : "neg"}">${fmt(r.value, r.unit)}</td>
        <td class="num">${fmt(r.limit, r.unit)} ${r.dir === "up" ? "이상" : "이하"}</td>
        <td class="mid"><span class="pill ${r.ok ? "ok" : "bad"}">${r.ok ? "정상" : "★이탈"}</span></td>
        <td class="why">${esc(r.action)}</td></tr>`;
    });
    s += `</tbody></table></div></div>`;

    s += `<div class="blk"><div class="callout warn"><b>전부 빨간 상태일 때의 순서</b>
      <p>① 게이트 통과 수(가맹 매출의 선행조건) → ② 렌탈료·임차료·로스터리 고정비(적자의 직접 원인, 계약서 확보가 선행) → ③ 상각 명세(숫자 신뢰도) → ④ 미커버 금액(목표 재조정 여부).
      누계 달성률·적자 사업 수·착지 전망은 결과지표이므로 앞의 네 가지가 풀리면 따라서 움직입니다.</p></div></div>`;
    return s;
  }

  /* ── 페이지: 착지 전망 ────────────────── */
  function pLanding() {
    const max = Math.max(...LX.landing.map((l) => Math.abs(l.value)));
    let s = `<div class="blk"><div class="bars">`;
    LX.landing.forEach((l) => {
      s += `<div class="land k-${l.kind}">
        <div class="l-name">${esc(l.label)}<span class="l-how">${esc(l.how)}</span></div>
        <div class="l-bar"><i style="width:${(Math.abs(l.value) / max * 100).toFixed(1)}%"></i></div>
        <div class="l-val">${eok(l.value)}</div></div>`;
    });
    s += `</div></div>`;
    s += `<div class="blk"><div class="callout"><b>읽는 순서</b>
      <p>②를 먼저 보고(그대로 가면 얼마), ③으로 추세를 확인하고, ④로 과제가 그 간격을 메우는지 보고, ⑤로 남는 것을 오늘 결정합니다.</p></div></div>`;
    s += `<div class="blk"><div class="callout warn"><b>한계</b>
      <p>2026년이 첫 해라 전년 동월 데이터가 없어 계절성을 보정하지 못합니다. 열두 달이 쌓이면 2027년부터 계절지수를 넣을 수 있습니다. 또 ②와 ③은 가맹이 열리면 구조가 바뀝니다.</p></div></div>`;
    return s;
  }

  /* ── 페이지: 포트폴리오 ───────────────── */
  function pPortfolio() {
    const diag = {
      man: "유일한 흑자. 임차료율 16.6%로 투자모델(34.8%)의 절반입니다.",
      inv: "임차료 34.8% + 위탁수수료 18.8%로 매출의 절반 이상이 빠져나갑니다.",
      unm: "적자의 79%가 기계렌탈료. 원본 기준으로는 투자모델보다 낫습니다.",
      gds: "수익성이 가장 좋습니다. 단, 인건비·보관비를 부담하지 않은 숫자입니다.",
      rst: "매출총이익은 흑자인데 고정비가 커서 적자. 손익분기점까지 월 891만 부족."
    };
    let s = `<div class="blk"><div class="chart-row">
      <div class="chart-card"><h3>누계 매출 구성</h3><p class="c-hint">조각 위 숫자가 구성비입니다</p>
        <div class="donut-wrap"><canvas id="revDonut" width="250" height="250"></canvas></div><ul class="legend" id="revLegend"></ul></div>
      <div class="chart-card"><h3>누계 비용 구성</h3><p class="c-hint">항목 이름을 누르면 구성이 열립니다</p>
        <div class="donut-wrap"><canvas id="costDonut" width="250" height="250"></canvas></div><ul class="legend" id="costLegend"></ul></div>
    </div></div>`;

    s += `<div class="blk"><h2>사업별 요약</h2>
      <p class="h-sub">사업명을 누르면 계정별 손익계산서가 열립니다.</p>
      <div class="table-scroll"><table class="tbl"><thead><tr>
      <th>사업</th><th class="num">누계 매출</th><th class="num">구성비</th><th class="num">누계 관리손익</th><th class="num">이익률</th><th>한 줄 진단</th>
      </tr></thead><tbody>`;
    LX.segments.forEach((x) => {
      s += `<tr><td><a href="#/cause?s=${x.key}" style="font-weight:700;color:var(--blue)">${esc(x.name)}</a></td>
        <td class="num">${won(x.revenue)}</td><td class="num">${pct(x.share)}</td>
        <td class="num ${x.op < 0 ? "neg" : "pos"}">${won(x.op)}</td>
        <td class="num ${x.margin < 0 ? "neg" : "pos"}">${pct(x.margin)}</td>
        <td class="why">${esc(diag[x.key] || "")}</td></tr>`;
    });
    s += `</tbody></table></div></div>`;
    return s;
  }

  function drawDonuts() {
    donut("revDonut", "revLegend", LX.segments, "revenue", "name", false);
    donut("costDonut", "costLegend", LX.costMix, "value", "name", true);
  }

  function donut(cid, lid, items, vk, lk, linkLegend) {
    const cv = el(cid); if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1, size = 250;
    cv.width = size * dpr; cv.height = size * dpr;
    cv.style.width = size + "px"; cv.style.height = size + "px";
    ctx.scale(dpr, dpr);
    const total = items.reduce((s, i) => s + Math.abs(i[vk]), 0);
    const cx = size / 2, cy = size / 2, R = size / 2 - 5, r = R * 0.58;
    let a = -Math.PI / 2;
    items.forEach((it) => {
      const f = Math.abs(it[vk]) / total, a2 = a + f * Math.PI * 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, a, a2); ctx.arc(cx, cy, r, a2, a, true); ctx.closePath();
      ctx.fillStyle = it.color; ctx.fill();
      if (f >= 0.05) {
        const mid = (a + a2) / 2, rr = (R + r) / 2;
        ctx.fillStyle = "#fff"; ctx.font = "600 12px system-ui,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((f * 100).toFixed(1) + "%", cx + Math.cos(mid) * rr, cy + Math.sin(mid) * rr);
      }
      a = a2;
    });
    ctx.fillStyle = "#16202b"; ctx.font = "700 15px system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(eok(total), cx, cy - 7);
    ctx.fillStyle = "#7b8a97"; ctx.font = "400 11px system-ui,sans-serif";
    ctx.fillText("누계 합계", cx, cy + 10);

    el(lid).innerHTML = items.map((it) => {
      const nm = (linkLegend && LX.drill[it[lk]]) ? dt(it[lk]) : esc(it[lk]);
      return `<li><span class="sw" style="background:${it.color}"></span>
        <span class="lg-name">${nm}</span>
        <span class="lg-pct">${pct(Math.abs(it[vk]) / total)}</span>
        <span class="lg-amt">${eok(it[vk])}</span></li>`;
    }).join("");
  }

  /* ── 페이지: 간격 ─────────────────────── */
  function pGap() {
    const g = LX.gap;
    let s = `<div class="blk"><div class="kpis">`;
    [{ n: "누계 계획", v: eok(g.plan) }, { n: "누계 실적", v: eok(g.actual) },
     { n: "달성률", v: pct(g.actual / g.plan) }, { n: "간격", v: eok(g.total), c: "neg" }]
      .forEach((c) => { s += `<div class="kpi"><div class="k-name">${esc(c.n)}</div><div class="k-val ${c.c || ""}">${esc(c.v)}</div></div>`; });
    s += `</div></div>`;

    const max = Math.max(...g.items.map((i) => Math.abs(i.value)));
    s += `<div class="blk"><h2>어느 약속이 지켜지지 않았나</h2><div class="bars">`;
    g.items.forEach((i) => {
      s += `<div class="barrow neg"><div class="b-top">
        <span class="b-name">${esc(i.name)} <span class="pill grey">${esc(i.status)}</span>
        <span class="b-share">간격의 ${pct(i.share)}</span></span>
        <span class="b-val neg">${eok(i.value)}</span></div>
        <div class="b-track"><i style="width:${(Math.abs(i.value) / max * 100).toFixed(1)}%"></i></div>
        <div class="b-why">${esc(i.why)}</div></div>`;
    });
    s += `</div></div><div class="blk"><div class="callout"><b>진단</b><p>${esc(g.verdict)}</p></div></div>`;
    return s;
  }

  /* ── 페이지: 원인 분해 ────────────────── */
  function pCause() {
    const keys = ["inv", "unm", "rst", "man", "gds"];
    const q = (location.hash.split("?")[1] || "").match(/s=(\w+)/);
    const cur = (q && keys.indexOf(q[1]) >= 0) ? q[1] : "inv";

    let s = `<div class="blk"><div class="steps">
      <div class="step"><span class="step-n">1단계</span>어느 사업이 적자인가<small>사업 포트폴리오</small></div>
      <div class="step"><span class="step-n">2단계</span>그 사업의 어느 계정인가<small>이 화면</small></div>
      <div class="step"><span class="step-n">3단계</span>그 계정의 어느 점포인가<small>점포별 비교</small></div>
    </div></div>`;

    s += `<div class="blk"><div class="tabs" id="causeTabs">`;
    keys.forEach((k) => {
      s += `<button class="tab-btn ${k === cur ? "on" : ""}" data-k="${k}">${esc(LX.segDetail[k].name)}</button>`;
    });
    s += `</div><div id="causePanel">${causePanel(cur)}</div></div>`;
    return s;
  }

  function causePanel(k) {
    const d = LX.segDetail[k];
    const rev = d.rows.find((r) => r.n === "I.매출").v;
    const maxR = Math.max(...d.rows.map((r) => Math.abs(r.v / rev)));
    let s = "";

    const seg = LX.segments.find((x) => x.key === k);
    if (seg) {
      s += `<div class="kpis c3" style="margin-bottom:16px">
        <div class="kpi"><div class="k-name">누계 매출</div><div class="k-val sm">${eok(seg.revenue)}</div><div class="k-sub">${d.stores ? d.stores + "개점" : "유통"}</div></div>
        <div class="kpi"><div class="k-name">누계 관리손익</div><div class="k-val sm ${seg.op < 0 ? "neg" : "pos"}">${eok(seg.op)}</div></div>
        <div class="kpi"><div class="k-name">이익률</div><div class="k-val sm ${seg.margin < 0 ? "neg" : "pos"}">${pct(seg.margin)}</div></div>
      </div>`;
    }

    s += `<div class="table-scroll"><table class="tbl"><thead><tr>
      <th>계정</th><th class="num">1~8월 누계</th><th>매출 대비</th><th>이게 무슨 뜻인가</th>
      </tr></thead><tbody>`;
    d.rows.forEach((r) => {
      const ratio = r.v / rev;
      const w = (Math.abs(ratio) / maxR * 100).toFixed(1);
      const cls = r.flag ? "flag" : r.good ? "good" : r.lv === 0 ? "lv0" : "";
      const nm = LX.drill[r.n] ? dt(r.n) : esc(r.n);
      s += `<tr class="${cls}">
        <td><span class="${r.lv === 1 ? "ind" : ""}">${nm}</span></td>
        <td class="num ${r.neg ? "neg" : r.pos ? "pos" : ""}">${won(r.v)}</td>
        <td>${pct(ratio, 1)}<div class="rbar"><i style="width:${w}%"></i></div></td>
        <td class="why">${esc(r.note || "")}</td></tr>`;
    });
    s += `</tbody></table></div>`;

    if (k === "rst" && LX.breakdown.rst.bep) {
      const p = LX.breakdown.rst.bep;
      s += `<h2 style="margin:26px 0 4px;font-size:19px">월 얼마를 팔아야 본전인가</h2>
        <p class="h-sub">고정비는 매출이 0이어도 나가는 돈, 변동비는 팔린 만큼 따라 나가는 돈입니다.</p><div class="bep">
        <div class="bep-item"><div class="n">월평균 매출</div><div class="v">${eok(p.avgRevenue)}</div></div>
        <div class="bep-item"><div class="n">월평균 고정비</div><div class="v">${eok(p.fixedCost)}</div></div>
        <div class="bep-item"><div class="n">공헌이익률</div><div class="v">${pct(p.cmRatio)}</div></div>
        <div class="bep-item hl"><div class="n">손익분기점 월매출</div><div class="v">${eok(p.breakeven)}</div></div>
        <div class="bep-item"><div class="n">현재와의 차이</div><div class="v" style="color:var(--red)">${eok(p.shortfall)}</div></div>
        <div class="bep-item"><div class="n">필요한 매출 증가율</div><div class="v">${pct(p.needGrowth)}</div></div>
        <div class="bep-item"><div class="n">또는 월 고정비 절감</div><div class="v">${eok(p.altCutFixed)}</div></div>
        <div class="bep-item"><div class="n">변동비율</div><div class="v">${pct(p.varRatio)}</div></div></div>`;
    }

    if (LX.storeDetail[k]) {
      const sd = LX.storeDetail[k];
      s += `<h2 style="margin:26px 0 4px;font-size:19px">점포별 손익</h2>
        <p class="h-sub">${esc(sd.note)}</p><div class="table-scroll"><table class="tbl"><thead><tr><th>점포</th>`;
      sd.cols.forEach((c) => (s += `<th class="num">${esc(c)}</th>`));
      s += `<th>메모</th></tr></thead><tbody>`;
      const keyMap = { "매출": "rev", "원재료": "mat", "인건비": "lab", "임차료": "rent", "판관비": "sga",
        "감가상각": "dep", "건물관리": "bld", "기계렌탈": "lease", "위탁수수료": "fee", "영업손익": "op" };
      sd.rows.forEach((row) => {
        s += `<tr class="${row.note ? "flag" : ""}"><td><b>${esc(row.s)}</b></td>`;
        sd.cols.forEach((c) => {
          if (c === "이익률") { s += `<td class="num ${row.op < 0 ? "neg" : "pos"}">${pct(row.op / row.rev)}</td>`; return; }
          const v = row[keyMap[c]];
          s += `<td class="num ${c === "영업손익" && v < 0 ? "neg" : c === "영업손익" ? "pos" : ""}">${v === undefined ? "—" : nf.format(v)}</td>`;
        });
        s += `<td class="why">${esc(row.note || "")}</td></tr>`;
      });
      s += `</tbody></table></div>`;
    }
    return s;
  }

  /* ── 페이지: 점포별 비교 ──────────────── */
  function pStores() {
    const m = LX.storeMatrix;
    let s = `<div class="blk"><div class="callout"><b>읽는 요령</b><p>${esc(m.readTip)}</p></div></div>`;

    s += `<div class="blk"><h2>투자모델 6개점 비율 히트맵</h2>
      <p class="h-sub">나쁜 쪽일수록 붉습니다. 편차가 크면 개별 점포 조치, 작으면 모델 구조 문제입니다.</p>
      <div class="table-scroll"><table class="tbl heat"><thead><tr>
      <th>지표</th><th class="num">6개점 전체</th><th class="num">편차</th>`;
    m.stores.forEach((x) => (s += `<th class="num">${esc(x)}</th>`));
    s += `<th>↑ 최고 / ↓ 최저</th></tr></thead><tbody>`;

    s += `<tr><td><b>매출 (규모 참고)</b></td><td class="num">${nf.format(m.revenue.reduce((a, b) => a + b, 0))}</td><td class="num">—</td>`;
    m.revenue.forEach((v) => (s += `<td class="h">${nf.format(v)}</td>`));
    s += `<td class="why">비율이 아니라 금액입니다.</td></tr>`;

    m.metrics.forEach((mt) => {
      const mx = Math.max(...mt.values), mn = Math.min(...mt.values), dev = mx - mn;
      const nm = LX.drill[mt.name.replace(/^·\s*/, "")] ? dt(mt.name.replace(/^·\s*/, ""), mt.name) : esc(mt.name);
      s += `<tr class="${mt.key ? "key-row" : ""}"><td>${nm}</td>
        <td class="num">${pct(mt.all)}</td><td class="num dev">${pp(dev)}</td>`;
      mt.values.forEach((v) => {
        let cls = "";
        if (dev > 0.0001) {
          const t = (v - mn) / dev, bad = mt.dir === "down" ? t : 1 - t;
          cls = bad > 0.8 ? "hot-3" : bad > 0.6 ? "hot-2" : bad > 0.45 ? "hot-1" : bad < 0.2 ? "cool-2" : bad < 0.35 ? "cool-1" : "";
        }
        s += `<td class="h ${cls}">${pct(v)}</td>`;
      });
      s += `<td class="why">↑ ${esc(m.stores[mt.values.indexOf(mx)])} · ↓ ${esc(m.stores[mt.values.indexOf(mn)])}</td></tr>`;
    });
    s += `</tbody></table></div></div>`;

    if (m.caveats) {
      s += `<div class="blk"><div class="callout warn"><b>평균을 읽을 때 감안할 것</b><ul>`
        + m.caveats.map((c) => `<li>${esc(c)}</li>`).join("") + `</ul></div></div>`;
    }

    s += `<div class="blk"><h2>무인직영·유인직영 점포별 손익</h2>
      <p class="h-sub">사업별 원인 분해 화면에서 각 사업을 고르면 점포별 표가 함께 나옵니다.</p>
      <div class="grid2">
      <div class="card"><h4>무인직영 3개점</h4><p>${esc(LX.storeDetail.unm.note)}</p>
        <p style="margin-top:8px"><a href="#/cause?s=unm" style="color:var(--blue)">→ 무인직영 점포별 보기</a></p></div>
      <div class="card"><h4>유인직영 4개점</h4><p>${esc(LX.storeDetail.man.note)}</p>
        <p style="margin-top:8px"><a href="#/cause?s=man" style="color:var(--blue)">→ 유인직영 점포별 보기</a></p></div>
      </div></div>`;
    return s;
  }

  /* ── 페이지: 상품과 제품 비용 분담 ────── */
  function pShared() {
    const sc = LX.sharedCost;
    let s = `<div class="blk"><div class="callout"><p>${esc(sc.lead)}</p></div></div>`;
    s += `<div class="blk"><div class="table-scroll"><table class="tbl"><thead><tr>`;
    sc.head.forEach((h, i) => (s += `<th class="${i === 1 || i === 2 ? "num" : ""}">${esc(h)}</th>`));
    s += `</tr></thead><tbody>`;
    sc.rows.forEach((r) => {
      const zero = r[1] === "0";
      s += `<tr class="${zero ? "flag" : ""}"><td>${esc(r[0])}</td>
        <td class="num ${zero ? "neg" : ""}">${esc(r[1])}</td><td class="num">${esc(r[2])}</td>
        <td class="why">${esc(r[3])}</td></tr>`;
    });
    s += `</tbody></table></div></div>`;
    s += `<div class="blk"><h2>무슨 뜻인가</h2><div class="callout warn"><ul>`
      + sc.findings.map((f) => `<li>${esc(f)}</li>`).join("") + `</ul></div></div>`;
    return s;
  }

  /* ── 페이지: 과제 ─────────────────────── */
  function pActions() {
    const a = LX.actions;
    const sumRev = a.reduce((s, x) => s + x.revThis, 0);
    const sumOp = a.reduce((s, x) => s + x.opYear, 0);
    const holds = a.filter((x) => x.hold).length;
    let s = `<div class="blk"><div class="kpis c3">`;
    [{ n: "올해 실현 기대 매출", v: eok(sumRev), s: "착지 전망 ④로 연결" },
     { n: "연환산 기대 손익 개선", v: eok(sumOp), s: "비용 절감 과제 합계" },
     { n: "기대효과 산정 보류", v: holds + "건", s: "계약서 확보 전까지 0" }]
      .forEach((c) => { s += `<div class="kpi"><div class="k-name">${esc(c.n)}</div><div class="k-val sm">${esc(c.v)}</div><div class="k-sub">${esc(c.s)}</div></div>`; });
    s += `</div></div>`;

    s += `<div class="blk"><div class="table-scroll"><table class="tbl"><thead><tr>
      <th>ID</th><th>과제</th><th class="mid">레버</th><th class="num">연환산 매출</th><th class="num">올해 매출</th><th class="num">연환산 손익</th><th>산출 근거</th>
      </tr></thead><tbody>`;
    a.forEach((x) => {
      s += `<tr class="${x.top ? "flag" : ""}"><td><b>${esc(x.id)}</b></td><td>${esc(x.name)}</td>
        <td class="mid"><span class="pill grey">${esc(x.lever)}</span></td>
        <td class="num">${x.revYear ? won(x.revYear) : (x.hold ? '<span class="pill hold">보류</span>' : "—")}</td>
        <td class="num">${x.revThis ? won(x.revThis) : "—"}</td>
        <td class="num">${x.opYear ? won(x.opYear) : (x.hold ? '<span class="pill hold">보류</span>' : "—")}</td>
        <td class="why">${esc(x.basis)}</td></tr>`;
    });
    s += `</tbody></table></div></div>`;
    return s;
  }

  /* ── 페이지: 목표 ─────────────────────── */
  function pTargets() {
    const t = LX.targets, f = t.franchise;
    let s = `<div class="blk"><div class="callout"><b>배분 규칙</b><p>${esc(t.rule)}</p></div></div>`;
    const max = Math.max(...t.items.map((i) => i.value));
    s += `<div class="blk"><h2>카테고리별 목표</h2><div class="bars">`;
    t.items.forEach((i) => {
      s += `<div class="barrow"><div class="b-top"><span class="b-name">${esc(i.name)}</span>
        <span class="b-val">${eok(i.value)} <span style="color:var(--ink-3);font-weight:400">${pct(i.share)}</span></span></div>
        <div class="b-track"><i style="width:${(i.value / max * 100).toFixed(1)}%"></i></div></div>`;
    });
    s += `</div></div>`;
    s += `<div class="blk"><h2>가맹 필요 물량</h2><div class="kpis">`;
    [{ n: "필요 연내 개설 수", v: f.needStores + "개" }, { n: "월 필요 개설 수", v: f.perMonth + "개/월" },
     { n: "점당 개설매출", v: eok(f.openRevenuePerStore) }, { n: "점당 월 반복매출", v: eok(f.monthlyRecurringPerStore) }]
      .forEach((c) => { s += `<div class="kpi"><div class="k-name">${esc(c.n)}</div><div class="k-val sm">${esc(c.v)}</div></div>`; });
    s += `</div><div class="callout" style="margin-top:12px"><b>판정</b><p>${esc(f.verdict)}</p></div></div>`;
    return s;
  }

  /* ── 페이지: 결정·신뢰도 ──────────────── */
  function pDecisions() {
    let s = `<div class="blk"><h2>지금 결정이 필요한 것</h2><div class="grid2">`;
    LX.decisions.forEach((d) => {
      s += `<div class="card dec"><h4>${esc(d.title)}</h4><p>${esc(d.detail)}</p><span class="owner">${esc(d.owner)}</span></div>`;
    });
    s += `</div></div>`;
    s += `<div class="blk"><div class="callout warn"><b>비교할 때 주의</b><p>${esc(LX.confidence.warning)}</p></div></div>`;
    s += `<div class="blk"><h2>숫자를 어디까지 믿어도 되는가</h2><div class="grid2">
      <div class="card ok"><h4>확정된 것</h4><ul>${LX.confidence.fixed.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="card hold"><h4>아직 확정되지 않은 것</h4><ul>${LX.confidence.open.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div></div>`;
    return s;
  }

  /* ── 페이지: 탭 지도 ──────────────────── */
  function pTabs() {
    let s = `<div class="blk"><div class="table-scroll"><table class="tbl"><thead><tr>
      <th>티어</th><th class="mid">색</th><th>언제 보나</th><th>해당 탭</th></tr></thead><tbody>`;
    const dotc = { green: "#34a853", blue: "#4285f4", yellow: "#fbbc04", grey: "#9aa0a6" };
    LX.tabs.forEach((t) => {
      s += `<tr><td><b>${esc(t.tier)}</b></td>
        <td class="mid"><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${dotc[t.color]}"></span></td>
        <td>${esc(t.when)}</td><td class="why">${esc(t.list)}</td></tr>`;
    });
    s += `</tbody></table></div></div>`;
    return s;
  }

  /* ── 드릴 패널 ────────────────────────── */
  function openDrill(key) {
    const d = LX.drill[key]; if (!d) return;
    let s = `<h3>${esc(d.title)}</h3><p class="d-desc">${esc(d.desc)}</p>`;
    if (d.items) {
      const total = d.items.reduce((a, b) => a + b.v, 0);
      s += `<div class="table-scroll"><table class="tbl"><thead><tr><th>항목</th><th class="num">금액</th><th class="num">비중</th><th>비고</th></tr></thead><tbody>`;
      d.items.forEach((i) => {
        s += `<tr><td>${esc(i.n)}</td><td class="num">${won(i.v)}</td><td class="num">${pct(i.v / total)}</td><td class="why">${esc(i.note || "")}</td></tr>`;
      });
      s += `<tr class="lv0"><td><b>합계</b></td><td class="num">${won(total)}</td><td class="num">100.0%</td><td></td></tr>`;
      s += `</tbody></table></div>`;
    }
    if (d.table) {
      s += `<div class="table-scroll"><table class="tbl"><thead><tr>`;
      d.table.head.forEach((h, i) => (s += `<th class="${i ? "num" : ""}">${esc(h)}</th>`));
      s += `</tr></thead><tbody>`;
      d.table.rows.forEach((r) => {
        s += `<tr>` + r.map((c, i) => `<td class="${i ? "num" : ""}">${esc(c)}</td>`).join("") + `</tr>`;
      });
      s += `</tbody></table></div>`;
    }
    if (d.after) s += `<div class="d-after">${esc(d.after)}</div>`;
    el("drillBody").innerHTML = s;
    el("drillLayer").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeDrill() {
    el("drillLayer").hidden = true;
    document.body.style.overflow = "";
  }

  /* ── 이벤트 ───────────────────────────── */
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".drill-t");
    if (t) { openDrill(t.dataset.drill); return; }
    const tab = e.target.closest("#causeTabs .tab-btn");
    if (tab) {
      [...tab.parentNode.children].forEach((b) => b.classList.toggle("on", b === tab));
      el("causePanel").innerHTML = causePanel(tab.dataset.k);
      return;
    }
    if (e.target.id === "drillX" || e.target.id === "drillLayer") closeDrill();
    if (e.target.id === "menuBtn") {
      el("side").classList.toggle("open");
      el("scrim").classList.toggle("show");
    }
    if (e.target.id === "scrim") {
      el("side").classList.remove("open");
      el("scrim").classList.remove("show");
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrill(); });

  route();
})();
