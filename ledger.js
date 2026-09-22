/* ============================================================
   라운지엑스 관리회계 포털 — 렌더링
   의존성 없음. data.js 의 LX 객체만 사용합니다.
   ============================================================ */
(function () {
  "use strict";

  /* ── 포맷 ─────────────────────────────── */
  const nf = new Intl.NumberFormat("ko-KR");
  const won = (n) => nf.format(Math.round(n)) + "원";
  const pct = (r, d = 1) => (r * 100).toFixed(d) + "%";
  const pp  = (r, d = 1) => (r * 100).toFixed(d) + "%p";

  function eok(n) {                       // 억 단위 읽기 쉽게
    const a = Math.abs(n);
    if (a >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억원";
    if (a >= 1e4) return Math.round(n / 1e4).toLocaleString("ko-KR") + "만원";
    return nf.format(n) + "원";
  }
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ── 상단 기준일 ──────────────────────── */
  el("asofText").textContent =
    `기준일 ${LX.meta.asOf} · 실적 ${LX.meta.periodLabel} · 출처 ${LX.meta.source}`;
  el("asofNote").textContent = LX.meta.note;
  el("footText").textContent =
    `라운지엑스 관리회계 포털 · ${LX.meta.asOf} 기준 · ${LX.meta.periodLabel}`;

  /* ── ① 회사 ───────────────────────────── */
  el("mission").textContent = LX.company.mission;
  el("vision").textContent  = LX.company.vision;
  el("lines").innerHTML = LX.company.lines.map((l) => `
    <div class="line-card">
      <h4>${esc(l.name)} <span class="badge">${esc(l.stores)}</span></h4>
      <p>${esc(l.desc)}</p>
    </div>`).join("");
  el("companyLogic").innerHTML =
    `<b>사업 간의 관계</b><p>${esc(LX.company.logic)}</p>`;

  /* ── ② KPI ────────────────────────────── */
  (function kpis() {
    const h = LX.headline;
    const rate = h.revenue.actual / h.revenue.target;
    const planRate = h.revenue.actual / h.revenue.planToDate;
    const cls = (v) => (v < 0 ? "neg" : "pos");
    const barCls = (r) => (r >= 0.9 ? "" : r >= 0.6 ? "low" : "bad");

    const cards = [
      { n: "누계 매출", v: eok(h.revenue.actual), c: "",
        s: `연간 목표 ${eok(h.revenue.target)} 대비 ${pct(rate)}`,
        bar: Math.min(rate, 1), barc: barCls(rate) },
      { n: "누계 계획 대비 달성률", v: pct(planRate), c: barCls(planRate) === "" ? "pos" : "neg",
        s: `계획 ${eok(h.revenue.planToDate)} · 실적 ${eok(h.revenue.actual)}`,
        bar: Math.min(planRate, 1), barc: barCls(planRate) },
      { n: "누계 관리 영업손익", v: eok(h.op.actual), c: cls(h.op.actual),
        s: `영업이익률 ${pct(h.opMargin.actual, 2)}` },
      { n: "누계 관리 EBITDA", v: eok(h.ebitda.actual), c: cls(h.ebitda.actual),
        s: `EBITDA율 ${pct(h.ebitdaMargin.actual, 2)} · 상각 가산 ${eok(h.depreciation)}` }
    ];

    el("kpis").innerHTML = cards.map((k) => `
      <div class="kpi">
        <div class="k-name">${esc(k.n)}</div>
        <div class="k-val ${k.c}">${esc(k.v)}</div>
        <div class="k-sub">${esc(k.s)}</div>
        ${k.bar !== undefined
          ? `<div class="bar"><i class="${k.barc}" style="width:${(k.bar * 100).toFixed(1)}%"></i></div>`
          : ""}
      </div>`).join("");
  })();

  /* ── ③ 예외보고 ───────────────────────── */
  (function exceptions() {
    const rows = LX.exceptions;
    const bad = rows.filter((r) => !r.ok);
    el("excSummary").innerHTML = `
      <span class="big">${bad.length}건</span>
      <span>이탈 / 점검 ${rows.length}건</span>
      <span style="flex:1 1 320px; color:var(--ink-2); font-size:13.5px">
        ${esc(bad.map((b) => b.name).join(" · "))}
      </span>`;

    const fmt = (v, u) => u === "pct" ? pct(v) : u === "cnt" ? nf.format(v) + "개" : won(v);

    el("excBody").innerHTML = rows.map((r) => `
      <tr class="${r.ok ? "ok-row" : ""}">
        <td>${esc(r.name)}</td>
        <td class="num ${!r.ok ? "neg" : ""}">${fmt(r.value, r.unit)}</td>
        <td class="num">${fmt(r.limit, r.unit)} ${r.dir === "up" ? "이상" : "이하"}</td>
        <td class="mid"><span class="pill ${r.ok ? "ok" : "bad"}">${r.ok ? "정상" : "★이탈"}</span></td>
        <td class="why">${esc(r.action)}</td>
      </tr>`).join("");
  })();

  /* ── ④ 착지 전망 ──────────────────────── */
  (function landing() {
    const max = Math.max(...LX.landing.map((l) => Math.abs(l.value)));
    el("landingGrid").innerHTML = LX.landing.map((l) => `
      <div class="land k-${l.kind}">
        <div class="l-name">${esc(l.label)}<span class="l-how">${esc(l.how)}</span></div>
        <div class="l-bar"><i style="width:${(Math.abs(l.value) / max * 100).toFixed(1)}%"></i></div>
        <div class="l-val">${eok(l.value)}</div>
      </div>`).join("");
  })();

  /* ── ⑤ 포트폴리오 + 도넛 ──────────────── */
  function donut(canvasId, legendId, items, valueKey, labelKey) {
    const cv = el(canvasId);
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const size = cv.width;
    cv.width = size * dpr; cv.height = size * dpr;
    cv.style.width = size + "px"; cv.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const total = items.reduce((s, i) => s + Math.abs(i[valueKey]), 0);
    const cx = size / 2, cy = size / 2, R = size / 2 - 6, r = R * 0.58;
    let a = -Math.PI / 2;

    items.forEach((it) => {
      const frac = Math.abs(it[valueKey]) / total;
      const a2 = a + frac * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a, a2);
      ctx.arc(cx, cy, r, a2, a, true);
      ctx.closePath();
      ctx.fillStyle = it.color;
      ctx.fill();
      // 조각 위 퍼센트 (5% 이상만)
      if (frac >= 0.05) {
        const mid = (a + a2) / 2, rr = (R + r) / 2;
        ctx.fillStyle = "#fff";
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((frac * 100).toFixed(1) + "%", cx + Math.cos(mid) * rr, cy + Math.sin(mid) * rr);
      }
      a = a2;
    });

    ctx.fillStyle = "#16202b";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(eok(total), cx, cy - 7);
    ctx.fillStyle = "#7b8a97";
    ctx.font = "400 11.5px system-ui, sans-serif";
    ctx.fillText("누계 합계", cx, cy + 11);

    el(legendId).innerHTML = items.map((it) => `
      <li>
        <span class="sw" style="background:${it.color}"></span>
        <span class="lg-name">${esc(it[labelKey])}</span>
        <span class="lg-pct">${pct(Math.abs(it[valueKey]) / total)}</span>
        <span class="lg-amt">${eok(it[valueKey])}</span>
      </li>`).join("");
  }

  donut("revDonut", "revLegend", LX.segments, "revenue", "name");
  donut("costDonut", "costLegend", LX.costMix, "value", "name");

  (function segTable() {
    const diag = {
      man: "유일한 흑자. 임차료 부담이 낮고 위탁수수료·렌탈료가 없습니다.",
      inv: "임차료 34.8% + 위탁수수료 18.8%로 매출의 절반 이상이 빠져나갑니다.",
      unm: "적자의 79%가 기계렌탈료. 4월에 월 675만→1,978만으로 3배 뛰었습니다.",
      gds: "수익성이 가장 좋습니다. 가맹이 열리면 공급 물량이 자동으로 늘어납니다.",
      rst: "매출총이익은 흑자인데 고정비가 커서 적자. 손익분기점까지 월 891만 부족."
    };
    el("segBody").innerHTML = LX.segments.map((s) => `
      <tr>
        <td><b>${esc(s.name)}</b></td>
        <td class="num">${won(s.revenue)}</td>
        <td class="num">${pct(s.share)}</td>
        <td class="num ${s.op < 0 ? "neg" : "pos"}">${won(s.op)}</td>
        <td class="num ${s.margin < 0 ? "neg" : "pos"}">${pct(s.margin)}</td>
        <td class="why">${esc(diag[s.key] || "")}</td>
      </tr>`).join("");
  })();

  /* ── ⑥ 간격 ───────────────────────────── */
  (function gap() {
    const g = LX.gap;
    const rate = g.actual / g.plan;
    el("gapTop").innerHTML = [
      { n: "누계 계획", v: eok(g.plan) },
      { n: "누계 실적", v: eok(g.actual) },
      { n: "달성률", v: pct(rate) },
      { n: "간격", v: eok(g.total), neg: true }
    ].map((c) => `
      <div class="kpi">
        <div class="k-name">${esc(c.n)}</div>
        <div class="k-val ${c.neg ? "neg" : ""}">${esc(c.v)}</div>
      </div>`).join("");

    const max = Math.max(...g.items.map((i) => Math.abs(i.value)));
    el("gapBars").innerHTML = g.items.map((i) => `
      <div class="gapbar">
        <div class="g-top">
          <span class="g-name">${esc(i.name)}
            <span class="pill grey">${esc(i.status)}</span>
            <span class="g-share">간격의 ${pct(i.share)}</span>
          </span>
          <span class="g-val">${eok(i.value)}</span>
        </div>
        <div class="g-track"><i style="width:${(Math.abs(i.value) / max * 100).toFixed(1)}%"></i></div>
        <div class="g-why">${esc(i.why)}</div>
      </div>`).join("");

    el("gapVerdict").innerHTML = `<b>진단</b><p>${esc(g.verdict)}</p>`;
  })();

  /* ── ⑦ 원인 분해 (탭) ─────────────────── */
  (function cause() {
    const keys = Object.keys(LX.breakdown);
    el("causeTabs").innerHTML = keys.map((k, i) =>
      `<button class="tab-btn ${i === 0 ? "on" : ""}" data-k="${k}">${esc(LX.breakdown[k].title)}</button>`
    ).join("");

    function render(k) {
      const b = LX.breakdown[k];
      const maxR = Math.max(...b.rows.map((r) => Math.abs(r.ratio)));
      let html = `<div class="cause-sum">${esc(b.summary)}</div>`;

      html += `<div class="table-scroll"><table class="tbl acct-tbl">
        <thead><tr><th>계정</th><th class="num">1~8월 누계</th><th>매출 대비</th><th>이게 무슨 뜻인가</th></tr></thead><tbody>`;
      b.rows.forEach((r) => {
        const w = (Math.abs(r.ratio) / maxR * 100).toFixed(1);
        html += `<tr class="${r.flag ? "flag" : ""} ${r.level === 0 ? "head-row" : ""}">
          <td class="${r.level === 1 ? "lv1" : ""}"><span class="nm">${esc(r.name)}</span></td>
          <td class="num ${r.neg ? "neg" : ""}">${won(r.value)}</td>
          <td class="ratio-cell">${pct(r.ratio, 2)}<div class="rbar"><i style="width:${w}%"></i></div></td>
          <td class="note">${esc(r.note || "")}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;

      if (b.bridge) {
        html += `<h3 style="margin:22px 0 4px;font-size:17px">원본 손익 → 관리 손익</h3>
          <p class="fine" style="margin-bottom:10px">원본 손익계산서에 잡힐 자리가 없어 영업손익 밖으로 빠져 있는 비용을 더 뺀 것이 관리 손익입니다.</p>
          <div class="bridge">`;
        b.bridge.forEach((x, i) => {
          if (i > 0) html += `<div class="br-op">${x.total ? "=" : "−"}</div>`;
          // 중간 항목은 "− 금액"으로 읽히므로 절대값으로 표시합니다.
          const shown = (i > 0 && !x.total) ? Math.abs(x.value) : x.value;
          html += `<div class="br-item ${x.total ? "total" : ""}">
            <div class="b-n">${esc(x.name)}</div>
            <div class="b-v">${eok(shown)}</div>
          </div>`;
        });
        html += `</div>`;
      }

      if (b.bep) {
        const p = b.bep;
        html += `<h3 style="margin:22px 0 4px;font-size:17px">월 얼마를 팔아야 본전인가</h3>
          <p class="fine" style="margin-bottom:10px">고정비는 매출이 0이어도 나가는 돈, 변동비는 팔린 만큼 따라 나가는 돈입니다.</p>
          <div class="bep">
            <div class="bep-item"><div class="n">월평균 매출</div><div class="v">${eok(p.avgRevenue)}</div></div>
            <div class="bep-item"><div class="n">월평균 고정비</div><div class="v">${eok(p.fixedCost)}</div></div>
            <div class="bep-item"><div class="n">공헌이익률</div><div class="v">${pct(p.cmRatio)}</div></div>
            <div class="bep-item hl"><div class="n">손익분기점 월매출</div><div class="v">${eok(p.breakeven)}</div></div>
            <div class="bep-item"><div class="n">현재와의 차이</div><div class="v" style="color:var(--red)">${eok(p.shortfall)}</div></div>
            <div class="bep-item"><div class="n">필요한 매출 증가율</div><div class="v">${pct(p.needGrowth)}</div></div>
            <div class="bep-item"><div class="n">또는 월 고정비 절감</div><div class="v">${eok(p.altCutFixed)}</div></div>
            <div class="bep-item"><div class="n">변동비율</div><div class="v">${pct(p.varRatio)}</div></div>
          </div>`;
      }
      el("causePanel").innerHTML = html;
    }

    el("causeTabs").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      [...el("causeTabs").children].forEach((b) => b.classList.toggle("on", b === btn));
      render(btn.dataset.k);
    });
    render(keys[0]);
  })();

  /* ── ⑧ 점포별 히트맵 ──────────────────── */
  (function stores() {
    const m = LX.storeMatrix;
    let html = `<thead><tr><th>지표</th><th class="num">6개점 전체</th><th class="num">편차</th>`;
    m.stores.forEach((s) => (html += `<th class="num">${esc(s)}</th>`));
    html += `<th>가장 높은 / 낮은 곳</th></tr></thead><tbody>`;

    html += `<tr><td><b>매출 (규모 참고)</b></td><td class="num">${won(m.revenue.reduce((a, b) => a + b, 0))}</td><td class="num">—</td>`;
    m.revenue.forEach((v) => (html += `<td class="h">${nf.format(v)}</td>`));
    html += `<td class="why">비율이 아니라 금액입니다. 아래 비율을 읽을 때 몸집을 같이 고려하십시오.</td></tr>`;

    m.metrics.forEach((mt) => {
      const mx = Math.max(...mt.values), mn = Math.min(...mt.values);
      const dev = mx - mn;
      const hiIdx = mt.values.indexOf(mx), loIdx = mt.values.indexOf(mn);
      html += `<tr class="${mt.key ? "key-row" : ""}">
        <td>${esc(mt.name)}</td>
        <td class="num">${pct(mt.all)}</td>
        <td class="num dev">${pp(dev)}</td>`;
      mt.values.forEach((v) => {
        let cls = "";
        if (dev > 0.0001) {
          const t = (v - mn) / dev;                 // 0~1
          const bad = mt.dir === "down" ? t : 1 - t; // 나쁠수록 1
          cls = bad > 0.8 ? "hot-3" : bad > 0.6 ? "hot-2" : bad > 0.45 ? "hot-1"
              : bad < 0.2 ? "cool-2" : bad < 0.35 ? "cool-1" : "";
        }
        html += `<td class="h ${cls}">${pct(v)}</td>`;
      });
      html += `<td class="why">↑ ${esc(m.stores[hiIdx])} · ↓ ${esc(m.stores[loIdx])}</td></tr>`;
    });
    html += `</tbody>`;
    el("storeTbl").innerHTML = html;
    el("storeTip").innerHTML = `<b>읽는 요령</b><p>${esc(m.readTip)}</p>`;
  })();

  /* ── ⑨ 과제 ───────────────────────────── */
  (function actions() {
    const a = LX.actions;
    const sumRevThis = a.reduce((s, x) => s + x.revThis, 0);
    const sumOpYear  = a.reduce((s, x) => s + x.opYear, 0);
    const holds = a.filter((x) => x.hold).length;

    el("actSum").innerHTML = [
      { n: "올해 실현 기대 매출 합계", v: eok(sumRevThis), s: "45_계획대실적 착지 전망 ④로 연결" },
      { n: "연환산 기대 손익 개선", v: eok(sumOpYear), s: "비용 절감 과제 합계" },
      { n: "기대효과 산정 보류", v: holds + "건", s: "계약서 확보 전까지 0으로 둡니다" }
    ].map((c) => `
      <div class="kpi"><div class="k-name">${esc(c.n)}</div>
      <div class="k-val">${esc(c.v)}</div><div class="k-sub">${esc(c.s)}</div></div>`).join("");

    el("actBody").innerHTML = a.map((x) => `
      <tr class="${x.top ? "top-row" : ""}">
        <td><b>${esc(x.id)}</b></td>
        <td>${esc(x.name)}</td>
        <td class="mid"><span class="pill grey">${esc(x.lever)}</span></td>
        <td class="num">${x.revYear ? won(x.revYear) : (x.hold ? '<span class="pill hold">보류</span>' : "—")}</td>
        <td class="num">${x.revThis ? won(x.revThis) : "—"}</td>
        <td class="num">${x.opYear ? won(x.opYear) : (x.hold ? '<span class="pill hold">보류</span>' : "—")}</td>
        <td class="why">${esc(x.basis)}</td>
      </tr>`).join("");
  })();

  /* ── ⑩ 목표 ───────────────────────────── */
  (function targets() {
    const t = LX.targets;
    el("targetRule").textContent = t.rule;
    const max = Math.max(...t.items.map((i) => i.value));
    el("tgtBars").innerHTML = t.items.map((i) => `
      <div class="tgtbar">
        <div class="t-top"><span>${esc(i.name)}</span>
          <span class="t-val">${eok(i.value)} <span style="color:var(--ink-3);font-weight:400">${pct(i.share)}</span></span></div>
        <div class="t-track"><i style="width:${(i.value / max * 100).toFixed(1)}%"></i></div>
      </div>`).join("");

    const f = t.franchise;
    el("frBox").innerHTML = [
      { n: "필요 연내 개설 수", v: f.needStores + "개" },
      { n: "월 필요 개설 수", v: f.perMonth + "개/월" },
      { n: "점당 개설매출", v: eok(f.openRevenuePerStore) },
      { n: "점당 월 반복매출", v: eok(f.monthlyRecurringPerStore) }
    ].map((c) => `
      <div class="kpi"><div class="k-name">${esc(c.n)}</div>
      <div class="k-val" style="font-size:22px">${esc(c.v)}</div></div>`).join("")
      + `<div class="callout" style="grid-column:1/-1;margin-top:4px"><b>판정</b><p>${esc(f.verdict)}</p></div>`;
  })();

  /* ── ⑪ 결정 · 신뢰도 ──────────────────── */
  el("decGrid").innerHTML = LX.decisions.map((d) => `
    <div class="dec">
      <h4>${esc(d.title)}</h4>
      <p>${esc(d.detail)}</p>
      <span class="owner">${esc(d.owner)}</span>
    </div>`).join("");

  el("confWarn").innerHTML = `<b>비교할 때 주의</b><p>${esc(LX.confidence.warning)}</p>`;
  el("confFixed").innerHTML = LX.confidence.fixed.map((s) => `<li>${esc(s)}</li>`).join("");
  el("confOpen").innerHTML  = LX.confidence.open.map((s) => `<li>${esc(s)}</li>`).join("");

  /* ── ⑫ 탭 지도 ────────────────────────── */
  el("tabBody").innerHTML = LX.tabs.map((t) => `
    <tr>
      <td><b>${esc(t.tier)}</b></td>
      <td class="mid"><span class="tabdot ${t.color}"></span></td>
      <td>${esc(t.when)}</td>
      <td class="why">${esc(t.list)}</td>
    </tr>`).join("");

  /* ── 내비 하이라이트 · 맨 위로 ─────────── */
  const navLinks = [...document.querySelectorAll("#topnav a")];
  const secs = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const btn = el("totop");

  function onScroll() {
    const y = window.scrollY + 130;
    let cur = secs[0];
    secs.forEach((s) => { if (s.offsetTop <= y) cur = s; });
    navLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur.id));
    btn.classList.toggle("show", window.scrollY > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();
