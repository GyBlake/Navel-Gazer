const $ = selector => document.querySelector(selector);
const state = { goals: [], summary: null };
const labels = { education:'Education', career:'Career', housing:'Housing', finance:'Finance', wellbeing:'Wellbeing', personal:'Personal' };
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Local request failed (' + response.status + ')');
  return payload;
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('show');
  window.setTimeout(() => node.classList.remove('show'), 2800);
}
function render() {
  const summary = state.summary || {};
  $('#active-goals').textContent = String(summary.activeGoals || 0);
  $('#milestones').textContent = (summary.completedMilestones || 0) + ' / ' + (summary.milestones || 0);
  $('#xp').textContent = (summary.xp || 0) + ' XP';
  const list = $('#goal-list'); list.replaceChildren();
  if (!state.goals.length) {
    const empty = el('div', 'empty');
    empty.append(el('strong', '', 'Your map starts with you.'), document.createTextNode('Create a goal on the right. Add a few practical milestones, then change the plan whenever your real circumstances change.'));
    list.append(empty); return;
  }
  for (const goal of state.goals) {
    const card = el('article', 'goal-card');
    const top = el('div', 'goal-top');
    const heading = el('div');
    heading.append(el('span', 'domain', labels[goal.domain] || goal.domain), el('h3', '', goal.title));
    if (goal.description) heading.append(el('p', '', goal.description));
    top.append(heading, el('span', 'goal-date', goal.targetDate ? 'TARGET · ' + goal.targetDate : goal.status.toUpperCase()));
    card.append(top);
    const complete = goal.milestones.filter(item => item.status === 'complete').length;
    const total = goal.milestones.length;
    const progress = el('div', 'progress-row');
    progress.append(el('span', '', complete + ' OF ' + total + ' QUESTS COMPLETE'), el('span', '', total ? Math.round(complete / total * 100) + '%' : 'PLAN'));
    const track = el('div', 'progress-track'); const fill = el('div', 'progress-fill'); fill.style.width = (total ? complete / total * 100 : 0) + '%'; track.append(fill);
    card.append(progress, track);
    const quests = el('ul', 'quest-list');
    for (const milestone of goal.milestones) {
      const item = el('li', 'quest' + (milestone.status === 'complete' ? ' complete' : ''));
      const mark = el('span', 'quest-mark', milestone.status === 'complete' ? '✓' : '·');
      const details = el('span', 'quest-title', milestone.title);
      if (milestone.status === 'complete') details.append(el('small', 'quest-note', 'USER-CONFIRMED · ' + (milestone.completedAt || '').slice(0, 10)));
      item.append(mark, details);
      if (milestone.status !== 'complete') {
        const button = el('button', '', 'Complete quest');
        button.type = 'button';
        button.addEventListener('click', async () => {
          const note = window.prompt('Confirm this milestone is complete. Optional: add a short note about what happened. This records your confirmation, not independent verification.', '');
          if (note === null) return;
          if (!window.confirm('Mark “' + milestone.title + '” complete? This adds 10 motivational XP.')) return;
          button.disabled = true;
          try {
            await api('/api/life/goals/' + encodeURIComponent(goal.id) + '/milestones/' + encodeURIComponent(milestone.id), { method: 'PATCH', body: JSON.stringify({ confirmed: true, evidenceNote: note }) });
            await load(); toast('Milestone recorded as user-confirmed. +10 XP.');
          } catch (error) { toast(error.message); button.disabled = false; }
        });
        item.append(button);
      }
      quests.append(item);
    }
    card.append(quests);
    const footer = el('div', 'goal-footer');
    footer.append(el('small', '', goal.status === 'complete' ? 'DESTINATION REACHED · USER-CONFIRMED' : 'LOCAL PLAN · USER-LED'));
    const remove = el('button', 'delete-goal', 'Delete goal');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!window.confirm('Delete “' + goal.title + '” and its local milestone history? This cannot be undone.')) return;
      try { await api('/api/life/goals/' + encodeURIComponent(goal.id), { method: 'DELETE' }); await load(); toast('Goal deleted from this device.'); }
      catch (error) { toast(error.message); }
    });
    footer.append(remove); card.append(footer); list.append(card);
  }
}
async function load() {
  $('#sync-label').textContent = 'SYNCING LOCAL STATE…';
  try {
    const payload = await api('/api/life/goals');
    state.goals = payload.goals; state.summary = payload.summary; render();
    $('#sync-label').textContent = 'LOCAL STATE · SAVED';
  } catch (error) {
    $('#sync-label').textContent = 'LOCAL STATE · UNAVAILABLE';
    $('#goal-list').replaceChildren(el('p', 'muted', error.message));
  }
}
$('#goal-form').addEventListener('submit', async event => {
  event.preventDefault();
  const title = $('#goal-title').value.trim();
  const milestones = $('#goal-milestones').value.split('\n').map(item => item.trim()).filter(Boolean);
  if (!title) return;
  if (!window.confirm('Create this goal and save it to this device? No tasks will be sent to external services.')) return;
  const submit = $('#goal-form button[type="submit"]'); submit.disabled = true;
  try {
    await api('/api/life/goals', { method: 'POST', body: JSON.stringify({
      title, domain: $('#goal-domain').value, targetDate: $('#goal-date').value || null,
      description: $('#goal-description').value, milestones, confirmed: true
    }) });
    $('#goal-form').reset(); await load(); toast('Goal saved locally. Your next step is yours to choose.');
  } catch (error) { toast(error.message); }
  finally { submit.disabled = false; }
});
$('#refresh').addEventListener('click', () => load().then(() => toast('Local state refreshed.')));
load();
