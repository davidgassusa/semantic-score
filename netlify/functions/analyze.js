/**
 * Netlify Function: Analyze
 * Main analysis endpoint that calculates the Semantic Score
 * API Key is securely stored in Netlify environment variables
 */

import Anthropic from '@anthropic-ai/sdk';

// Import scoring modules (bundled at build time)
import {
  TERM_LIBRARY,
  TermCategory,
  TERM_RISK_MULTIPLIERS,
  VAGUE_PATTERNS,
  EXCLUSION_SIGNALS,
  INCLUSION_SIGNALS,
  LIMIT_SIGNALS
} from '../../src/termLibrary.js';

// Component weights
const WEIGHTS = {
  definition_coverage: 0.25,
  consistency: 0.25,
  boundary_clarity: 0.20,
  threshold_specificity: 0.15,
  jargon_load: 0.10,
  ownership_clarity: 0.05
};

export const handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { inputs, companySize = 50, useAI = true } = body;

    if (!inputs || !inputs.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No inputs provided' })
      };
    }

    // Initialize Anthropic client if AI is enabled and key exists
    let anthropicClient = null;
    if (useAI && process.env.ANTHROPIC_API_KEY) {
      anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }

    // Run analysis
    const result = await analyzeContent(inputs, {
      companySize,
      useAI: useAI && !!anthropicClient,
      anthropicClient
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Analysis error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Analysis failed' })
    };
  }
};

// ============================================
// Analysis Functions (inlined for serverless)
// ============================================

async function analyzeContent(inputs, options = {}) {
  const { companySize = 50, useAI = false, anthropicClient = null } = options;

  const termOccurrences = extractTerms(inputs);
  const termAnalyses = await analyzeTerms(termOccurrences, inputs, useAI, anthropicClient);

  const c1 = scoreDefinitionCoverage(termAnalyses);
  const c2 = scoreConsistency(termAnalyses);
  const c3 = scoreBoundaryClarity(inputs);
  const c4 = scoreThresholdSpecificity(inputs);
  const c5 = scoreJargonLoad(inputs);
  const c6 = scoreOwnershipClarity(inputs);

  const components = [
    { name: 'Definition Coverage', ...c1, weight: WEIGHTS.definition_coverage },
    { name: 'Consistency', ...c2, weight: WEIGHTS.consistency },
    { name: 'Boundary Clarity', ...c3, weight: WEIGHTS.boundary_clarity },
    { name: 'Threshold Specificity', ...c4, weight: WEIGHTS.threshold_specificity },
    { name: 'Jargon Load', ...c5, weight: WEIGHTS.jargon_load },
    { name: 'Ownership Clarity', ...c6, weight: WEIGHTS.ownership_clarity }
  ].map(c => ({
    ...c,
    weightedScore: c.score * c.weight
  }));

  const overallScore = components.reduce((sum, c) => sum + c.weightedScore, 0);
  const scoreBand = getScoreBand(overallScore);
  const aspireScores = calculateASPIREScores(termAnalyses);
  const highRiskTerms = identifyHighRiskTerms(termAnalyses);
  const meaningDebt = estimateMeaningDebt(overallScore, companySize, highRiskTerms.length);
  const actionPlan = generateActionPlan(termAnalyses, components);

  return {
    overall_score: Math.round(overallScore * 10) / 10,
    score_band: scoreBand,
    components,
    aspire_scores: aspireScores,
    total_terms_analyzed: termAnalyses.length,
    high_risk_terms: highRiskTerms,
    meaning_debt: meaningDebt,
    action_plan: actionPlan,
    documents_analyzed: inputs.length,
    total_word_count: inputs.reduce((sum, inp) => sum + (inp.wordCount || 0), 0),
    analysis_timestamp: new Date().toISOString()
  };
}

function extractTerms(inputs) {
  const termOccurrences = {};

  for (const input of inputs) {
    const contentLower = input.content.toLowerCase();

    for (const term of Object.keys(TERM_LIBRARY)) {
      const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
      const matches = [...contentLower.matchAll(regex)];

      for (const match of matches) {
        if (!termOccurrences[term]) {
          termOccurrences[term] = [];
        }

        const start = Math.max(0, match.index - 100);
        const end = Math.min(input.content.length, match.index + term.length + 100);
        const context = input.content.slice(start, end).trim();

        termOccurrences[term].push({
          docId: input.id,
          docName: input.name,
          context
        });
      }
    }
  }

  return termOccurrences;
}

