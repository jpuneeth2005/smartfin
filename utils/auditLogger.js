'use strict';

const AuditLog = require('../models/AuditLog');

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmPassword',
  'token',
  'csrfToken',
  'session',
  'sessionId',
  'cookie',
  'secret',
  'authorization',
]);

function safeMetadata(value, depth = 0) {
  if (value === null || value === undefined) return null;
  if (depth > 3) return '[truncated]';
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeMetadata(item, depth + 1));
  if (typeof value === 'object') {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      result[key] = safeMetadata(child, depth + 1);
    }
    return result;
  }
  return String(value).slice(0, 500);
}

async function recordAudit({ actor, actorEmail, action, targetType, targetId = null, metadata = {} }) {
  try {
    await AuditLog.create({
      actor: actor || null,
      actorEmail: actorEmail || null,
      action,
      targetType,
      targetId,
      metadata: safeMetadata(metadata),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Audit log write failed:', error.name);
    }
  }
}

module.exports = { recordAudit, safeMetadata };
