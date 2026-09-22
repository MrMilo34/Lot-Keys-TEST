/* LotKeys Hub V0.9.4.83 — pure models for contacts, organization and appointments. */
(function (root) {
  'use strict';

  const uid = (prefix = 'H') => prefix + '-' + (
    globalThis.crypto?.randomUUID?.() ||
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')
  );
  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
  const color = value => /^#[0-9a-f]{6}$/i.test(text(value)) ? text(value) : '';

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

  function validPhone(value) {
    return /^\+?\d{7,15}$/.test(phone(value));
  }

  function primary(contact) {
    return (contact?.fields || []).find(field => field.kind === 'phone' && field.primary) ||
      (contact?.fields || []).find(field => field.kind === 'phone') || null;
  }

  function nextLabel(fields, kind, label) {
    const taken = new Set(fields.map(field => text(field.label).toLowerCase()));
    if (!taken.has(label.toLowerCase())) return label;
    let number = 2;
    while (taken.has((label + ' ' + number).toLowerCase())) number += 1;
    return label + ' ' + number;
  }

  const LABELS = {
    phone: 'Cellphone',
    email: 'Email',
    alias: 'Alias',
    birthday: 'Birthday',
    address: 'Address',
    text: 'Custom field'
  };

  function field(fields, kind = 'text', base = '') {
    return {
      id: uid('F'),
      kind,
      label: nextLabel(fields, kind, base || LABELS[kind] || 'Field'),
      value: '',
      ...(kind === 'phone' ? { phoneType: 'cell', primary: !fields.some(item => item.kind === 'phone') } : {})
    };
  }

  function categoryIds(contact) {
    const values = Array.isArray(contact?.categoryIds)
      ? contact.categoryIds
      : contact?.categoryId
        ? [contact.categoryId]
        : [];
    return [...new Set(values.map(text).filter(Boolean))];
  }

  function normalizeContact(contact) {
    const clean = { ...(contact || {}), categoryIds: categoryIds(contact) };
    delete clean.categoryId;
    return clean;
  }

  function normalizeCategories(items) {
    const rows = (Array.isArray(items) ? items : [])
      .map((item, index) => ({
        id: text(item?.id) || uid('CAT'),
        name: text(item?.name).slice(0, 40),
        color: color(item?.color) || '#2563eb',
        parentId: text(item?.parentId),
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index
      }))
      .filter(item => item.name);
    const byId = new Map(rows.map(item => [item.id, item]));
    for (const item of rows) {
      if (!item.parentId || item.parentId === item.id || !byId.has(item.parentId)) item.parentId = '';
    }
    for (const item of rows) {
      const parent = byId.get(item.parentId);
      if (parent?.parentId) item.parentId = parent.parentId;
    }
    return rows
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((item, order) => ({ ...item, order }));
  }

  function categoryClosure(contact, items) {
    const rows = normalizeCategories(items);
    const byId = new Map(rows.map(item => [item.id, item]));
    const found = new Set();
    for (const id of categoryIds(contact)) {
      let current = byId.get(id);
      while (current && !found.has(current.id)) {
        found.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : null;
      }
    }
    return [...found];
  }

  function categoryPath(item, items) {
    if (!item) return '';
    const parent = (items || []).find(row => row.id === item.parentId);
    return parent ? parent.name + ' / ' + item.name : item.name;
  }

  function validateContact(contact) {
    if (!text(contact.name)) throw Error('Enter a contact name.');
    const fields = contact.fields || [];
    const phones = fields.filter(item => item.kind === 'phone');
    if (!contact.lotkeysId && !phones.some(item => validPhone(item.value))) throw Error('Add a valid phone number.');
    for (const item of phones) {
      if (text(item.value) && !validPhone(item.value)) throw Error('Check ' + (item.label || 'phone number') + '.');
    }
    if (phones.length && phones.filter(item => item.primary).length !== 1) throw Error('Select one primary number.');
    if (phones.length && !validPhone(phones.find(item => item.primary)?.value)) throw Error('The primary phone number must be valid.');
    for (const item of fields) {
      if (item.kind === 'email' && text(item.value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value)) {
        throw Error('Check ' + (item.label || 'email') + '.');
      }
    }
    return contact;
  }

  function contactSearch(contact) {
    return [contact.name, ...(contact.fields || []).flatMap(item => [
      item.label,
      item.value,
      ...(item.kind === 'phone' ? [phone(item.value)] : [])
    ])].join(' ').toLowerCase();
  }

  function matches(contact, query) {
    query = text(query).toLowerCase();
    if (!query) return true;
    if (contactSearch(contact).includes(query)) return true;
    const digits = query.replace(/\D/g, '');
    return digits.length >= 3 && (contact.fields || []).some(item =>
      item.kind === 'phone' && phone(item.value).replace(/\D/g, '').includes(digits)
    );
  }

  function conversationMatch(row, query) {
    return matches(row.contact || {
      name: row.title,
      fields: [
        { kind: 'phone', value: row.phone || row.address || '' },
        { kind: 'email', value: row.email || '' }
      ]
    }, query) || text(row.title + ' ' + (row.preview || '')).toLowerCase().includes(text(query).toLowerCase());
  }

  function filtered(rows, {
    scope = 'all',
    filter = 'all',
    selectedCategories = [],
    categoryRows = [],
    query = ''
  } = {}) {
    const wanted = [...new Set((selectedCategories || []).map(text).filter(Boolean))];
    return rows.filter(row => {
      if (scope !== 'all' && row.source !== scope) return false;
      if (wanted.length) {
        if (row.source !== 'device') return false;
        const assigned = categoryClosure(row.contact, categoryRows);
        if (!wanted.some(id => assigned.includes(id))) return false;
      }
      if (filter === 'unread' && !(row.unread > 0)) return false;
      if (filter === 'groups' && row.group !== true) return false;
      if (filter === 'contacts' && !(row.favorite || row.contact)) return false;
      return conversationMatch(row, query);
    }).sort((a, b) => (b.at || 0) - (a.at || 0) || text(a.title).localeCompare(text(b.title)));
  }

  function localDay(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function atLocal(date, time) {
    const value = new Date(date + 'T' + time + ':00');
    const actual = String(value.getHours()).padStart(2, '0') + ':' + String(value.getMinutes()).padStart(2, '0');
    if (!Number.isFinite(value.getTime()) || localDay(value) !== date || actual !== time) {
      throw Error('That local date/time does not exist. Check the date and daylight-saving change.');
    }
    return value.toISOString();
  }

  function agenda(rows, date) {
    return rows.filter(item => localDay(item.start) === date && !item.deleted)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }

  function overlap(rows, appointment) {
    return rows.filter(item =>
      item.id !== appointment.id &&
      !item.deleted &&
      !['Cancelled', 'Completed', 'No show'].includes(item.status) &&
      Date.parse(appointment.start) < Date.parse(item.end) &&
      Date.parse(appointment.end) > Date.parse(item.start)
    );
  }

  function monthCells(date) {
    date = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const begin = new Date(date);
    begin.setDate(begin.getDate() - begin.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(begin);
      day.setDate(begin.getDate() + index);
      return day;
    });
  }

  function ics(appointment) {
    const clean = value => String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
    const stamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const encoder = new TextEncoder();
    const fold = line => {
      let output = '';
      let part = '';
      let count = 0;
      for (const character of line) {
        const next = encoder.encode(character).length;
        if (count + next > 75) {
          output += part + '\r\n';
          part = ' ';
          count = 1;
        }
        part += character;
        count += next;
      }
      return output + part;
    };
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LotKeys//Hub//EN',
      'BEGIN:VEVENT',
      'UID:' + String(appointment.id || 'appointment').replace(/[^A-Za-z0-9_-]/g, '_') + '@lot-keys.ca',
      'DTSTAMP:' + stamp(new Date()),
      'DTSTART:' + stamp(appointment.start),
      'DTEND:' + stamp(appointment.end),
      'SUMMARY:' + clean(appointment.title),
      'LOCATION:' + clean(appointment.location),
      'DESCRIPTION:' + clean(appointment.vehicleLabel || ''),
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].map(fold).join('\r\n');
  }

  const questions = [
    ['purchaseMethod', 'Cash or financing', 'Are you planning to pay cash, or would you like financing options?'],
    ['budget', 'Budget / payment target', 'What price range or payment range would feel comfortable for you?'],
    ['downPayment', 'Down payment', 'Have you thought about an amount you would like to put down?'],
    ['reason', 'Reason for buying', 'What would you like your next vehicle to do better than your current one?'],
    ['timeframe', 'Purchase timeframe', 'When would you ideally like to have the next vehicle?'],
    ['searchDuration', 'Time spent searching', 'How long have you been looking, and what have you already tried?'],
    ['trade', 'Trade-in & details', 'Are you replacing a vehicle? What is the year, make, model and mileage?'],
    ['decisionMakers', 'People involved', 'Will anyone else want to see or discuss the vehicle before you decide?'],
    ['dealType', 'In person or remote', 'Would you prefer to visit us or work through the details by phone?'],
    ['coApplicant', 'Co-applicant discussion', 'Would anyone else be applying for financing with you?'],
    ['features', 'Important features', 'Which features are must-haves for you?']
  ];

  // Conservative local suggestions only. They never make credit decisions or write CRM data automatically.
  function suggestNotes(input) {
    const source = text(input).slice(0, 12000);
    if (/\b(?:SIN|social insurance|social security|licen[cs]e\s*(?:number|#))\b/i.test(source)) return [];
    const output = [];
    const add = (key, value, match) => {
      if (match && !/\b(?:not|don't|won't|no longer|maybe|if|isn't|wasn't|without)\b/i.test(
        source.slice(Math.max(0, match.index - 50), match.index + match[0].length)
      )) output.push({ key, value, source: match[0].slice(0, 160) });
    };
    let match = source.match(/\b(?:pay(?:ing)?|buy(?:ing)?|purchase)\s+(?:with |in |by )?cash\b/i);
    add('purchaseMethod', 'Cash', match);
    match = source.match(/\b(?:want|need|using|use|choose|interested in)\s+(?:to |the )?financ(?:ing|e)\b/i);
    add('purchaseMethod', 'Financing', match);
    match = source.match(/\b(?:down payment|money down|put down)\s*(?:is |of |about |would be )?\$?([\d,]+(?:\.\d{1,2})?)\b/i) ||
      source.match(/\$([\d,]+(?:\.\d{1,2})?)\s*(?:as a )?down payment\b/i);
    add('downPayment', match ? '$' + match[1] : '', match);
    match = source.match(/\b(?:my |our )?budget\s*(?:is|of|around|about|:)\s*\$?([\d,]+(?:\.\d{1,2})?)\b/i);
    add('budget', match ? '$' + match[1] : '', match);
    return output.filter((item, index) => output.findIndex(other => other.key === item.key) === index);
  }

  const api = {
    uid,
    text,
    esc,
    color,
    phone,
    validPhone,
    primary,
    nextLabel,
    field,
    categoryIds,
    normalizeContact,
    normalizeCategories,
    categoryClosure,
    categoryPath,
    validateContact,
    matches,
    filtered,
    localDay,
    atLocal,
    agenda,
    overlap,
    monthCells,
    ics,
    questions,
    suggestNotes
  };

  root.LotKeysHubCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
