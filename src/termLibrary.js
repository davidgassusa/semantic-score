/**
 * Semantic Score - Term Library
 * High-stakes terms categorized by type from 'Semantic Collision' book
 */

// Term Categories
export const TermCategory = {
  PROMISE_WORD: 'promise_word',
  LIFECYCLE_VERB: 'lifecycle_verb',
  FINANCIAL_STRATEGIC: 'financial_strategic',
  STATUS_LABEL: 'status_label',
  OWNERSHIP_TERM: 'ownership_term',
  GENERAL: 'general'
};

// Risk multipliers for each term category
export const TERM_RISK_MULTIPLIERS = {
  [TermCategory.PROMISE_WORD]: 3.0,
  [TermCategory.LIFECYCLE_VERB]: 2.5,
  [TermCategory.FINANCIAL_STRATEGIC]: 2.0,
  [TermCategory.STATUS_LABEL]: 2.0,
  [TermCategory.OWNERSHIP_TERM]: 1.5,
  [TermCategory.GENERAL]: 1.0
};

// Document risk weights
export const DOCUMENT_RISK_WEIGHTS = {
  contract: 1.5,
  proposal: 1.4,
  onboarding: 1.3,
  marketing: 1.2,
  website: 1.2,
  sales_script: 1.3,
  internal_process: 1.0,
  meeting_transcript: 1.1,
  other: 1.0
};

