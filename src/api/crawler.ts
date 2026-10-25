/**
 * Frontend TinyFish Web Scraping & Crawler API Service
 * Specialized for Targeted Industrial Distributor & OEM Catalog Sites
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TINYFISH_API_KEY = import.meta.env.VITE_TINYFISH_API_KEY || '';

export interface SpecificSource {
  id: string;
  name: string;
  domain: string;
  url_template: string;
  category: string;
  reliability: string;
  typical_delivery: string;
}

export const SPECIFIC_INDUSTRIAL_SOURCES: SpecificSource[] = [
  {
    id: 'mcmaster',
    name: 'McMaster-Carr',
    domain: 'mcmaster.com',
    url_template: 'https://www.mcmaster.com/products/{part_number}',
    category: 'Direct Industrial Catalog',
    reliability: 'Very High',
    typical_delivery: 'Next Day',
  },
  {
    id: 'ifm',
    name: 'ifm efector',
    domain: 'ifm.com',
    url_template: 'https://www.ifm.com/us/en/product/{part_number}',
    category: 'OEM Direct Manufacturer',
    reliability: 'Certified OEM',
    typical_delivery: '2-3 Days',
  },
  {
    id: 'grainger',
    name: 'Grainger Industrial',
    domain: 'grainger.com',
    url_template: 'https://www.grainger.com/search?searchQuery={part_number}',
    category: 'Authorized Distributor',
    reliability: 'High',
    typical_delivery: '1-2 Days',
  },
  {
    id: 'radwell',
    name: 'Radwell International',
    domain: 'radwell.com',
    url_template: 'https://www.radwell.com/en-US/Buy/{part_number}',
    category: 'Surplus & Automation Stockist',
    reliability: 'High',
    typical_delivery: '1-3 Days',
  },
  {
    id: 'automationdirect',
    name: 'AutomationDirect',
    domain: 'automationdirect.com',
    url_template: 'https://www.automationdirect.com/adc/shopping/catalog?search={part_number}',
    category: 'Direct Controls Catalog',
    reliability: 'High',
    typical_delivery: '2 Days',
  },
  {
    id: 'digikey',
    name: 'DigiKey Electronics',
    domain: 'digikey.com',
    url_template: 'https://www.digikey.com/en/products/result?keywords={part_number}',
    category: 'Authorized Distributor',
    reliability: 'Very High',
    typical_delivery: '1-2 Days',
  },
  {
    id: 'rs-online',
    name: 'RS Components / RS Americas',
    domain: 'rs-online.com',
    url_template: 'https://us.rs-online.com/search?keyword={part_number}',
    category: 'Authorized Distributor',
    reliability: 'High',
    typical_delivery: '2-4 Days',
  },
  {
    id: 'turck',
    name: 'Turck USA',
    domain: 'turck.us',
    url_template: 'https://www.turck.us/en/product/{part_number}',
    category: 'OEM Direct Manufacturer',
    reliability: 'Certified OEM',
    typical_delivery: '3-5 Days',
  },
];

export interface CrawlerStatus {
  configured: boolean;
  provider: string;
  active: boolean;
  whitelisted_sources_count?: number;
}

export interface ScrapeRequest {
  url: string;
  part_number?: string;
  goal?: string;
}

export interface ScrapeResult {
  success: boolean;
  run_id?: string;
  status?: string;
  num_of_steps?: number;
  result?: any;
  error?: string;
  target_url?: string;
  source_id?: string;
  source_name?: string;
}

/**
 * Check whether TinyFish crawler is active & configured
 */
export async function getCrawlerStatus(): Promise<CrawlerStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/crawler/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline fallback check
  }

  const hasClientKey = Boolean(TINYFISH_API_KEY && TINYFISH_API_KEY.startsWith('sk-tinyfish-'));
  return {
    configured: hasClientKey,
    provider: 'TinyFish Web Agent Engine',
    active: hasClientKey,
    whitelisted_sources_count: SPECIFIC_INDUSTRIAL_SOURCES.length,
  };
}

/**
 * Retrieve whitelisted industrial sources for targeted scraping
 */
export async function getWhitelistedSources(): Promise<SpecificSource[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/crawler/sources`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline fallback
  }
  return SPECIFIC_INDUSTRIAL_SOURCES;
}

/**
 * Scrape data specifically targeting a single whitelisted industrial distributor or OEM catalog.
 * Avoids broad internet noise, crawler bans, and ambiguous search engine pages.
 */
export async function scrapeSpecificSource(
  sourceId: string,
  partNumber: string,
  goal?: string
): Promise<ScrapeResult> {
  // 1. Try backend targeted endpoint
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/crawler/scrape-specific`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: sourceId,
        part_number: partNumber,
        goal,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline fallback to direct TinyFish execution
  }

  // 2. Direct TinyFish call using formatted template
  const matchedSource = SPECIFIC_INDUSTRIAL_SOURCES.find((s) => s.id === sourceId) || SPECIFIC_INDUSTRIAL_SOURCES[0];
  const targetUrl = matchedSource.url_template.replace('{part_number}', encodeURIComponent(partNumber));

  return triggerPartScrape({
    url: targetUrl,
    part_number: partNumber,
    goal:
      goal ||
      `Extract technical specs, real-time stock quantity, unit price USD, and shipping lead time for ${partNumber} from ${matchedSource.name}. Return as clean JSON.`,
  });
}

/**
 * Trigger an automated part specs scrape using TinyFish
 */
export async function triggerPartScrape(payload: ScrapeRequest): Promise<ScrapeResult> {
  // 1. Try FastAPI backend route
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/crawler/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // If backend is offline, call TinyFish API directly using Vite env key
  }

  if (TINYFISH_API_KEY) {
    try {
      const res = await fetch('https://agent.tinyfish.ai/v1/automation/run', {
        method: 'POST',
        headers: {
          'X-API-Key': TINYFISH_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: payload.url,
          goal:
            payload.goal ||
            `Extract part specifications, price, stock, and lead time for ${payload.part_number || 'component'}. Return as clean JSON.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          run_id: data.run_id,
          status: data.status,
          num_of_steps: data.num_of_steps,
          result: data.result,
          target_url: payload.url,
        };
      }
      const errText = await res.text();
      return {
        success: false,
        error: `TinyFish returned ${res.status}: ${errText.slice(0, 150)}`,
        target_url: payload.url,
      };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Direct TinyFish scrape failed', target_url: payload.url };
    }
  }

  return { success: false, error: 'TinyFish scraping service unavailable. Check API key.', target_url: payload.url };
}
