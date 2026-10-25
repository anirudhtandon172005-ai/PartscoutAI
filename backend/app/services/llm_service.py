import os
from typing import Any, Optional
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterLLMService:
    """Service to interact with OpenRouter LLM APIs for industrial part intelligence."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or OPENROUTER_API_KEY
        self.model = model or OPENROUTER_MODEL

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.startswith("sk-or-v1-"))

    async def get_key_status(self) -> dict[str, Any]:
        """Check OpenRouter API key quota and remaining limits."""
        if not self.is_configured():
            return {"configured": False, "provider": "OpenRouter", "message": "Key not configured"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{OPENROUTER_BASE_URL}/auth/key",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if res.status_code == 200:
                    data = res.json().get("data", {})
                    return {
                        "configured": True,
                        "provider": "OpenRouter",
                        "label": data.get("label"),
                        "limit_remaining_usd": data.get("limit_remaining"),
                        "free_model_daily_requests": data.get("free_model_daily_requests", {}),
                        "model": self.model,
                    }
                return {
                    "configured": False,
                    "provider": "OpenRouter",
                    "status_code": res.status_code,
                    "error": res.text,
                }
        except Exception as e:
            return {"configured": False, "provider": "OpenRouter", "error": str(e)}

    async def query_llm(self, prompt: str, system_prompt: Optional[str] = None) -> dict[str, Any]:
        """Send completion request to OpenRouter API."""
        if not self.is_configured():
            return {
                "success": False,
                "error": "OpenRouter API key is not configured.",
                "response": None,
            }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://partscout.internal",
            "X-Title": "PartScout AI Industrial Intelligence",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if res.status_code == 200:
                    result = res.json()
                    choices = result.get("choices", [])
                    content = choices[0]["message"]["content"] if choices else ""
                    return {
                        "success": True,
                        "model": result.get("model", self.model),
                        "response": content,
                        "usage": result.get("usage", {}),
                    }
                return {
                    "success": False,
                    "status_code": res.status_code,
                    "error": res.text,
                    "response": None,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": None,
            }


openrouter_service = OpenRouterLLMService()
