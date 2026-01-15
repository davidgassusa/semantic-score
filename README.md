# Semantic Score - Netlify Edition

**Analyze your business language for semantic collisions.**

A serverless web application that calculates your **Semantic Score** - a measure of how well-defined and consistent your business language is.

Based on *Semantic Collision* by David Gass.

---

## Features

- **Website Scanning** - Enter a URL to scrape and analyze marketing language
- **Document Upload** - Process PDFs and DOCX files directly in the browser
- **Text Input** - Paste content from any source
- **AI-Powered Analysis** - Uses Claude to detect semantic inconsistencies
- **Comprehensive Reports** - Score breakdown, high-risk terms, action plan

---

## Deploy to Netlify

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=YOUR_REPO_URL)

### Manual Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/semantic-score.git
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub repository
   - Build settings will be auto-detected from `netlify.toml`

3. **Add Environment Variables**
   - Go to Site settings > Environment variables
   - Add: `ANTHROPIC_API_KEY` = `your-api-key-here`

4. **Deploy**
   - Netlify will automatically deploy
   - Your site will be live at `https://your-site.netlify.app`

---

## Local Development

```bash
# Install dependencies
npm install

# Install Netlify CLI
npm install -g netlify-cli

# Run locally (with serverless functions)
netlify dev

# Open http://localhost:8888
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude AI |

**Important:** The API key is stored securely in Netlify's environment variables and is only accessible by serverless functions. It is never exposed to the browser.

---

## Architecture

```
semantic-score-netlify/
├── netlify/
│   └── functions/
│       ├── analyze.js       # Main analysis (uses Claude API)
│       └── scrape-website.js # Website scraper
├── public/
│   ├── index.html           # Single-page app
│   ├── css/styles.css       # Styling
│   └── js/app.js            # Client-side logic
├── src/
│   ├── termLibrary.js       # High-stakes term database
│   └── semanticAnalyzer.js  # Scoring algorithm (shared)
├── netlify.toml             # Netlify configuration
├── package.json             # Dependencies
└── README.md
```

### Data Flow

1. **User uploads documents** → Processed client-side using PDF.js/Mammoth.js
2. **User enters website URL** → Serverless function scrapes content
3. **User clicks Analyze** → Serverless function runs scoring algorithm + AI
4. **Results displayed** → All in browser, nothing stored

---

## API Endpoints (Serverless Functions)

### POST `/api/analyze`

Analyzes content and returns Semantic Score.

**Request:**
```json
{
  "inputs": [
    {
      "id": "doc_123",
      "name": "proposal.pdf",
      "content": "...",
      "wordCount": 500,
      "type": "document"
    }
  ],
  "companySize": 50,
  "useAI": true
}
```

**Response:**
```json
{
  "overall_score": 62.5,
  "score_band": "at_risk",
  "components": [...],
  "high_risk_terms": [...],
  "aspire_scores": {...},
  "meaning_debt": {...},
  "action_plan": [...]
}
```

### POST `/api/scrape-website`

Scrapes a website and extracts text content.

**Request:**
```json
{
  "url": "https://example.com",
  "maxPages": 10
}
```

**Response:**
```json
{
  "success": true,
  "pages": [...],
  "pagesScraped": 5
}
```

---

## Security

- **API Key Protection**: The Anthropic API key is stored as a Netlify environment variable, accessible only to serverless functions
- **No Data Storage**: All analysis happens in-memory; no user data is persisted
- **Client-Side Processing**: Documents are processed in the browser, never uploaded to servers
- **HTTPS Only**: Netlify enforces HTTPS for all deployments

---

## Scoring Algorithm

| Component | Weight | Description |
|-----------|--------|-------------|
| Definition Coverage | 25% | Are high-stakes terms defined? |
| Consistency | 25% | Same meaning across documents? |
| Boundary Clarity | 20% | Are promises bounded? |
| Threshold Specificity | 15% | Concrete vs vague criteria? |
| Jargon Load | 10% | Unexplained acronyms? |
| Ownership Clarity | 5% | Clear responsibility? |

---

## Customization

### Adding Terms

Edit `src/termLibrary.js` to add industry-specific terms:

```javascript
export const TERM_LIBRARY = {
  // Add your terms
  'your-term': TermCategory.PROMISE_WORD,
  // ...
};
```

### Adjusting Weights

Edit `netlify/functions/analyze.js`:

```javascript
const WEIGHTS = {
  definition_coverage: 0.25,  // Adjust as needed
  consistency: 0.25,
  // ...
};
```

---

## License

MIT License

---

## Credits

Based on *Semantic Collision: How Broken Language Destroys Service Businesses and How to Fix It* by David Gass.
