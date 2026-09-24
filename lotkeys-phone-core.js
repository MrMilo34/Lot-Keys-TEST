/* LotKeys Phone V0.9.4.88 — pure identity, trust and conversation helpers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LotKeysPhoneCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const text = value => String(value ?? '').trim();

  function phone(value) {
    let normalized = text(value)
      .replace(/^tel:/i, '')
      .replace(/(?:ext\.?|x)\s*\d+$/i, '')
      .replace(/[^+\d]/g, '');
    if (normalized.startsWith('00')) normalized = '+' + normalized.slice(2);
    const digits = normalized.replace(/\D/g, '');
    if (digits.length === 10) return '+1' + digits;
    if (digits.length === 11 && digits[0] === '1') return '+' + digits;
    return normalized.startsWith('+') && digits.length >= 7 && digits.length <= 15 ? '+' + digits : digits;
  }

  function contactPhone(contact) {
    const fields = Array.isArray(contact?.fields) ? contact.fields : [];
    const field = fields.find(item => item.kind === 'phone' && item.primary) || fields.find(item => item.kind === 'phone');
    return phone(field?.value || '');
  }

  function contactFor(thread, contacts = []) {
    const wanted = phone(thread?.address || '');
    if (!wanted) return null;
    return contacts.find(contact => (contact.fields || []).some(field => field.kind === 'phone' && phone(field.value) === wanted)) || null;
  }

  function sortingFor(thread, sorting = []) {
    const wanted = phone(thread?.address || '');
    return wanted ? sorting.find(item => phone(item.phone) === wanted) || null : null;
  }

  function displayName(thread, contacts = []) {
    const contact = contactFor(thread, contacts);
    return text(contact?.name) || text(thread?.phoneContactName) || text(thread?.title) || text(thread?.address) || 'Unknown number';
  }

  function decorateThread(thread, contacts = [], sorting = []) {
    const contact = contactFor(thread, contacts);
    const sort = sortingFor(thread, sorting);
    const categoryIds = [...new Set([
      ...(Array.isArray(sort?.categoryIds) ? sort.categoryIds : []),
      ...(!sort && Array.isArray(contact?.categoryIds) ? contact.categoryIds : [])
    ].map(text).filter(Boolean))];
    return {
      ...thread,
      source: 'device',
      contact: contact || null,
      sorting: sort || null,
      title: displayName(thread, contacts),
      phone: phone(thread?.address || ''),
      organization: {
        categoryIds,
        primaryCategoryId: text(sort?.primaryCategoryId || contact?.primaryCategoryId || categoryIds[0] || '')
      }
    };
  }

  function normalizeThreads(rows, contacts = [], sorting = []) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : [])
      .filter(row => row && /^smsmms-\d{1,18}$/.test(text(row.id)) && !seen.has(row.id) && seen.add(row.id))
      .map(row => decorateThread({
        ...row,
        at: Number(row.at) || 0,
        unread: Math.max(0, Number(row.unread) || 0),
        preview: text(row.preview).slice(0, 350),
        address: text(row.address).slice(0, 100),
        phoneContactName: text(row.phoneContactName).slice(0, 300),
        group: !!row.group,
        canReply: !!row.canReply
      }, contacts, sorting))
      .sort((left, right) => right.at - left.at || left.title.localeCompare(right.title));
  }

  function trustExpiry(mode, now = Date.now()) {
    if (mode === '36h') return now + 36 * 60 * 60 * 1000;
    if (mode === '7d') return now + 7 * 24 * 60 * 60 * 1000;
    if (mode === 'until-disconnect') return Number.MAX_SAFE_INTEGER;
    return 0;
  }

  function trustValid(record, browserId, now = Date.now()) {
    if (!record || text(record.browserId) !== text(browserId) || record.mode === 'ask') return false;
    return record.mode === 'until-disconnect' || Number(record.expiresAt) > now;
  }

  function coverage({ connected = false, native = false, sms = false, rcs = false } = {}) {
    if (!connected && !native) return { level: 'red', label: 'Phone unavailable', detail: 'Device Messages are locked.' };
    if (sms && rcs) return { level: 'green', label: 'Full coverage', detail: 'SMS/MMS and the RCS safety watcher are active.' };
    if (sms) return { level: 'amber', label: 'SMS/MMS live', detail: 'RCS safety coverage is not enabled yet.' };
    return { level: 'red', label: 'Messages unavailable', detail: 'Repair Android Messages access.' };
  }

  function validatePairOffer(value, now = Date.now()) {
    if (!value || value.version !== 1 || value.type !== 'offer') return false;
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(text(value.sessionId))) return false;
    if (!/^\d{4}$/.test(text(value.code))) return false;
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(text(value.browserId))) return false;
    if (!value.publicKey || value.publicKey.kty !== 'EC' || value.publicKey.crv !== 'P-256') return false;
    return Number(value.expiresAt) > now && Number(value.expiresAt) <= now + 15 * 60 * 1000;
  }

  return {
    version: '0.9.4.88',
    phone,
    contactPhone,
    contactFor,
    sortingFor,
    displayName,
    decorateThread,
    normalizeThreads,
    trustExpiry,
    trustValid,
    coverage,
    validatePairOffer
  };
});
