/* LotKeys Phone V0.9.4.98 — reliable phone approval, trusted reconnect and encrypted session transport. */
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
  const SESSION_KEY = 'lotkeys-phone-active-session-v1';
  const REMEMBERED_PAIR_KEY = 'lotkeys-phone-remembered-pair-v1';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const PHONE_POLL_IDLE_MS = 3000;
  const PHONE_POLL_HEAVY_MS = 30000;
  const FRAME_POLL_ACTIVE_MS = 1100;
  const FRAME_POLL_HEAVY_MS = 10000;
  const HEARTBEAT_IDLE_MS = 6500;
  const HEARTBEAT_HEAVY_MS = 30000;
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
    backgroundRelay: false,
    nativeTrusts: [],
    relayReady: false,
    relayIdentity: '',
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
  let pairBusy = false;
  let frameTimer = 0;
  let heartbeatTimer = 0;
  let frameBusy = false;
  let offerBusy = false;
  let heartbeatBusy = false;
  let monitoringWasHeavy = false;
  let monitoringGraceUntil = 0;
  let automaticPairAttempted = false;
  let lastStatusEventSignature = '';

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const text = value => String(value ?? '').trim();
  const now = () => Date.now();
  const monitoringState = () => {
    try { return Core.monitoringState?.() || { heavy: false, phonePollMs: PHONE_POLL_IDLE_MS }; }
    catch { return { heavy: false, phonePollMs: PHONE_POLL_IDLE_MS }; }
  };
  const phonePollDelay = () => {
    const state = monitoringState();
    return state.heavy ? (Number(state.phonePollMs) || PHONE_POLL_HEAVY_MS) : (Number(state.phonePollMs) || PHONE_POLL_IDLE_MS);
  };
  const framePollDelay = () => pendingRpc.size ? FRAME_POLL_ACTIVE_MS : (monitoringState().heavy ? FRAME_POLL_HEAVY_MS : PHONE_POLL_IDLE_MS);
  const heartbeatDelay = () => monitoringState().heavy ? HEARTBEAT_HEAVY_MS : HEARTBEAT_IDLE_MS;
  const event = (type, detail = {}) => {
    const snapshot = status();
    if (type === 'status') {
      const signature = JSON.stringify(snapshot);
      if (signature === lastStatusEventSignature) return false;
      lastStatusEventSignature = signature;
    }
    for (const listener of listeners) {
      try { listener(type, detail, snapshot); } catch {}
    }
    window.dispatchEvent(new CustomEvent('lotkeys-phone-' + type, { detail: { ...detail, status: snapshot } }));
    return true;
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
  const standardBase64 = bytes => {
    const view = new Uint8Array(bytes);
    let binary = '';
    for (let offset = 0; offset < view.length; offset += 0x8000) {
      binary += String.fromCharCode(...view.subarray(offset, Math.min(view.length, offset + 0x8000)));
    }
    return btoa(binary);
  };
  const standardBytes = value => {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
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

  function rememberedPair() {
    try {
      const row = JSON.parse(localStorage.getItem(REMEMBERED_PAIR_KEY) || 'null');
      if (!P.rememberedPairValid(row, browserId())) {
        localStorage.removeItem(REMEMBERED_PAIR_KEY);
        return null;
      }
      return row;
    } catch {
      localStorage.removeItem(REMEMBERED_PAIR_KEY);
      return null;
    }
  }

  function rememberPair(session) {
    if (session?.role !== 'pc' || !['36h', '7d', 'until-disconnect'].includes(session.trustMode)) return;
    localStorage.setItem(REMEMBERED_PAIR_KEY, JSON.stringify({
      version: 1,
      browserId: browserId(),
      phoneName: session.peerName || 'Android phone',
      trustMode: session.trustMode,
      trustExpiresAt: session.trustExpiresAt || 0,
      connectedAt: session.connectedAt || now(),
      disconnected: false
    }));
  }

  function forgetRememberedPair() {
    localStorage.removeItem(REMEMBERED_PAIR_KEY);
  }

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

  async function loopbackPermissionState() {
    if (!navigator.permissions?.query) return '';
    for (const name of ['loopback-network', 'local-network-access']) {
      try { return (await navigator.permissions.query({ name })).state || ''; }
      catch {}
    }
    return '';
  }

  async function nativeCall(path, options = {}) {
    if (!state.nativeToken) throw Error('Open LotKeys from the Android setup once to link this phone browser.');
    const controller = new AbortController();
    const { timeout: timeoutMs = 7000, diagnose = false, ...requestOptions } = options;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = new Headers(requestOptions.headers || {});
      headers.set('Authorization', 'Bearer ' + state.nativeToken);
      if (requestOptions.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      const response = await fetch(NATIVE_ORIGIN + path, {
        ...requestOptions,
        headers,
        signal: controller.signal,
        cache: 'no-store',
        targetAddressSpace: 'loopback'
      });
      let data = {};
      try { data = await response.json(); } catch {}
      if (!response.ok) throw Error(data.error || 'The Android phone layer returned ' + response.status + '.');
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw Error('The Android phone layer did not answer. Reopen LotKeys Connector TEST.');
      if (error instanceof TypeError || /failed to fetch/i.test(error?.message || '')) {
        const permission = diagnose ? await loopbackPermissionState() : '';
        if (permission === 'denied') {
          throw Error('Chrome blocked the phone connector. Open this site\'s permissions, allow Loopback network access, then tap Reconnect phone.');
        }
        throw Error('The browser could not reach the phone connector. Keep LotKeys Connector TEST running, tap Reconnect phone, and allow Loopback network access if asked.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function nativeTick({ throwOnError = false, userInitiated = false } = {}) {
    if (!state.nativeToken) return;
    try {
      const wasConnected = connected();
      const previous = state.nativeRevision;
      const native = await nativeCall('/v1/status', { timeout: 2500, diagnose: userInitiated });
      state.nativeStatus = native;
      state.nativeError = '';
      state.nativeRevision = Number(native.revision) || 0;
      state.backgroundRelay = !!native.relay?.authorized;
      state.nativeTrusts = Array.isArray(native.relay?.trusts) ? native.relay.trusts : [];
      if (state.backgroundRelay) {
        state.relayReady = true;
        state.relayIdentity = text(native.relay?.account).toLowerCase();
        if (native.relay?.lastError) state.lastError = text(native.relay.lastError);
      } else {
        state.relayReady = !!Drive.connected?.();
        if (!state.relayReady) state.relayIdentity = '';
      }
      if (!state.session || state.session.role === 'phone') state.role = 'phone';
      if (previous && previous !== state.nativeRevision) {
        await refreshThreads(0).catch(error => { state.lastError = error.message; event('status'); });
        if (state.session?.role === 'phone' && !state.backgroundRelay) sendFrame('pc', { kind: 'event', event: 'invalidate', revision: state.nativeRevision }).catch(() => {});
      }
      const isConnected = connected();
      if (!wasConnected && isConnected) event('connected', { deviceName: native.relay?.peerName || '' });
      else if (wasConnected && !isConnected) event('disconnected');
      event('status');
    } catch (error) {
      const changed = !!state.nativeStatus || state.nativeError !== error.message;
      state.nativeStatus = null;
      state.nativeError = error.message;
      if (!state.session) state.role = 'phone';
      if (changed) event('status');
      if (throwOnError) throw error;
    }
  }

  async function connectNative() {
    if (!state.nativeToken) throw Error('Open LotKeys from the Android setup once to link this phone browser.');
    state.role = 'phone';
    await nativeTick({ throwOnError: true, userInitiated: true });
    await refreshThreads(0);
    return status();
  }

  async function preparePhonePairing() {
    if (!state.nativeToken) throw Error('Open LotKeys from the Android setup before pairing a computer.');
    if (!state.nativeStatus) await connectNative();
    if (state.backgroundRelay) {
      state.relayReady = true;
      state.relayIdentity = text(state.nativeStatus?.relay?.account).toLowerCase();
      state.lastError = '';
      await pollOffers();
      scheduleOfferPoll(300);
      event('pair-ready', { account: state.relayIdentity, background: true });
      return status();
    }
    await Drive.authorize(false);
    const identity = await Drive.getGoogleIdentity();
    state.relayReady = true;
    state.relayIdentity = text(identity?.email).toLowerCase();
    state.lastError = '';
    await pollOffers();
    scheduleOfferPoll(300);
    if (state.session) scheduleFramePoll(100);
    event('pair-ready', { account: state.relayIdentity });
    return status();
  }

  async function reconnectTrustedComputer() {
    if (state.nativeToken || state.session || state.pairing || automaticPairAttempted || document.visibilityState !== 'visible') return false;
    const remembered = rememberedPair();
    if (!remembered || !Drive.connected?.()) return false;
    automaticPairAttempted = true;
    try {
      await startPairing({ trustMode: remembered.trustMode, automatic: true });
      return true;
    } catch (error) {
      state.lastError = error.message;
      event('status');
      return false;
    }
  }

  async function driveFetch(url, options = {}) {
    try {
      const token = await Drive.authorize(false);
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', 'Bearer ' + token);
      const response = await fetch(url, { ...options, headers, cache: 'no-store' });
      if (!response.ok) {
        let message = '';
        try { message = (await response.json())?.error?.message || ''; } catch {}
        throw Object.assign(Error(message || 'Phone connection could not reach private Google Drive signaling (' + response.status + ').'), { status: response.status });
      }
      if (state.nativeToken) state.relayReady = true;
      if (response.status === 204) return null;
      return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
    } catch (error) {
      if (state.nativeToken) state.relayReady = false;
      throw error;
    }
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
    return crypto.subtle.deriveKey({ name: 'ECDH', public: remote }, privateKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }

  async function persistSession() {
    const session = state.session;
    if (!session?.key) return;
    try {
      const raw = await crypto.subtle.exportKey('raw', session.key);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        version: 1,
        role: session.role,
        sessionId: session.sessionId,
        key: base64url(raw),
        browserId: session.browserId,
        peerName: session.peerName || '',
        trustMode: session.trustMode || 'ask',
        trustExpiresAt: Number(session.trustExpiresAt) || 0,
        connectedAt: Number(session.connectedAt) || now(),
        lastSeenAt: Number(session.lastSeenAt) || now(),
        savedAt: now()
      }));
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async function restoreSession() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { saved = null; }
    const role = state.nativeToken ? 'phone' : 'pc';
    if (!P.validateStoredSession(saved, role)) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    if (['36h', '7d'].includes(saved.trustMode) && Number(saved.trustExpiresAt) <= now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    if (role === 'phone' && saved.trustMode !== 'ask' && !trusts().some(row => P.trustValid(row, saved.browserId))) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    if (role === 'phone' && !state.nativeStatus) return false;
    try {
      const key = await crypto.subtle.importKey('raw', fromBase64url(saved.key), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      state.session = {
        role,
        sessionId: saved.sessionId,
        key,
        browserId: saved.browserId,
        peerName: text(saved.peerName) || (role === 'pc' ? 'Android phone' : 'Computer'),
        trustMode: saved.trustMode || 'ask',
        trustExpiresAt: Number(saved.trustExpiresAt) || 0,
        connectedAt: Number(saved.connectedAt) || now(),
        lastSeenAt: Number(saved.lastSeenAt) || 0
      };
      state.role = role;
      if (role === 'pc') state.lastPhoneSeenAt = Number(saved.lastSeenAt) || 0;
      beginSession();
      event('session-restored', { deviceName: state.session.peerName });
      return true;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      state.session = null;
      return false;
    }
  }

  function clearStoredSession() {
    sessionStorage.removeItem(SESSION_KEY);
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
    if (state.backgroundRelay) return state.nativeTrusts.map(row => ({ ...row }));
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

  async function startPairing({ trustMode = '36h', automatic = false } = {}) {
    if (state.nativeToken) {
      if (!state.nativeStatus) throw Error(state.nativeError || 'Reconnect this phone before pairing a computer.');
      throw Error('This is the phone. Start Connect Phone from the computer instead.');
    }
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
    state.pairing = { ...offer, pair, fileId: file.id, automatic: !!automatic };
    state.lastError = '';
    event('pairing', { code, sessionId, expiresAt });
    schedulePairPoll(100);
    return { code, sessionId, expiresAt };
  }

  function pairingError(error) {
    state.lastError = error.message;
    event('status');
  }

  function schedulePairPoll(delay = 1600) {
    clearTimeout(pairTimer);
    if (!state.pairing) return;
    pairTimer = setTimeout(async () => {
      if (!state.pairing || pairBusy) return schedulePairPoll();
      pairBusy = true;
      try { await pollPairAnswer(); }
      catch (error) { pairingError(error); }
      finally {
        pairBusy = false;
        if (state.pairing) schedulePairPoll();
      }
    }, Math.max(100, Number(delay) || 1600));
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
    clearTimeout(pairTimer);
    await Promise.allSettled([deleteFile(answerFile.id), deleteFile(pairing.fileId)]);
    await persistSession();
    rememberPair(state.session);
    beginSession();
    event('connected', { deviceName: state.session.peerName });
    await refreshThreads().catch(error => { state.lastError = error.message; event('status'); });
  }

  async function cancelPairing(reason = '') {
    const pairing = state.pairing;
    state.pairing = null;
    clearTimeout(pairTimer);
    if (pairing?.fileId) deleteFile(pairing.fileId).catch(() => {});
    if (reason) state.lastError = reason;
    event('pairing-cancelled', { reason });
  }

  async function pollOffers() {
    if (offerBusy || !state.nativeStatus || !state.relayReady) return;
    offerBusy = true;
    try {
      if (state.backgroundRelay) {
        const result = await nativeCall('/v1/pairings', { timeout: 7000 });
        const rows = Array.isArray(result?.pairings) ? result.pairings : [];
        const ids = new Set(rows.map(row => text(row.sessionId)));
        for (const [id, offer] of pendingOffers) if (offer._native && !ids.has(id)) pendingOffers.delete(id);
        for (const row of rows) {
          if (!text(row.sessionId) || Number(row.expiresAt) <= now()) continue;
          const offer = { ...row, version: 1, type: 'offer', _native: true };
          pendingOffers.set(offer.sessionId, offer);
          event('pair-request', { offer: publicOffer(offer) });
        }
        return;
      }
      const files = await listFiles({ lotkeysRole: 'lotkeysPairOffer' });
      for (const file of files) {
        if (Number(file.appProperties?.expiresAt || 0) < now()) {
          pendingOffers.delete(file.appProperties?.sessionId);
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

  function scheduleNativeTick(delay = phonePollDelay()) {
    clearTimeout(nativeTimer);
    nativeTimer = setTimeout(async () => {
      await nativeTick().catch(() => {});
      scheduleNativeTick(phonePollDelay());
    }, Math.max(100, Number(delay) || PHONE_POLL_IDLE_MS));
  }

  function scheduleOfferPoll(delay = phonePollDelay()) {
    clearTimeout(offerTimer);
    offerTimer = setTimeout(async () => {
      await pollOffers().catch(() => {});
      scheduleOfferPoll(phonePollDelay());
    }, Math.max(100, Number(delay) || PHONE_POLL_IDLE_MS));
  }

  function scheduleFramePoll(delay = framePollDelay()) {
    clearTimeout(frameTimer);
    if (!state.session) return;
    frameTimer = setTimeout(async () => {
      if (!state.session) return;
      await pollFrames().catch(sessionError);
      if (state.session) scheduleFramePoll(framePollDelay());
    }, Math.max(100, Number(delay) || FRAME_POLL_ACTIVE_MS));
  }

  function scheduleHeartbeat(delay = heartbeatDelay()) {
    clearTimeout(heartbeatTimer);
    if (state.session?.role !== 'pc') return;
    heartbeatTimer = setTimeout(async () => {
      if (state.session?.role !== 'pc') return;
      await heartbeat().catch(sessionError);
      if (state.session?.role === 'pc') scheduleHeartbeat(heartbeatDelay());
    }, Math.max(100, Number(delay) || HEARTBEAT_IDLE_MS));
  }

  function workloadChanged() {
    const heavy = !!monitoringState().heavy;
    if (monitoringWasHeavy && !heavy) monitoringGraceUntil = now() + 15000;
    monitoringWasHeavy = heavy;
    scheduleNativeTick(heavy ? phonePollDelay() : 100);
    scheduleOfferPoll(heavy ? phonePollDelay() : 100);
    if (state.session) scheduleFramePoll(heavy ? framePollDelay() : 100);
    if (state.session?.role === 'pc') scheduleHeartbeat(heavy ? heartbeatDelay() : 100);
    event('status');
  }

  const publicOffer = offer => ({
    sessionId: offer.sessionId,
    code: offer.code,
    pcName: offer.pcName,
    requestedTrustMode: offer.requestedTrustMode,
    expiresAt: offer.expiresAt
  });

  function pendingPairings() {
    return [...pendingOffers.values()].filter(offer => offer._native ? Number(offer.expiresAt) > now() : P.validatePairOffer(offer)).map(publicOffer);
  }

  async function approvePair(sessionId, trustMode = '36h', { automatic = false } = {}) {
    const offer = pendingOffers.get(sessionId);
    if (offer?._native) {
      if (!['ask', '36h', '7d', 'until-disconnect'].includes(trustMode)) trustMode = '36h';
      await nativeCall('/v1/pairings/approve', {
        method: 'POST', body: JSON.stringify({ sessionId, trustMode }), timeout: 15000
      });
      pendingOffers.delete(sessionId);
      state.lastError = '';
      event('status');
      return status();
    }
    if (!offer || !P.validatePairOffer(offer)) throw Error('That pairing request expired. Start again from the computer.');
    if (!state.nativeStatus) throw Error('The Android phone layer is not available.');
    if (!['ask', '36h', '7d', 'until-disconnect'].includes(trustMode)) trustMode = '36h';
    if (state.session) await disconnect({ notify: true, reason: 'moved', movedTo: offer.pcName });
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
    await persistSession();
    beginSession();
    event('connected', { deviceName: offer.pcName, automatic });
    return status();
  }

  async function rejectPair(sessionId) {
    const offer = pendingOffers.get(sessionId);
    if (!offer) return;
    if (offer._native) {
      await nativeCall('/v1/pairings/reject', {
        method: 'POST', body: JSON.stringify({ sessionId }), timeout: 15000
      });
      pendingOffers.delete(sessionId);
      event('pair-rejected', { sessionId });
      return;
    }
    await createFile('LotKeys Phone Pair Declined ' + offer.sessionId + '.json', {
      version: 1, type: 'answer', sessionId: offer.sessionId, code: offer.code, rejected: true, createdAt: now()
    }, { lotkeysRole: 'lotkeysPairAnswer', sessionId: offer.sessionId, expiresAt: String(offer.expiresAt) });
    pendingOffers.delete(sessionId);
    deleteFile(offer._fileId).catch(() => {});
    event('pair-rejected', { sessionId });
  }

  function beginSession() {
    clearTimeout(frameTimer);
    clearTimeout(heartbeatTimer);
    scheduleFramePoll(100);
    if (state.session?.role === 'pc') {
      scheduleHeartbeat(100);
    }
  }

  function sessionError(error) {
    state.lastError = error.message;
    event('status');
  }

  async function sendFrame(target, payload, session = state.session) {
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
    if (frameBusy || !state.session || (state.session.role === 'phone' && !state.relayReady)) return;
    frameBusy = true;
    const session = state.session;
    const target = session.role;
    try {
      const files = await listFiles({ lotkeysRole: 'lotkeysPhoneFrame', sessionId: session.sessionId, target });
      if (state.session !== session) return;
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
          if (state.session !== session) return;
          if (target === 'phone') await handlePhonePayload(payload, session);
          else handlePcPayload(payload, session);
        } finally {
          deleteFile(file.id).catch(() => {});
        }
      }
    } finally {
      frameBusy = false;
    }
  }

  async function handlePhonePayload(payload, session) {
    if (state.session !== session) return;
    if (payload.kind === 'event' && payload.event === 'disconnect') {
      await disconnect({ notify: false, reason: payload.reason || '', movedTo: payload.movedTo || '' });
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
      } else if (payload.op === 'media') {
        data = await nativeCall('/v1/media-handoff', { method: 'POST', body: JSON.stringify(payload.payload || {}), timeout: 60000 });
      } else if (payload.op === 'attachment') {
        data = await nativeCall('/v1/attachment?partId=' + encodeURIComponent(text(payload.payload?.partId)), { timeout: 45000 });
      } else if (payload.op === 'foreground') {
        data = { ok: true, trustExpiresAt: renewTrust() };
      } else throw Error('Unsupported phone request.');
      await sendFrame('pc', { kind: 'response', requestId: payload.id, ok: true, data }, session);
    } catch (error) {
      await sendFrame('pc', { kind: 'response', requestId: payload.id, ok: false, error: error.message || 'Phone request failed.' }, session);
    }
  }

  function handlePcPayload(payload, session) {
    if (state.session !== session) return;
    if (payload.kind === 'event') {
      if (payload.event === 'invalidate') {
        refreshThreads().catch(sessionError);
      }
      if (payload.event === 'disconnect') disconnect({ notify: false, reason: payload.reason || '', movedTo: payload.movedTo || '' }).catch(() => {});
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
      sendFrame('phone', { kind: 'request', id, op, payload }).then(() => scheduleFramePoll(100)).catch(error => {
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
      const result = await request('status', {}, monitoringState().heavy ? 45000 : 18000);
      state.lastPhoneSeenAt = now();
      state.session.lastSeenAt = now();
      state.session.phoneStatus = result;
      state.lastError = '';
      event('status');
      if (document.visibilityState === 'visible') request('foreground', {}, 18000).then(result => {
        if (!result?.trustExpiresAt || state.session?.role !== 'pc') return;
        state.session.trustExpiresAt = Number(result.trustExpiresAt) || state.session.trustExpiresAt;
        rememberPair(state.session);
        persistSession();
      }).catch(() => {});
    } catch (error) {
      state.lastError = error.message;
      event('status');
    } finally {
      heartbeatBusy = false;
    }
  }

  function renewTrust() {
    if (state.session?.role !== 'phone') return 0;
    const rows = trusts();
    const row = rows.find(item => item.browserId === state.session.browserId);
    if (!row) return Number(state.session.trustExpiresAt) || 0;
    row.lastConnectedAt = now();
    if (!['36h', '7d'].includes(row.mode)) {
      saveTrusts(rows);
      return Number(state.session.trustExpiresAt) || 0;
    }
    row.expiresAt = P.trustExpiry(row.mode);
    saveTrusts(rows);
    state.session.trustExpiresAt = row.expiresAt;
    persistSession();
    return row.expiresAt;
  }

  async function refreshThreads(offset = 0) {
    let page;
    if (state.nativeStatus) page = await nativeCall('/v1/threads?offset=' + Math.max(0, Number(offset) || 0));
    else if (connected()) page = await request('threads', { offset });
    else throw Error('Connect the phone before opening Device Messages.');
    const rows = Array.isArray(page.threads) ? page.threads : [];
    const nextThreads = offset ? [...state.threads, ...rows] : rows;
    const nextThreadPage = {
      hasMore: !!page.hasMore,
      nextOffset: Math.max(0, Number(page.nextOffset) || nextThreads.length),
      total: Math.max(nextThreads.length, Number(page.total) || 0)
    };
    const changed = JSON.stringify([state.threads, state.threadPage]) !== JSON.stringify([nextThreads, nextThreadPage]);
    state.threads = nextThreads;
    state.threadPage = nextThreadPage;
    state.lastError = '';
    if (changed) event('data', { reason: 'threads', page });
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

  async function sendMedia({ threadId, address, text: body = '', files = [] }) {
    if (!Array.isArray(files) || !files.length || files.length > 5) throw Error('Choose between one and five media items.');
    const total = files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
    const limit = state.nativeStatus ? 12 * 1024 * 1024 : 3 * 1024 * 1024;
    if (!total || total > limit) throw Error(state.nativeStatus ? 'Keep this media handoff under 12 MB.' : 'Computer-to-phone media is limited to 3 MB in this TEST connection.');
    const payload = {
      requestId: randomId(18), threadId, address, text: String(body || '').slice(0, 16000), transport: 'media',
      files: await Promise.all(files.map(async file => ({
        name: String(file.name || 'LotKeys media').replace(/[\\/]/g, '-').slice(0, 150),
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: standardBase64(await file.arrayBuffer())
      })))
    };
    let receipt;
    if (state.nativeStatus) receipt = await nativeCall('/v1/media-handoff', { method: 'POST', body: JSON.stringify(payload), timeout: 60000 });
    else if (connected()) receipt = await request('media', payload, 120000);
    else throw Error('The phone disconnected. No media was handed off.');
    event('send-state', { receipt, threadId });
    return receipt;
  }

  async function attachment(partId) {
    let result;
    if (state.nativeStatus) result = await nativeCall('/v1/attachment?partId=' + encodeURIComponent(text(partId)), { timeout: 45000 });
    else if (connected()) result = await request('attachment', { partId }, 90000);
    else throw Error('The phone disconnected before the MMS attachment could be read.');
    if (!result?.data) throw Error('The phone did not return this MMS attachment.');
    const blob = new Blob([standardBytes(result.data)], { type: result.type || 'application/octet-stream' });
    return new File([blob], String(result.name || 'MMS attachment').replace(/[\\/]/g, '-').slice(0, 150), { type: blob.type });
  }

  function connected() {
    if (state.nativeToken && state.backgroundRelay) return !!state.nativeStatus?.relay?.connected;
    if (!state.session) return false;
    const staleAfter = monitoringState().heavy || now() < monitoringGraceUntil ? 90000 : state.session.role === 'phone' ? 35000 : 22000;
    if (state.session.role === 'phone' && (!state.nativeStatus || !state.relayReady)) return false;
    return now() - Math.max(state.session.lastSeenAt || 0, state.lastPhoneSeenAt || 0) < staleAfter;
  }

  async function disconnect({ notify = true, forget = false, reason = '', movedTo = '', keepRemembered = false } = {}) {
    if (state.nativeToken && state.backgroundRelay && !state.session) {
      await nativeCall('/v1/relay/disconnect', {
        method: 'POST', body: JSON.stringify({ forget: !!forget }), timeout: 15000
      });
      await wait(500);
      await nativeTick().catch(() => {});
      event('disconnected', { reason, movedTo });
      return;
    }
    const session = state.session;
    if (notify && session) await sendFrame(session.role === 'pc' ? 'phone' : 'pc', {
      kind: 'event', event: 'disconnect', reason: text(reason), movedTo: text(movedTo)
    }, session).catch(() => {});
    if (forget && session?.role === 'phone') saveTrusts(trusts().filter(row => row.browserId !== session.browserId));
    if (session?.trustMode === 'until-disconnect' && session.role === 'phone') {
      saveTrusts(trusts().filter(row => row.browserId !== session.browserId));
    }
    state.session = null;
    clearStoredSession();
    if (session?.role === 'pc' && !keepRemembered) forgetRememberedPair();
    state.threads = [];
    state.threadPage = { hasMore: false, nextOffset: 0, total: 0 };
    state.lastPhoneSeenAt = 0;
    clearTimeout(frameTimer);
    clearTimeout(heartbeatTimer);
    for (const [id, pending] of pendingRpc) {
      clearTimeout(pending.timer);
      pending.reject(Error('Phone disconnected. Nothing was sent.'));
      pendingRpc.delete(id);
    }
    if (state.nativeStatus) state.role = 'phone';
    if (reason === 'moved') state.lastError = movedTo ? `Messaging moved to ${movedTo}.` : 'Messaging moved to another computer.';
    event('disconnected', { reason, movedTo });
  }

  function forgetDevice(browser) {
    if (state.nativeToken && state.backgroundRelay) {
      state.nativeTrusts = state.nativeTrusts.filter(row => row.browserId !== browser);
      return nativeCall('/v1/relay/forget', {
        method: 'POST', body: JSON.stringify({ browserId: browser }), timeout: 15000
      }).then(() => nativeTick()).catch(error => { state.lastError = error.message; event('status'); });
    }
    saveTrusts(trusts().filter(row => row.browserId !== browser));
    if (state.session?.browserId === browser) return disconnect({ notify: true, forget: true });
  }

  async function disconnectAll() {
    if (state.nativeToken && state.backgroundRelay) {
      await nativeCall('/v1/relay/disconnect-all', { method: 'POST', body: '{}', timeout: 15000 });
      state.nativeTrusts = [];
      await wait(500);
      await nativeTick().catch(() => {});
      event('trust');
      return;
    }
    saveTrusts([]);
    pendingOffers.clear();
    await disconnect({ notify: true, forget: true });
    event('trust');
  }

  function status() {
    const sms = !!(state.nativeStatus?.capabilities?.smsHistory || state.session?.phoneStatus?.capabilities?.smsHistory || connected());
    const coverage = P.coverage({ connected: connected(), native: !!state.nativeStatus, sms, rcs: false });
    return {
      version: '0.9.4.98',
      role: state.nativeToken ? 'phone' : 'pc',
      nativeLinked: !!state.nativeToken,
      native: !!state.nativeStatus,
      nativeError: state.nativeError,
      relayReady: !!state.relayReady,
      relayIdentity: state.relayIdentity,
      connected: connected(),
      pairing: state.pairing ? { code: state.pairing.code, sessionId: state.pairing.sessionId, expiresAt: state.pairing.expiresAt, automatic: !!state.pairing.automatic } : null,
      deviceName: state.nativeStatus?.deviceName || state.session?.peerName || '',
      sourceApp: state.nativeStatus?.sourceApp || state.session?.phoneStatus?.sourceApp || '',
      peerName: state.nativeStatus?.relay?.peerName || state.session?.peerName || '',
      trustMode: state.nativeStatus?.relay?.trustMode || state.session?.trustMode || '',
      trustExpiresAt: Number(state.nativeStatus?.relay?.trustExpiresAt) || state.session?.trustExpiresAt || 0,
      coverage,
      capabilities: state.nativeStatus?.capabilities || state.session?.phoneStatus?.capabilities || {},
      lastError: state.lastError,
      pendingPairings: pendingPairings(),
      rememberedPair: rememberedPair(),
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
    const driveRestored = await Drive.restoreSessionAuthorization?.().catch(() => false);
    await nativeTick();
    state.relayReady = !!(state.backgroundRelay || (state.nativeStatus && (driveRestored || Drive.connected?.())));
    if (state.relayReady) {
      state.relayIdentity = state.backgroundRelay
        ? text(state.nativeStatus?.relay?.account).toLowerCase()
        : text((await Drive.getGoogleIdentity().catch(() => null))?.email).toLowerCase();
    }
    await restoreSession();
    monitoringWasHeavy = !!monitoringState().heavy;
    scheduleNativeTick(phonePollDelay());
    scheduleOfferPoll(phonePollDelay());
    window.addEventListener('lotkeys-workload-change', workloadChanged);
    if (state.nativeStatus) {
      pollOffers().catch(() => {});
      refreshThreads().catch(() => {});
    }
    cleanupStale().catch(() => {});
    if (!state.nativeToken && !state.session) setTimeout(() => reconnectTrustedComputer().catch(() => {}), 500);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (state.nativeStatus && state.relayReady) {
          pollOffers().catch(() => {});
          if (state.session) scheduleFramePoll(100);
        } else if (!state.nativeToken && !state.session) reconnectTrustedComputer().catch(() => {});
      } else if (state.session) persistSession();
    });
    window.addEventListener('pagehide', () => { if (state.session) persistSession(); });
    event('ready');
  }

  window.LotKeysPhone = {
    version: '0.9.4.98',
    init,
    status,
    subscribe,
    connectNative,
    preparePhonePairing,
    reconnectTrustedComputer,
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
    sendMedia,
    attachment,
    disconnect,
    trusts,
    forgetDevice,
    disconnectAll,
    clearNativeLink: () => { localStorage.removeItem(TOKEN_KEY); state.nativeToken = ''; state.nativeStatus = null; state.relayReady = false; state.relayIdentity = ''; state.role = 'pc'; clearStoredSession(); event('status'); }
  };

  function initAfterBase() {
    if (window.__lotKeysBaseReady) setTimeout(() => init(), 0);
    else window.addEventListener('lotkeys-base-ready', () => init(), { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAfterBase, { once: true });
  else initAfterBase();
})();
