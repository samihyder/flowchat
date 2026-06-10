(function () {
  'use strict';

  const cfg = window.flowchat || {};
  const inboxId = cfg.inboxId;
  const apiUrl = (cfg.apiUrl || 'http://localhost:3001').replace(/\/$/, '');
  const configUrl = (cfg.configUrl || apiUrl).replace(/\/$/, '');
  const wsUrl = cfg.wsUrl || 'ws://localhost:3002';

  if (!inboxId) {
    console.error('[FlowChat] window.flowchat.inboxId is required');
    return;
  }

  const ICON_SVGS = {
    chat: '<path fill="currentColor" d="M8 10h8M8 14h5M20 6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2v3l4-3h6a2 2 0 0 0 2-2V6z"/>',
    bubble: '<path fill="currentColor" d="M12 3C7.03 3 3 6.58 3 11c0 2.03.9 3.87 2.36 5.24L4 21l5.2-1.62C10.5 19.8 11.23 20 12 20c4.97 0 9-3.58 9-8s-4.03-8-9-8z"/>',
    headset: '<path fill="currentColor" d="M12 2a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h1v-6H6a6 6 0 1 1 12 0h-2v6h1a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8zm-3 16h6v2H9v-2z"/>',
    message: '<path fill="currentColor" d="M4 4h16v12H8l-4 4V4zm3 3h10v2H7V7zm0 4h7v2H7v-2z"/>',
    help: '<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>',
    wave: '<path fill="currentColor" d="M7.5 12.5 10 10l2.5 2.5L17 8l1.5 1.5-5.5 5.5L10 13l-2.5 2.5L4 12l1.5-1.5 2 2z"/>',
  };

  const DEFAULT_THEME = {
    launcherBg: '#6366F1',
    launcherIcon: '#ffffff',
    headerBg: '#6366F1',
    headerTitle: '#ffffff',
    headerSubtitle: '#ffffff',
    panelBg: '#ffffff',
    panelBorder: '#e5e7eb',
    messagesBg: '#f9fafb',
    agentBubbleBg: '#ffffff',
    agentBubbleText: '#111827',
    visitorBubbleBg: '#6366F1',
    visitorBubbleText: '#ffffff',
    systemText: '#6b7280',
    labelText: '#374151',
    inputBg: '#ffffff',
    inputText: '#111827',
    inputBorder: '#d1d5db',
    inputPlaceholder: '#9ca3af',
    composerBg: '#ffffff',
    buttonBg: '#6366F1',
    buttonText: '#ffffff',
  };

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
    #fc-launcher { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,.18); display: flex; align-items: center; justify-content: center; transition: transform .2s; }
    #fc-launcher:hover { transform: scale(1.05); }
    #fc-launcher svg { width: 26px; height: 26px; }
    #fc-panel { position: fixed; bottom: 96px; right: 24px; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,.16); display: none; flex-direction: column; overflow: hidden; }
    #fc-panel.open { display: flex; animation: fcSlide .25s ease; }
    @keyframes fcSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    #fc-header { padding: 16px 18px; }
    #fc-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    #fc-header p { margin: 4px 0 0; font-size: 12px; opacity: .9; }
    #fc-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .fc-msg { max-width: 85%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.45; word-break: break-word; }
    .fc-msg.in { align-self: flex-start; border-bottom-left-radius: 4px; }
    .fc-msg.out { align-self: flex-end; border-bottom-right-radius: 4px; }
    .fc-msg.sys { align-self: center; background: transparent; font-size: 12px; padding: 4px; }
    #fc-prechat, #fc-composer { padding: 14px; border-top: 1px solid var(--fc-panel-border, #e5e7eb); }
    #fc-prechat label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px; }
    #fc-prechat input, #fc-composer input { width: 100%; box-sizing: border-box; margin-bottom: 8px; padding: 10px 12px; border-radius: 8px; font-size: 14px; }
    #fc-prechat button, #fc-composer button { width: 100%; padding: 10px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
    #fc-composer { display: flex; gap: 8px; align-items: center; }
    #fc-composer input { flex: 1; margin-bottom: 0; }
    #fc-composer button { width: auto; padding: 10px 16px; }
    #fc-prechat input::placeholder, #fc-composer input::placeholder { opacity: 1; }
  `;
  document.head.appendChild(style);

  function theme() {
    const t = state.inbox?.widgetTheme || {};
    const primary = state.inbox?.widgetColor || '#6366F1';
    return {
      ...DEFAULT_THEME,
      launcherBg: primary,
      headerBg: primary,
      visitorBubbleBg: primary,
      buttonBg: primary,
      ...t,
    };
  }

  function launcherIconSvg() {
    const id = state.inbox?.widgetIcon || 'chat';
    const path = ICON_SVGS[id] || ICON_SVGS.chat;
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }

  function render() {
    const t = theme();
    root.innerHTML = `
      <button id="fc-launcher" style="background:${t.launcherBg};color:${t.launcherIcon}" aria-label="Open chat">${launcherIconSvg()}</button>
      <div id="fc-panel" class="${state.open ? 'open' : ''}" style="background:${t.panelBg};border:1px solid ${t.panelBorder}">
        <div id="fc-header" style="background:${t.headerBg};color:${t.headerTitle}">
          <h3 style="color:${t.headerTitle}">${escapeHtml(state.inbox?.welcomeTitle || state.inbox?.name || 'Chat with us')}</h3>
          <p style="color:${t.headerSubtitle}">${escapeHtml(state.inbox?.welcomeTagline || 'We reply quickly')}</p>
        </div>
        <div id="fc-messages" style="background:${t.messagesBg}">${renderMessages(t)}</div>
        ${!state.prechatDone ? renderPrechat(t) : renderComposer(t)}
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

  function renderPrechat(t) {
    return `<div id="fc-prechat" style="background:${t.composerBg}">
      <label style="color:${t.labelText}">Your name</label>
      <input id="fc-name" placeholder="Your name" required
        style="background:${t.inputBg};color:${t.inputText};border:1px solid ${t.inputBorder}"
        onfocus="this.style.outline='2px solid ${t.buttonBg}'" />
      <label style="color:${t.labelText}">Email (optional)</label>
      <input id="fc-email" type="email" placeholder="Email (optional)"
        style="background:${t.inputBg};color:${t.inputText};border:1px solid ${t.inputBorder}" />
      <button id="fc-start" style="background:${t.buttonBg};color:${t.buttonText}">Start chat</button>
    </div>`;
  }

  function renderComposer(t) {
    return `<div id="fc-composer" style="background:${t.composerBg}">
      <input id="fc-input" placeholder="Type a message…"
        style="background:${t.inputBg};color:${t.inputText};border:1px solid ${t.inputBorder}" />
      <button id="fc-send" style="background:${t.buttonBg};color:${t.buttonText}">Send</button>
    </div>`;
  }

  function renderMessages(t) {
    if (!state.messages.length && state.prechatDone) {
      return `<div class="fc-msg sys" style="color:${t.systemText}">${escapeHtml(state.inbox?.greetingMessage || 'How can we help?')}</div>`;
    }
    return state.messages
      .map((m) => {
        if (m.senderType === 'contact') {
          return `<div class="fc-msg out" style="background:${t.visitorBubbleBg};color:${t.visitorBubbleText}">${escapeHtml(m.content)}</div>`;
        }
        if (m.senderType === 'agent') {
          return `<div class="fc-msg in" style="background:${t.agentBubbleBg};color:${t.agentBubbleText};border:1px solid ${t.panelBorder}">${escapeHtml(m.content)}</div>`;
        }
        return `<div class="fc-msg sys" style="color:${t.systemText}">${escapeHtml(m.content)}</div>`;
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
      const res = await fetch(`${configUrl}/public/inboxes/${inboxId}/widget-config`);
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
    const t = theme();
    const box = document.getElementById('fc-messages');
    if (box) {
      let html;
      if (msg.senderType === 'contact') {
        html = `<div class="fc-msg out" style="background:${t.visitorBubbleBg};color:${t.visitorBubbleText}">${escapeHtml(msg.content)}</div>`;
      } else if (msg.senderType === 'agent') {
        html = `<div class="fc-msg in" style="background:${t.agentBubbleBg};color:${t.agentBubbleText};border:1px solid ${t.panelBorder}">${escapeHtml(msg.content)}</div>`;
      } else {
        html = `<div class="fc-msg sys" style="color:${t.systemText}">${escapeHtml(msg.content)}</div>`;
      }
      box.insertAdjacentHTML('beforeend', html);
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
