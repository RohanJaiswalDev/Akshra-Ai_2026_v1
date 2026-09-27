/**
 * Real-time Web Search Engine utility for Akshra AI
 * Fetches live search results from Google / Web search indexes
 * without requiring external paid API keys.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchPayload {
  query: string;
  results: SearchResult[];
}

// Decode HTML entities safely
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

// Strip HTML tags
function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ""));
}

// Extract real URL from DuckDuckGo redirect link
function cleanUrl(rawUrl: string): string {
  try {
    if (rawUrl.includes("uddg=")) {
      const match = rawUrl.match(/uddg=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    if (rawUrl.startsWith("//")) {
      return "https:" + rawUrl;
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

// Strategy 1: DuckDuckGo HTML Search
async function searchDuckDuckGoHtml(query: string, maxResults: number): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo returned ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResult[] = [];
  const blocks = html.split('<div class="result results_links');

  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i];
    // Find anchor tag for title and URL
    const titleMatch =
      block.match(/<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    // Find snippet
    const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

    if (titleMatch) {
      const parsedUrl = cleanUrl(titleMatch[1]);
      const title = stripHtml(titleMatch[2]);
      const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : "";

      if (parsedUrl.startsWith("http") && title) {
        results.push({
          title,
          url: parsedUrl,
          snippet,
        });
      }
    }
  }

  return results;
}

// Strategy 2: Google Web Search
async function searchGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=${maxResults + 2}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Google returned ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResult[] = [];

  // Parse Google results
  const linkRegex = /<a href="\/url\?q=([^"&]+)[^"]*"[^>]*><h3[^>]*>([\s\S]*?)<\/h3>/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
    const rawUrl = decodeURIComponent(match[1]);
    const title = stripHtml(match[2]);

    if (rawUrl.startsWith("http") && !rawUrl.includes("google.com")) {
      results.push({
        title,
        url: rawUrl,
        snippet: `Real-time web search result from ${new URL(rawUrl).hostname}`,
      });
    }
  }

  return results;
}

// Strategy 3: DuckDuckGo Lite fallback
async function searchDuckDuckGoLite(query: string, maxResults: number): Promise<SearchResult[]> {
  const url = `https://lite.duckduckgo.com/lite/`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const html = await response.text();
  const results: SearchResult[] = [];
  const rows = html.split('<tr class="result__table">');

  for (let i = 1; i < rows.length && results.length < maxResults; i++) {
    const row = rows[i];
    const linkMatch = row.match(/<a class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = row.match(/<td class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i);

    if (linkMatch) {
      const parsedUrl = cleanUrl(linkMatch[1]);
      const title = stripHtml(linkMatch[2]);
      const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : "";

      if (parsedUrl.startsWith("http") && title) {
        results.push({
          title,
          url: parsedUrl,
          snippet,
        });
      }
    }
  }

  return results;
}

/**
 * Main Web Search function with multi-source fallback
 */
export async function performWebSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Try Strategy 1: DDG HTML
  try {
    const results = await searchDuckDuckGoHtml(cleanQuery, maxResults);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn("[webSearch] DDG HTML attempt failed, trying Google...", err);
  }

  // Try Strategy 2: Google
  try {
    const results = await searchGoogle(cleanQuery, maxResults);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn("[webSearch] Google attempt failed, trying DDG Lite...", err);
  }

  // Try Strategy 3: DDG Lite
  try {
    const results = await searchDuckDuckGoLite(cleanQuery, maxResults);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn("[webSearch] DDG Lite attempt failed:", err);
  }

  return [];
}

/**
 * Formats retrieved web search results into a clean prompt section for the AI
 */
export function formatWebSearchPrompt(query: string, results: SearchResult[]): string {
  if (results.length === 0) return "";

  const formattedSources = results
    .map(
      (r, index) =>
        `[Source ${index + 1}]: ${r.title}\nURL: ${r.url}\nSummary: ${r.snippet || "No summary available"}`
    )
    .join("\n\n");

  return `\n\n[LIVE WEB SEARCH RESULTS FOR: "${query}"]
The following live information was fetched directly from current web search:
${formattedSources}

Instructions for responding with web search results:
- Incorporate the up-to-date facts from these live search results into your answer.
- Always include citations with markdown links pointing to the sources, e.g. "[Source Name](URL)".
- Be informative, authoritative, and direct.`;
}
