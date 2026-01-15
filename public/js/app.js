/**
 * Semantic Score App - Netlify Frontend
 * Client-side document processing + serverless function calls
 */

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// State
let collectedInputs = [];
let analysisResult = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupFileUploads();
});

// ----- Event Listeners -----

function setupEventListeners() {
    document.getElementById('add-website-btn').addEventListener('click', addWebsite);
    document.getElementById('add-text-btn').addEventListener('click', addText);
    document.getElementById('analyze-btn').addEventListener('click', runAnalysis);
    document.getElementById('export-btn').addEventListener('click', exportResults);
    document.getElementById('start-over-btn').addEventListener('click', startOver);

    // Enter key for website URL
    document.getElementById('website-url').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addWebsite();
    });
}

function setupFileUploads() {
    const docDropzone = document.getElementById('doc-dropzone');
    const docInput = document.getElementById('doc-files');

    docDropzone.addEventListener('click', () => docInput.click());
    docInput.addEventListener('change', (e) => handleDocumentFiles(e.target.files));

    docDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        docDropzone.classList.add('dragover');
    });

    docDropzone.addEventListener('dragleave', () => {
        docDropzone.classList.remove('dragover');
    });

    docDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        docDropzone.classList.remove('dragover');
        handleDocumentFiles(e.dataTransfer.files);
    });
}

// ----- Website Handling -----

async function addWebsite() {
    const urlInput = document.getElementById('website-url');
    const statusDiv = document.getElementById('website-status');
    const button = document.getElementById('add-website-btn');

    let url = urlInput.value.trim();
    if (!url) {
        showStatus(statusDiv, 'Please enter a URL', 'error');
        return;
    }

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    setButtonLoading(button, true);

    try {
        const response = await fetch('/api/scrape-website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, maxPages: 10 })
        });

        const data = await response.json();

        if (response.ok && data.pages) {
            for (const page of data.pages) {
                collectedInputs.push(page);
            }
            showStatus(statusDiv, `Added ${data.pages.length} pages from website`, 'success');
            updateSummary();
            urlInput.value = '';
        } else {
            showStatus(statusDiv, data.error || 'Failed to scrape website', 'error');
        }
    } catch (error) {
        console.error('Website error:', error);
        showStatus(statusDiv, 'Failed to connect. Try again.', 'error');
    } finally {
        setButtonLoading(button, false);
    }
}

// ----- Document Handling (Client-Side) -----

async function handleDocumentFiles(files) {
    const fileList = document.getElementById('doc-list');

    for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();

        // Show processing indicator
        const itemId = 'file_' + Math.random().toString(36).substr(2, 9);
        addFileToList(fileList, file.name, 'Processing...', itemId);

        try {
            let content = '';

            if (ext === 'pdf') {
                content = await extractPdfText(file);
            } else if (ext === 'docx' || ext === 'doc') {
                content = await extractDocxText(file);
            } else if (ext === 'txt' || ext === 'md') {
                content = await file.text();
            } else {
                throw new Error('Unsupported format');
            }

            if (!content || content.length < 50) {
                throw new Error('Could not extract text');
            }

            const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

            collectedInputs.push({
                id: itemId,
                name: file.name,
                content,
                wordCount,
                type: 'document'
            });

            updateFileInList(itemId, file.name, `${wordCount.toLocaleString()} words`);
            updateSummary();

        } catch (error) {
            console.error('File error:', error);
            updateFileInList(itemId, file.name, 'Error: ' + error.message, true);
        }
    }
}

async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n\n';
    }

    return text.trim();
}

async function extractDocxText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

// ----- Text Handling -----

function addText() {
    const textarea = document.getElementById('text-input');
    const statusDiv = document.getElementById('text-status');

    const content = textarea.value.trim();
    if (!content) {
        showStatus(statusDiv, 'Please enter some text', 'error');
        return;
    }

    if (content.length < 50) {
        showStatus(statusDiv, 'Please enter at least 50 characters', 'error');
        return;
    }

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    collectedInputs.push({
        id: 'text_' + Math.random().toString(36).substr(2, 9),
        name: `Pasted Text (${wordCount} words)`,
        content,
        wordCount,
        type: 'text'
    });

    textarea.value = '';
    showStatus(statusDiv, 'Text added successfully', 'success');
    updateSummary();
}

// ----- UI Helpers -----

function addFileToList(listElement, name, meta, id) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.id = id;
    item.innerHTML = `
        <span class="filename">${name}</span>
        <span class="file-meta">${meta}</span>
        <button class="remove-btn" onclick="removeInput('${id}')">&times;</button>
    `;
    listElement.appendChild(item);
}

function updateFileInList(id, name, meta, isError = false) {
    const item = document.getElementById(id);
    if (item) {
        const metaEl = item.querySelector('.file-meta');
        metaEl.textContent = meta;
        if (isError) metaEl.style.color = 'var(--danger)';
    }
}

