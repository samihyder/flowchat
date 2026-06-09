(function () {
  'use strict';

  const cfg = window.flowchat || {};
  const inboxId = cfg.inboxId;
  const apiUrl = (cfg.apiUrl || 'http://localhost:3001').replace(/\/$/, '');
  const wsUrl = cfg.wsUrl || 'ws://localhost:3002';

  if (!inboxId) {
    console.error('[FlowChat] window.flowchat.inboxId is required');
    return;
  }

  const STORAGE_KEY = `fc_source_${inboxId}`;
  let sourceId = localStorage.getItem(STORAGE_KEY);
  if (!sourceId) {
    sourceId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY, sourceId);
  }

  let state = {
    open: false,
    conversationId: null,
    visitorToken: null,
    contactName: null,
    messages: [],
    inbox: null,
    ws: null,
    prechatDone: false,
  };

  const root = document.createElement('div');
  root.id = 'flowchat-widget-root';
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    #flowchat-widget-root { font-family: system-ui, -apple-system, sans-serif; z-index: 999999; }
    #fc-launcher { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,.18); color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: transform .2s; }
    #fc-launcher:hover { transform: scale(1.05); }
    #fc-panel { position: fixed; bottom: 96px; right: 24px; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,.16); display: none; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; }
    #fc-panel.open { display: flex; animation: fcSlide .25s ease; }
    @keyframes fcSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    #fc-header { padding: 16px 18px; color: #fff; }
    #fc-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    #fc-header p { margin: 4px 0 0; font-size: 12px; opacity: .9; }
    #fc-messages { flex: 1; overflow-y: auto; padding: 14px; background: #f9fafb; display: flex; flex-direction: column; gap: 8px; }
    .fc-msg { max-width: 85%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.45; word-break: break-word; }
    .fc-msg.in { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; color: #111827; border-bottom-left-radius: 4px; }
    .fc-msg.out { align-self: flex-end; color: #fff; border-bottom-right-radius: 4px; }
    .fc-msg.sys { align-self: center; background: transparent; color: #6b7280; font-size: 12px; padding: 4px; }
    #fc-prechat, #fc-composer { padding: 14px; border-top: 1px solid #e5e7eb; background: #fff; }
    #fc-prechat input { width: 100%; box-sizing: border-box; margin-bottom: 8px; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    #fc-prechat button, #fc-composer button { width: 100%; padding: 10px; border: none; border-radius: 8px; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }
    #fc-composer { display: flex; gap: 8px; }
    #fc-composer input { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    #fc-composer button { width: auto; padding: 10px 16px; }
  `;
  document.head.appendChild(style);

  function color() {
    return state.inbox?.widgetColor || '#6366F1';
  }

  function render() {
    const c = color();
    root.innerHTML = `
      <button id="fc-launcher" style="background:${c}" aria-label="Open chat">💬</button>
      <div id="fc-panel" class="${state.open ? 'open' : ''}">
        <div id="fc-header" style="background:${c}">
          <h3>${escapeHtml(state.inbox?.welcomeTitle || state.inbox?.name || 'Chat with us')}</h3>
          <p>${escapeHtml(state.inbox?.welcomeTagline || 'We reply quickly')}</p>
        </div>
        <div id="fc-messages">${renderMessages()}</div>
        ${!state.prechatDone ? renderPrechat(c) : renderComposer(c)}
      </div>
    `;

    document.getElementById('fc-launcher')?.addEventListener('click', toggle);
    document.getElementById('fc-start')?.addEventListener('click', startChat);
    document.getElementById('fc-send')?.addEventListener('click', sendMessage);
    document.getElementById('fc-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    scrollMessages();
  }

  function renderPrechat(c) {
    return `<div id="fc-prechat">
      <input id="fc-name" placeholder="Your name" required />
      <input id="fc-email" type="email" placeholder="Email (optional)" />
      <button id="fc-start" style="background:${c}">Start chat</button>
    </div>`;
  }

  function renderComposer(c) {
    return `<div id="fc-composer">
      <input id="fc-input" placeholder="Type a message…" />
      <button id="fc-send" style="background:${c}">Send</button>
    </div>`;
  }

  function renderMessages() {
    if (!state.messages.length && state.prechatDone) {
      return `<div class="fc-msg sys">${escapeHtml(state.inbox?.greetingMessage || 'How can we help?')}</div>`;
    }
    return state.messages
      .map((m) => {
        const cls = m.senderType === 'contact' ? 'out' : m.senderType === 'agent' ? 'in' : 'sys';
        return `<div class="fc-msg ${cls}" ${cls === 'out' ? `style="background:${color()}"` : ''}>${escapeHtml(m.content)}</div>`;
      })
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scrollMessages() {
    const el = document.getElementById('fc-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function toggle() {
    state.open = !state.open;
    render();
    if (state.open && !state.inbox) loadConfig();
  }

  async function loadConfig() {
    try {
      const res = await fetch(`${apiUrl}/public/inboxes/${inboxId}/widget-config`);
      const data = await res.json();
      if (res.ok) {
        state.inbox = data.inbox;
        render();
      }
    } catch (e) {
      console.error('[FlowChat] config error', e);
    }
  }

  async function startChat() {
    const name = document.getElementById('fc-name')?.value?.trim();
    const email = document.getElementById('fc-email')?.value?.trim() || '';
    if (!name) return;

    try {
      const res = await fetch(`${apiUrl}/public/inboxes/${inboxId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start chat');

      state.conversationId = data.conversationId;
      state.visitorToken = data.visitorToken;
      state.contactName = data.contact.name;
      state.prechatDone = true;
      await loadMessages();
      connectWs();
      render();
    } catch (e) {
      alert(e.message || 'Could not start chat');
    }
  }

  async function loadMessages() {
    if (!state.conversationId || !state.visitorToken) return;
    const res = await fetch(`${apiUrl}/public/conversations/${state.conversationId}/messages`, {
      headers: { 'X-Visitor-Token': state.visitorToken },
    });
    const data = await res.json();
    if (res.ok) state.messages = data.messages || [];
  }

  async function sendMessage() {
    const input = document.getElementById('fc-input');
    const content = input?.value?.trim();
    if (!content || !state.conversationId || !state.visitorToken) return;

    input.value = '';
    try {
      const res = await fetch(`${apiUrl}/public/conversations/${state.conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Token': state.visitorToken,
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (res.ok) {
        appendMessage(data.message);
      }
    } catch (e) {
      console.error('[FlowChat] send error', e);
    }
  }

  function appendMessage(msg) {
    if (!msg || state.messages.some((m) => m.id === msg.id)) return;
    state.messages.push(msg);
    const box = document.getElementById('fc-messages');
    if (box) {
      box.insertAdjacentHTML(
        'beforeend',
        `<div class="fc-msg ${msg.senderType === 'contact' ? 'out' : 'in'}" ${msg.senderType === 'contact' ? `style="background:${color()}"` : ''}>${escapeHtml(msg.content)}</div>`
      );
      scrollMessages();
    }
  }

  function connectWs() {
    if (state.ws) state.ws.close();
    const url = `${wsUrl}?visitorToken=${encodeURIComponent(state.visitorToken)}&conversationId=${encodeURIComponent(state.conversationId)}`;
    state.ws = new WebSocket(url);
    state.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'message_created' && msg.message) {
          appendMessage(msg.message);
        }
      } catch (_) {}
    };
    state.ws.onclose = () => {
      setTimeout(connectWs, 3000);
    };
  }

  loadConfig().then(render);
})();