async function analyzeTerms(termOccurrences, inputs, useAI, anthropicClient) {
  const analyses = [];

  for (const [term, occurrences] of Object.entries(termOccurrences)) {
    const category = TERM_LIBRARY[term.toLowerCase()] || TermCategory.GENERAL;
    const riskMultiplier = TERM_RISK_MULTIPLIERS[category] || 1.0;

    const documents = [...new Set(occurrences.map(o => o.docName))];
    const contexts = occurrences.slice(0, 5).map(o => o.context);

    let isDefined = false;
    let definitionQuality = 'missing';
    let hasThreshold = false;
    let hasBoundary = false;

    for (const input of inputs) {
      const defResult = findDefinition(term, input.content);
      if (defResult) {
        isDefined = true;
        hasThreshold = defResult.hasThreshold;
        hasBoundary = defResult.hasBoundary;

        if (hasThreshold && hasBoundary) definitionQuality = 'complete';
        else if (hasThreshold || hasBoundary) definitionQuality = 'partial';
        else definitionQuality = 'minimal';
        break;
      }
    }

    let inconsistencyDetected = false;

    if (documents.length > 1 && useAI && anthropicClient) {
      try {
        const result = await checkConsistencyAI(term, contexts, anthropicClient);
        inconsistencyDetected = result.inconsistent;
      } catch (e) {
        console.error('AI check error:', e);
      }
    }

    analyses.push({
      term,
      category,
      riskMultiplier,
      occurrences: occurrences.length,
      documents,
      isDefined,
      definitionQuality,
      hasThreshold,
      hasBoundary,
      contexts,
      inconsistencyDetected
    });
  }

  return analyses;
}

function findDefinition(term, content) {
  const contentLower = content.toLowerCase();
  const termEscaped = escapeRegex(term);

  const patterns = [
    new RegExp(`${termEscaped}["']?\\s+(?:means?|is defined as|refers to)\\s+["']?([^.]+)`, 'i'),
    new RegExp(`(?:by|when we say)\\s+["']?${termEscaped}["']?,?\\s+(?:we mean|this means)\\s+([^.]+)`, 'i'),
    new RegExp(`["']?${termEscaped}["']?\\s*[-:]\\s*([^.]+)`, 'i')
  ];

  for (const pattern of patterns) {
    const match = contentLower.match(pattern);
    if (match) {
      const text = match[1].trim().slice(0, 200);
      const hasThreshold = LIMIT_SIGNALS.some(s => text.includes(s));
      const hasBoundary = [...EXCLUSION_SIGNALS, ...INCLUSION_SIGNALS].some(s => text.includes(s));
      return { text, hasThreshold, hasBoundary };
    }
  }

  return null;
}

