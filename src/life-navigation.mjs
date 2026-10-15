const DOMAINS = new Set(['education', 'career', 'housing', 'finance', 'wellbeing', 'personal']);
const MAX_MILESTONES = 20;

export function createLifeGoal(input, { idFactory, clock = () => new Date().toISOString() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Goal must be an object');
  if (typeof idFactory !== 'function') throw new TypeError('An ID factory is required');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 120) throw new TypeError('Goal title must contain 1 to 120 characters');
  const domain = input.domain ?? 'personal';
  if (!DOMAINS.has(domain)) throw new TypeError('Unsupported goal domain');
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 1000) : '';
  const targetDate = input.targetDate ?? null;
  if (targetDate !== null && (typeof targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(targetDate)))) {
    throw new TypeError('Target date must be a valid YYYY-MM-DD date');
  }
  const titles = input.milestones ?? [];
  if (!Array.isArray(titles) || titles.length > MAX_MILESTONES) throw new TypeError('Provide up to 20 milestones');
  const seen = new Set();
  const milestones = titles.map(item => {
    const milestoneTitle = typeof item === 'string' ? item.trim() : '';
    if (!milestoneTitle || milestoneTitle.length > 160) throw new TypeError('Milestone titles must contain 1 to 160 characters');
    const key = milestoneTitle.toLocaleLowerCase();
    if (seen.has(key)) throw new TypeError('Milestone titles must be unique within a goal');
    seen.add(key);
    return { id: idFactory(), title: milestoneTitle, status: 'pending', createdAt: clock(), completedAt: null, confirmation: null, evidenceNote: '' };
  });
  const now = clock();
  return {
    schema: 'nexus.life-goal.v1',
    id: idFactory(),
    title,
    domain,
    description,
    targetDate,
    status: milestones.length ? 'active' : 'planning',
    milestones,
    createdAt: now,
    updatedAt: now
  };
}

export function confirmMilestone(goal, milestoneId, { confirmed, evidenceNote = '' } = {}, { clock = () => new Date().toISOString() } = {}) {
  if (!goal || !Array.isArray(goal.milestones)) throw new TypeError('A valid goal is required');
  if (confirmed !== true) throw new TypeError('Explicit user confirmation is required');
  if (typeof evidenceNote !== 'string' || evidenceNote.length > 500) throw new TypeError('Evidence note must be 500 characters or fewer');
  const milestone = goal.milestones.find(item => item.id === milestoneId);
  if (!milestone) return null;
  if (milestone.status === 'complete') return goal;
  const now = clock();
  return {
    ...goal,
    status: goal.milestones.every(item => item.id === milestoneId || item.status === 'complete') ? 'complete' : 'active',
    updatedAt: now,
    milestones: goal.milestones.map(item => item.id === milestoneId
      ? { ...item, status: 'complete', completedAt: now, confirmation: 'user-confirmed', evidenceNote: evidenceNote.trim() }
      : item)
  };
}

export function summarizeLifeGoals(goals) {
  const all = Array.isArray(goals) ? goals : [];
  const milestones = all.flatMap(goal => Array.isArray(goal.milestones) ? goal.milestones : []);
  const completed = milestones.filter(item => item.status === 'complete').length;
  return {
    goals: all.length,
    activeGoals: all.filter(goal => goal.status !== 'complete').length,
    completedGoals: all.filter(goal => goal.status === 'complete').length,
    milestones: milestones.length,
    completedMilestones: completed,
    xp: completed * 10,
    xpBasis: 'user-confirmed milestones; motivational only, not a measure of human worth'
  };
}
