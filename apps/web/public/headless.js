/**
 * FlowChat Headless Chat SDK — connectivity only (no UI).
 * Use when the inbox widget mode is "headless".
 *
 *   const client = FlowChat.createClient({ inboxId, apiUrl, wsUrl });
 *   await client.startSession({ name: 'Ada', email: 'ada@example.com' });
 *   client.on('message', (msg) => { ... });
 *   await client.sendMessage('Hello');
 */
(function (global) {
  'use strict';

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function createClient(options) {
    if (!options || !options.inboxId) {
      throw new Error('[FlowChat] inboxId is required');
    }

    var inboxId = options.inboxId;
    var apiUrl = String(options.apiUrl || options.configUrl || '').replace(/\/$/, '');
    var configUrl = String(options.configUrl || options.apiUrl || '').replace(/\/$/, '');
    var wsUrl = options.wsUrl || '';
    if (!apiUrl) throw new Error('[FlowChat] apiUrl is required');

    var storageKey = 'fc_headless_' + inboxId;
    var sourceId =
      options.sourceId ||
      (function () {
        try {
          var existing = localStorage.getItem(storageKey + '_source');
          if (existing) return existing;
          var id = uuid();
          localStorage.setItem(storageKey + '_source', id);
          return id;
        } catch (_) {
          return uuid();
        }
      })();

    var conversationId = null;
    var visitorToken = null;
    var ws = null;
    var pingTimer = null;
    var pollTimer = null;
    var listeners = {};

    function emit(event, payload) {
      var list = listeners[event] || [];
      for (var i = 0; i < list.length; i++) {
        try {
          list[i](payload);
        } catch (err) {
          console.error('[FlowChat] listener error', err);
        }
      }
    }

    function saveSession() {
      if (!conversationId || !visitorToken) return;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ conversationId: conversationId, visitorToken: visitorToken })
        );
      } catch (_) {}
    }

    function clearSession() {
      conversationId = null;
      visitorToken = null;
      try {
        localStorage.removeItem(storageKey);
      } catch (_) {}
    }

    function restoreSession() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        var parsed = JSON.parse(raw);
        if (parsed.conversationId && parsed.visitorToken) {
          conversationId = parsed.conversationId;
          visitorToken = parsed.visitorToken;
          return true;
        }
      } catch (_) {}
      return false;
    }

    async function getConfig() {
      var res = await fetch(configUrl + '/public/inboxes/' + inboxId + '/widget-config');
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Failed to load widget config');
      return data.inbox;
    }

    async function getAvailability() {
      var res = await fetch(apiUrl + '/public/inboxes/' + inboxId + '/availability');
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Failed to load availability');
      return data;
    }

    async function trackVisit(pageUrl, referrer) {
      try {
        await fetch(apiUrl + '/public/inboxes/' + inboxId + '/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: sourceId,
            pageUrl: pageUrl || (global.location && global.location.href) || null,
            referrer: referrer || (typeof document !== 'undefined' ? document.referrer : null) || null,
          }),
        });
      } catch (_) {}
    }

    async function startSession(input) {
      var name = input && input.name ? String(input.name).trim() : '';
      if (!name) throw new Error('Name is required');
      var res = await fetch(apiUrl + '/public/inboxes/' + inboxId + '/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: sourceId,
          name: name,
          email: (input.email && String(input.email).trim()) || undefined,
          preChatData: input.preChatData || undefined,
        }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Failed to start session');
      conversationId = data.conversationId;
      visitorToken = data.visitorToken;
      saveSession();
      emit('session', {
        conversationId: conversationId,
        visitorToken: visitorToken,
        contact: data.contact,
      });
      return data;
    }

    async function getMessages() {
      if (!conversationId || !visitorToken) throw new Error('No active session');
      var res = await fetch(apiUrl + '/public/conversations/' + conversationId + '/messages', {
        headers: { 'X-Visitor-Token': visitorToken },
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');
      return data.messages || [];
    }

    async function sendMessage(content) {
      if (!conversationId || !visitorToken) throw new Error('No active session');
      var text = String(content || '').trim();
      if (!text) throw new Error('Message content is required');
      var clientMessageId = uuid();
      var res = await fetch(apiUrl + '/public/conversations/' + conversationId + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Token': visitorToken,
        },
        body: JSON.stringify({ content: text, clientMessageId: clientMessageId }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      if (data.message) emit('message', data.message);
      return data.message;
    }

    async function getStatus() {
      if (!conversationId || !visitorToken) throw new Error('No active session');
      var res = await fetch(apiUrl + '/public/conversations/' + conversationId + '/status', {
        headers: { 'X-Visitor-Token': visitorToken },
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Failed to load status');
      return data.status || data;
    }

    function stopRealtime() {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (ws) {
        ws.onclose = null;
        ws.onmessage = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch (_) {}
        ws = null;
      }
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(function () {
        if (!conversationId || !visitorToken) return;
        getMessages()
          .then(function (messages) {
            emit('messages', messages);
          })
          .catch(function () {});
      }, 8000);
    }

    function connect() {
      if (!conversationId || !visitorToken) {
        throw new Error('No active session — call startSession() or restore() first');
      }
      if (!wsUrl) {
        startPolling();
        return;
      }
      stopRealtime();
      var url =
        wsUrl +
        '?visitorToken=' +
        encodeURIComponent(visitorToken) +
        '&conversationId=' +
        encodeURIComponent(conversationId);
      ws = new WebSocket(url);
      ws.onopen = function () {
        emit('connected', true);
        startPolling();
        pingTimer = setInterval(function () {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };
      ws.onmessage = function (ev) {
        try {
          var payload = JSON.parse(ev.data);
          if (payload.type === 'message' && payload.message) {
            emit('message', payload.message);
          } else if (payload.type === 'pong') {
            /* keep-alive */
          } else {
            emit('event', payload);
          }
        } catch (_) {}
      };
      ws.onclose = function () {
        emit('connected', false);
        setTimeout(function () {
          if (conversationId && visitorToken) connect();
        }, 3000);
      };
      ws.onerror = function () {
        emit('error', new Error('WebSocket error'));
      };
    }

    function on(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
      return function off() {
        listeners[event] = (listeners[event] || []).filter(function (h) {
          return h !== handler;
        });
      };
    }

    function getSession() {
      return {
        inboxId: inboxId,
        sourceId: sourceId,
        conversationId: conversationId,
        visitorToken: visitorToken,
      };
    }

    function restore() {
      var ok = restoreSession();
      if (ok) {
        emit('session', { conversationId: conversationId, visitorToken: visitorToken });
      }
      return ok;
    }

    function end() {
      stopRealtime();
      clearSession();
      emit('session', null);
    }

    return {
      getConfig: getConfig,
      getAvailability: getAvailability,
      trackVisit: trackVisit,
      startSession: startSession,
      getMessages: getMessages,
      sendMessage: sendMessage,
      getStatus: getStatus,
      connect: connect,
      disconnect: stopRealtime,
      on: on,
      getSession: getSession,
      restore: restore,
      end: end,
    };
  }

  var api = {
    createClient: createClient,
    version: 1,
  };

  global.FlowChat = api;
})(typeof window !== 'undefined' ? window : globalThis);