// Master Term Library
export const TERM_LIBRARY = {
  // PROMISE WORDS (3.0x risk multiplier)
  'support': TermCategory.PROMISE_WORD,
  'partner': TermCategory.PROMISE_WORD,
  'partnership': TermCategory.PROMISE_WORD,
  'proactive': TermCategory.PROMISE_WORD,
  'unlimited': TermCategory.PROMISE_WORD,
  'guarantee': TermCategory.PROMISE_WORD,
  'guaranteed': TermCategory.PROMISE_WORD,
  'strategic': TermCategory.PROMISE_WORD,
  'premium': TermCategory.PROMISE_WORD,
  'white-glove': TermCategory.PROMISE_WORD,
  'white glove': TermCategory.PROMISE_WORD,
  'comprehensive': TermCategory.PROMISE_WORD,
  'full-service': TermCategory.PROMISE_WORD,
  'full service': TermCategory.PROMISE_WORD,
  'dedicated': TermCategory.PROMISE_WORD,
  'personalized': TermCategory.PROMISE_WORD,
  'customized': TermCategory.PROMISE_WORD,
  'tailored': TermCategory.PROMISE_WORD,
  'world-class': TermCategory.PROMISE_WORD,
  'world class': TermCategory.PROMISE_WORD,
  'best-in-class': TermCategory.PROMISE_WORD,
  'excellence': TermCategory.PROMISE_WORD,
  'exceptional': TermCategory.PROMISE_WORD,
  'committed': TermCategory.PROMISE_WORD,
  'commitment': TermCategory.PROMISE_WORD,
  'ensure': TermCategory.PROMISE_WORD,
  'always': TermCategory.PROMISE_WORD,
  'never': TermCategory.PROMISE_WORD,
  'seamless': TermCategory.PROMISE_WORD,
  'turnkey': TermCategory.PROMISE_WORD,
  'end-to-end': TermCategory.PROMISE_WORD,
  'holistic': TermCategory.PROMISE_WORD,
  'responsive': TermCategory.PROMISE_WORD,
  'available': TermCategory.PROMISE_WORD,
  'accessible': TermCategory.PROMISE_WORD,
  'transparent': TermCategory.PROMISE_WORD,

  // LIFECYCLE VERBS (2.5x risk multiplier)
  'onboard': TermCategory.LIFECYCLE_VERB,
  'onboarded': TermCategory.LIFECYCLE_VERB,
  'onboarding': TermCategory.LIFECYCLE_VERB,
  'complete': TermCategory.LIFECYCLE_VERB,
  'completed': TermCategory.LIFECYCLE_VERB,
  'done': TermCategory.LIFECYCLE_VERB,
  'finished': TermCategory.LIFECYCLE_VERB,
  'delivered': TermCategory.LIFECYCLE_VERB,
  'launched': TermCategory.LIFECYCLE_VERB,
  'launch': TermCategory.LIFECYCLE_VERB,
  'escalate': TermCategory.LIFECYCLE_VERB,
  'escalated': TermCategory.LIFECYCLE_VERB,
  'escalation': TermCategory.LIFECYCLE_VERB,
  'approved': TermCategory.LIFECYCLE_VERB,
  'approve': TermCategory.LIFECYCLE_VERB,
  'approval': TermCategory.LIFECYCLE_VERB,
  'qualified': TermCategory.LIFECYCLE_VERB,
  'qualify': TermCategory.LIFECYCLE_VERB,
  'qualification': TermCategory.LIFECYCLE_VERB,
  'handoff': TermCategory.LIFECYCLE_VERB,
  'hand off': TermCategory.LIFECYCLE_VERB,
  'hand-off': TermCategory.LIFECYCLE_VERB,
  'transition': TermCategory.LIFECYCLE_VERB,
  'transfer': TermCategory.LIFECYCLE_VERB,
  'implement': TermCategory.LIFECYCLE_VERB,
  'implemented': TermCategory.LIFECYCLE_VERB,
  'implementation': TermCategory.LIFECYCLE_VERB,
  'deploy': TermCategory.LIFECYCLE_VERB,
  'deployed': TermCategory.LIFECYCLE_VERB,
  'activate': TermCategory.LIFECYCLE_VERB,
  'activated': TermCategory.LIFECYCLE_VERB,
  'resolve': TermCategory.LIFECYCLE_VERB,
  'resolved': TermCategory.LIFECYCLE_VERB,
  'resolution': TermCategory.LIFECYCLE_VERB,
  'close': TermCategory.LIFECYCLE_VERB,
  'closed': TermCategory.LIFECYCLE_VERB,
  'finalize': TermCategory.LIFECYCLE_VERB,
  'finalized': TermCategory.LIFECYCLE_VERB,

  // FINANCIAL/STRATEGIC TERMS (2.0x risk multiplier)
  'roi': TermCategory.FINANCIAL_STRATEGIC,
  'ltv': TermCategory.FINANCIAL_STRATEGIC,
  'lifetime value': TermCategory.FINANCIAL_STRATEGIC,
  'margin': TermCategory.FINANCIAL_STRATEGIC,
  'profit': TermCategory.FINANCIAL_STRATEGIC,
  'revenue': TermCategory.FINANCIAL_STRATEGIC,
  'value': TermCategory.FINANCIAL_STRATEGIC,
  'investment': TermCategory.FINANCIAL_STRATEGIC,
  'cost': TermCategory.FINANCIAL_STRATEGIC,
  'budget': TermCategory.FINANCIAL_STRATEGIC,
  'pricing': TermCategory.FINANCIAL_STRATEGIC,
  'scope': TermCategory.FINANCIAL_STRATEGIC,
  'deliverable': TermCategory.FINANCIAL_STRATEGIC,
  'deliverables': TermCategory.FINANCIAL_STRATEGIC,
  'milestone': TermCategory.FINANCIAL_STRATEGIC,
  'milestones': TermCategory.FINANCIAL_STRATEGIC,
  'outcome': TermCategory.FINANCIAL_STRATEGIC,
  'outcomes': TermCategory.FINANCIAL_STRATEGIC,
  'result': TermCategory.FINANCIAL_STRATEGIC,
  'results': TermCategory.FINANCIAL_STRATEGIC,
  'success': TermCategory.FINANCIAL_STRATEGIC,
  'kpi': TermCategory.FINANCIAL_STRATEGIC,
  'metric': TermCategory.FINANCIAL_STRATEGIC,
  'metrics': TermCategory.FINANCIAL_STRATEGIC,
  'performance': TermCategory.FINANCIAL_STRATEGIC,
  'growth': TermCategory.FINANCIAL_STRATEGIC,
  'scale': TermCategory.FINANCIAL_STRATEGIC,
  'efficiency': TermCategory.FINANCIAL_STRATEGIC,
  'optimization': TermCategory.FINANCIAL_STRATEGIC,
  'core': TermCategory.FINANCIAL_STRATEGIC,
  'focus': TermCategory.FINANCIAL_STRATEGIC,
  'aligned': TermCategory.FINANCIAL_STRATEGIC,
  'alignment': TermCategory.FINANCIAL_STRATEGIC,

  // STATUS LABELS (2.0x risk multiplier)
  'priority': TermCategory.STATUS_LABEL,
  'urgent': TermCategory.STATUS_LABEL,
  'critical': TermCategory.STATUS_LABEL,
  'high-priority': TermCategory.STATUS_LABEL,
  'high priority': TermCategory.STATUS_LABEL,
  'low-priority': TermCategory.STATUS_LABEL,
  'asap': TermCategory.STATUS_LABEL,
  'immediately': TermCategory.STATUS_LABEL,
  'vip': TermCategory.STATUS_LABEL,
  'tier a': TermCategory.STATUS_LABEL,
  'tier 1': TermCategory.STATUS_LABEL,
  'gold': TermCategory.STATUS_LABEL,
  'platinum': TermCategory.STATUS_LABEL,
  'enterprise': TermCategory.STATUS_LABEL,
  'standard': TermCategory.STATUS_LABEL,
  'basic': TermCategory.STATUS_LABEL,
  'at-risk': TermCategory.STATUS_LABEL,
  'at risk': TermCategory.STATUS_LABEL,
  'active': TermCategory.STATUS_LABEL,
  'inactive': TermCategory.STATUS_LABEL,
  'pending': TermCategory.STATUS_LABEL,
  'in progress': TermCategory.STATUS_LABEL,
  'on track': TermCategory.STATUS_LABEL,
  'blocked': TermCategory.STATUS_LABEL,
  'delayed': TermCategory.STATUS_LABEL,

  // OWNERSHIP TERMS (1.5x risk multiplier)
  'owner': TermCategory.OWNERSHIP_TERM,
  'owns': TermCategory.OWNERSHIP_TERM,
  'ownership': TermCategory.OWNERSHIP_TERM,
  'responsible': TermCategory.OWNERSHIP_TERM,
  'responsibility': TermCategory.OWNERSHIP_TERM,
  'accountable': TermCategory.OWNERSHIP_TERM,
  'accountability': TermCategory.OWNERSHIP_TERM,
  'lead': TermCategory.OWNERSHIP_TERM,
  'leads': TermCategory.OWNERSHIP_TERM,
  'point of contact': TermCategory.OWNERSHIP_TERM,
  'poc': TermCategory.OWNERSHIP_TERM,
  'primary': TermCategory.OWNERSHIP_TERM,
  'secondary': TermCategory.OWNERSHIP_TERM,
  'backup': TermCategory.OWNERSHIP_TERM,
  'assigned': TermCategory.OWNERSHIP_TERM,
  'delegate': TermCategory.OWNERSHIP_TERM,
  'delegated': TermCategory.OWNERSHIP_TERM,
  'manage': TermCategory.OWNERSHIP_TERM,
  'managed': TermCategory.OWNERSHIP_TERM,
  'manager': TermCategory.OWNERSHIP_TERM,
  'oversee': TermCategory.OWNERSHIP_TERM,
  'oversight': TermCategory.OWNERSHIP_TERM,

  // GENERAL BUSINESS TERMS (1.0x risk multiplier)
  'client': TermCategory.GENERAL,
  'customer': TermCategory.GENERAL,
  'project': TermCategory.GENERAL,
  'engagement': TermCategory.GENERAL,
  'account': TermCategory.GENERAL,
  'service': TermCategory.GENERAL,
  'solution': TermCategory.GENERAL,
  'product': TermCategory.GENERAL,
  'team': TermCategory.GENERAL,
  'process': TermCategory.GENERAL,
  'workflow': TermCategory.GENERAL,
  'system': TermCategory.GENERAL,
  'platform': TermCategory.GENERAL,
  'meeting': TermCategory.GENERAL,
  'call': TermCategory.GENERAL,
  'review': TermCategory.GENERAL,
  'update': TermCategory.GENERAL,
  'report': TermCategory.GENERAL,
  'communication': TermCategory.GENERAL,
  'feedback': TermCategory.GENERAL,
  'issue': TermCategory.GENERAL,
  'problem': TermCategory.GENERAL,
  'request': TermCategory.GENERAL,
  'requirement': TermCategory.GENERAL,
  'specification': TermCategory.GENERAL
};

