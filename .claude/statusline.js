#!/usr/bin/env node
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Unknown';
    const pct = Math.floor(data.context_window?.used_percentage || 0);
    const cost = (data.cost?.total_cost_usd || 0).toFixed(2);
    const durationMs = data.cost?.total_duration_ms || 0;
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);

    const RED = '\x1b[31m', YELLOW = '\x1b[33m', GREEN = '\x1b[32m';
    const CYAN = '\x1b[36m', RESET = '\x1b[0m';
    const barColor = pct >= 90 ? RED : pct >= 70 ? YELLOW : GREEN;

    const filled = Math.floor(pct / 10);
    const bar = '\u2593'.repeat(filled) + '\u2591'.repeat(10 - filled);

    console.log(
      `${CYAN}[${model}]${RESET} ${barColor}${bar}${RESET} ${pct}% | $${cost} | ${mins}m ${secs}s`
    );
  } catch {
    console.log('[AIDD]');
  }
});
