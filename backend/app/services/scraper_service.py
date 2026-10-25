import os
from typing import Any, Optional
import httpx

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "")
TINYFISH_BASE_URL = os.getenv("TINYFISH_BASE_URL", "https://agent.tinyfish.ai/v1").rstrip("/")


class TinyFishScraperService:
    """Service utilizing TinyFish Web Agent API for autonomous distributor data scraping."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or TINYFISH_API_KEY
        self.base_url = TINYFISH_BASE_URL

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.startswith("sk-tinyfish-"))

    async def scrape_part_specs(
        self,
        url: str,
        part_number: Optional[str] = None,
        goal: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Execute an automated TinyFish scraping run on an industrial distributor or OEM catalog page.
        Extracts part specs, real-time inventory quantity, unit price, lead time, and PDF datasheet link.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "TinyFish API key is not configured.",
                "result": None,
            }

        extraction_goal = goal or (
            f"Extract comprehensive technical specifications for part '{part_number or 'component'}'. "
            "Specifically identify: part number, manufacturer, price (unit price & currency), "
            "inventory / stock availability (units in stock), shipping lead time, "
            "and technical specs (mounting type, voltage, connector, sensing distance, IP rating). "
            "Return the extracted information as clean JSON."
        )

        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "url": url,
            "goal": extraction_goal,
        }

        try:
            # 60s timeout for live headless agent navigation & extraction
            async with httpx.AsyncClient(timeout=65.0) as client:
                res = await client.post(
                    f"{self.base_url}/automation/run",
                    headers=headers,
                    json=payload,
                )

                if res.status_code == 200:
                    data = res.json()
                    return {
                        "success": True,
                        "run_id": data.get("run_id"),
                        "status": data.get("status"),
                        "started_at": data.get("started_at"),
                        "finished_at": data.get("finished_at"),
                        "num_of_steps": data.get("num_of_steps"),
                        "result": data.get("result"),
                        "error": data.get("error"),
                    }
                return {
                    "success": False,
                    "status_code": res.status_code,
                    "error": res.text,
                    "result": None,
                }
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "TinyFish agent execution timed out after 65 seconds.",
                "result": None,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "result": None,
            }

    async def get_run_status(self, run_id: str) -> dict[str, Any]:
        """Poll run status and results by run_id."""
        if not self.is_configured():
            return {"success": False, "error": "TinyFish API key not configured"}

        headers = {"X-API-Key": self.api_key}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.base_url}/runs/{run_id}", headers=headers)
                if res.status_code == 200:
                    return {"success": True, "data": res.json()}
                return {"success": False, "status_code": res.status_code, "error": res.text}
        except Exception as e:
            return {"success": False, "error": str(e)}


tinyfish_service = TinyFishScraperService()
