/**
 * Consistency tests for the guided tour.
 *
 * The tour points at live DOM selectors, so the failure mode that matters is
 * drift: a selector renamed in index.html leaves the tour highlighting nothing.
 * These checks are cheap and catch that without a browser.
 *
 * Run: node tests/test-tour.mjs
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TOUR_STEPS, TOUR_STORAGE_KEY } = require('../js/tour.js');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

// 1. Steps are well formed
{
  assert.ok(TOUR_STEPS.length >= 4, 'tour should cover the main features');
  for (const step of TOUR_STEPS) {
    assert.ok(step.selector && typeof step.selector === 'string', 'step needs a selector');
    assert.ok(step.title && step.title.length > 3, `step ${step.selector} needs a title`);
    assert.ok(step.body && step.body.length > 20, `step ${step.selector} needs a useful body`);
    assert.ok(
      step.selector.startsWith('#') || step.selector.startsWith('.'),
      `unsupported selector form: ${step.selector}`
    );
  }
  assert.strictEqual(new Set(TOUR_STEPS.map(s => s.selector)).size, TOUR_STEPS.length, 'duplicate selectors');
  console.log(`✅ ${TOUR_STEPS.length} tour steps are well formed`);
}

// 2. Every static step points at something that exists in index.html
{
  const present = (selector) => {
    if (selector.startsWith('#')) {
      return html.includes(`id="${selector.slice(1)}"`);
    }
    const cls = selector.slice(1);
    return new RegExp(`class="[^"]*\\b${cls}\\b`).test(html);
  };

  const missing = TOUR_STEPS
    .filter(step => !step.dynamic)
    .filter(step => !present(step.selector));

  assert.deepStrictEqual(missing.map(s => s.selector), [], 'tour steps point at selectors missing from index.html');
  console.log('✅ every static tour anchor exists in index.html');
}

// 3. Dynamic steps are declared as such (the match ribbon is injected by JS)
{
  const ribbon = TOUR_STEPS.find(step => step.selector === '#match-ribbon');
  assert.ok(ribbon, 'tour should mention the match ribbon');
  assert.strictEqual(ribbon.dynamic, true, 'the injected ribbon must be flagged dynamic');
  console.log('✅ dynamically injected anchors are flagged');
}

// 4. Script order: tour.js loads before app.js, and after the switcher
{
  const tourAt = html.indexOf('js/tour.js');
  const appAt = html.indexOf('js/app.js');
  const switcherAt = html.indexOf('js/match-switcher.js');

  assert.ok(tourAt > -1, 'js/tour.js is not loaded');
  assert.ok(appAt > tourAt, 'app.js must load after tour.js (it constructs GuidedTour)');
  assert.ok(switcherAt > -1 && switcherAt < appAt, 'match-switcher.js must load before app.js');
  console.log('✅ script order is correct');
}

// 5. Controls the tour is launched from exist
{
  assert.ok(html.includes('id="btn-help"'), 'missing the replay button');
  assert.ok(html.includes('id="timeline-hint"'), 'missing the per-ball hint');
  console.log('✅ help button and timeline hint exist');
}

// 6. Styles the tour depends on are present
{
  for (const selector of ['.tour-root', '.tour-spotlight', '.tour-card', '.tour-dot', '.timeline-hint']) {
    assert.ok(css.includes(selector), `css is missing ${selector}`);
  }
  assert.ok(/prefers-reduced-motion/.test(css), 'tour styles ignore reduced-motion');
  console.log('✅ tour styles present, including reduced-motion handling');
}

// 7. Storage key is versioned so a redesign can re-run the tour
{
  assert.ok(/^criciq-tour-v\d+$/.test(TOUR_STORAGE_KEY), `unexpected storage key: ${TOUR_STORAGE_KEY}`);
  console.log('✅ tour storage key is versioned');
}

console.log('\n✅ all tour tests passed');
