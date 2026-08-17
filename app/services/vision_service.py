import base64
import asyncio
from typing import Optional
from app.config import settings

async def analyze_figure_image(image_bytes: bytes, caption_hint: str = "") -> Optional[str]:
    """
    Send an extracted thesis figure/diagram image to Groq LLaMA 3.2 Vision API
    to extract technical evidence (code snippets, database ER tables, UI elements,
    or graph axis labels & data values) with 0 MB server RAM overhead.
    """
    if not settings.GROQ_API_KEY:
        return None

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        b64_str = base64.b64encode(image_bytes).decode("utf-8")

        prompt = (
            f"Analyze this figure/image from an academic thesis (Caption context: '{caption_hint}'). "
            "Concisely extract any visible text, code snippets, database tables/columns, "
            "UI components, or data chart axis labels and values. "
            "Keep the output under 150 words focused on technical facts."
        )

        vision_model = getattr(settings, "GROQ_VISION_MODEL", "llama-3.2-11b-vision-preview")

        response = await client.chat.completions.create(
            model=vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64_str}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300,
            temperature=0.2
        )

        if response.choices and response.choices[0].message.content:
            return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq Vision API warning: {e}")
        return None

    return None

def analyze_figure_image_sync(image_bytes: bytes, caption_hint: str = "") -> Optional[str]:
    """Synchronous wrapper for analyze_figure_image."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            return loop.run_until_complete(analyze_figure_image(image_bytes, caption_hint))
        else:
            return asyncio.run(analyze_figure_image(image_bytes, caption_hint))
    except Exception:
        return None
