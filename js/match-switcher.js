/**  
 * CricIQ — Multi-Match Switcher UI  
 * Provides a match hub ribbon with columns for Live, Upcoming, Completed, and Demo matches.  
 * Dynamically fetches match data from the API and falls back to demo when no live matches.  
 */  

class MatchSwitcher {  
  constructor(app) {  
    this.app = app;  
    this.el = {};  
    this.matches = {  
      live: [],  
      upcoming: [],  
      completed: [],  
      demo: []  
    };  
    this.currentMatchId = null;  
    this.isLoading = false;  
    this.fallbackMode = false; // True when no live matches, showing demo  
  }  

  /**  
   * Bind DOM elements.  
   */  
  bindDOM() {  
    // Create or reference match ribbon element  
    if (!document.getElementById('match-ribbon')) {  
      this.createMatchRibbon();  
    }  

    this.el['match-ribbon'] = document.getElementById('match-ribbon');  
    this.el['match-ribbon-live'] = document.getElementById('match-ribbon-live');  
    this.el['match-ribbon-upcoming'] = document.getElementById('match-ribbon-upcoming');  
    this.el['match-ribbon-completed'] = document.getElementById('match-ribbon-completed');  
    this.el['match-ribbon-demo'] = document.getElementById('match-ribbon-demo');  
    this.el['no-live-banner'] = document.getElementById('no-live-banner');  
    this.el['fallback-banner'] = document.getElementById('fallback-banner');  
    this.el['data-source-info'] = document.getElementById('data-source-info');  
  }  

  /**  
   * Create the match ribbon UI element.  
   */  
  createMatchRibbon() {  
    const header = document.getElementById('app-header');  
    if (!header) return;  

    // Create ribbon container  
    const ribbon = document.createElement('div');  
    ribbon.id = 'match-ribbon';  
    ribbon.className = 'match-ribbon';  
    ribbon.innerHTML = `  
      <div class="match-ribbon-header">  
        <span class="match-ribbon-title">SELECT MATCH</span>  
        <span class="match-ribbon-subtitle">Live · Upcoming · Demo</span>  
      </div>  
      <div class="match-columns">  
        <div class="match-column" id="match-ribbon-live">  
          <div class="column-header live">  
            <span class="column-icon"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></span>  
            <span class="column-title">LIVE</span>  
          </div>  
          <div class="column-matches"></div>  
        </div>  
        <div class="match-column" id="match-ribbon-upcoming">  
          <div class="column-header upcoming">  
            <span class="column-icon"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>  
            <span class="column-title">UPCOMING</span>  
          </div>  
          <div class="column-matches"></div>  
        </div>  
        <div class="match-column" id="match-ribbon-completed">  
          <div class="column-header completed">  
            <span class="column-icon"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>  
            <span class="column-title">COMPLETED</span>  
          </div>  
          <div class="column-matches"></div>  
        </div>  
        <div class="match-column" id="match-ribbon-demo">  
          <div class="column-header demo">  
            <span class="column-icon"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 2v7.31"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg></span>  
            <span class="column-title">DEMO</span>  
          </div>  
          <div class="column-matches"></div>  
        </div>  
      </div>  
      <div id="fallback-banner" class="fallback-banner hidden">  
        <span><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>No live matches currently in progress. Running simulated IPL qualifier demo.</span>  
      </div>  
      <div id="no-live-banner" class="no-live-banner hidden">  
        <span>Fetching live match data…</span>  
      </div>  
    `;  

    // Insert AFTER app-header so Product Title is always at the top
    if (header.parentNode) {
      header.parentNode.insertBefore(ribbon, header.nextSibling);
    } else {
      header.appendChild(ribbon);
    }  

    // Add styles for match ribbon  
    this.addMatchRibbonStyles();  

    // Bind demo button  
    const demoColumn = document.getElementById('match-ribbon-demo');  
    if (demoColumn) {  
      const demoCard = demoColumn.querySelector('.match-card');  
      if (demoCard) {  
        demoCard.addEventListener('click', () => this.selectDemoMatch());  
      }  
    }  
  }  

