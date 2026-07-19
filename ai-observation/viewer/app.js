// AIE 观察 Viewer —— vanilla JS，无构建

// 数据路径（http 服务根 = target 项目根）
const DATA_BASE = "/.aie/observations/assembled";

const state = {
  index: null,
  currentConv: null,
  convCache: {},  // id -> conversation JSON
};

async function loadIndex() {
  const list = document.getElementById("conv-list");
  list.textContent = "加载中...";
  try {
    const resp = await fetch(`${DATA_BASE}/index.json?t=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.index = await resp.json();
    renderIndex();
  } catch (e) {
    list.textContent = `加载 index.json 失败：${e.message}\n先跑 python3 .aie/assemble.py`;
  }
}

function renderIndex() {
  const list = document.getElementById("conv-list");
  list.innerHTML = "";
  // 按 root 分组，root 在前，其子对话紧跟
  const roots = state.index.conversations.filter(c => !c.spawned_by_tool_call_id);
  const children = state.index.conversations.filter(c => c.spawned_by_tool_call_id);
  const childrenByRoot = {};
  for (const c of children) {
    const key = c.root_conversation_id;
    (childrenByRoot[key] ||= []).push(c);
  }

  for (const r of roots.sort((a,b) => (b.started_at || "").localeCompare(a.started_at || ""))) {
    list.appendChild(renderConvItem(r, false));
    for (const c of (childrenByRoot[r.id] || [])) {
      list.appendChild(renderConvItem(c, true));
    }
  }
}

function renderConvItem(c, isChild) {
  const div = document.createElement("div");
  div.className = "conv-item" + (isChild ? " child" : "");
  div.dataset.convId = c.id;

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = c.subagent_type ? `↳ ${c.subagent_type}` : "root";
  div.appendChild(title);

  const sub = document.createElement("div");
  sub.className = "subtitle";
  const shortId = c.id.length > 22 ? c.id.slice(0, 8) + "…" + c.id.slice(-6) : c.id;
  sub.innerHTML = `<span style="font-family:monospace">${shortId}</span><br>${c.model || ""}<br><span style="color:#999">${(c.started_at || "").slice(0,19).replace('T',' ')}</span>`;
  div.appendChild(sub);

  const counts = document.createElement("div");
  counts.className = "counts";
  counts.textContent = `${c.counts.user_inputs} inp · ${c.counts.generations} gen · ${c.counts.tool_calls} tool`;
  div.appendChild(counts);

  div.addEventListener("click", () => selectConv(c.id));
  return div;
}

async function selectConv(id) {
  document.querySelectorAll(".conv-item").forEach(el => {
    el.classList.toggle("active", el.dataset.convId === id);
  });
  const detail = document.getElementById("conv-detail");
  const hint = document.getElementById("empty-hint");
  detail.classList.remove("hidden");
  hint.classList.add("hidden");
  detail.innerHTML = "加载对话...";

  let conv = state.convCache[id];
  if (!conv) {
    try {
      const resp = await fetch(`${DATA_BASE}/${id}.json?t=${Date.now()}`);
      conv = await resp.json();
      state.convCache[id] = conv;
    } catch (e) {
      detail.textContent = `加载 ${id}.json 失败：${e.message}`;
      return;
    }
  }
  state.currentConv = conv;
  renderConv(conv);
}

function renderConv(c) {
  const detail = document.getElementById("conv-detail");
  detail.innerHTML = "";

  const h = document.createElement("h2");
  h.textContent = c.subagent_type ? `子对话：${c.subagent_type}` : "顶层对话";
  detail.appendChild(h);

  const meta = document.createElement("div");
  meta.className = "conv-meta";
  meta.innerHTML = `
    <div>id: ${c.id}</div>
    <div>model: ${c.model || "—"} | agent_type: ${c.agent_type} | subagent_type: ${c.subagent_type || "—"}</div>
    <div>started: ${c.started_at || "—"} | ended: ${c.ended_at || "—"}</div>
    ${c.spawned_by_tool_call_id ? `<div>spawned_by_tool_call: ${c.spawned_by_tool_call_id}</div>` : ""}
    <div>counts: ${c.user_inputs.length} UserInput · ${c.generations.length} Generation · ${c.tool_calls.length} ToolCall · ${c.hooks.length} conv-level hooks</div>
  `;
  detail.appendChild(meta);

  const timeline = renderTimeline(c);
  detail.appendChild(timeline);
}

function renderTimeline(c) {
  const wrap = document.createElement("div");
  wrap.className = "timeline";

  // 组建按时间的混合项
  const items = [];
  for (const ui of c.user_inputs) items.push({ kind: "UserInput", ts: ui.submitted_at, data: ui });
  for (const g of c.generations) items.push({ kind: "Generation", ts: g.started_at, data: g });
  for (const tc of c.tool_calls) items.push({ kind: "ToolCall", ts: tsFromToolCall(tc, c), data: tc });

  items.sort((a, b) => cmpTs(a.ts, b.ts));

  const uiById = Object.fromEntries(c.user_inputs.map(x => [x.id, x]));
  const tcById = Object.fromEntries(c.tool_calls.map(x => [x.id, x]));

  for (const it of items) {
    if (it.kind === "UserInput") wrap.appendChild(renderUserInput(it.data));
    else if (it.kind === "Generation") wrap.appendChild(renderGeneration(it.data, uiById, tcById));
    else if (it.kind === "ToolCall") wrap.appendChild(renderToolCall(it.data));
  }

  if (c.hooks && c.hooks.length) {
    const h = document.createElement("div");
    h.className = "item";
    h.innerHTML = `<div class="head"><span class="badge hook">Conv Hooks</span></div>`;
    const inline = document.createElement("div");
    inline.className = "hooks-inline";
    for (const hk of c.hooks) {
      const p = document.createElement("span");
      p.className = "pill";
      p.textContent = hk.name;
      inline.appendChild(p);
    }
    h.appendChild(inline);
    wrap.appendChild(h);
  }

  return wrap;
}

function tsFromToolCall(tc, c) {
  // ToolCall 没有独立 timestamp，用 requesting generation 的 started_at 作近似
  const g = c.generations.find(x => x.id === tc.requested_by_generation_id);
  return g ? g.started_at : null;
}

function cmpTs(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return String(a).localeCompare(String(b));
}

function shortTs(ts) {
  if (!ts) return "";
  const s = String(ts);
  return s.slice(0, 19).replace("T", " ");
}

function renderUserInput(ui) {
  const div = document.createElement("div");
  div.className = "item userinput";
  div.id = `ui-${ui.id}`;
  div.innerHTML = `
    <div class="head">
      <span class="badge userinput">UserInput #${ui.seq_no}</span>
      <span class="pill">${ui.kind}</span>
      <span class="time">${shortTs(ui.submitted_at)}</span>
    </div>
  `;
  for (const b of ui.content) {
    if (b.type === "text" && b.inline_text) {
      const t = document.createElement("div");
      t.className = "text-block";
      t.textContent = b.inline_text;
      div.appendChild(t);
    }
  }
  return div;
}

function renderGeneration(g, uiById, tcById) {
  const div = document.createElement("div");
  div.className = "item generation";
  div.id = `gen-${g.id}`;

  const trg = g.trigger || {};
  let trgHtml = "";
  if (trg.type === "user_input") {
    const uid = trg.payload?.user_input_id;
    const ui = uid ? uiById[uid] : null;
    trgHtml = `trigger: user_input → <a onclick="scrollToId('ui-${uid}')">${uid?.slice(0,10) || "?"}…</a>`;
  } else if (trg.type === "tool_results") {
    const ids = trg.payload?.tool_call_ids || [];
    trgHtml = `trigger: tool_results (${ids.length}) → ` + ids.map(tid =>
      `<a onclick="scrollToId('tc-${tid}')">${tid.slice(0,10)}…</a>`
    ).join(", ");
  } else if (trg.type === "initial_spawn") {
    const tid = trg.payload?.spawning_tool_call_id;
    trgHtml = `trigger: initial_spawn ← 父 ToolCall <code>${tid || "?"}</code>`;
  } else {
    trgHtml = `trigger: ${trg.type || "unknown"}`;
  }

  const tokens = g.tokens || {};
  const tokBits = Object.entries(tokens).filter(([k,v]) => v).map(([k,v]) => `${k}=${v}`).join(" · ");

  div.innerHTML = `
    <div class="head">
      <span class="badge generation">Generation #${g.seq_no}</span>
      <span class="pill">stop=${g.stop_reason || "?"}</span>
      <span class="time">${shortTs(g.started_at)}</span>
    </div>
    <div class="trigger">${trgHtml}</div>
    <div class="body"><span class="pill">tokens</span> ${tokBits || "—"}</div>
  `;

  if (g.thinking_text?.inline_text) {
    const d = document.createElement("details");
    d.innerHTML = `<summary>thinking (${g.thinking_text.length} chars)</summary><div class="text-block thinking"></div>`;
    d.querySelector(".text-block").textContent = g.thinking_text.inline_text;
    div.appendChild(d);
  }
  if (g.output_text?.inline_text) {
    const t = document.createElement("div");
    t.className = "text-block";
    t.textContent = g.output_text.inline_text;
    div.appendChild(t);
  }
  if (g.hooks?.length) {
    const inl = document.createElement("div");
    inl.className = "hooks-inline";
    inl.innerHTML = "hooks: " + g.hooks.map(h => `<span class="pill">${h.name}</span>`).join("");
    div.appendChild(inl);
  }
  return div;
}

function renderToolCall(tc) {
  const div = document.createElement("div");
  div.className = "item toolcall";
  div.id = `tc-${tc.id}`;

  const latency = tc.latency_ms != null ? `${tc.latency_ms}ms` : "—";

  div.innerHTML = `
    <div class="head">
      <span class="badge toolcall">ToolCall #${tc.seq_no}</span>
      <span class="pill">${tc.name}</span>
      <span class="pill">${latency}</span>
      <span class="time">${shortTs(tc.started_at ? new Date(tc.started_at * 1000).toISOString() : "")}</span>
    </div>
  `;

  if (tc.args?.inline_text) {
    const d = document.createElement("details");
    d.innerHTML = `<summary>args (${tc.args.length} chars)</summary><div class="text-block args"></div>`;
    d.querySelector(".text-block").textContent = tc.args.inline_text;
    div.appendChild(d);
  }
  if (tc.result) {
    const isErr = tc.result.status === "error";
    const d = document.createElement("details");
    d.innerHTML = `<summary>result${isErr ? " (error)" : ""} (${tc.result.length} chars)</summary><div class="text-block result${isErr ? " error" : ""}"></div>`;
    d.querySelector(".text-block").textContent = tc.result.inline_text || "(no inline)";
    div.appendChild(d);
  }
  if (tc.spawned_conversation_id) {
    const a = document.createElement("span");
    a.className = "spawn-link";
    a.textContent = `→ 打开子对话 ${tc.spawned_conversation_id}`;
    a.onclick = () => selectConv(tc.spawned_conversation_id);
    div.appendChild(a);
  }
  if (tc.hooks?.length) {
    const inl = document.createElement("div");
    inl.className = "hooks-inline";
    inl.innerHTML = "hooks: " + tc.hooks.map(h => `<span class="pill">${h.name}</span>`).join("");
    div.appendChild(inl);
  }
  return div;
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.outline = "2px solid #ffbe4a";
    setTimeout(() => { el.style.outline = ""; }, 1500);
  }
}

document.getElementById("refresh-btn").addEventListener("click", () => {
  state.convCache = {};
  loadIndex();
});

loadIndex();
