/* LotKeys Phone V0.9.4.84 — Android loopback bridge plus same-account encrypted session transport. */
(() => {
  'use strict';
  const Core = window.LotKeysMessagingBridge;
  const P = window.LotKeysPhoneCore;
  if (!Core?.DriveSync || !P || !globalThis.crypto?.subtle) return;

  const Drive = Core.DriveSync;
  const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
  const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const NATIVE_ORIGIN = 'http://127.0.0.1:39483';
  const TOKEN_KEY = 'lotkeys-phone-native-token-v1';
  const BROWSER_KEY = 'lotkeys-phone-browser-id-v1';
  const TRUST_KEY = 'lotkeys-phone-trusted-pcs-v1';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const listeners = new Set();
  const pendingRpc = new Map();
  const pendingOffers = new Map();
  const processedFrames = new Set();
  const state = {
    role: 'pc',
    nativeToken: '',
    nativeStatus: null,
    nativeError: '',
    nativeRevision: 0,
    session: null,
    pairing: null,
    threads: [],
    threadPage: { hasMore: false, nextOffset: 0, total: 0 },
    lastError: '',
    lastPhoneSeenAt: 0
  };
  let nativeTimer = 0;
  let offerTimer = 0;
  let pairTimer = 0;
  let frameTimer = 0;
  let heartbeatTimer = 0;
  let frameBusy = false;
  let offerBusy = false;
  let heartbeatBusy = false;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const text = value => String(value ?? '').trim();
  const now = () => Date.now();
  const event = (type, detail = {}) => {
    const snapshot = status();
    for (const listener of listeners) {
      try { listener(type, detail, snapshot); } catch {}
    }
    window.dispatchEvent(new CustomEvent('lotkeys-phone-' + type, { detail: { ...detail, status: snapshot } }));
  };
  const randomId = (bytes = 18) => base64url(crypto.getRandomValues(new Uint8Array(bytes)));
  const base64url = bytes => {
    let binary = '';
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const fromBase64url = value => {
    const padded = String(value).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(value).length + 3) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  };
  const escapeQuery = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const browserId = () => {
    let id = localStorage.getItem(BROWSER_KEY) || '';
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(id)) {
      id = randomId(18);
      localStorage.setItem(BROWSER_KEY, id);
    }
    return id;
  };
  const computerName = () => {
    const platform = text(navigator.userAgentData?.platform || navigator.platform || 'Computer');
    const browser = /Edg\//.test(navigator.userAgent) ? 'Edge' : /Firefox\//.test(navigator.userAgent) ? 'Firefox' : /Chrome\//.test(navigator.userAgent) ? 'Chrome' : 'Browser';
    return (browser + ' on ' + platform).slice(0, 80);
  };

  function parseNativeToken() {
    const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
    const incoming = text(fragment.get('lotkeys-phone'));
    if (/^[A-Za-z0-9_-]{30,100}$/.test(incoming)) {
      localStorage.setItem(TOKEN_KEY, incoming);
      state.nativeToken = incoming;
      fragment.delete('lotkeys-phone');
      const hash = fragment.toString();
      history.replaceState(history.state, '', location.pathname + location.search + (hash ? '#' + hash : ''));
    } else {
      state.nativeToken = text(localStorage.getItem(TOKEN_KEY));
    }
  }

  async function nativeCall(path, options = {}) {
    if (!state.nativeToken) throw Error('Open LotKeys from the Android setup once to link this phone browser.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 7000);
    try {
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', 'Bearer ' + state.nativeToken);
      if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      const response = await fetch(NATIVE_ORIGIN + path, { ...options, headers, signal: controller.signal, cache: 'no-store' });
      let data = {};
      try { data = await response.json(); } catch {}
      if (!response.ok) throw Error(data.error || 'The Android phone layer returned ' + response.status + '.');
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw Error('The Android phone layer did not answer. Reopen LotKeys Connector TEST.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function nativeTick() {
    if (!state.nativeToken) return;
    try {
      const previous = state.nativeRevision;
      const native = await nativeCall('/v1/status', { timeout: 2500 });
      state.nativeStatus = native;
      state.nativeError = '';
      state.nativeRevision = Number(native.revision) || 0;
      if (!state.session || state.session.role === 'phone') state.role = 'phone';
      if (previous && previous !== state.nativeRevision) {
        state.threads = [];
        state.threadPage = { hasMore: false, nextOffset: 0, total: 0 };
        event('data', { reason: 'phone-change' });
        if (state.session?.role === 'phone') sendFrame('pc', { kind: 'event', event: 'invalidate', revision: state.nativeRevision }).catch(() => {});
      }
      event('status');
    } catch (error) {
      if (state.nativeStatus) event('status');
      state.nativeStatus = null;
      state.nativeError = error.message;
      if (!state.session) state.role = 'pc';
    }
  }

  async function driveFetch(url, options = {}) {
    const token = await Drive.authorize(false);
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', 'Bearer ' + token);
    const response = await fetch(url, { ...options, headers, cache: 'no-store' });
    if (!response.ok) {
      let message = '';
      try { message = (await response.json())?.error?.message || ''; } catch {}
      throw Object.assign(Error(message || 'Phone connection could not reach private Google Drive signaling (' + response.status + ').'), { status: response.status });
    }
    if (response.status === 204) return null;
    return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
  }

  async function listFiles(properties = {}) {
    let query = "trashed = false";
    for (const [key, value] of Object.entries(properties)) {
      query += " and appProperties has { key='" + escapeQuery(key) + "' and value='" + escapeQuery(value) + "' }";
    }
    const url = new URL(DRIVE_FILES);
    url.searchParams.set('spaces', 'appDataFolder');
    url.searchParams.set('q', query);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'createdTime asc');
    url.searchParams.set('fields', 'files(id,name,createdTime,modifiedTime,size,appProperties)');
    return (await driveFetch(url.href)).files || [];
  }

  async function readFile(id) {
    return driveFetch(DRIVE_FILES + '/' + encodeURIComponent(id) + '?alt=media');
  }

  async function createFile(name, data, appProperties) {
    const boundary = 'lotkeys_' + randomId(9);
    const metadata = { name, parents: ['appDataFolder'], mimeType: 'application/json', appProperties };
    const body = new Blob([
      '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n', JSON.stringify(metadata),
      '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n', JSON.stringify(data),
      '\r\n--' + boundary + '--'
    ], { type: 'multipart/related; boundary=' + boundary });
    return driveFetch(DRIVE_UPLOAD + '?uploadType=multipart&fields=id,name,createdTime,appProperties', {
      method: 'POST', headers: { 'Content-Type': body.type }, body
    });
  }

  async function deleteFile(id) {
    if (!id) return;
    await driveFetch(DRIVE_FILES + '/' + encodeURIComponent(id), { method: 'DELETE' }).catch(error => {
      if (error.status !== 404) throw error;
    });
  }

  async function keyPair() {
    return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  }

  async function publicJwk(pair) {
    return crypto.subtle.exportKey('jwk', pair.publicKey);
  }

  async function sessionKey(privateKey, remoteJwk) {
    const remote = await crypto.subtle.importKey('jwk', remoteJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: remote }, privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function seal(key, sessionId, frameId, target, payload) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = encoder.encode(sessionId + '|' + frameId + '|' + target);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, encoder.encode(JSON.stringify(payload)));
    return { version: 1, iv: base64url(iv), ciphertext: base64url(ciphertext) };
  }

  async function openFrame(key, sessionId, frameId, target, envelope) {
    if (envelope?.version !== 1) throw Error('Unsupported encrypted phone frame.');
    const aad = encoder.encode(sessionId + '|' + frameId + '|' + target);
    const clear = await crypto.subtle.decrypt({
      name: 'AES-GCM', iv: fromBase64url(envelope.iv), additionalData: aad
    }, key, fromBase64url(envelope.ciphertext));
    return JSON.parse(decoder.decode(clear));
  }

  function trusts() {
    try {
      const value = JSON.parse(localStorage.getItem(TRUST_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => item?.browserId) : [];
    } catch { return []; }
  }

  function saveTrusts(rows) {
    localStorage.setItem(TRUST_KEY, JSON.stringify(rows.slice(-30)));
    event('trust');
  }

  function recordTrust(offer, mode) {
    let rows = trusts().filter(item => item.browserId !== offer.browserId);
    if (mode !== 'ask') rows.push({
      browserId: offer.browserId,
      name: offer.pcName,
      mode,
      expiresAt: P.trustExpiry(mode),
      lastConnectedAt: now()
    });
    saveTrusts(rows);
    return rows.find(item => item.browserId === offer.browserId) || null;
  }

  async function cleanupStale() {
    if (!Drive.connected?.()) return;
    for (const role of ['lotkeysPairOffer', 'lotkeysPairAnswer', 'lotkeysPhoneFrame']) {
      const files = await listFiles({ lotkeysRole: role }).catch(() => []);
      for (const file of files) {
        const expires = Number(file.appProperties?.expiresAt || 0);
        if (expires && expires < now()) deleteFile(file.id).catch(() => {});
      }
    }
  }

  async function startPairing({ trustMode = '36h' } = {}) {
    if (state.nativeStatus) throw Error('This is the phone. Start Connect Phone from the computer instead.');
    if (state.pairing) return { code: state.pairing.code, sessionId: state.pairing.sessionId, expiresAt: state.pairing.expiresAt };
    if (!Drive.connected?.()) await Drive.authorize(false);
    await cleanupStale();
    const pair = await keyPair();
    const sessionId = randomId(24);
    const code = String(1000 + crypto.getRandomValues(new Uint16Array(1))[0] % 9000);
    const expiresAt = now() + 5 * 60 * 1000;
    const offer = {
      version: 1,
      type: 'offer',
      sessionId,
      code,
      browserId: browserId(),
      pcName: computerName(),
      requestedTrustMode: ['ask', '36h', '7d', 'until-disconnect'].includes(trustMode) ? trustMode : '36h',
      publicKey: await publicJwk(pair),
      createdAt: now(),
      expiresAt
    };
    const file = await createFile('LotKeys Phone Pair Request ' + sessionId + '.json', offer, {
      lotkeysRole: 'lotkeysPairOffer', sessionId, expiresAt: String(expiresAt)
    });
    state.pairing = { ...offer, pair, fileId: file.id };
    state.lastError = '';
    event('pairing', { code, sessionId, expiresAt });
    clearInterval(pairTimer);
    pairTimer = setInterval(pollPairAnswer, 1600);
    pollPairAnswer().catch(pairingError);
    return { code, sessionId, expiresAt };
  }

  function pairingError(error) {
    state.lastError = error.message;
    event('status');
  }

  async function pollPairAnswer() {
    const pairing = state.pairing;
    if (!pairing) return;
    if (pairing.expiresAt < now()) {
      await cancelPairing('Pairing expired. Start again for a new four-digit code.');
      return;
    }
    const files = await listFiles({ lotkeysRole: 'lotkeysPairAnswer', sessionId: pairing.sessionId });
    if (!files.length) return;
    const answerFile = files[0];
    const answer = await readFile(answerFile.id);
    if (answer?.rejected) {
      await deleteFile(answerFile.id);
      await cancelPairing('The phone declined this connection.');
      return;
    }
    if (answer?.version !== 1 || answer?.type !== 'answer' || answer.sessionId !== pairing.sessionId || answer.code !== pairing.code ||
        !answer.publicKey || answer.publicKey.kty !== 'EC' || answer.publicKey.crv !== 'P-256') {
      await deleteFile(answerFile.id);
      throw Error('The phone pairing answer did not match this request.');
    }
    const key = await sessionKey(pairing.pair.privateKey, answer.publicKey);
    state.session = {
      role: 'pc',
      sessionId: pairing.sessionId,
      key,
      browserId: pairing.browserId,
      peerName: text(answer.deviceName) || 'Android phone',
      trustMode: answer.trustMode || 'ask',
      trustExpiresAt: Number(answer.trustExpiresAt) || 0,
      connectedAt: now(),
      lastSeenAt: now()
    };
    state.role = 'pc';
    state.lastPhoneSeenAt = now();
    state.pairing = null;
    clearInterval(pairTimer);
    await Promise.allSettled([deleteFile(answerFile.id), deleteFile(pairing.fileId)]);
    beginSession();
    event('connected', { deviceName: state.session.peerName });
    await refreshThreads().catch(error => { state.lastError = error.message; event('status'); });
  }

  async function cancelPairing(reason = '') {
    const pairing = state.pairing;
    state.pairing = null;
    clearInterval(pairTimer);
    if (pairing?.fileId) deleteFile(pairing.fileId).catch(() => {});
    if (reason) state.lastError = reason;
    event('pairing-cancelled', { reason });
  }

  async function pollOffers() {
    if (offerBusy || !state.nativeStatus || !Drive.connected?.()) return;
    offerBusy = true;
    try {
      const files = await listFiles({ lotkeysRole: 'lotkeysPairOffer' });
      for (const file of files) {
        if (Number(file.appProperties?.expiresAt || 0) < now()) {
          deleteFile(file.id).catch(() => {});
          continue;
        }
        if (pendingOffers.has(file.appProperties?.sessionId)) {
          event('pair-request', { offer: publicOffer(pendingOffers.get(file.appProperties.sessionId)) });
          continue;
        }
        const offer = await readFile(file.id);
        if (!P.validatePairOffer(offer)) {
          deleteFile(file.id).catch(() => {});
          continue;
        }
        offer._fileId = file.id;
        pendingOffers.set(offer.sessionId, offer);
        const trusted = trusts().find(row => P.trustValid(row, offer.browserId));
        if (trusted) {
          approvePair(offer.sessionId, trusted.mode, { automatic: true }).catch(error => {
            state.lastError = error.message;
            event('status');
          });
        } else {
          event('pair-request', { offer: publicOffer(offer) });
        }
      }
    } finally {
      offerBusy = false;
    }
  }

  const publicOffer = offer => ({
    sessionId: offer.sessionId,
    code: offer.code,
    pcName: offer.pcName,
    requestedTrustMode: offer.requestedTrustMode,
    expiresAt: offer.expiresAt
  });

  function pendingPairings() {
    return [...pendingOffers.values()].filter(offer => P.validatePairOffer(offer)).map(publicOffer);
  }

  async function approvePair(sessionId, trustMode = '36h', { automatic = false } = {}) {
    const offer = pendingOffers.get(sessionId);
    if (!offer || !P.validatePairOffer(offer)) throw Error('That pairing request expired. Start again from the computer.');
    if (!state.nativeStatus) throw Error('The Android phone layer is not available.');
    if (!['ask', '36h', '7d', 'until-disconnect'].includes(trustMode)) trustMode = '36h';
    if (state.session) await disconnect({ notify: true });
    const pair = await keyPair();
    const key = await sessionKey(pair.privateKey, offer.publicKey);
    const trust = recordTrust(offer, trustMode);
    const answer = {
      version: 1,
      type: 'answer',
      sessionId: offer.sessionId,
      code: offer.code,
      publicKey: await publicJwk(pair),
      deviceId: state.nativeStatus.deviceId,
      deviceName: state.nativeStatus.deviceName,
      sourceApp: state.nativeStatus.sourceApp,
      trustMode,
      trustExpiresAt: trust?.expiresAt || 0,
      createdAt: now(),
      expiresAt: offer.expiresAt
    };
    await createFile('LotKeys Phone Pair Answer ' + offer.sessionId + '.json', answer, {
      lotkeysRole: 'lotkeysPairAnswer', sessionId: offer.sessionId, expiresAt: String(offer.expiresAt)
    });
    state.session = {
      role: 'phone',
      sessionId: offer.sessionId,
      key,
      browserId: offer.browserId,
      peerName: offer.pcName,
      trustMode,
      trustExpiresAt: trust?.expiresAt || 0,
      connectedAt: now(),
      lastSeenAt: now()
    };
    state.role = 'phone';
    pendingOffers.delete(sessionId);
    deleteFile(offer._fileId).catch(() => {});
    beginSession();
    event('connected', { deviceName: offer.pcName, automatic });
    return status();
  }

  async function rejectPair(sessionId) {
    const offer = pendingOffers.get(sessionId);
    if (!offer) return;
    await createFile('LotKeys Phone Pair Declined ' + offer.sessionId + '.json', {
      version: 1, type: 'answer', sessionId: offer.sessionId, code: offer.code, rejected: true, createdAt: now()
    }, { lotkeysRole: 'lotkeysPairAnswer', sessionId: offer.sessionId, expiresAt: String(offer.expiresAt) });
    pendingOffers.delete(sessionId);
    deleteFile(offer._fileId).catch(() => {});
    event('pair-rejected', { sessionId });
  }

  function beginSession() {
    clearInterval(frameTimer);
    clearInterval(heartbeatTimer);
    frameTimer = setInterval(pollFrames, 1100);
    pollFrames().catch(sessionError);
    if (state.session?.role === 'pc') {
      heartbeatTimer = setInterval(heartbeat, 6500);
      heartbeat().catch(sessionError);
    }
  }

  function sessionError(error) {
    state.lastError = error.message;
    event('status');
  }

  async function sendFrame(target, payload) {
    const session = state.session;
    if (!session?.key) throw Error('The phone is not connected.');
    const frameId = randomId(18);
    const expiresAt = now() + 2 * 60 * 1000;
    const envelope = await seal(session.key, session.sessionId, frameId, target, {
      ...payload, sentAt: now(), sender: session.role
    });
    await createFile('LotKeys Phone Frame ' + frameId + '.json', envelope, {
      lotkeysRole: 'lotkeysPhoneFrame', sessionId: session.sessionId, frameId, target, expiresAt: String(expiresAt)
    });
    return frameId;
  }

  async function pollFrames() {
    if (frameBusy || !state.session || !Drive.connected?.()) return;
    frameBusy = true;
    const session = state.session;
    const target = session.role;
    try {
      const files = await listFiles({ lotkeysRole: 'lotkeysPhoneFrame', sessionId: session.sessionId, target });
      for (const file of files) {
        const frameId = file.appProperties?.frameId || '';
        if (!frameId || processedFrames.has(frameId)) {
          deleteFile(file.id).catch(() => {});
          continue;
        }
        if (Number(file.appProperties?.expiresAt || 0) < now()) {
          deleteFile(file.id).catch(() => {});
          continue;
        }
        try {
          const envelope = await readFile(file.id);
          const payload = await openFrame(session.key, session.sessionId, frameId, target, envelope);
          processedFrames.add(frameId);
          if (processedFrames.size > 1000) processedFrames.delete(processedFrames.values().next().value);
          session.lastSeenAt = now();
          state.lastPhoneSeenAt = now();
          if (target === 'phone') await handlePhonePayload(payload);
          else handlePcPayload(payload);
        } finally {
          deleteFile(file.id).catch(() => {});
        }
      }
    } finally {
      frameBusy = false;
    }
  }

  async function handlePhonePayload(payload) {
    if (payload.kind === 'event' && payload.event === 'disconnect') {
      await disconnect({ notify: false });
      return;
    }
    if (payload.kind !== 'request' || !/^[A-Za-z0-9_-]{8,100}$/.test(text(payload.id))) return;
    let data;
    try {
      if (!state.nativeStatus) throw Error('The Android phone layer is unavailable.');
      if (payload.op === 'status') data = await nativeCall('/v1/status');
      else if (payload.op === 'threads') data = await nativeCall('/v1/threads?offset=' + Math.max(0, Number(payload.payload?.offset) || 0));
      else if (payload.op === 'history') {
        const query = new URLSearchParams({ threadId: text(payload.payload?.threadId) });
        if (payload.payload?.before?.at) query.set('beforeAt', String(payload.payload.before.at));
        if (payload.payload?.before?.sort) query.set('beforeSort', text(payload.payload.before.sort));
        data = await nativeCall('/v1/history?' + query);
      } else if (payload.op === 'send') {
        data = await nativeCall('/v1/send', { method: 'POST', body: JSON.stringify(payload.payload || {}) });
        data = await waitForSendReceipt(data.requestId);
      } else if (payload.op === 'foreground') {
        renewTrust(payload.sender);
        data = { ok: true };
      } else throw Error('Unsupported phone request.');
      await sendFrame('pc', { kind: 'response', requestId: payload.id, ok: true, data });
    } catch (error) {
      await sendFrame('pc', { kind: 'response', requestId: payload.id, ok: false, error: error.message || 'Phone request failed.' });
    }
  }

  function handlePcPayload(payload) {
    if (payload.kind === 'event') {
      if (payload.event === 'invalidate') {
        state.threads = [];
        state.threadPage = { hasMore: false, nextOffset: 0, total: 0 };
        event('data', { reason: 'phone-change' });
        refreshThreads().catch(sessionError);
      }
      if (payload.event === 'disconnect') disconnect({ notify: false }).catch(() => {});
      return;
    }
    if (payload.kind !== 'response') return;
    const pending = pendingRpc.get(payload.requestId);
    if (!pending) return;
    pendingRpc.delete(payload.requestId);
    clearTimeout(pending.timer);
    if (payload.ok) pending.resolve(payload.data);
    else pending.reject(Error(payload.error || 'The phone could not complete that request.'));
  }

  function request(op, payload = {}, timeout = 35000) {
    if (state.session?.role !== 'pc') return Promise.reject(Error('No computer-to-phone session is active.'));
    const id = randomId(14);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRpc.delete(id);
        reject(Error('The phone did not answer in time. Check that LotKeys is connected on the phone.'));
      }, timeout);
      pendingRpc.set(id, { resolve, reject, timer });
      sendFrame('phone', { kind: 'request', id, op, payload }).catch(error => {
        pendingRpc.delete(id);
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async function waitForSendReceipt(requestId) {
    let receipt = { requestId, phase: 'sending' };
    for (let attempt = 0; attempt < 50; attempt++) {
      if (receipt.phase !== 'sending') return receipt;
      await wait(500);
      receipt = await nativeCall('/v1/send-status?requestId=' + encodeURIComponent(requestId));
    }
    return { ...receipt, phase: 'unconfirmed', error: 'The phone has not confirmed this SMS yet. Check the phone before retrying.' };
  }

  async function heartbeat() {
    if (heartbeatBusy || state.session?.role !== 'pc') return;
    heartbeatBusy = true;
    try {
      const result = await request('status', {}, 18000);
      state.lastPhoneSeenAt = now();
      state.session.lastSeenAt = now();
      state.session.phoneStatus = result;
      state.lastError = '';
      event('status');
      if (document.visibilityState === 'visible') request('foreground', {}, 18000).catch(() => {});
    } catch (error) {
      state.lastError = error.message;
      event('status');
    } finally {
      heartbeatBusy = false;
    }
  }

  function renewTrust() {
    if (state.session?.role !== 'phone') return;
    const rows = trusts();
    const row = rows.find(item => item.browserId === state.session.browserId);
    if (!row || !['36h', '7d'].includes(row.mode)) return;
    row.expiresAt = P.trustExpiry(row.mode);
    row.lastConnectedAt = now();
    saveTrusts(rows);
    state.session.trustExpiresAt = row.expiresAt;
  }

  async function refreshThreads(offset = 0) {
    let page;
    if (state.nativeStatus) page = await nativeCall('/v1/threads?offset=' + Math.max(0, Number(offset) || 0));
    else if (connected()) page = await request('threads', { offset });
    else throw Error('Connect the phone before opening Device Messages.');
    const rows = Array.isArray(page.threads) ? page.threads : [];
    state.threads = offset ? [...state.threads, ...rows] : rows;
    state.threadPage = {
      hasMore: !!page.hasMore,
      nextOffset: Math.max(0, Number(page.nextOffset) || state.threads.length),
      total: Math.max(state.threads.length, Number(page.total) || 0)
    };
    state.lastError = '';
    event('data', { reason: 'threads', page });
    return { ...page, threads: rows };
  }

  async function history(threadId, before = null) {
    const query = new URLSearchParams({ threadId: text(threadId) });
    if (before?.at) query.set('beforeAt', String(before.at));
    if (before?.sort) query.set('beforeSort', text(before.sort));
    if (state.nativeStatus) return nativeCall('/v1/history?' + query);
    if (connected()) return request('history', { threadId, before });
    throw Error('The phone disconnected. Message history is locked until it reconnects.');
  }

  async function send({ threadId, address, text: body }) {
    const requestId = randomId(18);
    const payload = { requestId, threadId, address, text: String(body || ''), transport: 'sms' };
    let receipt;
    if (state.nativeStatus) {
      receipt = await nativeCall('/v1/send', { method: 'POST', body: JSON.stringify(payload) });
      receipt = await waitForSendReceipt(receipt.requestId);
    } else if (connected()) receipt = await request('send', payload, 45000);
    else throw Error('The phone disconnected. Nothing was sent.');
    event('send-state', { receipt, threadId });
    return receipt;
  }

  function connected() {
    if (!state.session) return false;
    if (state.session.role === 'phone') return !!state.nativeStatus;
    return now() - Math.max(state.session.lastSeenAt || 0, state.lastPhoneSeenAt || 0) < 22000;
  }

  async function disconnect({ notify = true, forget = false } = {}) {
    const session = state.session;
    if (notify && session) await sendFrame(session.role === 'pc' ? 'phone' : 'pc', { kind: 'event', event: 'disconnect' }).catch(() => {});
    if (forget && session?.role === 'phone') saveTrusts(trusts().filter(row => row.browserId !== session.browserId));
    if (session?.trustMode === 'until-disconnect' && session.role === 'phone') {
      saveTrusts(trusts().filter(row => row.browserId !== session.browserId));
    }
    state.session = null;
    state.threads = [];
    state.threadPage = { hasMore: false, nextOffset: 0, total: 0 };
    state.lastPhoneSeenAt = 0;
    clearInterval(frameTimer);
    clearInterval(heartbeatTimer);
    for (const [id, pending] of pendingRpc) {
      clearTimeout(pending.timer);
      pending.reject(Error('Phone disconnected. Nothing was sent.'));
      pendingRpc.delete(id);
    }
    if (state.nativeStatus) state.role = 'phone';
    event('disconnected');
  }

  function forgetDevice(browser) {
    saveTrusts(trusts().filter(row => row.browserId !== browser));
    if (state.session?.browserId === browser) return disconnect({ notify: true, forget: true });
  }

  function status() {
    const sms = !!(state.nativeStatus?.capabilities?.smsHistory || state.session?.phoneStatus?.capabilities?.smsHistory || connected());
    const coverage = P.coverage({ connected: connected(), native: !!state.nativeStatus, sms, rcs: false });
    return {
      version: '0.9.4.84',
      role: state.nativeStatus ? 'phone' : 'pc',
      native: !!state.nativeStatus,
      nativeError: state.nativeError,
      connected: connected(),
      pairing: state.pairing ? { code: state.pairing.code, sessionId: state.pairing.sessionId, expiresAt: state.pairing.expiresAt } : null,
      deviceName: state.nativeStatus?.deviceName || state.session?.peerName || '',
      sourceApp: state.nativeStatus?.sourceApp || state.session?.phoneStatus?.sourceApp || '',
      peerName: state.session?.peerName || '',
      trustMode: state.session?.trustMode || '',
      trustExpiresAt: state.session?.trustExpiresAt || 0,
      coverage,
      lastError: state.lastError,
      pendingPairings: pendingPairings(),
      threadCount: state.threads.length,
      threadPage: { ...state.threadPage }
    };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function init() {
    parseNativeToken();
    await Drive.restoreSessionAuthorization?.().catch(() => false);
    await nativeTick();
    clearInterval(nativeTimer);
    clearInterval(offerTimer);
    nativeTimer = setInterval(nativeTick, 1800);
    offerTimer = setInterval(() => pollOffers().catch(() => {}), 2600);
    if (state.nativeStatus) {
      pollOffers().catch(() => {});
      refreshThreads().catch(() => {});
    }
    cleanupStale().catch(() => {});
    event('ready');
  }

  window.LotKeysPhone = {
    version: '0.9.4.84',
    init,
    status,
    subscribe,
    startPairing,
    cancelPairing,
    pendingPairings,
    approvePair,
    rejectPair,
    refreshThreads,
    threads: () => state.threads.slice(),
    threadPage: () => ({ ...state.threadPage }),
    history,
    send,
    disconnect,
    trusts,
    forgetDevice,
    clearNativeLink: () => { localStorage.removeItem(TOKEN_KEY); state.nativeToken = ''; state.nativeStatus = null; event('status'); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
