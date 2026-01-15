/**
 * Netlify Function: Scrape Website
 * Fetches and extracts text content from websites
 * (Can't be done client-side due to CORS)
 */

import * as cheerio from 'cheerio';

// Important paths to try scraping
const IMPORTANT_PATHS = [
  '/', '/about', '/about-us', '/services', '/solutions',
  '/products', '/pricing', '/how-it-works', '/process',
  '/our-process', '/approach', '/why-us', '/faq'
];

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
    let { url, maxPages = 10 } = body;

    if (!url) {
      return {
        statusCode: 400,
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
        body: JSON.stringify({ error: 'Could not extract content from website' })
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
      body: JSON.stringify({ error: error.message || 'Scraping failed' })
    };
  }
};

/**
 * Scrape a single page
 */
async function scrapePage(url, pageName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SemanticScoreBot/1.0 (Business Language Analysis)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

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
 * Extract meaningful text from HTML
 */
function extractText(html) {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, nav, footer, header, aside, noscript, iframe, form').remove();
  $('[class*="nav"], [class*="menu"], [class*="sidebar"], [class*="footer"], [class*="header"], [class*="cookie"], [class*="popup"]').remove();

  // Try to find main content
  let content = $('main').text() ||
                $('article').text() ||
                $('#content').text() ||
                $('#main').text() ||
                $('.content').text() ||
                $('body').text();

  // Clean up the text
  content = content
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')     // Remove excessive newlines
    .trim();

  // Remove common boilerplate
  content = content
    .replace(/©.*?\d{4}/g, '')
    .replace(/All [Rr]ights [Rr]eserved/g, '')
    .replace(/[Pp]rivacy [Pp]olicy/g, '')
    .replace(/[Tt]erms of [Ss]ervice/g, '');

  return content.trim();
}

/**
 * Generate a simple unique ID
 */
function generateId() {
  return 'web_' + Math.random().toString(36).substring(2, 15);
}
