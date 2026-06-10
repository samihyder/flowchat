(function () {
  'use strict';

  const cfg = window.flowchat || {};
  const inboxId = cfg.inboxId;
  const configUrl = (cfg.configUrl || cfg.apiUrl || 'http://localhost:3001').replace(/\/$/, '');
  const apiUrl = (cfg.apiUrl || configUrl).replace(/\/$/, '');
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
    headerSubtitle: 'rgba(255,255,255,0.9)',
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
    view: 'home',
    conversationId: null,
    visitorToken: null,
    contactName: null,
    messages: [],
    inbox: null,
    configLoaded: false,
    ws: null,
    prechatDone: false,
    sending: false,
    error: '',
  };

  const root = document.createElement('div');
  root.id = 'flowchat-widget-root';
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    #flowchat-widget-root {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      z-index: 2147483000;
      -webkit-font-smoothing: antialiased;
    }
    #fc-launcher {
      position: fixed; bottom: 20px; right: 20px;
      width: 60px; height: 60px; border-radius: 50%; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      background: var(--fc-launcher-bg); color: var(--fc-launcher-icon);
      box-shadow: 0 4px 24px rgba(0,0,0,.18);
      transition: transform .2s, box-shadow .2s;
    }
    #fc-launcher:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(0,0,0,.22); }
    #fc-launcher svg { width: 28px; height: 28px; }
    #fc-launcher .fc-badge {
      position: absolute; top: -2px; right: -2px;
      min-width: 18px; height: 18px; padding: 0 5px;
      background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
      border-radius: 9px; display: none; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }
    #fc-panel {
      position: fixed; bottom: 92px; right: 20px;
      width: 400px; max-width: calc(100vw - 24px);
      height: min(600px, calc(100vh - 110px));
      background: var(--fc-panel-bg);
      border: 1px solid var(--fc-panel-border);
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,.15);
      display: none; flex-direction: column; overflow: hidden;
    }
    #fc-panel.open { display: flex; animation: fcSlideUp .28s cubic-bezier(.16,1,.3,1); }
    @keyframes fcSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(.98); }
      to { opacity: 1; transform: none; }
    }
    #fc-header {
      padding: 18px 20px; background: var(--fc-header-bg);
      color: var(--fc-header-title); flex-shrink: 0;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    #fc-header-text h3 {
      margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3;
      color: var(--fc-header-title);
    }
    #fc-header-text p {
      margin: 4px 0 0; font-size: 13px; line-height: 1.4;
      color: var(--fc-header-subtitle);
    }
    #fc-close {
      background: rgba(255,255,255,.15); border: none; border-radius: 8px;
      width: 32px; height: 32px; cursor: pointer; color: inherit;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #fc-close:hover { background: rgba(255,255,255,.25); }
    #fc-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
    #fc-home {
      flex: 1; overflow-y: auto; padding: 24px 20px;
      background: var(--fc-messages-bg);
      display: flex; flex-direction: column; align-items: center; text-align: center;
    }
    #fc-home .fc-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--fc-header-bg); color: var(--fc-header-title);
      display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
    }
    #fc-home .fc-avatar svg { width: 28px; height: 28px; }
    #fc-home h4 { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #111827; }
    #fc-home p { margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.5; max-width: 280px; }
    #fc-home .fc-cta {
      width: 100%; padding: 12px 20px; border: none; border-radius: 10px;
      background: var(--fc-button-bg); color: var(--fc-button-text);
      font-size: 15px; font-weight: 600; cursor: pointer;
      transition: opacity .15s;
    }
    #fc-home .fc-cta:hover { opacity: .92; }
    #fc-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      background: var(--fc-messages-bg);
      display: flex; flex-direction: column; gap: 10px;
    }
    .fc-msg {
      max-width: 82%; padding: 10px 14px; border-radius: 16px;
      font-size: 14px; line-height: 1.5; word-break: break-word;
    }
    .fc-msg.in {
      align-self: flex-start; background: var(--fc-agent-bubble-bg);
      color: var(--fc-agent-bubble-text);
      border: 1px solid var(--fc-panel-border);
      border-bottom-left-radius: 4px;
    }
    .fc-msg.out {
      align-self: flex-end; background: var(--fc-visitor-bubble-bg);
      color: var(--fc-visitor-bubble-text);
      border-bottom-right-radius: 4px;
    }
    .fc-msg.sys {
      align-self: center; background: transparent; color: var(--fc-system-text);
      font-size: 12px; padding: 4px 8px; text-align: center;
    }
    .fc-msg-time { font-size: 10px; opacity: .65; margin-top: 4px; display: block; }
    #fc-prechat, #fc-composer {
      padding: 16px; border-top: 1px solid var(--fc-panel-border);
      background: var(--fc-composer-bg); flex-shrink: 0;
    }
    #fc-prechat label {
      display: block; font-size: 12px; font-weight: 500;
      color: var(--fc-label-text); margin-bottom: 4px;
    }
    #fc-prechat input {
      width: 100%; box-sizing: border-box; margin-bottom: 12px;
      padding: 11px 14px; border-radius: 10px; font-size: 14px;
      background: var(--fc-input-bg); color: var(--fc-input-text);
      border: 1px solid var(--fc-input-border); outline: none;
    }
    #fc-prechat input:focus { border-color: var(--fc-button-bg); box-shadow: 0 0 0 3px color-mix(in srgb, var(--fc-button-bg) 20%, transparent); }
    #fc-prechat input::placeholder, #fc-composer input::placeholder { color: var(--fc-input-placeholder); }
    #fc-prechat button, #fc-composer button[type="submit"] {
      width: 100%; padding: 12px; border: none; border-radius: 10px;
      background: var(--fc-button-bg); color: var(--fc-button-text);
      font-weight: 600; font-size: 14px; cursor: pointer;
    }
    #fc-prechat button:disabled, #fc-composer button:disabled { opacity: .6; cursor: not-allowed; }
    #fc-composer { display: flex; gap: 8px; align-items: flex-end; }
    #fc-composer input {
      flex: 1; padding: 11px 14px; border-radius: 10px; font-size: 14px;
      background: var(--fc-input-bg); color: var(--fc-input-text);
      border: 1px solid var(--fc-input-border); outline: none;
    }
    #fc-composer input:focus { border-color: var(--fc-button-bg); }
    #fc-composer button[type="submit"] { width: auto; padding: 11px 18px; white-space: nowrap; }
    #fc-error { padding: 8px 16px; background: #fef2f2; color: #b91c1c; font-size: 12px; text-align: center; }
    #fc-powered { padding: 8px; text-align: center; font-size: 10px; color: #9ca3af; background: var(--fc-composer-bg); border-top: 1px solid var(--fc-panel-border); }
    @media (max-width: 480px) {
      #fc-panel {
        bottom: 0; right: 0; left: 0; width: 100%; max-width: 100%;
        height: 100%; max-height: 100%; border-radius: 0; border: none;
      }
      #fc-launcher { bottom: 16px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  function parseTheme(raw, primary) {
    let partial = raw;
    if (typeof partial === 'string') {
      try { partial = JSON.parse(partial); } catch { partial = {}; }
    }
    const base = { ...DEFAULT_THEME, launcherBg: primary, headerBg: primary, visitorBubbleBg: primary, buttonBg: primary };
    return { ...base, ...(partial || {}) };
  }

  function theme() {
    const primary = state.inbox?.widgetColor || '#6366F1';
    return parseTheme(state.inbox?.widgetTheme, primary);
  }

  function applyThemeVars(t) {
    const vars = {
      '--fc-launcher-bg': t.launcherBg,
      '--fc-launcher-icon': t.launcherIcon,
      '--fc-header-bg': t.headerBg,
      '--fc-header-title': t.headerTitle,
      '--fc-header-subtitle': t.headerSubtitle,
      '--fc-panel-bg': t.panelBg,
      '--fc-panel-border': t.panelBorder,
      '--fc-messages-bg': t.messagesBg,
      '--fc-agent-bubble-bg': t.agentBubbleBg,
      '--fc-agent-bubble-text': t.agentBubbleText,
      '--fc-visitor-bubble-bg': t.visitorBubbleBg,
      '--fc-visitor-bubble-text': t.visitorBubbleText,
      '--fc-system-text': t.systemText,
      '--fc-label-text': t.labelText,
      '--fc-input-bg': t.inputBg,
      '--fc-input-text': t.inputText,
      '--fc-input-border': t.inputBorder,
      '--fc-input-placeholder': t.inputPlaceholder,
      '--fc-composer-bg': t.composerBg,
      '--fc-button-bg': t.buttonBg,
      '--fc-button-text': t.buttonText,
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  function launcherIconSvg() {
    const id = state.inbox?.widgetIcon || 'chat';
    const path = ICON_SVGS[id] || ICON_SVGS.chat;
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }

  function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  function renderMessages() {
    if (!state.messages.length && state.prechatDone) {
      return `<div class="fc-msg sys">${escapeHtml(state.inbox?.greetingMessage || 'How can we help?')}</div>`;
    }
    return state.messages.map((m) => {
      const time = `<span class="fc-msg-time">${formatTime(m.createdAt)}</span>`;
      if (m.senderType === 'contact') {
        return `<div class="fc-msg out">${escapeHtml(m.content)}${time}</div>`;
      }
      if (m.senderType === 'agent') {
        return `<div class="fc-msg in">${escapeHtml(m.content)}${time}</div>`;
      }
      return `<div class="fc-msg sys">${escapeHtml(m.content)}</div>`;
    }).join('');
  }

  function renderBody() {
    if (state.view === 'home' && !state.prechatDone) {
      return `<div id="fc-home">
        <div class="fc-avatar">${launcherIconSvg()}</div>
        <h4>${escapeHtml(state.inbox?.welcomeTitle || state.inbox?.name || 'Chat with us')}</h4>
        <p>${escapeHtml(state.inbox?.welcomeTagline || 'We typically reply in a few minutes')}</p>
        <button type="button" class="fc-cta" id="fc-start-home">Start conversation</button>
      </div>`;
    }
    if (!state.prechatDone) {
      return `<div id="fc-prechat">
        <label for="fc-name">Your name</label>
        <input id="fc-name" placeholder="Enter your name" required autocomplete="name" />
        <label for="fc-email">Email <span style="font-weight:400;color:var(--fc-input-placeholder)">(optional)</span></label>
        <input id="fc-email" type="email" placeholder="you@company.com" autocomplete="email" />
        <button type="button" id="fc-start" ${state.sending ? 'disabled' : ''}>${state.sending ? 'Connecting…' : 'Start chat'}</button>
      </div>`;
    }
    return `
      <div id="fc-messages">${renderMessages()}</div>
      <form id="fc-composer">
        <input id="fc-input" placeholder="Type your message…" autocomplete="off" />
        <button type="submit" id="fc-send" ${state.sending ? 'disabled' : ''}>Send</button>
      </form>`;
  }

  function render() {
    const t = theme();
    applyThemeVars(t);

    const unread = state.messages.filter((m) => m.senderType === 'agent').length;
    const showBadge = !state.open && unread > 0 && state.prechatDone;

    root.innerHTML = `
      <button id="fc-launcher" aria-label="Open chat" aria-expanded="${state.open}">
        ${launcherIconSvg()}
        <span class="fc-badge" style="display:${showBadge ? 'flex' : 'none'}">${unread}</span>
      </button>
      <div id="fc-panel" class="${state.open ? 'open' : ''}" role="dialog" aria-label="Chat">
        <div id="fc-header">
          <div id="fc-header-text">
            <h3>${escapeHtml(state.inbox?.welcomeTitle || state.inbox?.name || 'Chat with us')}</h3>
            <p>${escapeHtml(state.inbox?.welcomeTagline || 'We reply quickly')}</p>
          </div>
          <button id="fc-close" aria-label="Close chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="fc-body">
          ${state.error ? `<div id="fc-error">${escapeHtml(state.error)}</div>` : ''}
          ${renderBody()}
        </div>
        <div id="fc-powered">Powered by FlowChat</div>
      </div>
    `;

    document.getElementById('fc-launcher')?.addEventListener('click', toggle);
    document.getElementById('fc-close')?.addEventListener('click', close);
    document.getElementById('fc-start-home')?.addEventListener('click', () => { state.view = 'prechat'; render(); });
    document.getElementById('fc-start')?.addEventListener('click', startChat);
    document.getElementById('fc-composer')?.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    document.getElementById('fc-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    scrollMessages();
  }

  function close() {
    state.open = false;
    render();
  }

  function toggle() {
    state.open = !state.open;
    if (state.open) {
      loadConfig(true);
      if (!state.prechatDone) state.view = 'home';
    }
    render();
  }

  async function loadConfig(force) {
    if (state.configLoaded && !force) return;
    try {
      const res = await fetch(`${configUrl}/public/inboxes/${inboxId}/widget-config`);
      const data = await res.json();
      if (res.ok && data.inbox) {
        if (typeof data.inbox.widgetTheme === 'string') {
          try { data.inbox.widgetTheme = JSON.parse(data.inbox.widgetTheme); } catch { /* keep */ }
        }
        state.inbox = data.inbox;
        state.configLoaded = true;
        state.error = '';
        render();
      } else {
        state.error = data.error || 'Widget configuration not found';
        render();
      }
    } catch (e) {
      console.error('[FlowChat] config error', e);
      state.error = 'Could not load widget settings';
      render();
    }
  }

  async function startChat() {
    const name = document.getElementById('fc-name')?.value?.trim();
    const email = document.getElementById('fc-email')?.value?.trim() || '';
    if (!name) return;

    state.sending = true;
    state.error = '';
    render();

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
      state.view = 'chat';
      await loadMessages();
      connectWs();
    } catch (e) {
      state.error = e.message || 'Could not start chat';
    } finally {
      state.sending = false;
      render();
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
    if (!content || !state.conversationId || !state.visitorToken || state.sending) return;

    input.value = '';
    state.sending = true;
    render();

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
      if (res.ok) appendMessage(data.message);
      else state.error = data.error || 'Failed to send';
    } catch (e) {
      state.error = 'Could not send message';
      console.error('[FlowChat] send error', e);
    } finally {
      state.sending = false;
      render();
    }
  }

  function appendMessage(msg) {
    if (!msg || state.messages.some((m) => m.id === msg.id)) return;
    state.messages.push(msg);
    const box = document.getElementById('fc-messages');
    if (box) {
      let html;
      const time = `<span class="fc-msg-time">${formatTime(msg.createdAt)}</span>`;
      if (msg.senderType === 'contact') {
        html = `<div class="fc-msg out">${escapeHtml(msg.content)}${time}</div>`;
      } else if (msg.senderType === 'agent') {
        html = `<div class="fc-msg in">${escapeHtml(msg.content)}${time}</div>`;
      } else {
        html = `<div class="fc-msg sys">${escapeHtml(msg.content)}</div>`;
      }
      box.insertAdjacentHTML('beforeend', html);
      scrollMessages();
      if (!state.open) render();
    }
  }

  function connectWs() {
    if (state.ws) state.ws.close();
    const url = `${wsUrl}?visitorToken=${encodeURIComponent(state.visitorToken)}&conversationId=${encodeURIComponent(state.conversationId)}`;
    state.ws = new WebSocket(url);
    state.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'message_created' && msg.message) appendMessage(msg.message);
      } catch (_) {}
    };
    state.ws.onclose = () => setTimeout(connectWs, 3000);
  }

  loadConfig().then(render);
})();