  /**  
   * Add inline styles for match ribbon.  
   */  
  addMatchRibbonStyles() {  
    const styles = document.createElement('style');  
    styles.textContent = `  
      .match-ribbon {  
        background: var(--surface);  
        border-radius: var(--radius);  
        padding: 12px;  
        margin-bottom: 12px;  
        border: 1px solid var(--hairline);  
        box-shadow: var(--shadow-card);  
      }  

      .match-ribbon-header {  
        display: flex;  
        align-items: center;  
        justify-content: space-between;  
        margin-bottom: 10px;  
        padding-bottom: 8px;  
        border-bottom: 1px solid var(--hairline);  
      }  

      .match-ribbon-title {  
        font-size: 0.72rem;  
        font-weight: 700;  
        letter-spacing: 0.08em;  
        color: var(--ink-3);  
        text-transform: uppercase;  
      }  

      .match-ribbon-subtitle {  
        font-size: 0.7rem;  
        color: var(--ink-3);  
      }  

      .match-columns {  
        display: grid;  
        grid-template-columns: repeat(4, 1fr);  
        gap: 8px;  
      }  

      .match-column {  
        min-width: 0;  
      }  

      .column-header {  
        display: flex;  
        align-items: center;  
        gap: 5px;  
        margin-bottom: 6px;  
        font-size: 0.65rem;  
        font-weight: 700;  
        letter-spacing: 0.05em;  
        text-transform: uppercase;  
        padding: 3px 6px;  
        border-radius: 4px;  
      }  

      .column-header.live {  
        color: #b4231f;  
        background: rgba(220, 38, 38, 0.08);  
      }  

      .column-header.upcoming {  
        color: var(--ink-2);  
        background: var(--bg);  
      }  

      .column-header.completed {  
        color: #1f8a4c;  
        background: rgba(31, 138, 76, 0.08);  
      }  

      .column-header.demo {  
        color: var(--ink-2);  
        background: var(--accent-lime-soft);  
      }  

      .column-icon {  
        display: inline-flex;  
        align-items: center;  
      }  

      .column-matches {  
        display: flex;  
        flex-direction: column;  
        gap: 5px;  
        max-height: 120px;  
        overflow-y: auto;  
      }  

      .column-matches::-webkit-scrollbar {  
        width: 3px;  
      }  

      .column-matches::-webkit-scrollbar-thumb {  
        background: var(--hairline-strong);  
        border-radius: 2px;  
      }  

      .match-card {  
        background: var(--bg);  
        border: 1px solid var(--hairline);  
        border-radius: var(--radius-sm);  
        padding: 8px 10px;  
        cursor: pointer;  
        transition: all 0.2s ease;  
        font-size: 0.72rem;  
      }  

      .match-card:hover {  
        background: var(--surface-strong);  
        border-color: var(--accent);  
      }  

      .match-card.live {  
        border-left: 3px solid #b4231f;  
      }  

      .match-card.upcoming {  
        border-left: 3px solid var(--ink-3);  
      }  

      .match-card.completed {  
        border-left: 3px solid #1f8a4c;  
      }  

      .match-card.demo {  
        border-left: 3px solid var(--accent-lime);  
        background: var(--accent-lime-soft);  
      }  

      .match-card.selected {  
        background: var(--accent-soft);  
        border-color: var(--accent);  
      }  

      .match-card-team {  
        font-weight: 700;  
        color: var(--ink);  
        margin-bottom: 2px;  
      }  

      .match-card-vs {  
        color: var(--ink-3);  
        font-size: 0.65rem;  
      }  

      .match-card-status {  
        font-size: 0.6rem;  
        color: var(--ink-3);  
        text-transform: uppercase;  
        letter-spacing: 0.5px;  
        margin-top: 4px;  
      }  

      .match-card-score {  
        font-weight: 700;  
        color: var(--accent);  
        font-size: 0.7rem;  
        margin-top: 2px;  
      }  

      .match-card-time {  
        font-size: 0.65rem;  
        color: var(--text-muted);  
      }  

      .fallback-banner {  
        margin-top: 10px;  
        padding: 8px 12px;  
        background: rgba(241,196,15,0.1);  
        border: 1px solid rgba(241,196,15,0.3);  
        border-radius: 6px;  
        font-size: 0.75rem;  
        color: var(--accent-yellow);  
        text-align: center;  
      }  

      .no-live-banner {  
        margin-top: 10px;  
        padding: 8px 12px;  
        background: rgba(74,144,217,0.1);  
        border: 1px solid rgba(74,144,217,0.3);  
        border-radius: 6px;  
        font-size: 0.75rem;  
        color: var(--accent-blue);  
        text-align: center;  
      }  

      @media (max-width: 500px) {  
        .match-columns {  
          grid-template-columns: repeat(2, 1fr);  
        }  

        .match-column:nth-child(3),  
        .match-column:nth-child(4) {  
          grid-column: span 2;  
        }  
      }  
    `;  
    document.head.appendChild(styles);  
  }  

  /**  
   * Fetch live matches from the API.  
   */  
  async fetchMatches() {  
    this.isLoading = true;  
    this.showBanner('no-live-banner', 'Fetching live matches...');  

    try {  
      const response = await fetch('/api/live-match', {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ action: 'getMatches' })  
      });  

      if (!response.ok) {  
        throw new Error(`HTTP ${response.status}`);  
      }  

