/**
 * CricIQ — first-run guided tour
 *
 * A lightweight spotlight tour over the real interface. No dependency, no video,
 * no screenshots to re-shoot when the UI changes: each step points at a selector,
 * so if the markup moves the highlight follows it.
 *
 * - Runs once per browser (localStorage), replayable from the header "?" button.
 * - Non-blocking: the dimmed backdrop ignores pointer events, the page stays usable.
 * - Keyboard: ArrowRight/Enter next, ArrowLeft back, Escape close.
 * - Respects prefers-reduced-motion.
 */

const TOUR_STORAGE_KEY = 'criciq-tour-v1';

const TOUR_STEPS = [
  {
    selector: '#match-ribbon',
    dynamic: true, // injected by MatchSwitcher, so not present in index.html
    title: 'Start with a match',
    body: 'Live and upcoming fixtures appear here when a scores key is configured. With nothing in progress, the DEMO card replays a real IPL powerplay ball by ball.'
  },
  {
    selector: '.scorecard-card',
    title: 'The score, as it happens',
    body: 'Runs, wickets and overs, with the two batters at the crease and the bowler figures. Every number is computed from the ball data, never hard-coded.'
  },
  {
    selector: '#ball-timeline',
    title: 'Every ball is clickable',
    body: 'Colours tell the story: green is four, gold is six, red is a wicket, purple is an extra. Click any ball to ask CricIQ about that exact delivery.'
  },
  {
    selector: '.ai-card',
    title: 'Three ways to ask',
    body: '“What just happened” explains the latest ball, “Catch me up” summarises the innings, and “Ask me anything” answers your own question — grounded only in the match data.'
  },
  {
    selector: '.controls-card',
    title: 'Control the pace',
    body: 'Play or pause the replay, step one ball at a time, or change the speed. Nothing is live-streamed, so you can rewind the whole match.'
  }
];

class GuidedTour {
  constructor(options = {}) {
    this.steps = options.steps || TOUR_STEPS;
    this.storageKey = options.storageKey || TOUR_STORAGE_KEY;
    this.root = null;
    this.index = -1;
    this.activeSteps = [];
    this.lastFocused = null;
    this.onViewportChange = () => this.schedulePosition();
    this.frame = null;
  }

  /* ------------------------------ persistence ------------------------------ */

  hasSeen() {
    try {
      return localStorage.getItem(this.storageKey) === 'done';
    } catch (e) {
      return true; // storage blocked: do not nag on every load
    }
  }

  markSeen() {
    try {
      localStorage.setItem(this.storageKey, 'done');
    } catch (e) {
      /* private mode: the tour simply shows again next visit */
    }
  }