function removeInput(id) {
    collectedInputs = collectedInputs.filter(inp => inp.id !== id);
    const element = document.getElementById(id);
    if (element) element.remove();
    updateSummary();
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
    }, 5000);
}

function setButtonLoading(button, loading) {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.btn-loading');
    if (loading) {
        text.classList.add('hidden');
        loader.classList.remove('hidden');
        button.disabled = true;
    } else {
        text.classList.remove('hidden');
        loader.classList.add('hidden');
        button.disabled = false;
    }
}

function updateSummary() {
    const totalWords = collectedInputs.reduce((sum, inp) => sum + (inp.wordCount || 0), 0);

    document.getElementById('source-count').textContent = collectedInputs.length;
    document.getElementById('word-count').textContent = totalWords.toLocaleString();

    // Update sources list
    const sourcesList = document.getElementById('sources-list');
    sourcesList.innerHTML = collectedInputs.map(inp => `
        <div class="source-item">
            <span class="source-name">${inp.name}</span>
            <span class="source-words">${(inp.wordCount || 0).toLocaleString()} words</span>
        </div>
    `).join('');

    // Enable/disable analyze button
    document.getElementById('analyze-btn').disabled = collectedInputs.length === 0;
}

// ----- Analysis -----

async function runAnalysis() {
    const analyzeBtn = document.getElementById('analyze-btn');
    setButtonLoading(analyzeBtn, true);

    showSection('loading-section');
    updateStep(2);

    // Animate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 10, 90);
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }, 500);

    const messages = [
        'Extracting terms from your content...',
        'Identifying high-stakes language...',
        'Checking for semantic collisions...',
        'Analyzing consistency across sources...',
        'Calculating your Semantic Score...'
    ];

    let msgIdx = 0;
    const messageInterval = setInterval(() => {
        msgIdx = (msgIdx + 1) % messages.length;
        document.getElementById('loading-message').textContent = messages[msgIdx];
    }, 2000);

    try {
        const companySize = parseInt(document.getElementById('company-size').value) || 50;

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inputs: collectedInputs,
                companySize,
                useAI: true
            })
        });

        clearInterval(progressInterval);
        clearInterval(messageInterval);

        document.getElementById('progress-fill').style.width = '100%';

        if (response.ok) {
            const data = await response.json();
            analysisResult = data;
            setTimeout(() => {
                showSection('results-section');
                updateStep(3);
                renderResults(data);
            }, 500);
        } else {
            const error = await response.json();
            alert(error.error || 'Analysis failed. Please try again.');
            showSection('input-section');
            updateStep(1);
        }
    } catch (error) {
        clearInterval(progressInterval);
        clearInterval(messageInterval);
        console.error('Analysis error:', error);
        alert('Failed to complete analysis. Please try again.');
        showSection('input-section');
        updateStep(1);
    } finally {
        setButtonLoading(analyzeBtn, false);
    }
}

// ----- Results Rendering -----

function renderResults(result) {
    // Score circle
    const score = result.overall_score;
    const scoreCircle = document.getElementById('score-circle');
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;

    setTimeout(() => {
        scoreCircle.style.strokeDashoffset = offset;
        scoreCircle.style.stroke = getScoreColor(result.score_band);
    }, 100);

    document.getElementById('score-number').textContent = Math.round(score);

    const bandLabel = document.getElementById('score-band');
    bandLabel.textContent = formatBand(result.score_band);
    bandLabel.style.color = getScoreColor(result.score_band);

    document.getElementById('score-interpretation').textContent = getInterpretation(result.score_band);

    renderComponents(result.components);
    renderRiskTerms(result.high_risk_terms);
    renderASPIRE(result.aspire_scores);
    renderMeaningDebt(result.meaning_debt);
    renderActionPlan(result.action_plan);
}

function getScoreColor(band) {
    const colors = {
        'excellent': '#10b981', 'good': '#22c55e', 'at_risk': '#f59e0b',
        'poor': '#f97316', 'critical': '#ef4444'
    };
    return colors[band] || '#64748b';
}

function formatBand(band) {
    return band.replace('_', ' ').toUpperCase();
}

function getInterpretation(band) {
    const texts = {
        'excellent': 'Your business language is well-defined and consistent. You\'re ready for AI automation.',
        'good': 'Most high-stakes terms are defined, but some gaps remain that could cause friction.',
        'at_risk': 'Significant meaning debt exists. Semantic collisions are likely in handoffs and client interactions.',
        'poor': 'Your language is actively causing damage. Many terms are undefined or used inconsistently.',
        'critical': 'Semantic chaos. Every handoff and client interaction is at risk of misalignment.'
    };
    return texts[band] || '';
}

