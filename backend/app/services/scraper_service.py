from __future__ import annotations
import os
import re
from pathlib import Path
from typing import Any, Optional
import httpx
from dotenv import load_dotenv

root_dir = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(root_dir / ".env")
load_dotenv(root_dir / "backend" / ".env")

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY", "")
TINYFISH_BASE_URL = os.getenv("TINYFISH_BASE_URL", "https://agent.tinyfish.ai/v1").rstrip("/")

SPECIFIC_INDUSTRIAL_SOURCES = [
    {
        "id": "mcmaster",
        "name": "McMaster-Carr",
        "domain": "mcmaster.com",
        "url_template": "https://www.mcmaster.com/products/{part_number}",
        "category": "Direct Industrial Catalog",
        "reliability": "Very High",
        "typical_delivery": "Next Day",
    },
    {
        "id": "ifm",
        "name": "ifm efector",
        "domain": "ifm.com",
        "url_template": "https://www.ifm.com/us/en/product/{part_number}",
        "category": "OEM Direct Manufacturer",
        "reliability": "Certified OEM",
        "typical_delivery": "2-3 Days",
    },
    {
        "id": "grainger",
        "name": "Grainger Industrial",
        "domain": "grainger.com",
        "url_template": "https://www.grainger.com/search?searchQuery={part_number}",
        "category": "Authorized Distributor",
        "reliability": "High",
        "typical_delivery": "1-2 Days",
    },
    {
        "id": "radwell",
        "name": "Radwell International",
        "domain": "radwell.com",
        "url_template": "https://www.radwell.com/en-US/Buy/{part_number}",
        "category": "Surplus & Automation Stockist",
        "reliability": "High",
        "typical_delivery": "1-3 Days",
    },
    {
        "id": "automationdirect",
        "name": "AutomationDirect",
        "domain": "automationdirect.com",
        "url_template": "https://www.automationdirect.com/adc/shopping/catalog?search={part_number}",
        "category": "Direct Controls Catalog",
        "reliability": "High",
        "typical_delivery": "2 Days",
    },
    {
        "id": "digikey",
        "name": "DigiKey Electronics",
        "domain": "digikey.com",
        "url_template": "https://www.digikey.com/en/products/result?keywords={part_number}",
        "category": "Authorized Distributor",
        "reliability": "Very High",
        "typical_delivery": "1-2 Days",
    },
    {
        "id": "rs-online",
        "name": "RS Components / RS Americas",
        "domain": "rs-online.com",
        "url_template": "https://us.rs-online.com/search?keyword={part_number}",
        "category": "Authorized Distributor",
        "reliability": "High",
        "typical_delivery": "2-4 Days",
    },
    {
        "id": "turck",
        "name": "Turck USA",
        "domain": "turck.us",
        "url_template": "https://www.turck.us/en/product/{part_number}",
        "category": "OEM Direct Manufacturer",
        "reliability": "Certified OEM",
        "typical_delivery": "3-5 Days",
    },
]


class TinyFishScraperService:
    """Service utilizing TinyFish Web Agent API for autonomous distributor data scraping."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or TINYFISH_API_KEY
        self.base_url = TINYFISH_BASE_URL
        self.specific_sources = SPECIFIC_INDUSTRIAL_SOURCES

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.startswith("sk-tinyfish-"))

    def get_specific_sources(self) -> list[dict[str, Any]]:
        return self.specific_sources

    def resolve_source_url(self, source_id_or_domain: str, part_number: str) -> tuple[dict[str, Any], str]:
        """Resolve a specific whitelisted industrial distributor and formulate its search URL."""
        source_match = None
        for s in self.specific_sources:
            if s["id"] == source_id_or_domain or s["domain"] in source_id_or_domain.lower():
                source_match = s
                break

        if not source_match:
            source_match = self.specific_sources[0]  # McMaster fallback

        clean_part = part_number.strip()
        # If McMaster: https://www.mcmaster.com/{part_number} handles both part numbers and search queries
        if source_match["id"] == "mcmaster":
            target_url = f"https://www.mcmaster.com/{clean_part}"
        elif source_match["id"] == "ifm" and not re.match(r"^[A-Z0-9]{3,8}$", clean_part, re.I):
            target_url = f"https://www.ifm.com/us/en/search?query={clean_part}"
        else:
            target_url = source_match["url_template"].format(part_number=clean_part)

        return source_match, target_url

    async def scrape_specific_source(
        self,
        source_id: str,
        part_number: str,
        goal: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Execute targeted scraping against a specific whitelisted distributor site.
        Prevents open-internet crawler drift, avoiding rate-limits and ambiguous search engines.
        """
        source, target_url = self.resolve_source_url(source_id, part_number)
        custom_goal = goal or (
            f"Extract technical specifications for industrial part '{part_number}' from {source['name']}. "
            "Specifically extract: unit price (USD), stock availability (quantity in stock), "
            "lead time in days, thread size/mounting, sensing range (mm), and connector type. "
            "Return structured JSON."
        )

        scrape_response = await self.scrape_part_specs(
            url=target_url,
            part_number=part_number,
            goal=custom_goal,
        )

        # Enhance with specific distributor metadata
        scrape_response["source_id"] = source["id"]
        scrape_response["source_name"] = source["name"]
        scrape_response["source_domain"] = source["domain"]
        scrape_response["target_url"] = target_url
        scrape_response["category"] = source["category"]

        return scrape_response

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
                        "target_url": url,
                    }
                return {
                    "success": False,
                    "status_code": res.status_code,
                    "error": res.text,
                    "result": None,
                    "target_url": url,
                }
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "TinyFish agent execution timed out after 65 seconds.",
                "result": None,
                "target_url": url,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "result": None,
                "target_url": url,
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

