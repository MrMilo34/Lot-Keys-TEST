(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lotkeys-transfer-core.js'));
  else root.LotKeysNativeTransfers = factory(root.LotKeysTransferCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const CHUNK = 512 * 1024;
  function bridge() { return globalThis.LotKeysPhone; }
  async function available(account, phone = bridge()) {
    if (!phone?.uploadCapabilities) return false;
    try { const status = await phone.uploadCapabilities(); return status.capabilities?.backgroundUploads === true && String(status.uploadAccount || '').toLowerCase() === String(account || '').toLowerCase(); }
    catch { return false; }
  }
  function base64(buffer) {
    const bytes = new Uint8Array(buffer); let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  async function handoff(plan, sources, { phone = bridge(), onProgress = () => {}, onPrepared = async () => {}, check = async () => {} } = {}) {
    await check();
    let snapshot = await phone.uploadCall('prepare', plan);
    if (!Core.sameContext(snapshot.context, plan.context)) throw Error('Android returned another account or Store upload.');
    // Persist the receipt BEFORE transferring bytes. A refresh resumes staging instead
    // of making a second batch while Android already owns part of the originals.
    await onPrepared(snapshot);
    if (snapshot.state !== 'staging') return snapshot;
    const total = plan.assets.reduce((sum, row) => sum + row.size, 0); let staged = 0;
    for (let item = 0; item < plan.assets.length; item++) {
      const source = sources.get(plan.assets[item].key);
      if (!(source instanceof Blob) || source.size !== plan.assets[item].size) throw Error('Keep the original file available until Android finishes preparing this save.');
      let offset = Number(snapshot.assets[item].staged) || 0;
      if (offset < 0 || offset > source.size) throw Error('Android returned an invalid original-file checkpoint.');
      staged += offset;
      while (offset < source.size) {
        await check();
        const end = Math.min(source.size, offset + CHUNK), bytes = base64(await source.slice(offset, end).arrayBuffer());
        let receipt;
        try { receipt = await phone.uploadCall('chunk', { id: snapshot.id, item, offset, base64: bytes }); }
        catch { receipt = await phone.uploadCall('chunk', { id: snapshot.id, item, offset, base64: bytes }); }
        if (receipt.staged !== end) throw Error('Android has not confirmed the original-file handoff.');
        staged += end - offset; offset = end;
        onProgress({ phase: 'staging', staged, total, percent: total ? Math.floor(staged * 100 / total) : 0 });
      }
    }
    await check(); snapshot = await phone.uploadCall('commit', { id: snapshot.id }, 180000);
    onProgress({ phase: 'queued', ...Core.progress(snapshot) });
    return snapshot;
  }
  async function wait(id, context, { phone = bridge(), check = async () => {}, onProgress = () => {}, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
    while (true) {
      await check(); const snapshot = await phone.uploadCall('status', { id });
      const result = Core.completed(snapshot, context); onProgress({ phase: snapshot.state, ...Core.progress(snapshot) });
      if (result) return result;
      if (Core.terminal(snapshot.state) || snapshot.state.startsWith('paused_')) {
        const error = Error(snapshot.error || 'The Android save needs attention. Reopen Android setup to resume.');
        error.nativeTransfer = true; error.nativeState = snapshot.state; error.snapshot = snapshot; throw error;
      }
      await delay(1500);
    }
  }
  async function hold(account, store, phone = bridge()) {
    if (!account || !store || !phone?.uploadCall) return;
    return phone.uploadCall('hold', { account, store }, 5000);
  }
  return { available, handoff, wait, hold, chunkSize: CHUNK };
});