function renderComponents(components) {
    const list = document.getElementById('components-list');
    list.innerHTML = components.map(comp => {
        const color = comp.score >= 70 ? '#10b981' : comp.score >= 50 ? '#f59e0b' : '#ef4444';
        return `
            <div class="component-item">
                <div class="component-info">
                    <div class="component-name">${comp.name}</div>
                    <div class="component-detail">${formatDetail(comp.details)}</div>
                </div>
                <div class="component-bar">
                    <div class="component-bar-fill" style="width: ${comp.score}%; background: ${color}"></div>
                </div>
                <div class="component-score" style="color: ${color}">${Math.round(comp.score)}</div>
            </div>
        `;
    }).join('');
}

function formatDetail(details) {
    if (details.terms_defined !== undefined) return `${details.terms_defined} of ${details.terms_found} terms defined`;
    if (details.inconsistent !== undefined) return `${details.inconsistent} inconsistent terms`;
    if (details.vague_patterns_found !== undefined) return `${details.vague_patterns_found} vague patterns`;
    return '';
}

function renderRiskTerms(terms) {
    const list = document.getElementById('risk-terms-list');

    if (!terms || !terms.length) {
        list.innerHTML = '<p class="no-data">No high-risk terms identified. Great job!</p>';
        return;
    }

    list.innerHTML = terms.slice(0, 5).map(term => `
        <div class="risk-term ${term.risk_level}">
            <span class="risk-badge ${term.risk_level}">${term.risk_level}</span>
            <div class="risk-term-content">
                <div class="risk-term-name">"${term.term}"</div>
                <div class="risk-term-issue">Found ${term.occurrences} times across ${term.documents.length} source(s). ${formatIssue(term.issue)}</div>
                <div class="risk-term-recommendation">${term.recommendation}</div>
            </div>
        </div>
    `).join('');
}

function formatIssue(issue) {
    const issues = {
        'undefined': 'No definition found.',
        'inconsistent_meaning': 'Different meanings across documents.',
        'high_frequency': 'Frequently used but undefined.'
    };
    return issues[issue] || issue;
}

function renderASPIRE(scores) {
    const chart = document.getElementById('aspire-chart');
    const stages = [
        { key: 'alignment', label: 'Align' },
        { key: 'strategy', label: 'Strategy' },
        { key: 'prospecting', label: 'Prospect' },
        { key: 'integration', label: 'Integrate' },
        { key: 'relationship', label: 'Relate' },
        { key: 'engagement', label: 'Engage' }
    ];

    chart.innerHTML = stages.map(stage => {
        const score = scores[stage.key] || 0;
        const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
        return `
            <div class="aspire-stage">
                <div class="aspire-bar-container">
                    <div class="aspire-bar" style="height: ${score}%; background: ${color}"></div>
                </div>
                <div class="aspire-label">${stage.label}</div>
                <div class="aspire-score">${Math.round(score)}</div>
            </div>
        `;
    }).join('');
}

function renderMeaningDebt(debt) {
    const container = document.getElementById('debt-estimate');

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    container.innerHTML = `
        <div class="debt-range">${fmt(debt.low_estimate)} - ${fmt(debt.high_estimate)}</div>
        <div class="debt-period">Estimated annual cost of meaning debt</div>
        <div class="debt-breakdown">
            ${Object.entries(debt.breakdown || {}).map(([key, val]) => `
                <div class="debt-item">
                    <div class="debt-item-label">${key.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</div>
                    <div class="debt-item-value">${fmt(val)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderActionPlan(actions) {
    const container = document.getElementById('action-plan');

    const groups = {
        'quick_win': { title: 'Quick Wins (Do This Week)', items: [] },
        'high_impact': { title: 'High Impact (Do This Month)', items: [] },
        'systemic': { title: 'Systemic (Do This Quarter)', items: [] },
        'maintenance': { title: 'Ongoing Maintenance', items: [] }
    };

    (actions || []).forEach(a => {
        if (groups[a.priority]) groups[a.priority].items.push(a);
    });

    container.innerHTML = Object.values(groups)
        .filter(g => g.items.length > 0)
        .map(g => `
            <div class="action-group">
                <div class="action-group-title">${g.title}</div>
                ${g.items.map(item => `
                    <div class="action-item">
                        <div class="action-checkbox"></div>
                        <div class="action-text">
                            <strong>${item.action}</strong>
                            <small>${item.rationale}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
}

// ----- Navigation -----

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

function updateStep(stepNum) {
    document.querySelectorAll('.step').forEach((s, i) => {
        s.classList.remove('active', 'completed');
        if (i + 1 < stepNum) s.classList.add('completed');
        if (i + 1 === stepNum) s.classList.add('active');
    });
}

// ----- Export & Reset -----

function exportResults() {
    if (!analysisResult) return;

    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `semantic-score-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function startOver() {
    collectedInputs = [];
    analysisResult = null;

    document.getElementById('website-url').value = '';
    document.getElementById('text-input').value = '';
    document.getElementById('doc-list').innerHTML = '';
    document.getElementById('sources-list').innerHTML = '';

    updateSummary();
    showSection('input-section');
    updateStep(1);
}
