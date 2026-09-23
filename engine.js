/* 島嶼：權力之間 v1.0 — pure shared engine. Cloud authority lives in Apps Script. */
(function (root) {
  "use strict";
  const ROLES = [
    {
      id: "technocrat",
      name: "經濟部技術次長",
      short: "技術官僚",
      portrait: 0,
      tag: "政策與能源",
      desc: "一張公文可以穩住電網，也可能替財團打開後門。你掌握技術審查，卻未必掌握最後的決定。",
      power: "批示地方職掌內事項、備詢、提出預算與人事建議；非院長時不主持院會。",
      salary: 6200,
      capital: 42,
      integrity: 75,
      skill: 86,
      reputation: 48,
      party: "governing",
    },
    {
      id: "prosecutor",
      name: "廉政署駐署檢察官",
      short: "廉政檢察官",
      portrait: 1,
      tag: "證據與正義",
      desc: "他們說只是喝茶，你看到的是一整條利益鏈。證據要完整，程序要站得住，自己的底線更要。",
      power:
        "偵查評估、保全證據及追查弊案；不批行政預算、不參加黨務。參選需先辭職。",
      salary: 5800,
      capital: 22,
      integrity: 94,
      skill: 88,
      reputation: 46,
      party: "none",
    },
    {
      id: "legislator",
      name: "地方派系新科立委",
      short: "地方立委",
      portrait: 2,
      tag: "人脈與協商",
      desc: "鄉親的電話比鬧鐘早。你帶著地方的票進入國會，每一個人都記得當初替你做了什麼。",
      power: "質詢、提案、預算協商與地方服務；不能直接下令部會或干預個案偵查。",
      salary: 6800,
      capital: 68,
      integrity: 55,
      skill: 66,
      reputation: 58,
      party: "opposition",
    },
    {
      id: "chair",
      name: "第三勢力政黨主席",
      short: "政黨主席",
      portrait: 3,
      tag: "理念與選戰",
      desc: "你沒有地方山頭，只有一間租來的辦公室。把口號變成席次，是理想開始付出代價的時候。",
      power:
        "自訂黨名、黨內提名、派員參選及推動黨團協商；未任立委時不親自質詢。",
      salary: 4200,
      capital: 36,
      integrity: 82,
      skill: 73,
      reputation: 52,
      party: "third",
    },
  ];
  const COUNTIES = {"changhua-county":"彰化縣","chiayi-city":"嘉義市","chiayi-county":"嘉義縣","hualien-county":"花蓮縣","hsinchu-city":"新竹市","hsinchu-county":"新竹縣","kaohsiung-city":"高雄市","keelung-city":"基隆市","kinmen-county":"金門縣","lienchiang-county":"連江縣","miaoli-county":"苗栗縣","nantou-county":"南投縣","new-taipei-city":"新北市","penghu-county":"澎湖縣","pingtung-county":"屏東縣","taichung-city":"臺中市","tainan-city":"臺南市","taipei-city":"臺北市","taitung-county":"臺東縣","taoyuan-city":"桃園市","yilan-county":"宜蘭縣","yunlin-county":"雲林縣"};
  const ITEMS = [
    {
      id: "usb",
      rarity: "SSR",
      name: "關鍵金流錄音隨身碟",
      rate: 3,
      desc: "補強目前弊案證據 30 點，降低個人風險 8；須在晚間有未結案件時使用。",
      where: "night",
    },
    {
      id: "cards",
      rarity: "SR",
      name: "側翼圖卡部隊",
      rate: 12,
      desc: "下一次國會交鋒成功率 +18%，聲望 +3、廉潔 −4、風險 +4。",
      where: "hearing",
    },
    {
      id: "tea",
      rarity: "R",
      name: "高級茶葉禮盒",
      rate: 30,
      desc: "公開登錄為會議茶點，政治資本 +6；只在院會或國會協商使用。",
      where: "meeting",
    },
    {
      id: "ticket",
      rarity: "N",
      name: "選民陳情違停罰單",
      rate: 55,
      desc: "完成依法陳情說明，聲望 +2。沒有特權銷單，也不消耗公帑。",
      where: "any",
    },
  ];
  const CASES = [
    {
      id: "wind",
      name: "海岬風電標案",
      tag: "綠能／採購",
      office: "經濟部",
      intro:
        "海岬能源的技術評分在一夜之間提高。承辦人的備份裡，附件版本與用印時間對不上。",
      clues: ["評選版本差異", "顧問費關聯", "決標會議紀錄"],
      stages: ["消失的評選附件", "顧問公司的影子", "最後一枚官印"],
    },
    {
      id: "metro",
      name: "南灣捷運重劃案",
      tag: "土地／地方派系",
      office: "交通部",
      intro:
        "捷運路線還沒公告，沿線土地已被同一批關係人買下。地方大老說，這只是眼光好。",
      clues: ["地籍異動摘要", "路線會議時間軸", "關係人持分"],
      stages: ["提前抵達的買家", "站口旁的宴席", "公開前的最後一晚"],
    },
    {
      id: "science",
      name: "青嶺科學園區",
      tag: "徵地／產業",
      office: "國科會",
      intro:
        "產業升級計畫即將定案，居民卻收到互相矛盾的估價報告。部會都說主責不是自己。",
      clues: ["估價落差", "環評補件紀錄", "徵收審查附件"],
      stages: ["兩份價格", "被跳過的聽證", "開工典禮之前"],
    },
    {
      id: "network",
      name: "樁腳基金會帳冊",
      tag: "白手套／政治獻金",
      office: "內政部",
      intro:
        "基金會反覆支付不存在的活動費，一名帳務人員帶著筆記來找你，要求先保障家人安全。",
      clues: ["活動核銷矛盾", "關聯組織清單", "證人交叉陳述"],
      stages: ["不存在的晚會", "茶桌上的警告", "翻開最後一本帳"],
    },
  ];
  const DOCUMENTS = [
    {
      title: "海岬風場併網驗收案",
      agency: "經濟部能源署",
      text: "能源署要求加速驗收，政風附件卻標示三筆顧問契約有待釐清。秘書壓低聲音：「部長說，下班以前要有結論。」",
      approve: { budget: -55, reserve: 1.6, poll: 2, risk: 7, integrity: -5 },
    },
    {
      title: "南灣捷運配合款追加案",
      agency: "交通部",
      text: "地方政府要求中央挹注，路線旁土地交易量異常。交通部認為地政由內政部管，內政部回函卻說這是交通計畫。",
      approve: { budget: -70, poll: 3, risk: 8, integrity: -5 },
    },
    {
      title: "青嶺園區徵地補償案",
      agency: "國科會",
      text: "科技產業急需用地，居民要求公開估價。財政部提醒，追加補償將壓縮下半年的防災預算。",
      approve: { budget: -65, poll: 2, capital: 3, risk: 7, integrity: -4 },
    },
    {
      title: "離島韌性通訊採購案",
      agency: "數位發展部",
      text: "海纜異常增加，備援通訊急待部署。廠商要求限制性招標，國安單位說時間不等人，主計人員說憑證也不能等。",
      approve: { budget: -60, crisis: -5, poll: 2, risk: 5 },
    },
    {
      title: "醫院急診擴充預算案",
      agency: "衛生福利部",
      text: "醫院請求人力支援，地方代表卻各自堅持先蓋新大樓。部長附上三份不同版本的預算表。",
      approve: { budget: -45, poll: 4, risk: 2 },
    },
    {
      title: "夏季尖峰備轉調度案",
      agency: "經濟部",
      text: "連續高溫拉高用電。電力公司請求動用緊急備援；環境部要求兼顧排放，產業公會則拒絕分攤限電風險。",
      approve: { budget: -50, reserve: 2.4, poll: 2, crisis: -1 },
    },
  ];
  const PHASES = {
    morning: "晨間公文",
    cabinet: "國務行政院會",
    hearing: "立院與預算協商",
    night: "晚間政治任務",
  };
  const PARTY_NAMES = {
    governing: "民生同盟",
    opposition: "建設黨",
    third: "新序黨",
    independent: "無黨籍",
    none: "無黨籍",
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function assert(v, m) {
    if (!v) throw new Error(m);
  }
  function rand(s) {
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }
  function int(s, a, b) {
    return a + Math.floor(rand(s) * (b - a + 1));
  }
  function role(s) {
    return ROLES.find((r) => r.id === s.player.role);
  }
  function partyName(s, id) {
    return id === "third" ? s.partyName : PARTY_NAMES[id] || "無黨籍";
  }
  function log(s, text, type) {
    s.logs.unshift({ day: s.day, phase: s.phase, text, type: type || "story" });
    s.logs = s.logs.slice(0, 45);
  }
  function delta(s, e) {
    Object.keys(e || {}).forEach((k) => {
      if (k in s.nation) s.nation[k] += e[k];
      else if (k in s.player) s.player[k] += e[k];
    });
    normalize(s);
  }
  function normalize(s) {
    ["poll", "crisis"].forEach(
      (k) => (s.nation[k] = Math.round(clamp(s.nation[k], 0, 100))),
    );
    s.nation.reserve = Math.round(clamp(s.nation.reserve, 0, 25) * 10) / 10;
    ["capital", "integrity", "reputation", "risk", "skill"].forEach(
      (k) => (s.player[k] = Math.round(clamp(s.player[k], 0, 100))),
    );
    s.player.cash = Math.max(0, Math.round(s.player.cash));
    s.nation.budget = Math.round(s.nation.budget);
  }
  function office(s) {
    return s.player.office || role(s).name;
  }
  function isOfficial(s) {
    return s.player.careerLevel > 0 || /立法委員|檢察官|市長|縣長|技術參事|行政院院長|總統/.test(office(s));
  }
  function isProsecutor(s) {
    return s.player.role === "prosecutor" && /檢察官/.test(office(s));
  }
  function executive(s) {
    return ["行政院院長", "總統"].includes(office(s));
  }
  function administrator(s) {
    return executive(s) || s.player.role === "technocrat" && /技術參事|技術次長/.test(office(s)) || /市長|縣長/.test(office(s));
  }
  function currentCase(s) {
    const open = s.cases.filter((c) => !c.closed);
    return open.length ? open[(s.day - 1) % open.length] : null;
  }
  function makeCandidates(s, portfolio) {
    const family = ["林", "陳", "許", "吳", "鄭", "黃", "蔡", "賴", "方", "蘇"];
    const given = [
      "岳衡",
      "品蓉",
      "維岳",
      "映岑",
      "啟謙",
      "孟庭",
      "承禮",
      "予安",
      "景禾",
      "書涵",
    ];
    const types = [
      {
        faction: "海線地方派系",
        bio: "長年經營農漁會與地方議會，由派系大老力薦。",
        skill: [48, 72],
        loyal: [68, 92],
        risk: [45, 82],
        secret: "親屬的顧問公司曾收取標案得標商費用。",
      },
      {
        faction: "學院技術官僚",
        bio: "大學公共政策與工程研究背景，熟悉審查制度。",
        skill: [78, 95],
        loyal: [30, 60],
        risk: [8, 45],
        secret: "過去研究案曾接受利害關係企業資助，揭露程序不完整。",
      },
      {
        faction: "跨黨改革派",
        bio: "曾任地方政務幕僚，以協商能力與公開透明著稱。",
        skill: [64, 85],
        loyal: [45, 74],
        risk: [15, 58],
        secret: "幕僚曾介入政治獻金核銷，責任歸屬尚待查證。",
      },
    ];
    return types.map((t, i) => ({
      id: "npc-" + s.day + "-" + s.npcSerial++,
      name: family[int(s, 0, 9)] + given[int(s, 0, 9)],
      portfolio,
      faction: t.faction,
      bio: t.bio,
      skill: int(s, ...t.skill),
      loyalty: int(s, ...t.loyal),
      hiddenRisk: int(s, ...t.risk),
      secret: t.secret,
      vetted: false,
      portrait: i === 1 ? 0 : i === 2 ? 3 : 2,
    }));
  }
  const MISSION_TEMPLATES = [
    {title:"海岬斷電倒數", lead:"風場驗收疑點擴大。三天內完成審查、國會答詢與保全證據，否則電力調度將受衝擊。", goal:["退回公文查核", "在立法院以證據答詢成功", "晚間公開保全線索"], reward:{reserve:0.8,budget:30,reputation:5}, penalty:{reserve:-0.8,crisis:6,poll:-3}},
    {title:"地方利益鏈倒數", lead:"人事、標案與地方派系互相施壓。三天內守住審查與國會監督，避免弊案持續擴散。", goal:["要求公開審查", "在立法院以證據答詢成功", "晚間公開保全線索"], reward:{budget:45,capital:7,poll:2}, penalty:{poll:-5,risk:8,capital:-4}},
  ];
  function newMission(day) {
    return {start:day, deadline:day+2, template:Math.floor((day-1)/3)%MISSION_TEMPLATES.length, flags:[false,false,false], status:"active"};
  }
  function progressMission(s, phase, choice, hearingWin) {
    const m=s.mission;
    if (!m || m.status!=="active") return;
    if (phase==="morning" && choice==="review") m.flags[0]=true;
    if (phase==="hearing" && choice==="evidence" && hearingWin) m.flags[1]=true;
    if (phase==="night" && choice==="expose") m.flags[2]=true;
    if (m.flags.every(Boolean)) {
      m.status="won";
      const t=MISSION_TEMPLATES[m.template];
      delta(s,t.reward);
      log(s,"限時任務達成：「"+t.title+"」。國家獲得支援，地方也記住了你的選擇。","mission");
    }
  }
  function create(input, seed) {
    const r = ROLES.find((x) => x.id === input.role);
    assert(r, "請選擇起始身分");
    const name = String(input.name || "").trim();
    assert(name.length >= 1 && name.length <= 16, "角色名稱需 1–16 字");
    const age = Number(input.age || 42);
    assert(
      Number.isInteger(age) && age >= 25 && age <= 80,
      "角色年齡需為 25–80",
    );
    const countyId = String(input.countyId || "");
    assert(Object.prototype.hasOwnProperty.call(COUNTIES, countyId), "請在地圖上選擇起始縣市");
    const countyName = COUNTIES[countyId];
    const startingOffice = {
      technocrat: countyName + "政府產業發展技術參事",
      prosecutor: "派駐" + countyName + "廉政專案檢察官",
      legislator: countyName + "選區新科立法委員",
      chair: countyName + "地方黨部主席",
    }[r.id];
    const startingSalary = {technocrat:4200,prosecutor:4800,legislator:6800,chair:3200}[r.id];
    const gender = String(input.gender || "undisclosed");
    assert(["woman", "man", "nonbinary", "undisclosed"].includes(gender), "請選擇性別");
    const portraitId = Number(input.portrait);
    assert(Number.isInteger(portraitId) && portraitId >= 0 && portraitId <= 3, "請選擇頭像");
    const party = String(input.partyName || "新序黨").trim();
    assert(party.length >= 1 && party.length <= 14, "黨名需 1–14 字");
    const s = {
      schema: 1,
      version: 1,
      seed: seed >>> 0 || 1234567,
      day: 1,
      phase: "morning",
      checked: false,
      paidDay: 0,
      npcSerial: 1,
      partyName: party,
      county: { id: countyId, name: countyName, trust: 52 },
      player: {
        name,
        age,
        gender,
        portrait: portraitId,
        role: r.id,
        office: startingOffice,
        careerLevel: 0,
        party: r.party,
        cash: 18000,
        capital: r.capital,
        integrity: r.integrity,
        reputation: r.reputation,
        skill: r.skill,
        risk: 8,
        salary: startingSalary,
      },
      nation: { budget: 3200, poll: 48, crisis: 32, reserve: 8.2, frozen: 160 },
      seats: { governing: 49, opposition: 51, third: 9, independent: 4 },
      president: "沈若川",
      premier: "周明岳",
      term: 1,
      cases: CASES.map((c) => ({
        id: c.id,
        stage: 0,
        evidence: 0,
        exposure: 0,
        complicity: 0,
        closed: false,
        outcome: "",
        clues: [],
      })),
      inventory: { usb: 0, cards: 0, tea: 0, ticket: 0 },
      pity: 0,
      draws: 0,
      hearingBoost: 0,
      logs: [],
      lastResult: null,
      history: [],
      appointment: null,
      ministers: [],
      election: {
        cycle: 1,
        enrolled: false,
        method: null,
        office: "legislature",
        candidate: null,
        support: 12,
        organization: 10,
        funds: 30000,
        actions: 0,
        actionDay: 0,
        result: null,
      },
      ai: null,
      mission: newMission(1),
      ending: null,
    };
    log(s, "你接下這份職務。第一封公文已經壓在桌上，國會也排好了今天的議程。");
    return s;
  }
  function option(id, label, note, effect, chance) {
    return {
      id,
      label,
      note,
      effect: effect || {},
      chance: chance === undefined ? null : chance,
    };
  }
  function scene(s) {
    const p = s.player;
    let a = [];
    let title = "",
      body = "",
      speaker = "",
      tag = "";
    if (s.ending)
      return {
        id: "ending",
        title: s.ending.title,
        body: s.ending.text,
        tag: "本局落幕",
        options: [],
      };
    if (s.phase === "morning") {
      const d = DOCUMENTS[(s.day - 1) % DOCUMENTS.length];
      title = d.title;
      tag = s.county.name + " · " + d.agency + " · 第 " + s.day + " 日";
      speaker = "主任秘書";
      body = "來自" + s.county.name + "的府會動態牽動這份公文。" + d.text;
      if (isProsecutor(s)) {
        body += " 你收到的是廉政通報與偵查評估卷，不是行政核准公文。";
        a = [
          option(
            "review",
            "列案查核、保全附件",
            "證據完整度提高；行政機關仍自行決定執行。",
            { integrity: 3, reputation: 2, capital: -2 },
          ),
          option("refer", "補齊資料後分案", "程序穩健，承辦人需要更多時間。", {
            skill: 1,
            integrity: 2,
          }),
          option(
            "shelve",
            "依上意暫緩查核",
            "換得政治空間，但延誤與掩蓋責任會累積。",
            { capital: 7, integrity: -9, risk: 10 },
          ),
        ];
      } else if (!administrator(s)) {
        body += " 這是送到辦公室的陳情副本。你能監督與提案，不能直接核定工程。";
        a = [
          option(
            "review",
            "要求公開審查、提出質疑",
            "轉請主管機關回覆；提高監督聲量。",
            { integrity: 3, reputation: 3, capital: -2 },
          ),
          option(
            "approve",
            "支持配套、促成協商",
            "政府接受部分建議並推動計畫；承擔連帶政治責任。",
            d.approve,
          ),
          option(
            "favor",
            "替地方關係人關切進度",
            "派系記得你的人情，紀錄也會留下。",
            { capital: 9, integrity: -8, risk: 9, poll: -1 },
          ),
        ];
      } else {
        if (office(s) === "總統")
          body += " 由院長送交政策協調簡報，行政執行仍交由行政院負責。";
        a = [
          option(
            "review",
            "退回補件、啟動透明審查",
            "暫緩進度，調查費支出 8 億。",
            {
              budget: -8,
              integrity: 4,
              reputation: 2,
              capital: -3,
              reserve: d.agency.includes("經濟") ? -0.3 : 0,
            },
          ),
          option(
            "approve",
            "核定職掌事項、陳報執行",
            "政策快速推進，未釐清附件增加個人風險。",
            d.approve,
          ),
          option(
            "favor",
            "照會關係人、先行背書",
            "取得政治支持，採購與行政責任由你承擔。",
            { capital: 11, integrity: -9, risk: 11, budget: -25, poll: -1 },
          ),
        ];
      }
    } else if (s.phase === "cabinet") {
      title = "同一張桌，不同本帳";
      tag = "每週院會 · 跨部會預算";
      speaker = office(s) === "行政院院長" ? p.name : s.premier;
      body =
        "財政部長：「錢只有這些，大家不要把追加預算當提款機。」經濟部長：「沒有穩定供電，你拿什麼拚稅收？」交通部長把卷宗推回桌中央：「地方用地未交付，不是本部延宕。」" +
        (office(s) === "行政院院長"
          ? "你敲下議事槌，要求各部會報告。"
          : isProsecutor(s)
            ? "你就廉政議題列席說明，個案偵查內容不在此公開。"
            : "你以列席、黨團或政策協調身分提出立場，由院長作最後裁示。");
      const verb = office(s) === "行政院院長" ? "裁示" : "建議";
      a = [
        option(
          "energy",
          verb + "優先電網韌性",
          "支出 90 億；備轉 +2.8，財政派不滿。",
          { budget: -90, reserve: 2.8, capital: -3, poll: 2 },
        ),
        option(
          "balanced",
          verb + "拆案公開、分期撥款",
          "支出 40 億；備轉 +0.8、民調 +2、廉潔 +3。",
          { budget: -40, reserve: 0.8, poll: 2, integrity: 3 },
        ),
        option(
          "pork",
          verb + "各部會交換支持",
          "支出 110 億；派系力挺，廉政風險上升。",
          { budget: -110, capital: 10, integrity: -7, risk: 8, poll: 1 },
        ),
      ];
    } else if (s.phase === "hearing") {
      title = s.day % 2 ? "三百億的問號" : "凍結案，誰先讓步？";
      tag = s.day % 2 ? "立法院 · 專案質詢" : "立法院 · 朝野預算協商";
      speaker = "在野黨團總召 許振堯";
      body =
        "「不要再說研議！這筆錢到底誰決定的？」總召敲著報告。門外記者等著一句失言，門內有人遞來一張地方建設清單。主計長提醒：解凍不是新收入，只是解除已列預算的支用限制。";
      if (isProsecutor(s))
        body += " 你只回應制度與程序事項，不公開偵查細節，也不決定預算表決。";
      else if (p.role === "chair" && !executive(s) && office(s) !== "立法委員")
        body += " 你在黨團會議準備立場，由黨籍立委進入議場發言。";
      else if (p.role === "legislator" || office(s) === "立法委員")
        body += " 輪到你質詢與提出修正主張。";
      const coalition =
        s.seats.governing * 0.45 +
        s.seats.third * 0.16 +
        s.seats.independent * 0.08;
      const allies = s.ministers.reduce((n, m) => n + (m.loyalty - 50) / 25, 0);
      const chance = clamp(
        Math.round(
          10 +
            coalition +
            p.skill * 0.25 +
            p.reputation * 0.18 +
            s.hearingBoost +
            allies -
            s.nation.crisis * 0.12,
        ),
        15,
        95,
      );
      a = [
        option(
          "evidence",
          "以資料與程序正面交鋒",
          "成功：解凍 40 億、聲望 +5；失敗：新增凍結 25 億、民調 −3。",
          { capital: -4, integrity: 2 },
          chance,
        ),
        option(
          "bargain",
          "公開附帶決議、換取支持",
          "解凍 25 億；另支出 20 億做公開政策配套。",
          { capital: -6, budget: -20, poll: 1 },
        ),
        option(
          "deal",
          "密室交換、承諾地方利益",
          "解凍 50 億、政治資本 +6；個人風險 +12。",
          { capital: 6, integrity: -10, risk: 12, budget: -30 },
        ),
      ];
    } else {
      const c = currentCase(s);
      if (c) {
        const d = CASES.find((x) => x.id === c.id);
        title = d.stages[c.stage];
        tag = d.name + " · 線索 " + (c.stage + 1) + "/3";
        speaker = "特別助理";
        body =
          d.intro +
          " " +
          (c.stage === 0
            ? "一份未署名的資料袋，出現在你的辦公桌。"
            : c.stage === 1
              ? "同一個人第二次來電，這次的語氣已經不像拜託。"
              : "該不該把所有資料送出去？你知道，今晚的決定會讓一個人的仕途結束。");
        a = [
          option(
            "expose",
            isProsecutor(s) ? "依法偵辦、補強證據" : "保全資料、向權責機關揭弊",
            "證據 +24；廉潔 +5、聲望 +4、政治資本 −5。第三章證據滿 60 可完整揭弊。",
            { integrity: 5, reputation: 4, capital: -5, risk: -4 },
          ),
          option(
            "collude",
            "接受派系保護、壓下疑點",
            "政治資本 +13、證據 −4、風險 +16；派系保護會留下人情與責任。",
            { capital: 13, integrity: -14, risk: 16 },
          ),
          option(
            "cut",
            "切割關係、交付已有資料",
            "證據 +10、風險 −6、聲望 −2；無法抹除你已留下的涉案紀錄。",
            { capital: -3, risk: -6, reputation: -2, integrity: 1 },
          ),
        ];
      } else {
        title = "風暴之後的辦公室";
        tag = "自由夜晚";
        speaker = "主任秘書";
        body = "四本卷宗都有了結果。明天仍要上班，新的選舉週期也不會等你。";
        a = [
          option("rest", "回家休息、整理思緒", "聲望 +2、風險 −4。", {
            reputation: 2,
            risk: -4,
          }),
          option("service", "處理地方陳情", "聲望 +4，支出個人薪資 1,000。", {
            reputation: 4,
            cash: -1000,
          }),
          option("network", "公開政策座談", "政治資本 +5、能力 +1。", {
            capital: 5,
            skill: 1,
          }),
        ];
      }
    }
    const available = s.nation.budget - s.nation.frozen;
    a.forEach((o) => {
      o.blocked =
        -(o.effect.budget || 0) > available || -(o.effect.cash || 0) > p.cash;
    });
    if (a.some((o) => o.blocked))
      a.push(
        option(
          "defer",
          "暫緩支出、要求重新審議",
          "可動支預算不足；本時段不新增支出，民調 −2、資本 −2。",
          { poll: -2, capital: -2 },
        ),
      );
    return {
      id: s.day + ":" + s.phase,
      title,
      tag,
      speaker,
      body,
      options: a,
      needsCheckIn: s.phase === "morning" && !s.checked,
    };
  }
  function checkpoint(s) {
    if (s.player.risk >= 100) {
      s.ending = {
        title: "一紙起訴書",
        text: "累積的涉案紀錄突破了政治保護。你被迫離開職務，本局仕途結束。這是架空劇情結果，不等同真實司法程序。",
      };
    } else if (s.nation.budget < 0)
      s.ending = {
        title: "國庫告急，內閣總辭",
        text: "可運用的模擬政策預算耗盡。行政院無法維持承諾，政治責任席捲所有人。",
      };
    else if (s.nation.crisis >= 100)
      s.ending = {
        title: "危機全面升級",
        text: "台海情勢突破危機門檻，正常政治議程中止。你的任期在緊急局勢中落幕。",
      };
  }
  function closeCase(s, c) {
    const d = CASES.find((x) => x.id === c.id);
    c.closed = true;
    if (c.complicity >= 2) {
      c.outcome = "被派系封存";
      delta(s, { risk: 12, capital: 8, poll: -3 });
    } else if (c.evidence >= 60) {
      c.outcome = "完整揭弊";
      delta(s, { reputation: 8, poll: 4, budget: 35, risk: -5 });
      if (!s.appointment) openVacancy(s, d.office);
    } else {
      c.outcome = "部分移送，真相未明";
      delta(s, { reputation: 1, poll: 1 });
    }
    log(
      s,
      d.name +
        "結案：" +
        c.outcome +
        "。" +
        (c.complicity ? "你的涉案紀錄仍被保留。" : ""),
      "case",
    );
  }
  function openVacancy(s, portfolio) {
    s.appointment = {
      portfolio,
      reason: "首長因爭議請辭，院長要求提出替補建議。",
      candidates: makeCandidates(s, portfolio),
    };
    log(s, portfolio + "出現首長缺額。三份履歷已送到人事案卷。", "personnel");
  }
  function advance(s) {
    if (s.phase === "morning")
      s.phase = s.day % 7 === 0 ? "cabinet" : "hearing";
    else if (s.phase === "cabinet") s.phase = "hearing";
    else if (s.phase === "hearing") s.phase = "night";
    else {
      if (s.mission?.status==="active" && s.day>=s.mission.deadline) {
        const t=MISSION_TEMPLATES[s.mission.template];
        s.mission.status="lost";
        delta(s,t.penalty);
        log(s,"限時任務失敗：「"+t.title+"」。政治代價已反映在國家數值。","mission");
      }
      if (s.day % 28 === 0) resolveElection(s);
      s.day++;
      if (s.day%3===1) s.mission=newMission(s.day);
      s.phase = "morning";
      s.checked = false;
      s.hearingBoost = 0;
      const competent = s.ministers.reduce(
        (n, m) => n + (m.skill - 65) / 250,
        0,
      );
      delta(s, {
        budget: 24,
        reserve: -0.35 + competent,
        crisis: int(s, -2, 3),
        poll: s.nation.reserve < 6 ? -2 : 0,
        risk: s.player.integrity < 35 ? 3 : 0,
      });
      if (s.day === 4 && !s.appointment) openVacancy(s, "經濟部");
      if (s.day % 9 === 0 && s.ministers.length) {
        const m = s.ministers[int(s, 0, s.ministers.length - 1)];
        if (rand(s) < m.hiddenRisk / 100) {
          delta(s, { poll: -4, risk: 6, capital: -4 });
          log(s, m.name + "遭爆爭議：" + m.secret, "scandal");
          s.ministers = s.ministers.filter((x) => x.id !== m.id);
          if (!s.appointment) openVacancy(s, m.portfolio);
        }
      }
      if (s.day % 5 === 0) {
        const shock = int(s, 0, 3);
        const shocks = [
          {
            text: "強烈高溫拉高用電，備轉容量下修 0.6。",
            e: { reserve: -0.6 },
          },
          { text: "區域情勢升溫，危機值增加 4。", e: { crisis: 4 } },
          {
            text: "出口訂單回溫，政策預算增加 35 億。",
            e: { budget: 35, poll: 1 },
          },
          {
            text: "地方豪雨造成道路受損，緊急支出 30 億。",
            e: { budget: -30, poll: -1 },
          },
        ];
        delta(s, shocks[shock].e);
        log(s, shocks[shock].text, "nation");
      }
    }
    s.ai = null;
    checkpoint(s);
  }
  function checkin(s) {
    assert(s.phase === "morning" && !s.checked, "今天已簽到，不能重複領薪");
    s.checked = true;
    assert(s.paidDay !== s.day, "今日薪水已入帳");
    s.paidDay = s.day;
    s.player.cash += s.player.salary;
    log(
      s,
      "晨間簽到完成。" +
        (isOfficial(s) ? "官職" : "黨務／公共服務工作") +
        "模擬日薪 " +
        s.player.salary.toLocaleString("en-US") +
        " 元入帳。",
      "salary",
    );
    return "薪水已入帳，請批示今天的公文。";
  }
  function choose(s, id) {
    assert(!(s.phase === "morning" && !s.checked), "請先完成晨間簽到");
    const sc = scene(s);
    const o = sc.options.find((x) => x.id === id);
    assert(o, "這個選項已失效，請重新整理");
    assert(s.player.cash + (o.effect.cash || 0) >= 0, "薪資帳戶餘額不足");
    assert(!o.blocked, "可動支預算不足，請先解凍或暫緩支出");
    const before = { ...s.nation, ...s.player };
    const phaseBefore = s.phase;
    let hearingWin = false;
    delta(s, o.effect);
    if (s.phase === "morning" || s.phase === "night") {
      const trustDelta = id === "review" || id === "expose" ? 3 : id === "favor" || id === "collude" ? -6 : id === "shelve" ? -4 : 0;
      s.county.trust = clamp(s.county.trust + trustDelta, 0, 100);
    }
    let msg = "你選擇「" + o.label + "」。";
    if (s.phase === "morning" && id === "review") {
      const c = currentCase(s);
      if (c) {
        c.evidence = clamp(c.evidence + 6, 0, 100);
        msg += " 本日案卷證據 +6。";
      }
    }
    if (s.phase === "hearing" && id !== "defer") {
      if (id === "evidence") {
        const win = rand(s) * 100 < o.chance;
        if (win) {
          hearingWin = true;
          s.nation.frozen = Math.max(0, s.nation.frozen - 40);
          delta(s, { reputation: 5, poll: 2 });
          msg += "資料站得住腳，凍結款解除 40 億。";
        } else {
          s.nation.frozen = Math.min(s.nation.budget, s.nation.frozen + 25);
          delta(s, { poll: -3, reputation: -2 });
          msg += "對方抓住資料缺口，新增凍結 25 億。";
        }
      } else {
        s.nation.frozen = Math.max(
          0,
          s.nation.frozen - (id === "bargain" ? 25 : 50),
        );
        msg +=
          id === "deal"
            ? "交換暫時奏效，但承諾被記了下來。"
            : "朝野接受附帶決議。";
      }
      s.hearingBoost = 0;
    }
    if (s.phase === "night") {
      const c = currentCase(s);
      if (c) {
        c.evidence = clamp(
          c.evidence + (id === "expose" ? 24 : id === "cut" ? 10 : -4),
          0,
          100,
        );
        if (id === "collude") c.complicity++;
        if (id === "expose") {
          const d = CASES.find((x) => x.id === c.id);
          c.clues.push(d.clues[c.stage]);
          c.exposure++;
        }
        c.stage++;
        if (c.stage >= 3) closeCase(s, c);
      }
    }
    progressMission(s, phaseBefore, id, hearingWin);
    const after = { ...s.nation, ...s.player };
    const diffs = {};
    Object.keys(o.effect).forEach((k) => {
      if (after[k] !== before[k])
        diffs[k] = Math.round((after[k] - before[k]) * 10) / 10;
    });
    s.lastResult = { title: o.label, text: msg, effects: diffs };
    log(s, msg, "decision");
    checkpoint(s);
    if (!s.ending) advance(s);
    return msg;
  }
  function draw(s, count) {
    assert(count === 1 || count === 5, "只能抽一次或五次");
    assert(s.player.cash >= count * 1500, "薪資帳戶餘額不足");
    s.player.cash -= count * 1500;
    const drops = [];
    for (let i = 0; i < count; i++) {
      s.pity++;
      s.draws++;
      const r = rand(s) * 100;
      const item =
        s.pity >= 40 || r < 3
          ? ITEMS[0]
          : r < 15
            ? ITEMS[1]
            : r < 45
              ? ITEMS[2]
              : ITEMS[3];
      if (item.rarity === "SSR") s.pity = 0;
      s.inventory[item.id]++;
      drops.push(item.id);
    }
    log(
      s,
      "政治黑水抽獎 " + count + " 次，花費 " + count * 1500 + " 元。",
      "draw",
    );
    return drops;
  }
  function use(s, id) {
    const item = ITEMS.find((x) => x.id === id);
    assert(item && s.inventory[id] > 0, "沒有這個道具");
    assert(s.checked || s.phase !== "morning", "請先簽到");
    if (id === "usb") {
      const c = currentCase(s);
      assert(s.phase === "night" && c, "錄音隨身碟需在未結案件的晚間使用");
      c.evidence = clamp(c.evidence + 30, 0, 100);
      delta(s, { risk: -8 });
    }
    if (id === "cards") {
      assert(s.phase === "hearing", "圖卡部隊只能在國會時段使用");
      assert(s.hearingBoost === 0, "本次交鋒已使用圖卡部隊");
      s.hearingBoost = 18;
      delta(s, { reputation: 3, integrity: -4, risk: 4 });
    }
    if (id === "tea") {
      assert(
        ["cabinet", "hearing"].includes(s.phase),
        "茶點只能在院會或協商使用",
      );
      delta(s, { capital: 6 });
    }
    if (id === "ticket") delta(s, { reputation: 2 });
    s.inventory[id]--;
    log(s, "使用「" + item.name + "」。", "item");
    return item.desc;
  }
  function vet(s, id) {
    assert(s.appointment, "目前沒有首長缺額");
    const c = s.appointment.candidates.find((x) => x.id === id);
    assert(c && !c.vetted, "此候補不存在或已完成背景調查");
    assert(s.player.capital >= 7, "背景調查需要 7 點政治資本");
    s.player.capital -= 7;
    c.vetted = true;
    log(s, "完成對 " + c.name + " 的背景調查。", "personnel");
    return c.secret;
  }
  function appoint(s, id) {
    assert(s.appointment, "目前沒有首長缺額");
    assert(
      !isProsecutor(s),
      "檢察官只能提出廉政風險評估，不能介入人事任命；請使用「提交風險評估」。",
    );
    const c = s.appointment.candidates.find((x) => x.id === id);
    assert(c, "人選不存在");
    const accepted = executive(s) || s.player.capital >= 30 || rand(s) < 0.55;
    const selected = accepted
      ? c
      : s.appointment.candidates.slice().sort((a, b) => b.skill - a.skill)[0];
    s.ministers = s.ministers.filter((x) => x.portfolio !== selected.portfolio);
    s.ministers.push(clone(selected));
    delta(s, { capital: accepted ? 5 : -3 });
    s.appointment = null;
    const text =
      (office(s) === "行政院院長"
        ? "提請總統任命"
        : office(s) === "總統"
          ? "依院長提請任命"
          : "院長審酌建議、提請總統任命") +
      "：" +
      selected.name +
      "接掌" +
      selected.portfolio +
      "。" +
      (accepted ? "你的建議獲得採納。" : "院長改採專業評估較高的人選。");
    log(s, text, "personnel");
    return text;
  }
  function submitVetting(s) {
    assert(isProsecutor(s) && s.appointment, "只有檢察官可提交此案");
    const pool = s.appointment.candidates;
    assert(
      pool.some((c) => c.vetted),
      "請先調查至少一位人選",
    );
    const selected = pool
      .slice()
      .sort(
        (a, b) =>
          b.skill -
          (b.vetted ? b.hiddenRisk : 30) -
          (a.skill - (a.vetted ? a.hiddenRisk : 30)),
      )[0];
    s.ministers = s.ministers.filter((x) => x.portfolio !== selected.portfolio);
    s.ministers.push(clone(selected));
    s.appointment = null;
    delta(s, { integrity: 3 });
    const text = "你提交風險評估；院方自行決定任命 " + selected.name + "。";
    log(s, text, "personnel");
    return text;
  }
  function enroll(s, input) {
    const e = s.election;
    assert(
      !isProsecutor(s),
      "現職檢察官不得從事黨務；請先辭去檢察官職務再參選",
    );
    assert(!e.enrolled, "本屆已完成登記");
    assert((s.day - 1) % 28 < 21, "本屆登記已截止，請等待下一屆");
    assert(
      ["party", "independent", "nominate"].includes(input.method),
      "參選方式錯誤",
    );
    assert(["local", "legislature", "president"].includes(input.office), "職務錯誤");
    if (input.office === "president")
      assert(
        s.player.age >= 40 && s.player.reputation >= 50,
        "本作總統參選門檻：40 歲、聲望 50",
      );
    if (input.method === "nominate")
      assert(s.player.role === "chair", "僅政黨主席能派發黨內人選");
    if (input.method === "party")
      assert(s.player.capital >= 25, "黨內提名需要政治資本 25");
    const candidate =
      input.method === "nominate"
        ? String(input.candidate || "").trim()
        : s.player.name;
    assert(
      candidate.length > 0 && candidate.length <= 16,
      "候選人姓名需 1–16 字",
    );
    e.enrolled = true;
    e.office = input.office;
    e.method = input.method;
    e.candidate = candidate;
    e.support = clamp(
      Math.round(
        s.player.reputation * 0.48 +
          s.player.capital * 0.18 +
          (input.method === "party" ? 8 : 0) +
          (input.office === "local" ? (s.county.trust - 50) * 0.12 : 0),
      ),
      15,
      60,
    );
    e.organization = input.method === "independent" ? 8 : 22;
    e.result = null;
    if (input.method === "party") s.player.capital -= 12;
    log(
      s,
      (input.method === "nominate"
        ? "黨內徵召 "
        : input.method === "independent"
          ? "無黨籍登記："
          : "取得黨內提名：") +
        candidate +
        "，投入" +
        (e.office === "president" ? "總統" : e.office === "local" ? s.county.name + "首長" : "立法委員") +
        "選舉。",
      "election",
    );
    return "登記完成。每個遊戲日可做一次選戰行動。";
  }
  function campaign(s, kind) {
    const e = s.election;
    assert(e.enrolled, "請先登記參選或提名候選人");
    assert(e.actionDay !== s.day, "今日已完成一次選戰行動");
    const actions = {
      town: { cost: 3500, support: 5, organization: 2, text: "公開政見座談" },
      volunteer: { cost: 1800, support: 3, organization: 5, text: "志工組織" },
      debate: { cost: 4500, support: 8, organization: 0, text: "政策辯論" },
    };
    const a = actions[kind];
    assert(a, "不支援的選戰行動");
    assert(e.funds >= a.cost, "選舉專戶餘額不足；可由個人薪資捐入 5,000");
    e.funds -= a.cost;
    e.support = clamp(e.support + a.support + int(s, -1, 1), 0, 90);
    e.organization = clamp(e.organization + a.organization, 0, 100);
    e.actionDay = s.day;
    e.actions++;
    log(
      s,
      e.candidate + "完成" + a.text + "，選情支持度 " + e.support + "。",
      "election",
    );
    return "選戰行動完成。";
  }
  function allocate(total, weights) {
    let sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) ((weights = weights.map(() => 1)), (sum = weights.length));
    const raw = weights.map((x) => (x / sum) * total);
    const counts = raw.map(Math.floor);
    let remain = total - counts.reduce((a, b) => a + b, 0);
    const order = raw
      .map((x, i) => ({ i, r: x - counts[i] }))
      .sort((a, b) => b.r - a.r);
    for (let i = 0; i < remain; i++) counts[order[i].i]++;
    return counts;
  }
  function resolveElection(s) {
    const e = s.election;
    const support = clamp(
      e.support + (e.office === "local" ? (s.county.trust - 50) * 0.12 : 0) +
        e.organization * 0.12 +
        s.player.reputation * 0.08 -
        s.player.risk * 0.15 +
        int(s, -13, 13),
      2,
      95,
    );
    const win = e.enrolled && support >= 50;
    const candidate = e.candidate || "未登記";
    let weights = [
      Math.max(5, s.nation.poll + int(s, -8, 8)),
      Math.max(5, 100 - s.nation.poll + int(s, -8, 8)),
      Math.max(
        3,
        12 +
          (e.method === "nominate"
            ? e.support * 0.6
            : e.method !== "independent" && s.player.party === "third"
              ? e.support * 0.4
              : 0),
      ),
      7,
    ];
    const district = allocate(79, weights);
    const sum = weights.slice(0, 3).reduce((a, b) => a + b, 0);
    const pr = allocate(
      34,
      weights.slice(0, 3).map((w) => (w / sum >= 0.05 ? w : 0)),
    );
    s.seats = {
      governing: district[0] + pr[0],
      opposition: district[1] + pr[1],
      third: district[2] + pr[2],
      independent: district[3],
    };
    if (win && e.method !== "nominate") {
      if (s.premier === s.player.name) s.premier = "周明岳";
      if (e.office === "president") {
        s.player.office = "總統";
        s.player.careerLevel = 3;
        s.player.salary = 9800;
        s.president = s.player.name;
      } else if (e.office === "local") {
        s.player.office = s.county.name + (s.county.name.endsWith("市") ? "市長" : "縣長");
        s.player.careerLevel = 0;
        s.player.salary = 7000;
        s.county.trust = clamp(s.county.trust + 8, 0, 100);
      } else {
        s.player.office = "立法委員";
        s.player.careerLevel = 1;
        s.player.salary = 6800;
      }
      s.player.party =
        e.method === "independent"
          ? "independent"
          : s.player.party === "none"
            ? "third"
            : s.player.party;
      delta(s, { capital: 12, reputation: 6 });
    } else if (
      !win &&
      /立法委員|市長|縣長|總統/.test(office(s))
    ) {
      s.player.office = "公共事務工作者";
      s.player.careerLevel = 0;
      s.player.salary = 3200;
      if (s.president === s.player.name) s.president = "沈若川";
      delta(s, { capital: -10 });
    }
    if (win && e.office === "president" && e.method === "nominate")
      s.president = e.candidate;
    else if (!(win && e.office === "president" && e.method !== "nominate"))
      s.president = s.nation.poll >= 45 ? "沈若川" : "羅書寧";
    const text = e.enrolled
      ? candidate +
        "的" +
        (e.office === "president" ? "總統" : e.office === "local" ? s.county.name + "地方首長" : "立委") +
        "選舉結果：" +
        (win ? "當選" : "落選") +
        "，模擬得票率 " +
        Math.round(support) +
        "%。"
      : "你未投入本屆選舉；全國席次已改選。";
    const result = {
      day: s.day,
      text,
      win,
      vote: Math.round(support),
      seats: clone(s.seats),
    };
    s.history.unshift(result);
    s.history = s.history.slice(0, 8);
    log(s, text, "election");
    s.term++;
    s.election = {
      cycle: e.cycle + 1,
      enrolled: false,
      method: null,
      office: "legislature",
      candidate: null,
      support: 12,
      organization: 10,
      funds: 30000,
      actions: 0,
      actionDay: 0,
      result,
    };
    if (s.day >= 28) {
      s.cases.forEach((c) => {
        if (c.closed) {
          c.closed = false;
          c.stage = 0;
          c.evidence = 0;
          c.clues = [];
          c.exposure = 0;
          c.complicity = 0;
          c.outcome = "";
        }
      });
      log(
        s,
        "新任期展開，四案進入下一輪延伸調查。既有政治責任仍會影響風險。",
        "case",
      );
    }
  }
  function act(state, action) {
    const s = clone(state);
    if (!s.mission) s.mission = newMission(s.day);
    assert(!s.ending, "本局已結束，請建立新的角色");
    let result;
    switch (action.type) {
      case "checkin":
        result = checkin(s);
        break;
      case "choose":
        result = choose(s, action.choice);
        break;
      case "draw":
        result = draw(s, Number(action.count));
        break;
      case "use":
        result = use(s, action.item);
        break;
      case "vet":
        result = vet(s, action.id);
        break;
      case "appoint":
        result = appoint(s, action.id);
        break;
      case "submitVetting":
        result = submitVetting(s);
        break;
      case "enroll":
        result = enroll(s, action);
        break;
      case "campaign":
        result = campaign(s, action.kind);
        break;
      case "donate":
        assert(s.player.cash >= 5000, "薪資帳戶餘額不足");
        s.player.cash -= 5000;
        s.election.funds += 5000;
        result = "已從薪資帳戶捐入選舉專戶 5,000 元。";
        log(s, result, "election");
        break;
      case "resign":
        assert(isProsecutor(s), "此選項供檢察官轉換跑道");
        s.player.office = "公共事務工作者";
        s.player.salary = 3200;
        result = "你已辭去檢察官職務，可選擇參選。";
        log(s, result, "career");
        break;
      case "central":
        assert(s.player.careerLevel < 1 && !executive(s) && s.day >= 10 && s.player.capital >= 55 && s.player.reputation >= 52, "中央晉升需第 10 天、政治資本 55、聲望 52，且尚未升任中央");
        s.player.office = s.player.role === "technocrat" ? "經濟部技術次長" : isProsecutor(s) ? "廉政署駐署檢察官" : s.player.role === "legislator" ? "立法院委員會召集委員" : "全國政黨主席暨政策顧問";
        s.player.careerLevel = 1;
        s.player.salary = role(s).salary;
        delta(s, { capital: -10 });
        result = "來自" + s.county.name + "的工作履歷獲得中央賞識，你升任" + s.player.office + "。";
        log(s, result, "career");
        break;
      case "premier":
        assert(
          !isProsecutor(s) &&
            office(s) !== "總統" &&
            office(s) !== "行政院院長" &&
            s.player.careerLevel >= 1 &&
            s.player.capital >= 65 &&
            s.player.reputation >= 55 &&
            s.day >= 14,
          "需先晉升中央、第 14 天起、政治資本 65、聲望 55，且非現職檢察官或總統／院長",
        );
        s.player.office = "行政院院長";
        s.player.careerLevel = 2;
        s.player.salary = 8200;
        s.premier = s.player.name;
        delta(s, { capital: -15 });
        result =
          "總統 " + s.president + "正式任命你為行政院院長；往後院會由你主持。";
        log(s, result, "career");
        break;
      default:
        throw new Error("未知操作");
    }
    normalize(s);
    s.nation.frozen = clamp(s.nation.frozen, 0, Math.max(0, s.nation.budget));
    checkpoint(s);
    s.version++;
    return { state: s, result };
  }
  function publicState(state) {
    const s = clone(state);
    delete s.seed;
    delete s._receipts;
    delete s._aiDay;
    delete s._aiCount;
    function redact(c) {
      if (c.vetted) c.riskAssessment = c.hiddenRisk;
      else delete c.secret;
      delete c.hiddenRisk;
      return c;
    }
    if (s.appointment)
      s.appointment.candidates = s.appointment.candidates.map(redact);
    s.ministers = s.ministers.map(redact);
    if (!s.mission) s.mission=newMission(s.day);
    s.mission.info=clone(MISSION_TEMPLATES[s.mission.template]);
    s.scene = scene(state);
    s.role = clone(role(state));
    return s;
  }
  const api = {
    ROLES,
    COUNTIES,
    ITEMS,
    CASES,
    PHASES,
    PARTY_NAMES,
    create,
    act,
    scene,
    publicState,
    partyName,
    office,
    isProsecutor,
    administrator,
    allocate,
    makeCandidates,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RepublicEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