async function checkConsistencyAI(term, contexts, client) {
  if (contexts.length < 2) return { inconsistent: false };

  const prompt = `Compare how "${term}" is used in these contexts. Are they consistent?
Context A: "${contexts[0].slice(0, 200)}"
Context B: "${contexts[1].slice(0, 200)}"
Reply JSON only: {"inconsistent": true/false}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.error('AI error:', e);
  }

  return { inconsistent: false };
}

function scoreDefinitionCoverage(termAnalyses) {
  if (!termAnalyses.length) return { score: 50, details: { terms_found: 0, terms_defined: 0, terms_undefined: 0 } };

  const qualityScores = { complete: 1.0, partial: 0.6, minimal: 0.3, missing: 0.0 };
  let totalWeight = 0, definedWeight = 0;

  for (const term of termAnalyses) {
    totalWeight += term.riskMultiplier;
    definedWeight += term.riskMultiplier * qualityScores[term.definitionQuality];
  }

  const score = totalWeight > 0 ? (definedWeight / totalWeight) * 100 : 50;
  const termsDefined = termAnalyses.filter(t => t.isDefined).length;

  return {
    score: Math.round(score * 10) / 10,
    details: { terms_found: termAnalyses.length, terms_defined: termsDefined, terms_undefined: termAnalyses.length - termsDefined }
  };
}

function scoreConsistency(termAnalyses) {
  const crossDocTerms = termAnalyses.filter(t => t.documents.length > 1);
  if (!crossDocTerms.length) return { score: 80, details: { cross_doc_terms: 0, consistent: 0, inconsistent: 0 } };

  let totalWeight = 0, consistentWeight = 0;
  for (const term of crossDocTerms) {
    totalWeight += term.riskMultiplier;
    if (!term.inconsistencyDetected) consistentWeight += term.riskMultiplier;
  }

  const score = totalWeight > 0 ? (consistentWeight / totalWeight) * 100 : 80;
  const inconsistentCount = crossDocTerms.filter(t => t.inconsistencyDetected).length;

  return {
    score: Math.round(score * 10) / 10,
    details: { cross_doc_terms: crossDocTerms.length, consistent: crossDocTerms.length - inconsistentCount, inconsistent: inconsistentCount }
  };
}

function scoreBoundaryClarity(inputs) {
  let promiseCount = 0, boundedCount = 0;

  for (const input of inputs) {
    const c = input.content.toLowerCase();
    promiseCount += (c.match(/\b(?:we\s+)?(?:will|shall|provide|offer|deliver|ensure|guarantee)\b/gi) || []).length;
    promiseCount += (c.match(/\b(?:unlimited|comprehensive|full.service)\b/gi) || []).length;

    for (const s of [...EXCLUSION_SIGNALS, ...INCLUSION_SIGNALS, ...LIMIT_SIGNALS]) {
      boundedCount += (c.match(new RegExp(escapeRegex(s), 'gi')) || []).length;
    }
  }

  const score = promiseCount === 0 ? 70 : Math.min(100, (boundedCount / promiseCount) * 100);
  return { score: Math.round(score * 10) / 10, details: { promises_found: promiseCount, boundary_signals: boundedCount } };
}

function scoreThresholdSpecificity(inputs) {
  let totalStatements = 0, vagueStatements = 0;

  for (const input of inputs) {
    totalStatements += input.content.split(/[.!?]+/).length;
    for (const p of VAGUE_PATTERNS) {
      vagueStatements += (input.content.toLowerCase().match(new RegExp(escapeRegex(p), 'gi')) || []).length;
    }
  }

  if (!totalStatements) return { score: 70, details: { criteria_statements: 0, vague_patterns_found: 0 } };
  const score = Math.max(0, 100 - (vagueStatements / totalStatements) * 200);
  return { score: Math.round(score * 10) / 10, details: { criteria_statements: totalStatements, vague_patterns_found: vagueStatements } };
}

function scoreJargonLoad(inputs) {
  const acronyms = new Set(), unexplained = new Set();

  for (const input of inputs) {
    for (const m of input.content.match(/\b[A-Z]{2,}\b/g) || []) {
      if (m !== 'I' && m !== 'A') {
        acronyms.add(m);
        if (!new RegExp(`\\(${m}\\)|${m}\\s*\\([^)]+\\)`).test(input.content)) unexplained.add(m);
      }
    }
  }

  const totalWords = inputs.reduce((s, i) => s + (i.wordCount || 0), 0);
  if (!totalWords) return { score: 80, details: { acronyms_found: 0, unexplained: 0 } };

  const density = unexplained.size / (totalWords / 100);
  let score = density <= 0.5 ? 95 : density <= 1 ? 85 : density <= 2 ? 70 : density <= 4 ? 50 : 30;

  return { score, details: { acronyms_found: acronyms.size, unexplained: unexplained.size } };
}

function scoreOwnershipClarity(inputs) {
  let clear = 0, vague = 0;

  for (const input of inputs) {
    clear += (input.content.match(/\b(\w+)\s+(?:is|are)\s+responsible\s+for\b/gi) || []).length;
    clear += (input.content.match(/\b(\w+)\s+owns?\b/gi) || []).length;
    vague += (input.content.match(/\b(?:we|they|someone)\s+will\b/gi) || []).length;
    vague += (input.content.match(/\bwill\s+be\s+(?:handled|managed)\b/gi) || []).length;
  }

  const total = clear + vague;
  const score = total === 0 ? 70 : (clear / total) * 100;
  return { score: Math.round(score * 10) / 10, details: { responsibility_statements: total, clear_owner: clear, unclear: vague } };
}

function getScoreBand(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'at_risk';
  if (score >= 30) return 'poor';
  return 'critical';
}

function calculateASPIREScores(termAnalyses) {
  const calc = (cat) => {
    const terms = termAnalyses.filter(t => t.category === cat);
    if (!terms.length) return 70;
    const def = terms.filter(t => t.isDefined).length / terms.length * 50;
    const con = terms.filter(t => !t.inconsistencyDetected).length / terms.length * 50;
    return Math.round(Math.min(100, def + con));
  };

  return {
    alignment: calc(TermCategory.OWNERSHIP_TERM),
    strategy: calc(TermCategory.FINANCIAL_STRATEGIC),
    prospecting: calc(TermCategory.PROMISE_WORD),
    integration: calc(TermCategory.LIFECYCLE_VERB),
    relationship: calc(TermCategory.PROMISE_WORD),
    engagement: calc(TermCategory.STATUS_LABEL)
  };
}

function identifyHighRiskTerms(termAnalyses) {
  const risks = [];

  for (const term of termAnalyses) {
    let score = 0;
    if (!term.isDefined) score += 30;
    if (term.inconsistencyDetected) score += 40;
    if (term.category === TermCategory.PROMISE_WORD) score += 20;
    if (term.occurrences > 5) score += 10;

    if (score >= 30) {
      const level = score >= 60 ? 'critical' : score >= 40 ? 'high' : 'medium';
      const issue = !term.isDefined ? 'undefined' : term.inconsistencyDetected ? 'inconsistent_meaning' : 'high_frequency';
      const rec = !term.isDefined ? `Define '${term.term}'` : `Standardize '${term.term}' usage`;

      risks.push({
        term: term.term,
        risk_level: level,
        category: term.category,
        occurrences: term.occurrences,
        documents: term.documents,
        issue,
        recommendation: rec
      });
    }
  }

  return risks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.risk_level] - order[b.risk_level] || b.occurrences - a.occurrences;
  }).slice(0, 10);
}

function estimateMeaningDebt(score, companySize, highRiskCount) {
  const base = companySize * 2500;
  const mult = ((100 - score) / 50) * (1 + highRiskCount * 0.1);
  const cost = base * mult;

  return {
    low_estimate: Math.round(cost * 0.7 / 1000) * 1000,
    high_estimate: Math.round(cost * 1.3 / 1000) * 1000,
    currency: 'USD',
    period: 'annual',
    breakdown: {
      rework_misalignment: Math.round(cost * 0.35 / 1000) * 1000,
      client_escalations: Math.round(cost * 0.20 / 1000) * 1000,
      employee_clarification_time: Math.round(cost * 0.25 / 1000) * 1000,
      lost_deals_confusion: Math.round(cost * 0.20 / 1000) * 1000
    }
  };
}

function generateActionPlan(termAnalyses, components) {
  const actions = [];

  const undefined = termAnalyses.filter(t => !t.isDefined && t.occurrences > 3).slice(0, 3);
  for (const t of undefined) {
    actions.push({ priority: 'quick_win', action: `Define '${t.term}'`, rationale: `Appears ${t.occurrences} times undefined` });
  }

  const inconsistent = termAnalyses.filter(t => t.inconsistencyDetected).slice(0, 2);
  for (const t of inconsistent) {
    actions.push({ priority: 'high_impact', action: `Standardize '${t.term}'`, rationale: `Inconsistent across ${t.documents.length} docs` });
  }

  const lowComps = [...components].sort((a, b) => a.score - b.score).slice(0, 2);
  for (const c of lowComps) {
    if (c.score < 60) {
      actions.push({ priority: 'systemic', action: `Improve ${c.name}`, rationale: `Currently ${Math.round(c.score)}/100` });
    }
  }

  actions.push({ priority: 'maintenance', action: 'Scan new documents before publishing', rationale: 'Prevent new collisions' });

  return actions;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
