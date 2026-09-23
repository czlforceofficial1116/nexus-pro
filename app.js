/* Buildless GitHub Pages client. Cloud mutations are commands, never state uploads. */
"use strict";
const E = window.RepublicEngine;
const $ = (s) => document.querySelector(s);
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (x) => Number(x).toLocaleString("zh-TW");
const LABELS = {
  budget: "國庫預算",
  reserve: "備轉容量",
  poll: "民調",
  crisis: "台海危機",
  cash: "薪資帳戶",
  capital: "政治資本",
  integrity: "廉潔",
  risk: "涉案風險",
  reputation: "聲望",
  skill: "能力",
};
let storageOk = true;
function read(key, fallback) {
  try {
    const x = localStorage.getItem(key);
    return x ? JSON.parse(x) : fallback;
  } catch (_) {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    storageOk = false;
    toast("瀏覽器無法儲存資料，請先匯出存檔再離開。");
    return false;
  }
}
const settings = read("island-settings", {
  mode: "local",
  endpoint: window.REPUBLIC_CONFIG.API_URL || "",
  auth: null,
});
let raw = read("island-demo", null),
  S = null,
  tab = "office",
  selectedRole = "technocrat",
  selectedCounty = "",
  busy = false;
let pending = read("island-pending", null);
function localView() {
  try {
    return raw ? E.publicState(raw) : null;
  } catch (_) {
    toast("本機存檔格式不正確，請匯入有效備份。");
    return null;
  }
}
if (settings.mode === "local") S = localView();
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 6000);
}
function portrait(i, cls = "") {
  i =
    Number.isInteger(Number(i)) && Number(i) >= 0 && Number(i) < 4
      ? Number(i)
      : 0;
  return `<div class="portrait p${i} ${cls}" role="img" aria-label="架空角色肖像"></div>`;
}
function tag(t, cls = "") {
  return `<span class="tag ${cls}">${esc(t)}</span>`;
}
function meter(label, value, color = "") {
  return `<div class="meter"><div><span>${esc(label)}</span><b>${value}</b></div><div class="track"><span class="${color}" style="width:${Math.max(0, Math.min(100, value))}%"></span></div></div>`;
}
function modal(html) {
  $("#dialogBody").innerHTML = html;
  const d = $("#dialog");
  if (!d.open) d.showModal();
}
function closeModal() {
  $("#dialog").close();
}
function setBusy(v) {
  busy = v;
  document.body.classList.toggle("busy", v);
  document.querySelectorAll("[data-action],#startBtn").forEach((b) => {
    if (v) {
      b.dataset.preDisabled = b.disabled ? "1" : "0";
      b.disabled = true;
    } else if (b.dataset.preDisabled !== undefined) {
      b.disabled = b.dataset.preDisabled === "1";
      delete b.dataset.preDisabled;
    }
  });
}
function endpointValid(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(
    url,
  );
}
function credential() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return {
    playerId: crypto.randomUUID(),
    token: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
  };
}
function requestId() {
  return crypto.randomUUID();
}
async function post(payload) {
  if (!endpointValid(settings.endpoint))
    throw new Error("請先設定 Apps Script 的 /exec 網址。");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65000);
  try {
    const r = await fetch(settings.endpoint, {
      method: "POST",
      redirect: "follow",
      credentials: "omit",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!r.ok) throw new Error("伺服器回應 " + r.status);
    const data = await r.json();
    if (typeof data.ok !== "boolean")
      throw new Error("後端回覆格式不符，請確認部署的是這份程式碼");
    return data;
  } catch (e) {
    throw new Error(
      "連線未完成，操作可能已寫入。請使用「重試待確認操作」，不會重複扣款。請確認部署為「所有人」與 /exec 網址。",
    );
  } finally {
    clearTimeout(timer);
  }
}
async function cloud(payload, remember = true) {
  if (remember) {
    pending = { endpoint: settings.endpoint, payload };
    save("island-pending", pending);
  }
  const data = await post(payload);
  if (data.code === "BUSY") throw new Error(data.error);
  if (remember) {
    pending = null;
    save("island-pending", null);
  }
  if (data.state) S = data.state;
  if (!data.ok) throw new Error(data.error || "操作未完成");
  return data;
}
async function perform(action) {
  if (busy) return;
  setBusy(true);
  try {
    let result;
    if (settings.mode === "local") {
      const next = E.act(raw, action);
      raw = next.state;
      save("island-demo", raw);
      S = E.publicState(raw);
      result = next.result;
    } else {
      if (pending)
        throw new Error("還有一筆連線未確認，請先在「存檔與連線」重試。");
      const data = await cloud({
        op: "act",
        ...settings.auth,
        version: S.version,
        requestId: requestId(),
        action,
      });
      result = data.result;
    }
    if (action.type === "draw") drawResult(result);
    else toast(typeof result === "string" ? result : "操作完成");
    render();
  } catch (e) {
    toast(e.message);
    render();
  } finally {
    setBusy(false);
  }
}
function render() {
  $("#modeLabel").textContent =
    settings.mode === "local" ? "本機試玩 · 自動存檔" : "雲端存檔";
  $("#main").innerHTML = S ? gameView() : creationView();
  if (!storageOk)
    $("#main").insertAdjacentHTML(
      "afterbegin",
      '<div class="warning">瀏覽器儲存不可用，請在離開前匯出存檔。</div>',
    );
}
function countyMap(selected, interactive = false) {
  const data = window.TAIWAN_MAP;
  return `<div class="map-board ${interactive ? "selectable" : "overview"}"><div class="map-top"><span>島嶼地圖 <small>/ 22 縣市</small></span><span>${interactive ? "點選縣市開始" : "地方與中央同步推進"}</span></div><div class="map-layout"><svg class="county-map" viewBox="${data.viewBox}" role="img" aria-label="臺灣 22 縣市互動地圖">${data.locations.map(c => `<path class="county-path ${c.id === selected ? "selected" : ""}" d="${c.path}" data-county="${c.id}" ${interactive ? `tabindex="0" role="button" aria-label="選擇${c.name}"` : `data-county-view="${c.id}"`}><title>${c.name}</title></path>`).join("")}</svg><div class="map-overlay"><span>區域任務 / LOCAL AFFAIRS</span><strong>${esc(E.COUNTIES[selected] || "請選擇縣市")}</strong><p>${interactive ? "從這裡進入地方職位，累積聲望與政治資本，再走向中央與總統府。" : `地方信任 ${S?.county?.trust ?? 52} / 100 · 在選舉中心可競選地方首長、立委與總統。`}</p></div></div><div class="map-footer"><span>地圖：SimpleMaps / @svg-maps/taiwan</span><span>◦ &nbsp; ${interactive ? "點擊地圖或下方清單" : "地方 → 中央 → 總統"}</span></div></div>`;
}
function creationView() {
  const r = E.ROLES.find((x) => x.id === selectedRole);
  return `<section class="creation"><div class="entry-heading"><div><p class="eyebrow">ISLAND / A POLITICAL RPG</p><h1>你的位置，<br><em>決定你看見的真相。</em></h1></div><div class="entry-note"><span class="edition">第一季 · 官印與暗潮</span><p>四種職涯，同一座島。<br>選定地方起點，再走進中央與總統府。</p></div></div>
 <div class="entry-map-grid"><div class="entry-map"><div class="map-heading"><span class="eyebrow">01 / CHOOSE YOUR COUNTY</span><h2>你的政治起點，在地圖上。</h2></div>${countyMap(selectedCounty, true)}<label class="county-picker">選擇縣市（離島與小縣市可用清單）<select id="countySelect" name="countyPicker"><option value="">請選擇一個縣市</option>${Object.entries(E.COUNTIES).map(([id,n])=>`<option value="${id}" ${selectedCounty===id?"selected":""}>${n}</option>`).join("")}</select></label></div><div class="entry-roles"><span class="eyebrow">02 / CHOOSE YOUR ROLE</span><h2>選擇第一份職務</h2><div class="role-grid" role="group" aria-label="選擇起始身分">${E.ROLES.map((x, i) => `<button class="role-card ${selectedRole === x.id ? "selected" : ""}" data-role="${x.id}" aria-pressed="${selectedRole === x.id}">${portrait(i)}<div class="role-overlay"><span class="role-number">0${i + 1} / ${x.tag}</span><h2>${x.name}</h2><span class="role-select">${selectedRole === x.id ? "已選擇身分" : "選擇這個身分"} <span aria-hidden="true">↗</span></span></div></button>`).join("")}</div></div></div>
 <div class="create-panel"><div class="role-detail"><p class="eyebrow">${esc(r.short)} / 起始履歷</p><h2>${selectedCounty ? esc(E.COUNTIES[selectedCounty]) + " · " : ""}${r.name}</h2><p>${r.desc}</p><p class="muted small">${r.power}</p><div class="starting-stats"><span>政治資本 <b>${r.capital}</b></span><span>廉潔 <b>${r.integrity}</b></span><span>地方起薪 <b>$${money(({technocrat:4200,prosecutor:4800,legislator:6800,chair:3200})[r.id])}</b></span></div></div>
 <form id="createForm"><div class="form-row"><label>角色姓名<input name="name" placeholder="輸入你的角色姓名" maxlength="16" required autocomplete="off"></label><label class="age-label">年齡<input name="age" value="42" min="25" max="80" type="number" required></label></div><label>第三勢力黨名<input name="partyName" value="新序黨" maxlength="14" required></label>${settings.mode === "cloud" ? '<label>開局邀請碼<input name="invite" type="password" placeholder="向遊戲管理者取得" required autocomplete="off"></label>' : ""}<button class="primary wide" id="startBtn">建立角色，進入第一天 <span aria-hidden="true">→</span></button><span class="small muted">${settings.mode === "local" ? "本機試玩可直接開始；設定雲端連線後，可另建跨裝置角色。" : "雲端角色將保存至遊戲資料庫，請備份存檔鑰匙。"}</span></form></div>
 <p class="disclaimer">架空政治劇情，人物、政黨、金額與案件均為虛構。制度參考台灣並作遊戲化簡化；所有抽獎只使用遊戲薪資，沒有儲值、兌現或現金獎品。</p></section>`;
}
const TABS = [
  ["office", "今日議程", "01"],
  ["cases", "案件卷宗", "02"],
  ["people", "人事任命", "03"],
  ["election", "選舉中心", "04"],
  ["blackwater", "政治黑水", "05"],
  ["archive", "任期紀錄", "06"],
];
function nav() {
  return `<nav class="game-nav" aria-label="遊戲功能">${TABS.map(([id, label, n]) => `<button data-tab="${id}" class="${tab === id ? "active" : ""}" ${tab === id ? 'aria-current="page"' : ""}><span class="nav-num">${n}</span><span>${label}</span>${id === "people" && S.appointment ? '<span class="nav-count">1</span>' : ""}</button>`).join("")}</nav>`;
}
function gameView() {
  const p = S.player;
  return `<div class="game-shell"><aside class="left-panel"><div class="player-card">${portrait(S.role.portrait, "avatar")}<p class="eyebrow">第 ${S.term} 任期 / DAY ${String(S.day).padStart(2, "0")}</p><h2>${esc(p.name)}</h2><p>${esc(p.office)}</p>${tag(E.partyName(S, p.party))}</div>${nav()}<div class="sidebar-footer"><p>總統 <b>${esc(S.president)}</b></p><p>院長 <b>${esc(S.premier)}</b></p><span>獨立世界 · 每位玩家各自推演</span></div></aside>
 <div class="workspace"><div class="workspace-heading"><div><p class="eyebrow">${esc(E.PHASES[S.phase])} / ${S.phase === "morning" ? "08:30" : S.phase === "cabinet" ? "10:00" : S.phase === "hearing" ? "14:00" : "20:30"}</p><h1>${TABS.find((t) => t[0] === tab)[1]}</h1></div><div class="day-stamp"><b>${String(S.day).padStart(2, "0")}</b><span>DAY<br>距投票 ${28 - ((S.day - 1) % 28)} 天</span></div></div>
 <div class="game-map-strip">${countyMap(S.county?.id || "", false)}<div class="map-brief"><span class="eyebrow">${esc(S.county?.name || "你的選區")} · 第 ${S.day} 日</span><h2>${esc(p.office)}</h2><p>地方信任 ${S.county?.trust ?? 52} · 政治資本 ${p.capital} · ${p.careerLevel >= 3 ? "現任總統" : p.careerLevel >= 2 ? "中央行政首長" : p.careerLevel >= 1 ? "中央職位" : "地方政治起點"}</p><button data-tab="election">查看下一場選舉 →</button></div></div>${nationStats()}<div class="content-grid"><section class="primary-content" id="panel">${{ office: officeView, cases: casesView, people: peopleView, election: electionView, blackwater: blackwaterView, archive: archiveView }[tab]()}</section><aside class="right-panel">${accountView()}${parliamentView()}<div class="aside-note"><span class="eyebrow">今日提醒</span><p>${esc(S.appointment ? "人事出缺中。查核履歷後再提出任命建議。" : S.nation.reserve < 6 ? "備轉低於 6%，低電力韌性正在拖累民調。" : S.player.risk >= 65 ? "涉案風險偏高，派系的承諾不等於司法免責。" : "每天簽到領薪，再依時段處理議程。選戰與道具不會推進時鐘。")}</p></div></aside></div></div></div>`;
}
function nationStats() {
  const n = S.nation;
  return `<div class="nation-stats"><div><span>國庫預算</span><b>${money(n.budget)}<small>億</small></b><i>已凍結 ${n.frozen} 億</i></div><div><span>施政滿意度</span><b>${n.poll}<small>%</small></b><i>${n.poll >= 50 ? "支持維持過半" : "尚未過半"}</i></div><div class="${n.crisis >= 70 ? "danger" : ""}"><span>台海危機值</span><b>${n.crisis}<small>/100</small></b><i>${n.crisis >= 70 ? "高度緊張" : "情勢監測中"}</i></div><div class="${n.reserve < 6 ? "danger" : ""}"><span>電網備轉容量</span><b>${n.reserve.toFixed(1)}<small>%</small></b><i>${n.reserve < 6 ? "供電吃緊" : "持續調度"}</i></div></div>`;
}
function accountView() {
  const p = S.player;
  return `<section class="account"><div class="section-label">個人帳戶 <span>PERSONAL</span></div><span class="muted small">薪資餘額</span><div class="balance"><small>NT$</small> ${money(p.cash)}</div><p class="small muted">模擬日薪 $${money(p.salary)} · ${S.paidDay === S.day ? "今日已領取" : "待晨間簽到"}</p><hr>${meter("政治資本", p.capital)}${meter("公眾聲望", p.reputation)}${meter("廉潔", p.integrity)}${meter("涉案風險", p.risk, "red")}<div class="account-foot">能力 ${p.skill} <span>風險達 100，仕途結束</span></div></section>`;
}
function parliamentView() {
  return `<section class="parliament"><div class="section-label">國會席次 <span>113 SEATS</span></div><div class="seat-bar">${Object.entries(
    S.seats,
  )
    .map(
      ([k, v]) =>
        `<span class="party-${k}" style="width:${(v / 113) * 100}%" title="${esc(E.partyName(S, k))} ${v}席"></span>`,
    )
    .join("")}</div>${Object.entries(S.seats)
    .map(
      ([k, v]) =>
        `<div class="seat-row"><span><i class="party-${k}"></i>${esc(E.partyName(S, k))}</span><b>${v}<small> / 113</small></b></div>`,
    )
    .join("")}<p class="small muted">過半門檻 57 席 · 架空席次</p></section>`;
}
function officeView() {
  const sc = S.scene;
  const a = S.ai && S.ai.sceneId === sc.id ? S.ai : null;
  if (S.ending)
    return `<article class="scene"><p class="eyebrow">本局落幕</p><h2>${esc(S.ending.title)}</h2><p>${esc(S.ending.text)}</p><button class="primary" data-action="newGame">另建新角色</button></article>`;
  const phases =
    S.day % 7 === 0
      ? ["morning", "cabinet", "hearing", "night"]
      : ["morning", "hearing", "night"];
  return `<div class="timeline">${phases.map((p, i) => `<div class="${p === S.phase ? "current" : phases.indexOf(p) < phases.indexOf(S.phase) ? "done" : ""}"><span>0${i + 1}</span>${E.PHASES[p]}</div>`).join("")}</div>
 ${S.lastResult ? `<div class="last-decision"><b>上一項決策</b><p>${esc(S.lastResult.text)}</p></div>` : ""}
 <article class="scene"><div class="scene-top">${tag(sc.tag, "paper")}<span class="case-number">ISL / ${String(S.day).padStart(3, "0")}</span></div><h2>${esc(sc.title)}</h2><p class="speaker">${esc(sc.speaker)} <span>送交你的案卷</span></p><div class="scene-narrative">${esc(a ? a.narrative : sc.body)}</div>${a && a.dialogue ? `<div class="dialogues">${a.dialogue.map((d) => `<blockquote><b>${esc(d.speaker)}</b><p>「${esc(d.line)}」</p></blockquote>`).join("")}</div>` : ""}
 ${sc.needsCheckIn ? `<div class="checkin-box"><div><b>08:30 晨間簽到</b><p>完成簽到，領取今日薪水並開啟公文批示。</p></div><button class="primary" data-action="checkin">簽到領薪 $${money(S.player.salary)}</button></div>` : `<div class="decision-heading"><span>你的批示</span><small>選擇後將立即推進下一時段</small></div><div class="choices">${sc.options.map((o, i) => `<button data-action="choose" data-choice="${o.id}" class="choice" ${o.blocked ? "disabled" : ""}><span class="choice-letter">${String.fromCharCode(65 + i)}</span><span><b>${esc(o.label)}</b><small>${esc(o.note)}</small></span>${o.chance !== null ? `<span class="chance">${o.chance}%<small>成功率</small></span>` : '<span class="choice-arrow" aria-hidden="true">↗</span>'}</button>`).join("")}</div>`}
 <div class="scene-footer"><span>${a ? (a.fallback ? "內建主持人 · AI 暫不可用" : "AI 主持人已生成") : "內建劇情主持人"}</span><button class="text-btn" data-action="narrate">生成 AI 對話</button></div></article>
 <div class="desk-bottom"><div><span class="eyebrow">任期目標</span><p>穩住國家，決定你的底線。<br>第 28 日晚間結束後開票。</p></div><div><span class="eyebrow">權限提示</span><p>${esc(S.player.office === "行政院院長" ? "你已升任院長，可以主持院會並提請任命部會首長。" : S.role.power)}</p></div></div>`;
}
function casesView() {
  return `<div class="panel-intro"><p class="eyebrow">THE DOSSIERS</p><h2>每一份卷宗，都有人不想翻開。</h2><p>晚間自動輪替未結案件。三個章節後依證據與涉入程度結案；第 28 日改選後進入延伸調查。</p></div><div class="case-grid">${S.cases
    .map((c) => {
      const d = E.CASES.find((x) => x.id === c.id);
      return `<article class="case-card"><div class="section-label">${esc(d.tag)}<span>${c.closed ? "已結案" : "調查中"}</span></div><h3>${esc(d.name)}</h3><p>${esc(d.intro)}</p>${meter("證據完整度", c.evidence)}<div class="case-info"><span>章節 ${Math.min(3, c.stage + 1)} / 3</span><span>涉入紀錄 ${c.complicity}</span></div><p class="clues">${c.clues.length ? c.clues.map(esc).join(" · ") : "尚未取得具名線索"}</p>${c.closed ? tag(c.outcome) : tag(c.evidence >= 60 ? "已達完整揭弊門檻" : "完整揭弊需要證據 60")}</article>`;
    })
    .join("")}</div>`;
}
function peopleView() {
  const a = S.appointment;
  return `<div class="panel-intro"><p class="eyebrow">CABINET & APPOINTMENTS</p><h2>能力之外，還有誰的名字？</h2><p>${a ? esc(a.portfolio + "首長出缺。" + a.reason) : "目前沒有待補缺額。案件揭弊與部長醜聞都可能觸發新的替補名單。"} 任命前可花 7 點政治資本調查背景。</p></div>
 ${a ? `<div class="candidate-list">${a.candidates.map((c) => `<article class="candidate">${portrait(c.portrait, "candidate-avatar")}<div class="candidate-body"><div class="section-label">${esc(c.faction)}<span>${c.aiGenerated ? "AI 人物背景" : "動態候補"}</span></div><h3>${esc(c.name)}</h3><p>${esc(c.bio)}</p><div class="candidate-stats"><span>行政能力 <b>${c.skill}</b></span><span>合作度 <b>${c.loyalty}</b></span></div><p class="secret ${c.vetted ? "revealed" : ""}">${c.vetted ? "背景調查：" + esc(c.secret) + " 風險評估 " + c.riskAssessment + "/100。" : "履歷沒有寫的事：尚未調查。"}</p><div class="button-row"><button data-action="vet" data-id="${esc(c.id)}" ${c.vetted ? "disabled" : ""}>${c.vetted ? "已完成調查" : "背景調查 −7 資本"}</button>${!E.isProsecutor(S) ? `<button class="primary" data-action="appoint" data-id="${esc(c.id)}">${E.office(S) === "行政院院長" ? "提請任命" : E.office(S) === "總統" ? "依院長提請任命" : "推薦此人"}</button>` : ""}</div></div></article>`).join("")}</div>${E.isProsecutor(S) ? '<button class="primary" data-action="submitVetting">提交廉政風險評估，由院方決定人選</button>' : ""}` : ""}
 <h3 class="subheading">你參與任命的內閣成員</h3>${S.ministers.length ? S.ministers.map((c) => `<div class="minister-row"><b>${esc(c.portfolio)} · ${esc(c.name)}</b><span>${esc(c.faction)} / 能力 ${c.skill}</span></div>`).join("") : '<div class="empty">尚未參與任何人事任命。第一項人事異動會在第 4 天出現。</div>'}
 <section class="career"><h3>從${esc(S.county?.name || "地方")}走向中央</h3><p>第 10 天起、政治資本 55、聲望 52，可升任中央職位。現職檢察官將進入中央廉政體系；若已辭職則改任政策顧問。</p><button data-action="central" ${S.day < 10 || S.player.capital < 55 || S.player.reputation < 52 || (S.player.careerLevel || 0) >= 1 ? "disabled" : ""}>接受中央任命</button><h3>走向院長辦公室</h3><p>升任中央後，第 14 天起，政治資本達 65、聲望達 55，且非現職檢察官或總統，即可接受組閣邀請。</p><button data-action="premier" ${(S.player.careerLevel || 0) < 1 || S.day < 14 || S.player.capital < 65 || S.player.reputation < 55 || E.isProsecutor(S) || ["總統", "行政院院長"].includes(E.office(S)) ? "disabled" : ""}>接受組閣邀請</button></section>`;
}
function electionView() {
  const e = S.election;
  const day = ((S.day - 1) % 28) + 1;
  return `<div class="panel-intro"><p class="eyebrow">ELECTION / CYCLE ${e.cycle}</p><h2>從一張選票，到一個位置。</h2><p>每 28 天為一次選舉週期；第 1–21 天登記，第 28 日晚間後開票。可黨內提名、無黨籍參選，政黨主席也能派發人選。</p></div>
 <div class="election-clock"><div><span>距離開票</span><strong>${29 - day}</strong><span>天</span></div><div><p>本屆第 ${day} 天</p><b>${day <= 21 ? "參選登記開放中" : "登記截止，選戰持續"}</b></div></div>
 ${e.result ? `<div class="election-result"><b>上一屆開票結果</b><p>${esc(e.result.text)}</p></div>` : ""}
 ${
   E.isProsecutor(S)
     ? `<div class="empty"><h3>檢察官保持政治中立</h3><p>你需先辭去檢察官職務才能加入選戰；辭職後模擬工作日薪為 3,200，這項轉職無法撤回。</p><button data-action="resignConfirm">辭職並轉入公共事務工作</button></div>`
     : !e.enrolled
       ? `<form id="electionForm" class="form-card"><h3>登記你的下一步</h3><label>選舉職務<select name="office"><option value="local">${esc(S.county?.name || "選區")}地方首長</option><option value="legislature">立法委員</option><option value="president">總統（年齡 40、聲望 50）</option></select></label><label>參選方式<select name="method"><option value="party">爭取黨內提名（資本門檻 25，消耗 12）</option><option value="independent">無黨籍自行參選</option>${S.player.role === "chair" ? '<option value="nominate">黨主席徵召並派發候選人</option>' : ""}</select></label>${S.player.role === "chair" ? '<label>徵召人選姓名（自行參選時忽略）<input name="candidate" maxlength="16" placeholder="輸入黨內候選人姓名"></label>' : ""}<button class="primary" ${day > 21 ? "disabled" : ""}>確認登記</button></form>`
       : `<article class="campaign"><div class="section-label">${e.method === "independent" ? "無黨籍" : e.method === "nominate" ? "政黨徵召" : "黨內提名"}<span>${e.office === "president" ? "總統選戰" : e.office === "local" ? (S.county?.name || "地方") + "首長選戰" : "立委選戰"}</span></div><h3>${esc(e.candidate)}</h3>${meter("選情支持度", e.support)}${meter("地方組織", e.organization)}<div class="campaign-fund">選舉專戶 <b>$${money(e.funds)}</b><button class="text-btn" data-action="donate">由薪資捐入 5,000</button></div><p class="small muted">今日選戰行動：${e.actionDay === S.day ? "已完成" : "尚未使用"} · 每日限一次</p><div class="campaign-actions">${[
           ["town", "公開政見座談", "3,500", "支持 +5／組織 +2"],
           ["volunteer", "志工組織", "1,800", "支持 +3／組織 +5"],
           ["debate", "政策辯論", "4,500", "支持 +8"],
         ]
           .map(
             ([id, name, cost, note]) =>
               `<button data-action="campaign" data-kind="${id}" ${e.actionDay === S.day ? "disabled" : ""}><b>${name}</b><span>$${cost}</span><small>${note}</small></button>`,
           )
           .join("")}</div></article>`
 }
 <details class="rules"><summary>選制與計票規則</summary><p>本作把真實任期壓縮為 28 天，模擬 113 席（區域與原住民共 79 席、不分區 34 席）。區域席次以支持權重分配；不分區採 5% 門檻與最大餘數法，是遊戲近似，並非真實逐區選票計算。</p><p>玩家得票＝支持度＋組織×0.12＋聲望×0.08−風險×0.15＋地方首長選舉的縣市信任加成＋隨機 −13 至 +13，達 50% 當選。總統選舉使用相同的遊戲化單一門檻。黨主席派員當選不會讓主席本人自動取得公職。</p><p>選舉專戶與薪資帳戶分開。每屆開局有 30,000 模擬競選資源；沒有真實政治獻金或金錢交易。</p></details>`;
}
function blackwaterView() {
  return `<div class="blackwater-hero"><p class="eyebrow">THE BACKROOM / 官場薪水抽獎</p><h2>有些籌碼，<br>不會寫在議程裡。</h2><p>用遊戲薪水抽取諷刺道具，在關鍵時刻多一個選擇。</p><div class="draw-price"><strong>1,500</strong><span>元／次</span></div><div class="button-row"><button class="gold-button" data-action="draw" data-count="1" ${S.player.cash < 1500 ? "disabled" : ""}>抽取一次</button><button data-action="draw" data-count="5" ${S.player.cash < 7500 ? "disabled" : ""}>連抽五次 · 7,500 元</button></div><p class="pity">距離 SSR 保底還有 <b>${40 - S.pity}</b> 抽 · 抽到 SSR 後重算</p></div><div class="rates">${E.ITEMS.map((i) => `<span class="rarity-${i.rarity}"><b>${i.rarity}</b> ${i.rate}%</span>`).join("")}</div>
 <h3 class="subheading">你的政治工具箱</h3><div class="inventory">${E.ITEMS.map((i) => `<article class="item-card rarity-${i.rarity}"><div class="item-top"><span class="rarity">${i.rarity}</span><span>持有 ${S.inventory[i.id]}</span></div><h3>${i.name}</h3><p>${i.desc}</p><button data-action="use" data-item="${i.id}" ${S.inventory[i.id] === 0 ? "disabled" : ""}>使用道具</button></article>`).join("")}</div><p class="disclaimer">機率獨立抽取；第 40 抽必得 SSR。不能儲值、交易或兌現，道具僅影響本局。</p>`;
}
function archiveView() {
  return `<div class="panel-intro"><p class="eyebrow">THE PUBLIC RECORD</p><h2>你簽過的字，都留在這裡。</h2><p>保留最近 45 筆事件與 8 次選舉結果；每日現金流、關鍵選擇與人事異動都可回看。</p></div><div class="logs">${S.logs.map((l) => `<article><span>DAY ${String(l.day).padStart(2, "0")}<small>${esc(E.PHASES[l.phase])}</small></span><p>${esc(l.text)}</p></article>`).join("")}</div><details class="rules"><summary>制度、數值與架空設定</summary><p>總統任命行政院院長；行政院對立法院負責，院長主持院會。本作的「國務行政院會」是遊戲名稱，並非現實另設機關。</p><p>「經濟部技術次長」是劇情職稱，非現行編制名稱；檢察官以廉政署駐署檢察官為參考。日薪、凍結金額、民調、危機值與各黨席次全為模擬數值，沒有連接即時政治資料。</p><p>每一日為遊戲回合，不是現實日期。每位玩家擁有獨立國家進度；多位玩家使用同一後端時，各自保存自己的世界。</p></details>`;
}
function drawResult(ids) {
  modal(
    `<div class="draw-result"><p class="eyebrow">政治黑水 / 抽取結果</p><h2>新的籌碼，已放進你的口袋。</h2><div class="drops">${ids
      .map((id) => {
        const i = E.ITEMS.find((x) => x.id === id);
        return `<div class="drop rarity-${i.rarity}"><span>${i.rarity}</span><h3>${i.name}</h3><p>${i.desc}</p></div>`;
      })
      .join(
        "",
      )}</div><button class="primary wide" data-close>收進工具箱</button></div>`,
  );
}
function settingsView() {
  modal(
    `<div class="settings"><p class="eyebrow">SAVE & CONNECTION</p><h2>帶著你的任期繼續走。</h2><div class="button-row"><button data-action="switchLocal" class="${settings.mode === "local" ? "primary" : ""}">本機試玩</button><button data-action="switchCloud" class="${settings.mode === "cloud" ? "primary" : ""}">雲端角色</button></div><form id="connectionForm"><label>Apps Script 網頁應用程式網址<input name="endpoint" type="url" value="${esc(settings.endpoint)}" placeholder="https://script.google.com/macros/s/…/exec" required></label><button>儲存連線網址</button></form>${settings.mode === "cloud" ? `<hr><h3>雲端存檔鑰匙</h3><p class="small muted">鑰匙等同這份存檔的登入憑證，請私下保存。不要貼到公開 GitHub。</p>${settings.auth ? '<div class="button-row"><button data-action="exportKey">下載存檔鑰匙</button><button data-action="loadCloud">重新載入</button></div>' : ""}<form id="restoreForm"><label>在另一台裝置繼續<textarea name="key" rows="3" placeholder="貼上鑰匙檔案中的完整 JSON" required></textarea></label><button>載入雲端角色</button></form>` : '<hr><div class="button-row"><button data-action="exportLocal" ' + (!raw ? "disabled" : "") + '>匯出本機存檔</button><button data-action="importLocal">匯入本機存檔</button></div><input type="file" id="importFile" accept="application/json,.json" hidden><p class="small muted">本機與雲端是獨立角色。清除瀏覽器資料前，請先匯出本機存檔。</p>'}${pending ? '<div class="warning">有一筆待確認操作。<button data-action="retry">重試待確認操作</button></div>' : ""}<hr><button data-action="newGame">另建新角色</button></div>`,
  );
}
function download(name, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function loadCloud() {
  if (!settings.auth) {
    S = null;
    render();
    return;
  }
  const d = await cloud({ op: "load", ...settings.auth }, false);
  S = d.state;
  render();
}
async function createCharacter(form) {
  if (busy) return;
  const fd = new FormData(form);
  const character = {
    name: fd.get("name"),
    age: Number(fd.get("age")),
    partyName: fd.get("partyName"),
    role: selectedRole,
    countyId: selectedCounty,
  };
  if (!selectedCounty) return toast("請先在地圖或縣市清單選擇你的起點");
  setBusy(true);
  try {
    if (settings.mode === "local") {
      raw = E.create(character, crypto.getRandomValues(new Uint32Array(1))[0]);
      save("island-demo", raw);
      S = E.publicState(raw);
    } else {
      if (pending) throw new Error("請先重試待確認操作，避免重複建立角色");
      if (!endpointValid(settings.endpoint))
        throw new Error("請先在「存檔與連線」設定有效網址");
      settings.auth = credential();
      save("island-settings", settings);
      const d = await cloud({
        op: "create",
        ...settings.auth,
        character,
        invite: fd.get("invite"),
      });
      S = d.state;
    }
    tab = "office";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("角色已建立。第一天，請完成晨間簽到。");
  } catch (e) {
    toast(e.message);
  } finally {
    setBusy(false);
  }
}
async function otherAction(action, button) {
  if (busy) return;
  const simple = ["checkin", "submitVetting", "donate", "central", "premier", "resign"];
  if (simple.includes(action)) {
    closeModal();
    return perform({ type: action });
  }
  if (action === "choose")
    return perform({ type: "choose", choice: button.dataset.choice });
  if (action === "draw")
    return perform({ type: "draw", count: Number(button.dataset.count) });
  if (action === "use")
    return perform({ type: "use", item: button.dataset.item });
  if (["vet", "appoint"].includes(action))
    return perform({ type: action, id: button.dataset.id });
  if (action === "campaign")
    return perform({ type: action, kind: button.dataset.kind });
  if (action === "resignConfirm")
    return modal(
      '<h2>確定離開檢察官職務？</h2><p>你會轉入公共事務工作，模擬日薪調整為 3,200 元，之後可登記參選。本局不能回任檢察官。</p><button class="primary" data-action="resign">確認辭職</button>',
    );
  if (action === "exportLocal") return download("Island-local-save.json", raw);
  if (action === "exportKey")
    return download("Island-private-save-key.json", {
      app: "Island RPG",
      endpoint: settings.endpoint,
      ...settings.auth,
    });
  if (action === "importLocal") return $("#importFile").click();
  if (action === "newGame") {
    modal(
      "<h2>另建一段政治生涯</h2><p>" +
        (settings.mode === "local"
          ? "建立新角色後會覆蓋本機存檔；建議先匯出備份。"
          : "原雲端角色仍會保留；請先下載舊角色鑰匙，之後才能找回。") +
        '</p><div class="button-row"><button data-action="' +
        (settings.mode === "local" ? "exportLocal" : "exportKey") +
        '">先下載備份</button><button class="primary" data-action="confirmNew">進入角色建立</button></div>',
    );
    return;
  }
  if (action === "confirmNew") {
    if (pending) return toast("請先確認待處理的雲端操作");
    S = null;
    settings.auth = null;
    save("island-settings", settings);
    closeModal();
    render();
    return;
  }
  if (action === "switchLocal" || action === "switchCloud") {
    if (pending) return toast("請先重試待確認操作，再切換模式");
    settings.mode = action === "switchLocal" ? "local" : "cloud";
    save("island-settings", settings);
    closeModal();
    S = settings.mode === "local" ? localView() : null;
    render();
    if (settings.mode === "local") return;
  }
  setBusy(true);
  try {
    if (action === "switchCloud" || action === "loadCloud") {
      await loadCloud();
      closeModal();
      toast("雲端模式已就緒。");
    }
    if (action === "retry") {
      if (!pending) throw new Error("沒有待確認的操作");
      if (pending.endpoint !== settings.endpoint)
        throw new Error("待確認操作屬於另一個連線網址，請先切回原網址");
      const d = await cloud(pending.payload);
      if (Array.isArray(d.result)) drawResult(d.result);
      else closeModal();
      render();
      toast("操作已確認，進度已同步。");
    }
    if (action === "narrate") {
      if (settings.mode === "local")
        throw new Error(
          "AI 對話需要雲端模式與管理者設定 API 金鑰；目前可繼續使用完整內建劇情。",
        );
      if (pending) throw new Error("請先確認待處理操作");
      const d = await cloud({
        op: "narrate",
        ...settings.auth,
        version: S.version,
        requestId: requestId(),
      });
      render();
      toast(d.result);
    }
  } catch (e) {
    toast(e.message);
    render();
  } finally {
    setBusy(false);
  }
}
document.addEventListener("click", (e) => {
  const county = e.target.closest("[data-county]");
  if (county && !S) {
    selectedCounty = county.dataset.county;
    const form = $("#createForm");
    const remembered = form ? Object.fromEntries(new FormData(form)) : {};
    render();
    Object.entries(remembered).forEach(([k,v]) => { const el = $("#createForm").elements[k]; if(el) el.value = v; });
    return;
  }
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.close !== undefined) {
    closeModal();
    return;
  }
  if (b.dataset.role) {
    const f = $("#createForm");
    const remembered = f ? Object.fromEntries(new FormData(f)) : {};
    selectedRole = b.dataset.role;
    render();
    Object.entries(remembered).forEach(([k, v]) => {
      const el = $("#createForm").elements[k];
      if (el) el.value = v;
    });
    return;
  }
  if (b.dataset.tab) {
    tab = b.dataset.tab;
    render();
    return;
  }
  if (b.dataset.action) otherAction(b.dataset.action, b);
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  const form = e.target;
  const fd = new FormData(form);
  if (form.id === "createForm") return createCharacter(form);
  if (form.id === "electionForm")
    return perform({
      type: "enroll",
      office: fd.get("office"),
      method: fd.get("method"),
      candidate: fd.get("candidate"),
    });
  if (form.id === "connectionForm") {
    const endpoint = String(fd.get("endpoint")).trim();
    if (!endpointValid(endpoint))
      return toast("需使用 https://script.google.com/macros/s/…/exec 格式");
    if (pending) return toast("請先重試待確認操作，再修改網址");
    if (settings.endpoint !== endpoint) {
      settings.auth = null;
      if (settings.mode === "cloud") S = null;
    }
    settings.endpoint = endpoint;
    save("island-settings", settings);
    closeModal();
    render();
    toast("連線網址已儲存，可切換雲端角色。");
  }
  if (form.id === "restoreForm") {
    setBusy(true);
    const old = { ...settings };
    try {
      if (pending) throw new Error("請先確認待處理操作");
      const key = JSON.parse(fd.get("key"));
      if (
        !endpointValid(key.endpoint) ||
        !/^[a-f0-9-]{36}$/.test(key.playerId) ||
        !/^[a-f0-9]{64}$/.test(key.token)
      )
        throw new Error("鑰匙格式不正確");
      settings.endpoint = key.endpoint;
      settings.auth = { playerId: key.playerId, token: key.token };
      settings.mode = "cloud";
      await loadCloud();
      save("island-settings", settings);
      closeModal();
      toast("已載入你的雲端角色。");
    } catch (err) {
      Object.assign(settings, old);
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "countySelect") {
    const form = $("#createForm");
    const remembered = form ? Object.fromEntries(new FormData(form)) : {};
    selectedCounty = e.target.value; render();
    Object.entries(remembered).forEach(([k,v]) => { const el = $("#createForm").elements[k]; if(el) el.value = v; });
    return;
  }
  if (e.target.id !== "importFile") return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 200000) throw new Error("存檔檔案過大");
    const imported = JSON.parse(await file.text());
    if (
      imported.schema !== 1 ||
      !Number.isInteger(imported.seed) ||
      !E.ROLES.some((r) => r.id === imported.player?.role) ||
      !Array.isArray(imported.cases) ||
      !Array.isArray(imported.logs) ||
      !imported.nation ||
      !imported.inventory
    )
      throw new Error("不是有效的本機存檔");
    const v = E.publicState(imported);
    if (!v.scene || !Number.isFinite(v.player.cash))
      throw new Error("存檔不完整");
    raw = imported;
    S = v;
    save("island-demo", raw);
    closeModal();
    render();
    toast("本機存檔已匯入。");
  } catch (err) {
    toast("無法匯入：" + err.message);
  }
});
$("#settingsBtn").addEventListener("click", settingsView);
$("#closeDialog").addEventListener("click", closeModal);
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
render();
if (settings.mode === "cloud" && settings.auth) {
  setBusy(true);
  loadCloud()
    .catch((e) => toast(e.message))
    .finally(() => setBusy(false));
}

document.addEventListener("keydown", e => { const c=e.target.closest?.(".selectable [data-county]"); if(c && (e.key==="Enter" || e.key===" ")) {e.preventDefault(); c.dispatchEvent(new MouseEvent("click",{bubbles:true}));} });
