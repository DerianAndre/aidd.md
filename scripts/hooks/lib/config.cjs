'use strict';
// AIDD Hooks — shared config utilities.
// Used by blocking and informational hooks to read .aidd/config.json.
// Fail-safe: returns true (tracking enabled) on any error.
const { resolve } = require('path');
const { readFileSync } = require('fs');

/**
 * Returns true if session tracking is enabled (default).
 * Returns false only when config explicitly sets content.sessionTracking = false.
 */
function isSessionTracking() {
  try {
    const cfg = JSON.parse(readFileSync(resolve('.aidd', 'config.json'), 'utf8'));
    return cfg?.content?.sessionTracking !== false;
  } catch {
    return true;
  }
}

module.exports = { isSessionTracking };