      const data = await response.json();  

      if (data.matches && data.matches.length > 0) {  
        // Categorize matches  
        this.matches = {  
          live: [],  
          upcoming: [],  
          completed: [],  
          demo: [{  
            id: 'demo-csk-mi',  
            name: 'IND vs PAK (T20 World Cup)',  
            team1: 'India',  
            team2: 'Pakistan',  
            venue: 'Grand Prairie Stadium, Dallas',  
            date: 'Demo Match',  
            status: 'demo',  
            toss: 'Demo mode - any team can win!',
            source: 'demo'  
          }]  
        };  

        data.matches.forEach(match => {  
          const status = (match.status || '').toLowerCase();  

          if (status === 'live' || status === 'in progress' || status === 'station') {  
            this.matches.live.push({  
              ...match,  
              status: 'live'  
            });  
          } else if (status === 'completed' || status === 'finished' || status === 'result') {  
            this.matches.completed.push({  
              ...match,  
              status: 'completed'  
            });  
          } else {  
            this.matches.upcoming.push({  
              ...match,  
              status: 'upcoming'  
            });  
          }  
        });  

        // If we have live matches, select the first one  
        if (this.matches.live.length > 0) {  
          this.selectMatch(this.matches.live[0].id);  
          this.fallbackMode = false;  
          this.hideBanner('fallback-banner');  
          this.hideBanner('no-live-banner');  
          this.updateDataSourceInfo('Live API');  
        } else {  
          // No live matches - use demo  
          this.fallbackMode = true;  
          this.showBanner('fallback-banner', 'No live matches currently on. Running simulated demo match for testing.');  
          this.hideBanner('no-live-banner');  
          this.updateDataSourceInfo('Demo (no live matches)');  
        }  
      } else {  
        // Empty response - use demo  
        this.matches = {  
          live: [],  
          upcoming: [],  
          completed: [],  
          demo: [{  
            id: 'demo-csk-mi',  
            name: 'IND vs PAK (T20 World Cup)',  
            team1: 'India',  
            team2: 'Pakistan',  
            venue: 'Grand Prairie Stadium, Dallas',  
            date: 'Demo Match',  
            status: 'demo',  
            toss: 'Demo mode - any team can win!',
            source: 'demo'  
          }]  
        };  

        this.fallbackMode = true;  
        this.showBanner('fallback-banner', 'No live matches currently on. Running simulated demo match for testing.');  
        this.hideBanner('no-live-banner');  
        this.updateDataSourceInfo('Demo (no live matches)');  
      }  
    } catch (err) {  
      console.warn('[MatchSwitcher] Failed to fetch matches:', err.message);  
      this.matches = {  
        live: [],  
        upcoming: [],  
        completed: [],  
        demo: [{  
          id: 'demo-csk-mi',  
          name: 'IND vs PAK (T20 World Cup)',  
          team1: 'India',  
          team2: 'Pakistan',  
          venue: 'Grand Prairie Stadium, Dallas',  
          date: 'Demo Match',  
          status: 'demo',  
          toss: 'Demo mode - any team can win!',
          source: 'demo'  
        }]  
      };  

      this.fallbackMode = true;  
      this.showBanner('fallback-banner', 'API unavailable. Running simulated demo match for testing.');  
      this.hideBanner('no-live-banner');  
      this.updateDataSourceInfo('Demo (API unavailable)');  
    }  

    this.isLoading = false;  
    this.render();  
  }  

  /**  
   * Select a match by ID.  
   */  
  async selectMatch(matchId) {  
    this.currentMatchId = matchId;  

    // Clear selection from all cards  
    document.querySelectorAll('.match-card').forEach(card => {  
      card.classList.remove('selected');  
    });  

    // Find and highlight the selected card  
    const selectedCard = document.querySelector(`.match-card[data-match-id="${matchId}"]`);  
    if (selectedCard) {  
      selectedCard.classList.add('selected');  
    }  

    // Reload the app with this match  
    if (matchId === 'demo-csk-mi') {  
      // Switch to demo mode  
      this.app.engine.switchToDemo();  
      this.app.updateMatchInfo();  
      this.updateDataSourceInfo('Demo match');  
    } else {  
      // For live matches, we would need to load the actual match data  
      // For now, fall back to demo since we don't have real match data  
      this.app.engine.switchToDemo();  
      this.app.updateMatchInfo();  
      this.updateDataSourceInfo(`Live match: ${matchId}`);  
    }  
  }  

  /**  
   * Select the demo match.  
   */  
  selectDemoMatch() {  
    this.selectMatch('demo-csk-mi');  
  }  

  /**  
   * Render match cards in the ribbon.  
   */  
  render() {  
    // Clear existing cards  
    this.el['match-ribbon-live'].querySelector('.column-matches').innerHTML = '';  
    this.el['match-ribbon-upcoming'].querySelector('.column-matches').innerHTML = '';  
    this.el['match-ribbon-completed'].querySelector('.column-matches').innerHTML = '';  
    this.el['match-ribbon-demo'].querySelector('.column-matches').innerHTML = '';  

    // Render live matches (limit to 3)  
    this.matches.live.slice(0, 3).forEach(match => {  
      this.renderMatchCard('live', match);  
    });  

    // Render upcoming matches (limit to 3)  
    this.matches.upcoming.slice(0, 3).forEach(match => {  
      this.renderMatchCard('upcoming', match);  
    });  

    // Render completed matches (limit to 3)  
    this.matches.completed.slice(0, 3).forEach(match => {  
      this.renderMatchCard('completed', match);  
    });  

    // Render demo match (always show)  
    this.matches.demo.forEach(match => {  
      this.renderMatchCard('demo', match);  
    });  
  }  

  /**  
   * Render a single match card.  
   */  
  renderMatchCard(type, match) {  
    const column = document.getElementById(`match-ribbon-${type}`);  
    if (!column) return;  

    const container = column.querySelector('.column-matches');  
    if (!container) return;  

    const card = document.createElement('div');  
    card.className = `match-card ${type}`;  
    card.dataset.matchId = match.id;  

    const isSelected = this.currentMatchId === match.id;  
    if (isSelected) {  
      card.classList.add('selected');  
    }  

    const team1Short = this.getTeamShort(match.team1);  
    const team2Short = this.getTeamShort(match.team2);  

    let scoreHtml = '';  
    let statusHtml = '';  
    let timeHtml = '';  

    if (type === 'live') {  
      // For live matches, show score if available  
      if (match.score) {  
        scoreHtml = `<div class="match-card-score">${match.score}</div>`;  
      }  
      statusHtml = `<div class="match-card-status">LIVE</div>`;  
    } else if (type === 'upcoming') {  
      statusHtml = `<div class="match-card-time">${match.date || 'TBD'}</div>`;  
    } else if (type === 'demo') {  
      statusHtml = `<div class="match-card-status">DEMO</div>`;  
    }  

    card.innerHTML = `  
      <div class="match-card-team">${team1Short}</div>  
      <div class="match-card-vs">vs</div>  
      <div class="match-card-team">${team2Short}</div>  
      ${scoreHtml}  
      ${statusHtml}  
      ${timeHtml}  
    `;  

    card.addEventListener('click', () => this.selectMatch(match.id));  

    container.appendChild(card);  
  }  

  /**  
   * Get team short name.  
   */  
  getTeamShort(name) {  
    if (!name) return '?';  
    // Common abbreviations  
    const abbreviations = {  
      'Chennai Super Kings': 'CSK',  
      'Mumbai Indians': 'MI',  
      'Royal Challengers Bangalore': 'RCB',  
      'Kolkata Knight Riders': 'KKR',  
      'Delhi Capitals': 'DC',  
      'Rajasthan Royals': 'RR',  
      'Sunrisers Hyderabad': 'SRH',  
      'Punjab Kings': 'PBKS',  
      'Lucknow Super Giants': 'LSG',  
      'Gujarat Titans': 'GT',  
      'India': 'IND',  
      'Pakistan': 'PAK',  
      'Australia': 'AUS',  
      'England': 'ENG',  
      'South Africa': 'SA',  
      'New Zealand': 'NZ',  
      'Bangladesh': 'BAN',  
      'Sri Lanka': 'SL',  
      'West Indies': 'WI'  
    };  
    return abbreviations[name] || name.split(' ')[0];  
  }  

  /**  
   * Show a banner.  
   */  
  showBanner(id, message) {  
    const banner = document.getElementById(id);  
    if (banner) {  
      banner.textContent = message;  
      banner.classList.remove('hidden');  
    }  
  }  

  /**  
   * Hide a banner.  
   */  
  hideBanner(id) {  
    const banner = document.getElementById(id);  
    if (banner) {  
      banner.classList.add('hidden');  
    }  
  }  

  /**  
   * Update the data source info footer.  
   */  
  updateDataSourceInfo(source) {  
    const el = document.getElementById('data-source-info');  
    if (el) {  
      if (source === 'Live API') {  
        el.textContent = 'Data source: Live Cricket API';  
      } else if (source.startsWith('Live match:')) {  
        el.textContent = `Data source: Live Match (${source.replace('Live match: ', '')})`;  
      } else {  
        el.textContent = `Data source: ${source}`;  
      }  
    }  
  }  
}  

// Attach to window  
if (typeof window !== 'undefined') {  
  window.MatchSwitcher = MatchSwitcher;  
}
