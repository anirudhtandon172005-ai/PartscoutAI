/**
 * Frontend TinyFish Web Scraping & Crawler API Service
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TINYFISH_API_KEY = import.meta.env.VITE_TINYFISH_API_KEY || '';

export interface CrawlerStatus {
  configured: boolean;
  provider: string;
  active: boolean;
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
  };
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
          goal: payload.goal || `Extract part specifications, price, stock, and lead time for ${payload.part_number || 'component'}. Return as clean JSON.`,
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
        };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Direct TinyFish scrape failed' };
    }
  }

  return { success: false, error: 'TinyFish scraping service unavailable.' };
}
