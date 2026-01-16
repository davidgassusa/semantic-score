/**
 * Netlify Function: Scrape Website
 * Fetches and extracts text content from websites
 * (Can't be done client-side due to CORS)
 */

// Important paths to try scraping
const IMPORTANT_PATHS = [
  '/', '/about', '/about-us', '/services', '/solutions',
  '/products', '/pricing', '/how-it-works', '/process',
  '/our-process', '/approach', '/why-us', '/faq'
];

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    let { url, maxPages = 10 } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const baseUrl = new URL(url).origin;
    const results = [];
    const scrapedUrls = new Set();

    // Scrape main URL first
    const mainPage = await scrapePage(url, 'Homepage');
    if (mainPage) {
      results.push(mainPage);
      scrapedUrls.add(url);
    }

    // Try important paths
    for (const path of IMPORTANT_PATHS) {
      if (results.length >= maxPages) break;

      const pageUrl = new URL(path, baseUrl).href;
      if (scrapedUrls.has(pageUrl)) continue;

      const pageName = path === '/' ? 'Homepage' : path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const page = await scrapePage(pageUrl, pageName);

      if (page) {
        results.push(page);
        scrapedUrls.add(pageUrl);
      }
    }

    if (results.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Could not extract content from website. The site may be blocking automated access.' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        pages: results,
        pagesScraped: results.length
      })
    };

  } catch (error) {
    console.error('Scrape error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Scraping failed' })
    };
  }
};

/**
 * Scrape a single page
 */
async function scrapePage(url, pageName) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SemanticScoreBot/1.0; +https://semanticscore.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await response.text();
    const text = extractText(html);

    if (!text || text.length < 100) return null;

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    return {
      id: generateId(),
      name: `Website: ${pageName}`,
      content: text,
      wordCount,
      type: 'website',
      metadata: { url, pageName }
    };

  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract meaningful text from HTML using regex (no external dependencies)
 */
function extractText(html) {
  // Remove script and style tags with their content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');

  // Remove nav, header, footer sections
  text = text
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#\d+;/gi, ' ');

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common boilerplate patterns
  text = text
    .replace(/©.*?\d{4}/g, '')
    .replace(/All [Rr]ights [Rr]eserved/g, '')
    .replace(/[Pp]rivacy [Pp]olicy/g, '')
    .replace(/[Tt]erms of [Ss]ervice/g, '')
    .replace(/[Cc]ookie [Pp]olicy/g, '');

  return text.trim();
}

/**
 * Generate a simple unique ID
 */
function generateId() {
  return 'web_' + Math.random().toString(36).substring(2, 15);
}
