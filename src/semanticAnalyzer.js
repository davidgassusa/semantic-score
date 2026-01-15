/**
 * Semantic Score - Analysis Engine
 * Core scoring algorithm ported to JavaScript
 */

import {
  TERM_LIBRARY,
  TermCategory,
  TERM_RISK_MULTIPLIERS,
  VAGUE_PATTERNS,
  EXCLUSION_SIGNALS,
  INCLUSION_SIGNALS,
  LIMIT_SIGNALS,
  getTermCategory,
  getRiskMultiplier
} from './termLibrary.js';

// Component weights
const WEIGHTS = {
  definition_coverage: 0.25,
  consistency: 0.25,
  boundary_clarity: 0.20,
  threshold_specificity: 0.15,
  jargon_load: 0.10,
  ownership_clarity: 0.05
};

/**
 * Main analysis function
 */
export async function analyzeContent(inputs, options = {}) {
  const { companySize = 50, useAI = false, anthropicClient = null } = options;

  // Step 1: Extract terms from all inputs
  const termOccurrences = extractTerms(inputs);

  // Step 2: Analyze each term
  const termAnalyses = await analyzeTerms(termOccurrences, inputs, useAI, anthropicClient);

  // Step 3: Calculate component scores
  const c1 = scoreDefinitionCoverage(termAnalyses);
  const c2 = scoreConsistency(termAnalyses, inputs);
  const c3 = scoreBoundaryClarity(inputs);
  const c4 = scoreThresholdSpecificity(inputs);
  const c5 = scoreJargonLoad(inputs);
  const c6 = scoreOwnershipClarity(inputs);

  // Step 4: Build components array
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

  // Step 5: Calculate overall score
  const overallScore = components.reduce((sum, c) => sum + c.weightedScore, 0);

  // Step 6: Determine score band
  const scoreBand = getScoreBand(overallScore);

  // Step 7: Calculate ASPIRE scores
  const aspireScores = calculateASPIREScores(termAnalyses, inputs);

  // Step 8: Identify high-risk terms
  const highRiskTerms = identifyHighRiskTerms(termAnalyses);

  // Step 9: Estimate meaning debt
  const meaningDebt = estimateMeaningDebt(overallScore, companySize, highRiskTerms.length);

  // Step 10: Generate action plan
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

/**
 * Extract high-stakes terms from all inputs
 */
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

        // Extract context
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

/**
 * Analyze each term
 */
async function analyzeTerms(termOccurrences, inputs, useAI, anthropicClient) {
  const analyses = [];

  for (const [term, occurrences] of Object.entries(termOccurrences)) {
    const category = getTermCategory(term) || TermCategory.GENERAL;
    const riskMultiplier = getRiskMultiplier(category);

    const documents = [...new Set(occurrences.map(o => o.docName))];
    const contexts = occurrences.slice(0, 5).map(o => o.context);

    // Check for definition
    let isDefined = false;
    let definitionQuality = 'missing';
    let definitionText = null;
    let hasThreshold = false;
    let hasBoundary = false;

    for (const input of inputs) {
      const defResult = findDefinition(term, input.content);
      if (defResult) {
        isDefined = true;
        definitionText = defResult.text;
        hasThreshold = defResult.hasThreshold;
        hasBoundary = defResult.hasBoundary;

        if (hasThreshold && hasBoundary) {
          definitionQuality = 'complete';
        } else if (hasThreshold || hasBoundary) {
          definitionQuality = 'partial';
        } else {
          definitionQuality = 'minimal';
        }
        break;
      }
    }

    // Check for inconsistency (simplified without AI)
    let inconsistencyDetected = false;
    let inconsistencyDetails = null;

    if (documents.length > 1 && useAI && anthropicClient) {
      try {
        const result = await checkConsistencyAI(term, contexts, anthropicClient);
        inconsistencyDetected = result.inconsistent;
        inconsistencyDetails = result.details;
      } catch (e) {
        console.error('AI consistency check failed:', e);
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
      definitionText,
      hasThreshold,
      hasBoundary,
      contexts,
      inconsistencyDetected,
      inconsistencyDetails
    });
  }

  return analyses;
}

/**
 * Find definition in content
 */
function findDefinition(term, content) {
  const contentLower = content.toLowerCase();
  const termEscaped = escapeRegex(term);

  const patterns = [
    new RegExp(`${termEscaped}["']?\\s+(?:means?|is defined as|refers to)\\s+["']?([^.]+)`, 'i'),
    new RegExp(`(?:by|when we say)\\s+["']?${termEscaped}["']?,?\\s+(?:we mean|this means)\\s+([^.]+)`, 'i'),
    new RegExp(`["']?${termEscaped}["']?\\s*[-:]\\s*([^.]+)`, 'i'),
    new RegExp(`definition of\\s+["']?${termEscaped}["']?\\s*[-:]\\s*([^.]+)`, 'i')
  ];

  for (const pattern of patterns) {
    const match = contentLower.match(pattern);
    if (match) {
      const definitionText = match[1].trim().slice(0, 200);

      const hasThreshold = LIMIT_SIGNALS.some(s => definitionText.includes(s));
      const hasBoundary = [...EXCLUSION_SIGNALS, ...INCLUSION_SIGNALS].some(s =>
        definitionText.includes(s)
      );

      return { text: definitionText, hasThreshold, hasBoundary };
    }
  }

  return null;
}

/**
 * Check consistency using AI
 */
async function checkConsistencyAI(term, contexts, client) {
  if (contexts.length < 2) {
    return { inconsistent: false };
  }

  const prompt = `Compare how the term "${term}" is used in these two contexts:

Context A:
"${contexts[0]}"

Context B:
"${contexts[1]}"

Does the term mean the same thing in both contexts?
Respond with JSON only: {"inconsistent": true/false, "details": "brief explanation if inconsistent"}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI check error:', e);
  }

  return { inconsistent: false };
}

/**
 * Score Definition Coverage (C1)
 */
function scoreDefinitionCoverage(termAnalyses) {
  if (!termAnalyses.length) {
    return { score: 50, details: { terms_found: 0, terms_defined: 0, terms_undefined: 0 } };
  }

  const qualityScores = { complete: 1.0, partial: 0.6, minimal: 0.3, missing: 0.0 };

  let totalWeight = 0;
  let definedWeight = 0;

  for (const term of termAnalyses) {
    const weight = term.riskMultiplier;
    totalWeight += weight;
    definedWeight += weight * qualityScores[term.definitionQuality];
  }

  const score = totalWeight > 0 ? (definedWeight / totalWeight) * 100 : 50;
  const termsDefined = termAnalyses.filter(t => t.isDefined).length;

  return {
    score: Math.round(score * 10) / 10,
    details: {
      terms_found: termAnalyses.length,
      terms_defined: termsDefined,
      terms_undefined: termAnalyses.length - termsDefined
    }
  };
}

/**
 * Score Consistency (C2)
 */
function scoreConsistency(termAnalyses, inputs) {
  const crossDocTerms = termAnalyses.filter(t => t.documents.length > 1);

  if (!crossDocTerms.length) {
    return { score: 80, details: { cross_doc_terms: 0, consistent: 0, inconsistent: 0 } };
  }

  let totalWeight = 0;
  let consistentWeight = 0;

  for (const term of crossDocTerms) {
    const weight = term.riskMultiplier;
    totalWeight += weight;
    if (!term.inconsistencyDetected) {
      consistentWeight += weight;
    }
  }

  const score = totalWeight > 0 ? (consistentWeight / totalWeight) * 100 : 80;
  const inconsistentCount = crossDocTerms.filter(t => t.inconsistencyDetected).length;

  return {
    score: Math.round(score * 10) / 10,
    details: {
      cross_doc_terms: crossDocTerms.length,
      consistent: crossDocTerms.length - inconsistentCount,
      inconsistent: inconsistentCount
    }
  };
}

/**
 * Score Boundary Clarity (C3)
 */
function scoreBoundaryClarity(inputs) {
  let promiseCount = 0;
  let boundedCount = 0;

  const promisePatterns = [
    /\b(?:we\s+)?(?:will|shall|provide|offer|deliver|ensure|guarantee)\b/gi,
    /\b(?:unlimited|comprehensive|full.service|all.inclusive)\b/gi,
    /\b(?:support|partnership|commitment)\b/gi
  ];

  for (const input of inputs) {
    const contentLower = input.content.toLowerCase();

    for (const pattern of promisePatterns) {
      const matches = contentLower.match(pattern);
      if (matches) promiseCount += matches.length;
    }

    for (const signal of [...EXCLUSION_SIGNALS, ...INCLUSION_SIGNALS, ...LIMIT_SIGNALS]) {
      const regex = new RegExp(escapeRegex(signal), 'gi');
      const matches = contentLower.match(regex);
      if (matches) boundedCount += matches.length;
    }
  }

  const score = promiseCount === 0 ? 70 : Math.min(100, (boundedCount / promiseCount) * 100);

  return {
    score: Math.round(score * 10) / 10,
    details: {
      promises_found: promiseCount,
      boundary_signals: boundedCount,
      ratio: Math.round((boundedCount / Math.max(1, promiseCount)) * 100) / 100
    }
  };
}

/**
 * Score Threshold Specificity (C4)
 */
function scoreThresholdSpecificity(inputs) {
  let totalStatements = 0;
  let vagueStatements = 0;

  for (const input of inputs) {
    const contentLower = input.content.toLowerCase();
    const sentences = input.content.split(/[.!?]+/);
    totalStatements += sentences.length;

    for (const pattern of VAGUE_PATTERNS) {
      const regex = new RegExp(escapeRegex(pattern), 'gi');
      const matches = contentLower.match(regex);
      if (matches) vagueStatements += matches.length;
    }
  }

  if (totalStatements === 0) {
    return { score: 70, details: { criteria_statements: 0, vague_patterns_found: 0 } };
  }

  const vagueRatio = vagueStatements / totalStatements;
  const score = Math.max(0, 100 - vagueRatio * 200);

  return {
    score: Math.round(score * 10) / 10,
    details: {
      criteria_statements: totalStatements,
      vague_patterns_found: vagueStatements,
      vague_ratio: Math.round(vagueRatio * 1000) / 1000
    }
  };
}

/**
 * Score Jargon Load (C5)
 */
function scoreJargonLoad(inputs) {
  const acronymsFound = new Set();
  const unexplained = new Set();

  for (const input of inputs) {
    const matches = input.content.match(/\b[A-Z]{2,}\b/g) || [];

    for (const acronym of matches) {
      if (acronym !== 'I' && acronym !== 'A') {
        acronymsFound.add(acronym);

        const explainPattern = new RegExp(`\\(${acronym}\\)|${acronym}\\s*\\([^)]+\\)`);
        if (!explainPattern.test(input.content)) {
          unexplained.add(acronym);
        }
      }
    }
  }

  const totalWords = inputs.reduce((sum, inp) => sum + (inp.wordCount || 0), 0);

  if (totalWords === 0) {
    return { score: 80, details: { acronyms_found: 0, unexplained: 0 } };
  }

  const jargonDensity = unexplained.size / (totalWords / 100);

  let score;
  if (jargonDensity <= 0.5) score = 95;
  else if (jargonDensity <= 1) score = 85;
  else if (jargonDensity <= 2) score = 70;
  else if (jargonDensity <= 4) score = 50;
  else score = 30;

  return {
    score,
    details: {
      acronyms_found: acronymsFound.size,
      unexplained: unexplained.size,
      jargon_density: Math.round(jargonDensity * 100) / 100
    }
  };
}

/**
 * Score Ownership Clarity (C6)
 */
function scoreOwnershipClarity(inputs) {
  let clearOwnership = 0;
  let vagueOwnership = 0;

  const clearPatterns = [
    /\b(\w+)\s+(?:is|are)\s+responsible\s+for\b/gi,
    /\b(\w+)\s+owns?\b/gi,
    /\b(\w+)\s+(?:will|shall)\s+(?:handle|manage|lead)\b/gi,
    /\bresponsibility\s+of\s+(?:the\s+)?(\w+)/gi
  ];

  const vaguePatterns = [
    /\b(?:we|they|someone)\s+will\b/gi,
    /\bwill\s+be\s+(?:handled|managed)\b/gi,
    /\bshould\s+be\s+(?:done|completed)\b/gi
  ];

  for (const input of inputs) {
    for (const pattern of clearPatterns) {
      const matches = input.content.match(pattern);
      if (matches) clearOwnership += matches.length;
    }

    for (const pattern of vaguePatterns) {
      const matches = input.content.match(pattern);
      if (matches) vagueOwnership += matches.length;
    }
  }

  const total = clearOwnership + vagueOwnership;
  const score = total === 0 ? 70 : (clearOwnership / total) * 100;

  return {
    score: Math.round(score * 10) / 10,
    details: {
      responsibility_statements: total,
      clear_owner: clearOwnership,
      unclear: vagueOwnership
    }
  };
}

/**
 * Get score band
 */
function getScoreBand(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'at_risk';
  if (score >= 30) return 'poor';
  return 'critical';
}

/**
 * Calculate ASPIRE scores
 */
function calculateASPIREScores(termAnalyses, inputs) {
  const calcScore = (terms) => {
    if (!terms.length) return 70;
    const defined = terms.filter(t => t.isDefined).length;
    const consistent = terms.filter(t => !t.inconsistencyDetected).length;
    return Math.min(100, (defined / terms.length) * 50 + (consistent / terms.length) * 50);
  };

  const alignment = termAnalyses.filter(t => t.category === TermCategory.OWNERSHIP_TERM);
  const strategy = termAnalyses.filter(t => t.category === TermCategory.FINANCIAL_STRATEGIC);
  const prospecting = termAnalyses.filter(t => t.category === TermCategory.PROMISE_WORD);
  const integration = termAnalyses.filter(t => t.category === TermCategory.LIFECYCLE_VERB);
  const relationship = termAnalyses.filter(t => t.category === TermCategory.PROMISE_WORD);
  const engagement = termAnalyses.filter(t => t.category === TermCategory.STATUS_LABEL);

  return {
    alignment: Math.round(calcScore(alignment)),
    strategy: Math.round(calcScore(strategy)),
    prospecting: Math.round(calcScore(prospecting)),
    integration: Math.round(calcScore(integration)),
    relationship: Math.round(calcScore(relationship)),
    engagement: Math.round(calcScore(engagement))
  };
}

/**
 * Identify high-risk terms
 */
function identifyHighRiskTerms(termAnalyses) {
  const highRisk = [];

  for (const term of termAnalyses) {
    let riskScore = 0;

    if (!term.isDefined) riskScore += 30;
    if (term.inconsistencyDetected) riskScore += 40;
    if (term.category === TermCategory.PROMISE_WORD) riskScore += 20;
    if (term.occurrences > 5) riskScore += 10;

    if (riskScore >= 30) {
      let riskLevel, issue, recommendation;

      if (riskScore >= 60) riskLevel = 'critical';
      else if (riskScore >= 40) riskLevel = 'high';
      else riskLevel = 'medium';

      if (!term.isDefined && term.inconsistencyDetected) {
        issue = 'undefined_and_inconsistent';
        recommendation = `Create single definition with explicit boundaries for '${term.term}'`;
      } else if (!term.isDefined) {
        issue = 'undefined';
        recommendation = `Define '${term.term}' with threshold and boundary`;
      } else if (term.inconsistencyDetected) {
        issue = 'inconsistent_meaning';
        recommendation = `Standardize meaning of '${term.term}' across all documents`;
      } else {
        issue = 'high_frequency_undefined';
        recommendation = `Review usage of '${term.term}' for clarity`;
      }

      highRisk.push({
        term: term.term,
        risk_level: riskLevel,
        category: term.category,
        occurrences: term.occurrences,
        documents: term.documents,
        issue,
        recommendation,
        examples: term.contexts.slice(0, 2)
      });
    }
  }

  // Sort by risk level and return top 10
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  highRisk.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level] || b.occurrences - a.occurrences);

  return highRisk.slice(0, 10);
}

/**
 * Estimate meaning debt
 */
function estimateMeaningDebt(score, companySize, highRiskCount) {
  const baseCostPerEmployee = 2500;
  const scoreMultiplier = (100 - score) / 50;
  const riskMultiplier = 1 + highRiskCount * 0.1;

  const baseCost = companySize * baseCostPerEmployee;
  const adjustedCost = baseCost * scoreMultiplier * riskMultiplier;

  const lowEstimate = Math.round(adjustedCost * 0.7 / 1000) * 1000;
  const highEstimate = Math.round(adjustedCost * 1.3 / 1000) * 1000;

  return {
    low_estimate: lowEstimate,
    high_estimate: highEstimate,
    currency: 'USD',
    period: 'annual',
    breakdown: {
      rework_misalignment: Math.round(adjustedCost * 0.35 / 1000) * 1000,
      client_escalations: Math.round(adjustedCost * 0.20 / 1000) * 1000,
      employee_clarification_time: Math.round(adjustedCost * 0.25 / 1000) * 1000,
      lost_deals_confusion: Math.round(adjustedCost * 0.20 / 1000) * 1000
    }
  };
}

/**
 * Generate action plan
 */
function generateActionPlan(termAnalyses, components) {
  const actions = [];

  // Quick wins
  const undefinedHighFreq = termAnalyses
    .filter(t => !t.isDefined && t.occurrences > 3)
    .slice(0, 3);

  for (const term of undefinedHighFreq) {
    actions.push({
      priority: 'quick_win',
      action: `Define '${term.term}' - one definition, used everywhere`,
      rationale: `Appears ${term.occurrences} times without definition`,
      related_terms: [term.term]
    });
  }

  // High impact
  const inconsistent = termAnalyses.filter(t => t.inconsistencyDetected).slice(0, 3);

  for (const term of inconsistent) {
    actions.push({
      priority: 'high_impact',
      action: `Resolve inconsistent usage of '${term.term}'`,
      rationale: `Used differently across ${term.documents.length} documents`,
      related_terms: [term.term]
    });
  }

  // Systemic - lowest components
  const sortedComponents = [...components].sort((a, b) => a.score - b.score);

  for (const comp of sortedComponents.slice(0, 2)) {
    if (comp.score < 60) {
      actions.push({
        priority: 'systemic',
        action: `Improve ${comp.name} (currently ${Math.round(comp.score)}/100)`,
        rationale: 'This component is dragging down your overall score',
        related_terms: []
      });
    }
  }

  // Maintenance
  actions.push({
    priority: 'maintenance',
    action: 'Scan new documents before publishing',
    rationale: 'Prevent new semantic collisions',
    related_terms: []
  });

  actions.push({
    priority: 'maintenance',
    action: 'Monthly consistency check across document corpus',
    rationale: 'Catch drift early',
    related_terms: []
  });

  return actions;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