// Vague language patterns
export const VAGUE_PATTERNS = [
  'as appropriate', 'as needed', 'reasonable', 'reasonably', 'timely',
  'adequate', 'sufficient', 'high-quality', 'high quality', 'best efforts',
  'good faith', 'substantial', 'substantially', 'material', 'materially',
  'significant', 'significantly', 'appropriate', 'appropriately', 'proper',
  'properly', 'suitable', 'suitably', 'satisfactory', 'acceptable',
  'generally', 'typically', 'usually', 'normally', 'approximately',
  'about', 'around', 'roughly', 'promptly', 'soon', 'quickly',
  'efficiently', 'effectively'
];

// Boundary signals
export const EXCLUSION_SIGNALS = [
  'does not include', 'excludes', 'excluding', 'not included',
  'outside scope', 'out of scope', 'not covered', 'this is not',
  'we do not', 'we will not', 'limitations', 'restrictions', 'exceptions'
];

export const INCLUSION_SIGNALS = [
  'includes', 'including', 'specifically', 'covers', 'covered',
  'encompasses', 'consists of', 'comprised of', 'contains', 'features'
];

export const LIMIT_SIGNALS = [
  'up to', 'maximum', 'max', 'minimum', 'min', 'limited to',
  'no more than', 'no less than', 'at least', 'at most', 'not to exceed',
  'within', 'per month', 'per week', 'per day', 'per year',
  'annually', 'monthly', 'weekly', 'daily', 'hours'
];

// Helper functions
export function getTermCategory(term) {
  return TERM_LIBRARY[term.toLowerCase()] || null;
}

export function isHighStakesTerm(term) {
  return term.toLowerCase() in TERM_LIBRARY;
}

export function getRiskMultiplier(category) {
  return TERM_RISK_MULTIPLIERS[category] || 1.0;
}
