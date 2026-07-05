/* Lift Faith — client-side app. No backend required; state persists in localStorage. */
(function () {
  "use strict";

  var STORAGE_KEY = "liftfaith.v1";
  var VERSES = window.LIFT_VERSES || [];

  var STRUGGLES = [
    { id: "anxiety", label: "Anxiety / Worry", ic: "😟" },
    { id: "depression", label: "Depression / Sadness", ic: "🌧️" },
    { id: "anger", label: "Anger / Bitterness", ic: "🔥" },
    { id: "addiction", label: "Addiction", ic: "⛓️" },
    { id: "relationships", label: "Relationships", ic: "💬" },
    { id: "finances", label: "Financial Stress", ic: "💵" },
    { id: "temptation", label: "Temptation", ic: "⚠️" },
    { id: "doubt", label: "Doubt / Faith Questions", ic: "❓" },
    { id: "grief", label: "Grief / Loss", ic: "🕊️" },
    { id: "loneliness", label: "Loneliness", ic: "🌙" },
    { id: "fear", label: "Fear", ic: "🌊" },
    { id: "guilt", label: "Guilt / Shame", ic: "🌑" }
  ];
  var GOALS = [
    { id: "memorize", label: "Memorize Scripture", ic: "📖" },
    { id: "pray", label: "Pray daily", ic: "🙏" },
    { id: "read", label: "Read the Bible daily", ic: "📚" },
    { id: "overcome", label: "Overcome temptation", ic: "🛡️" },
    { id: "closer", label: "Grow closer to God", ic: "✨" },
    { id: "serve", label: "Serve others", ic: "🤝" }
  ];
  var LABELS = {};
  STRUGGLES.concat(GOALS).forEach(function (x) { LABELS[x.id] = x.label; });

  /* ---------------- State ---------------- */
  function defaultState() {
    return {
      onboarded: false,
      name: "",
      struggles: [],
      goals: [],
      frequency: 3,
      journal: [],       // { id, ts, title, body }
      favorites: [],      // verse refs
      readLog: {},        // { "YYYY-MM-DD": [refs read] }
      dailyCache: null,   // { date, refs: [] }
      createdAt: Date.now()
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { return defaultState(); }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  var state = load();

  /* ---------------- Helpers ---------------- */
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function prettyDate(d) {
    d = d || new Date();
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
  // Deterministic hash so the same date yields the same daily selection.
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function verseByRef(ref) {
    for (var i = 0; i < VERSES.length; i++) if (VERSES[i].ref === ref) return VERSES[i];
    return null;
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  /* ---------------- Matching engine ----------------
   * Score each verse by how many of the user's active tags it carries.
   * Struggles weigh a bit heavier than goals. Then pick `frequency` verses
   * deterministically for the day so the feed is stable within a day but
   * rotates day to day. */
  function scoreVerse(v, tagWeights) {
    var s = 0;
    for (var i = 0; i < v.tags.length; i++) {
      if (tagWeights[v.tags[i]]) s += tagWeights[v.tags[i]];
    }
    return s;
  }
  function buildDailyVerses(dateKey) {
    var weights = {};
    state.struggles.forEach(function (t) { weights[t] = 2; });
    state.goals.forEach(function (t) { weights[t] = (weights[t] || 0) + 1; });

    var scored = VERSES.map(function (v) { return { v: v, s: scoreVerse(v, weights) }; })
      .filter(function (x) { return x.s > 0; });

    // Fallback: if the user picked nothing matchable, use encouragement staples.
    if (scored.length === 0) scored = VERSES.map(function (v) { return { v: v, s: 1 }; });

    // Rotate the candidate pool by day using a deterministic seed.
    var seed = hashStr(dateKey + "|" + state.struggles.join(",") + "|" + state.goals.join(","));
    scored.forEach(function (x, i) {
      x.rank = x.s * 1000 - ((hashStr(x.v.ref + "|" + dateKey) + seed) % 1000) / 1000;
    });
    scored.sort(function (a, b) { return b.rank - a.rank; });

    var n = Math.max(1, Math.min(state.frequency, scored.length));
    return scored.slice(0, n).map(function (x) { return x.v.ref; });
  }
  function getDaily() {
    var key = todayKey();
    if (!state.dailyCache || state.dailyCache.date !== key) {
      state.dailyCache = { date: key, refs: buildDailyVerses(key) };
      save();
    }
    return state.dailyCache.refs.map(verseByRef).filter(Boolean);
  }
  function whyMatched(v) {
    var active = state.struggles.concat(state.goals);
    var hits = v.tags.filter(function (t) { return active.indexOf(t) !== -1; }).map(function (t) { return LABELS[t]; });
    if (!hits.length) return "Daily encouragement";
    return "For your " + hits.slice(0, 2).join(" & ").toLowerCase();
  }

  /* ---------------- Streak ---------------- */
  function computeStreak() {
    var streak = 0;
    var d = new Date();
    // If nothing read today yet, the streak can still be intact from yesterday.
    if (!(state.readLog[todayKey(d)] && state.readLog[todayKey(d)].length)) {
      d.setDate(d.getDate() - 1);
    }
    while (true) {
      var k = todayKey(d);
      if (state.readLog[k] && state.readLog[k].length) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }
  function totalRead() {
    var seen = {};
    Object.keys(state.readLog).forEach(function (k) {
      state.readLog[k].forEach(function (r) { seen[k + r] = 1; });
    });
    return Object.keys(seen).length;
  }

  /* ---------------- Toast ---------------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------------- Render root ---------------- */
  var root = document.getElementById("app");
  var ui = { tab: "today", step: 0, draft: null };

  function render() {
    if (!state.onboarded) renderOnboarding();
    else renderDashboard();
  }

  /* ---------------- Onboarding ---------------- */
  function renderOnboarding() {
    if (!ui.draft) ui.draft = { name: state.name, struggles: state.struggles.slice(), goals: state.goals.slice(), frequency: state.frequency };
    var d = ui.draft;
    var steps = ["welcome", "struggles", "goals", "frequency", "name"];
    var step = ui.step;

    var html = '<div class="wrap section fade">';
    html += '<div class="steps">' + steps.map(function (_, i) {
      return '<span class="dot ' + (i === step ? "active" : (i < step ? "done" : "")) + '"></span>';
    }).join("") + '</div>';

    if (step === 0) {
      html += '<div class="hero">' +
        '<div class="mountains">⛰️</div>' +
        '<h1>Lift Faith</h1>' +
        '<p class="subtle" style="margin-top:8px">Personalized Scripture for the road you\'re walking.</p>' +
        '<div class="verse">“I will lift up my eyes to the hills—from whence comes my help? My help comes from the Lord.”<cite>Psalm 121:1–2 (NKJV)</cite></div>' +
        '</div>' +
        '<div class="card center"><p class="subtle">In under a minute we\'ll learn what you\'re carrying and what you\'re reaching for — then build you a daily verse feed that meets you there.</p>' +
        '<div class="row-actions" style="justify-content:center"><button class="btn" data-next>Begin →</button></div></div>';
    } else if (step === 1) {
      html += card(
        "What are you carrying right now?",
        "Pick anything that resonates. We\'ll speak Scripture directly to it.",
        chips(STRUGGLES, d.struggles),
        navButtons(true, d.struggles.length > 0)
      );
    } else if (step === 2) {
      html += card(
        "What are you reaching toward?",
        "Your spiritual goals shape the encouragement you receive.",
        chips(GOALS, d.goals),
        navButtons(true, d.goals.length > 0)
      );
    } else if (step === 3) {
      html += card(
        "How many verses a day?",
        "You can change this anytime.",
        '<div class="freq"><button data-freq="-1">−</button><div class="num">' + d.frequency + '</div><button data-freq="1">+</button></div>' +
        '<p class="center subtle" style="font-size:13px">Between 1 and 6 daily encouragements.</p>',
        navButtons(true, true)
      );
    } else if (step === 4) {
      html += card(
        "What should we call you?",
        "So we can greet you each day. (Optional)",
        '<div class="field"><label>Your name</label><input id="nameInput" type="text" placeholder="Friend" value="' + esc(d.name) + '" maxlength="40" /></div>',
        '<div class="row-actions"><button class="btn ghost" data-back>← Back</button><button class="btn" data-finish>Start my journey ✓</button></div>'
      );
    }
    html += '<p class="footnote">Everything stays on this device. No account needed.</p></div>';
    root.innerHTML = html;
    bindOnboarding();
  }

  function card(title, sub, bodyHtml, actionsHtml) {
    return '<h2 class="step-title">' + title + '</h2><p class="step-sub subtle">' + sub + '</p>' +
      '<div class="card">' + bodyHtml + actionsHtml + '</div>';
  }
  function chips(items, selected) {
    return '<div class="grid">' + items.map(function (it) {
      var on = selected.indexOf(it.id) !== -1;
      return '<button class="chip ' + (on ? "on" : "") + '" data-toggle="' + it.id + '">' +
        '<span class="ic">' + it.ic + '</span><span>' + it.label + '</span><span class="check">✓</span></button>';
    }).join("") + '</div>';
  }
  function navButtons(showBack, canNext) {
    return '<div class="row-actions">' +
      (showBack ? '<button class="btn ghost" data-back>← Back</button>' : '<span></span>') +
      '<button class="btn" data-next ' + (canNext ? "" : "disabled") + '>Continue →</button></div>';
  }

  function bindOnboarding() {
    var d = ui.draft;
    root.querySelectorAll("[data-toggle]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-toggle");
        var list = ui.step === 1 ? d.struggles : d.goals;
        var i = list.indexOf(id);
        if (i === -1) list.push(id); else list.splice(i, 1);
        renderOnboarding();
      });
    });
    root.querySelectorAll("[data-freq]").forEach(function (el) {
      el.addEventListener("click", function () {
        d.frequency = Math.max(1, Math.min(6, d.frequency + parseInt(el.getAttribute("data-freq"), 10)));
        renderOnboarding();
      });
    });
    var nameInput = root.querySelector("#nameInput");
    if (nameInput) nameInput.addEventListener("input", function () { d.name = nameInput.value; });

    var next = root.querySelector("[data-next]");
    if (next) next.addEventListener("click", function () { ui.step++; renderOnboarding(); });
    var back = root.querySelector("[data-back]");
    if (back) back.addEventListener("click", function () { ui.step--; renderOnboarding(); });
    var finish = root.querySelector("[data-finish]");
    if (finish) finish.addEventListener("click", function () {
      state.name = (d.name || "").trim();
      state.struggles = d.struggles;
      state.goals = d.goals;
      state.frequency = d.frequency;
      state.onboarded = true;
      state.dailyCache = null;
      ui.draft = null; ui.step = 0; ui.tab = "today";
      save();
      render();
      toast("Welcome" + (state.name ? ", " + state.name : "") + " 🕊️");
    });
  }

  /* ---------------- Dashboard ---------------- */
  function renderDashboard() {
    var html = '';
    html += '<div class="topbar"><div class="topbar-inner">' +
      '<div class="brand"><span class="mark">⛰️</span><span>Lift Faith<small>Daily Scripture</small></span></div>' +
      '<div class="greet">' + (state.name ? "Peace, " + esc(state.name) : "Peace be with you") + '</div>' +
      '</div></div>';

    html += '<div class="wrap">';
    html += '<div class="tabs">' +
      tabBtn("today", "Today") + tabBtn("favorites", "Favorites") +
      tabBtn("journal", "Journal") + tabBtn("settings", "Settings") + '</div>';

    html += '<div class="fade" id="tabbody">' + renderTab() + '</div>';
    html += '<p class="footnote">“Faith comes by hearing… the word of God.” — Romans 10:17</p>';
    html += '</div>';
    root.innerHTML = html;
    bindDashboard();
  }
  function tabBtn(id, label) {
    return '<button class="tab ' + (ui.tab === id ? "on" : "") + '" data-tab="' + id + '">' + label + '</button>';
  }
  function renderTab() {
    if (ui.tab === "today") return renderToday();
    if (ui.tab === "favorites") return renderFavorites();
    if (ui.tab === "journal") return renderJournal();
    return renderSettings();
  }

  function renderToday() {
    var daily = getDaily();
    var readToday = state.readLog[todayKey()] || [];
    var html = '';
    html += '<div class="stats">' +
      stat(computeStreak(), "Day streak") +
      stat(readToday.length + "/" + daily.length, "Read today") +
      stat(totalRead(), "Total read") + '</div>';

    html += '<div class="today-head"><h2>Today\'s encouragement</h2><span class="date">' + prettyDate() + '</span></div>';

    html += daily.map(function (v) {
      var isRead = readToday.indexOf(v.ref) !== -1;
      var isFav = state.favorites.indexOf(v.ref) !== -1;
      return '<div class="verse-card ' + (isRead ? "read" : "") + '">' +
        '<div class="text"><span class="quote">“</span>' + esc(v.text) + '”</div>' +
        '<div class="ref">— ' + esc(v.ref) + ' (NKJV)</div>' +
        '<div class="why">' + esc(whyMatched(v)) + '</div>' +
        '<div class="verse-actions">' +
          '<button class="iconbtn ' + (isRead ? "on" : "") + '" data-read="' + esc(v.ref) + '">' + (isRead ? "✓ Read" : "Mark as read") + '</button>' +
          '<button class="iconbtn ' + (isFav ? "on" : "") + '" data-fav="' + esc(v.ref) + '">' + (isFav ? "♥ Saved" : "♡ Save") + '</button>' +
          '<button class="iconbtn" data-pray="' + esc(v.ref) + '">🙏 Reflect</button>' +
        '</div></div>';
    }).join("");

    if (readToday.length >= daily.length && daily.length) {
      html += '<div class="card center" style="margin-top:6px"><p style="font-size:17px;color:var(--burgundy-deep)">All read for today. Well done. 🕊️</p><p class="subtle" style="font-size:13px">Come back tomorrow for a fresh word — your streak is growing.</p></div>';
    }
    return html;
  }
  function stat(big, lbl) { return '<div class="stat"><div class="big">' + big + '</div><div class="lbl">' + lbl + '</div></div>'; }

  function renderFavorites() {
    if (!state.favorites.length) {
      return '<div class="card empty"><div class="ic">♡</div><p>No saved verses yet.</p><p class="subtle" style="font-size:13px">Tap “Save” on any verse to keep it here.</p></div>';
    }
    return state.favorites.slice().reverse().map(function (ref) {
      var v = verseByRef(ref); if (!v) return "";
      return '<div class="verse-card">' +
        '<div class="text"><span class="quote">“</span>' + esc(v.text) + '”</div>' +
        '<div class="ref">— ' + esc(v.ref) + ' (NKJV)</div>' +
        '<div class="verse-actions">' +
          '<button class="iconbtn on" data-fav="' + esc(v.ref) + '">♥ Saved</button>' +
          '<button class="iconbtn" data-pray="' + esc(v.ref) + '">🙏 Reflect</button>' +
        '</div></div>';
    }).join("");
  }

  function renderJournal() {
    var html = '<div class="card journal-form">' +
      '<h2 style="font-size:18px;margin-bottom:12px">Prayer & reflection journal</h2>' +
      '<div class="field"><input id="jTitle" type="text" placeholder="Title (e.g. Praying for peace)" maxlength="80" /></div>' +
      '<div class="field"><textarea id="jBody" placeholder="Write your prayer, gratitude, or a reflection on today\'s verse…"></textarea></div>' +
      '<div class="row-actions" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="jSave">Save entry</button></div>' +
      '</div>';
    if (state.journal.length) {
      html += '<div style="margin-top:18px">' + state.journal.slice().reverse().map(function (e) {
        return '<div class="entry"><div class="meta"><span>' + esc(e.title || "Untitled") + '</span>' +
          '<span>' + new Date(e.ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + '</span></div>' +
          '<div class="body">' + esc(e.body) + '</div>' +
          '<div style="text-align:right;margin-top:8px"><button class="del" data-del="' + e.id + '">Delete</button></div></div>';
      }).join("") + '</div>';
    } else {
      html += '<div class="empty subtle" style="font-size:14px">Your entries will appear here.</div>';
    }
    return html;
  }

  function renderSettings() {
    var tags = function (ids) {
      if (!ids.length) return '<span class="subtle">None selected</span>';
      return ids.map(function (id) { return '<span class="tagline">' + esc(LABELS[id] || id) + '</span>'; }).join("");
    };
    var joined = new Date(state.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    return '<div class="card">' +
      '<h2 style="font-size:18px;margin-bottom:6px">Your profile</h2>' +
      '<div class="set-row"><span class="k">Name</span><span class="v">' + (state.name ? esc(state.name) : "—") + '</span></div>' +
      '<div class="set-row"><span class="k">Verses per day</span><span class="v"><button class="iconbtn" data-adj="-1">−</button> <b style="margin:0 8px">' + state.frequency + '</b> <button class="iconbtn" data-adj="1">+</button></span></div>' +
      '<div class="set-row"><span class="k">Walking with me since</span><span class="v">' + joined + '</span></div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h2 style="font-size:18px;margin-bottom:10px">Struggles I\'m carrying</h2>' + tags(state.struggles) +
      '<h2 style="font-size:18px;margin:16px 0 10px">Goals I\'m reaching for</h2>' + tags(state.goals) +
      '<div class="row-actions" style="margin-top:20px"><button class="btn ghost sm" id="editProfile">Edit struggles & goals</button><button class="btn ghost sm" id="resetAll" style="color:var(--muted)">Reset app</button></div></div>';
  }

  /* ---------------- Dashboard bindings ---------------- */
  function bindDashboard() {
    root.querySelectorAll("[data-tab]").forEach(function (el) {
      el.addEventListener("click", function () { ui.tab = el.getAttribute("data-tab"); renderDashboard(); });
    });
    root.querySelectorAll("[data-read]").forEach(function (el) {
      el.addEventListener("click", function () {
        var ref = el.getAttribute("data-read"); var k = todayKey();
        state.readLog[k] = state.readLog[k] || [];
        var i = state.readLog[k].indexOf(ref);
        if (i === -1) { state.readLog[k].push(ref); toast("Marked as read 📖"); }
        else { state.readLog[k].splice(i, 1); }
        save(); refreshBody();
      });
    });
    root.querySelectorAll("[data-fav]").forEach(function (el) {
      el.addEventListener("click", function () {
        var ref = el.getAttribute("data-fav");
        var i = state.favorites.indexOf(ref);
        if (i === -1) { state.favorites.push(ref); toast("Saved to favorites ♥"); }
        else { state.favorites.splice(i, 1); toast("Removed from favorites"); }
        save(); refreshBody();
      });
    });
    root.querySelectorAll("[data-pray]").forEach(function (el) {
      el.addEventListener("click", function () {
        var ref = el.getAttribute("data-pray"); var v = verseByRef(ref);
        ui.tab = "journal"; renderDashboard();
        var t = root.querySelector("#jTitle"), b = root.querySelector("#jBody");
        if (t) t.value = "Reflecting on " + ref;
        if (b) { b.value = "“" + (v ? v.text : "") + "”\n\nLord, "; b.focus(); }
      });
    });

    var jSave = root.querySelector("#jSave");
    if (jSave) jSave.addEventListener("click", function () {
      var t = root.querySelector("#jTitle"), b = root.querySelector("#jBody");
      if (!b.value.trim()) { toast("Write something first ✍️"); b.focus(); return; }
      state.journal.push({ id: "e" + Date.now(), ts: Date.now(), title: t.value.trim(), body: b.value.trim() });
      save(); toast("Entry saved 🙏"); refreshBody();
    });
    root.querySelectorAll("[data-del]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-del");
        state.journal = state.journal.filter(function (e) { return e.id !== id; });
        save(); refreshBody();
      });
    });

    root.querySelectorAll("[data-adj]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.frequency = Math.max(1, Math.min(6, state.frequency + parseInt(el.getAttribute("data-adj"), 10)));
        state.dailyCache = null; save(); refreshBody(); toast("Now " + state.frequency + " verse" + (state.frequency > 1 ? "s" : "") + " a day");
      });
    });
    var edit = root.querySelector("#editProfile");
    if (edit) edit.addEventListener("click", function () {
      state.onboarded = false; ui.step = 1;
      ui.draft = { name: state.name, struggles: state.struggles.slice(), goals: state.goals.slice(), frequency: state.frequency };
      state.dailyCache = null; save(); render();
    });
    var reset = root.querySelector("#resetAll");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Reset Lift Faith? This clears your profile, journal, favorites, and streak on this device.")) {
        state = defaultState(); localStorage.removeItem(STORAGE_KEY); ui = { tab: "today", step: 0, draft: null }; render();
      }
    });
  }
  function refreshBody() {
    var body = root.querySelector("#tabbody");
    if (body) { body.innerHTML = renderTab(); body.classList.remove("fade"); void body.offsetWidth; body.classList.add("fade"); bindDashboard(); }
    else renderDashboard();
  }

  render();
})();