  resetSeen() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      /* ignore */
    }
  }

  /* ------------------------------ lifecycle ------------------------------ */

  /**
   * Steps whose anchor is actually on the page right now.
   *
   * Visibility is judged by computed style, not by box size: the timeline is
   * legitimately empty (and 0px tall) before the first ball, and that is exactly
   * when the "click any ball" step is most useful.
   */
  resolveSteps() {
    return this.steps.filter(step => {
      const el = document.querySelector(step.selector);
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  /**
   * Start the tour.
   * @param {{force?: boolean}} options force = replay even if already seen
   * @returns {boolean} whether the tour actually opened
   */
  start(options = {}) {
    if (!options.force && this.hasSeen()) return false;

    this.activeSteps = this.resolveSteps();
    if (!this.activeSteps.length) return false;

    this.build();
    this.lastFocused = document.activeElement;
    document.body.classList.add('tour-open');
    window.addEventListener('resize', this.onViewportChange);
    window.addEventListener('scroll', this.onViewportChange, { passive: true, capture: true });

    this.showStep(0);
    return true;
  }

  build() {
    this.destroy();

    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = document.createElement('div');
    root.id = 'tour-root';
    root.className = `tour-root${reduceMotion ? ' tour-reduced' : ''}`;
    root.innerHTML = `
      <div class="tour-spotlight" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body" tabindex="-1">
        <div class="tour-card-head">
          <span class="tour-count" aria-live="polite"></span>
          <button type="button" class="tour-skip" data-tour="skip">Skip</button>
        </div>
        <h3 id="tour-title" class="tour-title"></h3>
        <p id="tour-body" class="tour-body"></p>
        <div class="tour-card-foot">
          <div class="tour-dots" aria-hidden="true"></div>
          <div class="tour-actions">
            <button type="button" class="tour-btn tour-btn-ghost" data-tour="prev">Back</button>
            <button type="button" class="tour-btn tour-btn-primary" data-tour="next">Next</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(root);
    this.root = root;

    root.querySelector('[data-tour="skip"]').addEventListener('click', () => this.finish());
    root.querySelector('[data-tour="prev"]').addEventListener('click', () => this.prev());
    root.querySelector('[data-tour="next"]').addEventListener('click', () => this.next());

    this.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.finish();
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        // Enter only advances from the buttons, not while typing anywhere.
        if (event.key === 'ArrowRight' || event.target.tagName === 'BUTTON') {
          event.preventDefault();
          this.next();
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.prev();
      }
    });

    this.el = {
      spotlight: root.querySelector('.tour-spotlight'),
      card: root.querySelector('.tour-card'),
      title: root.querySelector('.tour-title'),
      body: root.querySelector('.tour-body'),
      count: root.querySelector('.tour-count'),
      dots: root.querySelector('.tour-dots'),
      prev: root.querySelector('[data-tour="prev"]'),
      next: root.querySelector('[data-tour="next"]')
    };
  }

  destroy() {
    const existing = document.getElementById('tour-root');
    if (existing) existing.remove();
    this.root = null;
    this.el = null;
    document.body.classList.remove('tour-open');
    window.removeEventListener('resize', this.onViewportChange);
    window.removeEventListener('scroll', this.onViewportChange, true);
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  /* ------------------------------ steps ------------------------------ */

  showStep(index) {
    if (!this.root) return;
    const clamped = Math.max(0, Math.min(index, this.activeSteps.length - 1));
    this.index = clamped;

    const step = this.activeSteps[clamped];
    const target = document.querySelector(step.selector);
    if (!target) {
      this.next();
      return;
    }

    this.target = target;
    this.el.title.textContent = step.title;
    this.el.body.textContent = step.body;
    this.el.count.textContent = `Step ${clamped + 1} of ${this.activeSteps.length}`;
    this.el.prev.disabled = clamped === 0;
    this.el.next.textContent = clamped === this.activeSteps.length - 1 ? 'Done' : 'Next';

    this.el.dots.innerHTML = this.activeSteps
      .map((_, i) => `<span class="tour-dot${i === clamped ? ' active' : ''}"></span>`)
      .join('');

    this.root.classList.add('tour-visible');

    // Bring the target into view, then position once layout settles.
    const reduceMotion = this.root.classList.contains('tour-reduced');
    target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    this.el.card.focus({ preventScroll: true });
    this.schedulePosition();
    setTimeout(() => this.position(), reduceMotion ? 0 : 320);
  }

  schedulePosition() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.position();
    });
  }

  position() {
    if (!this.root || !this.target) return;

    const rect = this.target.getBoundingClientRect();
    const pad = 8;
    const spot = this.el.spotlight;
    spot.style.top = `${Math.round(rect.top - pad)}px`;
    spot.style.left = `${Math.round(rect.left - pad)}px`;
    spot.style.width = `${Math.round(rect.width + pad * 2)}px`;
    spot.style.height = `${Math.round(rect.height + pad * 2)}px`;

    const card = this.el.card;
    const cardRect = card.getBoundingClientRect();
    const margin = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Narrow screens: pin the card to the bottom like a sheet.
    if (viewportW < 560) {
      card.style.left = `${margin}px`;
      card.style.right = `${margin}px`;
      card.style.width = 'auto';
      card.style.top = 'auto';
      card.style.bottom = `${margin}px`;
      return;
    }

    card.style.bottom = 'auto';
    card.style.width = '340px';

    let top = rect.bottom + pad + margin;
    if (top + cardRect.height > viewportH - margin) {
      top = rect.top - pad - margin - cardRect.height;
    }
    top = Math.max(margin, Math.min(top, viewportH - cardRect.height - margin));

    let left = rect.left + rect.width / 2 - 170;
    left = Math.max(margin, Math.min(left, viewportW - 340 - margin));

    card.style.top = `${Math.round(top)}px`;
    card.style.left = `${Math.round(left)}px`;
  }

  next() {
    if (this.index >= this.activeSteps.length - 1) {
      this.finish();
    } else {
      this.showStep(this.index + 1);
    }
  }

  prev() {
    if (this.index > 0) this.showStep(this.index - 1);
  }

  finish() {
    this.markSeen();
    // Restore focus to whatever opened the tour; when it auto-started on load
    // that was <body>, so land on the replay button instead of nowhere.
    const restore = this.lastFocused && this.lastFocused !== document.body ? this.lastFocused : null;
    this.destroy();
    const target = restore || document.getElementById('btn-help');
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }
    if (typeof this.onFinish === 'function') this.onFinish();
  }
}

if (typeof window !== 'undefined') {
  window.GuidedTour = GuidedTour;
  window.TOUR_STEPS = TOUR_STEPS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GuidedTour, TOUR_STEPS, TOUR_STORAGE_KEY };
}
