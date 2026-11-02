import logging
import os
import time
import uuid
from pathlib import Path
from typing import Optional, Literal

import requests

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "outputs" / "videos"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

AGNES_API_BASE = "https://apihub.agnes-ai.com/v1"
AGNES_POLL_BASE = "https://apihub.agnes-ai.com"

DURATION_PRESETS = {5: (121, 24), 10: (241, 24), 15: (361, 24)}
WIDTH_HEIGHT = {"16:9": (1152, 768), "9:16": (768, 1152)}


def _upload_image(api_key: str, image_data_uri: str) -> Optional[str]:
    """Upload an image to Agnes Image API and return a hosted URL."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "agnes-image-2.1-flash",
        "prompt": "Keep the image exactly as it is",
        "n": 1,
        "size": "1024x1024",
        "extra_body": {
            "response_format": "url",
            "image": image_data_uri,
        },
    }
    try:
        resp = requests.post(
            f"{AGNES_API_BASE}/images/generations",
            headers=headers,
            json=payload,
            timeout=(15, 120),
        )
        resp.raise_for_status()
        result = resp.json()
        data_list = result.get("data", [])
        if data_list:
            url = data_list[0].get("url", "")
            if url:
                logger.info(f"[VideoGen] Image uploaded to hosted URL")
                return url
        logger.warning(f"[VideoGen] No URL in image upload response: {result}")
    except Exception as e:
        logger.warning(f"[VideoGen] Image upload failed: {e}")
    return None


def generate_video(
    prompt: str,
    duration: int = 5,
    aspect_ratio: Literal["16:9", "9:16"] = "16:9",
    creator_id: str = "default",
    reference_image_url: Optional[str] = None,
) -> dict:
    """Generate a video using Agnes AI free video API (agnes-video-v2.0).
    Supports reference images via data URI (uploaded to Agnes Image API first).
    """
    api_key = os.getenv("AGNES_API_KEY")
    if not api_key:
        return {"error": "AGNES_API_KEY not set in .env"}

    duration = max(5, min(duration, 15))
    num_frames, frame_rate = DURATION_PRESETS.get(duration, DURATION_PRESETS[5])
    w, h = WIDTH_HEIGHT.get(aspect_ratio, WIDTH_HEIGHT["16:9"])

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    image_url = None
    if reference_image_url:
        if reference_image_url.startswith("data:"):
            logger.info("[VideoGen] Uploading reference image to Agnes...")
            image_url = _upload_image(api_key, reference_image_url)
            if not image_url:
                return {"error": "Failed to upload reference image to Agnes hosting"}
        else:
            image_url = reference_image_url

    payload = {
        "model": "agnes-video-v2.0",
        "prompt": prompt,
        "width": w,
        "height": h,
        "num_frames": num_frames,
        "frame_rate": frame_rate,
    }
    if image_url:
        payload["image"] = image_url
        payload["mode"] = "ti2vid"

    try:
        logger.info(f"[VideoGen] Submitting: {prompt[:60]}... ({duration}s, {aspect_ratio})")
        resp = requests.post(
            f"{AGNES_API_BASE}/videos",
            headers=headers,
            json=payload,
            timeout=(15, 60),
        )
        if resp.status_code == 401:
            return {"error": "Invalid Agnes AI API key. Check AGNES_API_KEY in .env"}
        if resp.status_code == 429:
            return {"error": "Rate limited (1 video/min). Wait and try again."}
        resp.raise_for_status()

        result = resp.json()
        video_id = result.get("video_id") or result.get("task_id") or result.get("id")
        if not video_id:
            return {"error": f"No video_id in response: {result}"}

        logger.info(f"[VideoGen] Submitted, polling...")
        video_url = _poll_video(video_id, headers)
        if not video_url:
            return {"error": "Video generation timed out"}

        video_resp = requests.get(video_url, timeout=60)
        video_resp.raise_for_status()
        filename = f"{creator_id}_video_{uuid.uuid4().hex[:8]}_agnes.mp4"
        filepath = OUTPUT_DIR / filename
        with open(filepath, "wb") as f:
            f.write(video_resp.content)

        logger.info(f"[VideoGen] Done: {filename}")
        return {
            "filename": filename,
            "url": f"/outputs/videos/{filename}",
            "duration_seconds": duration,
            "source": "agnes",
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"[VideoGen] Failed: {e}")
        return {"error": str(e)}


def _poll_video(video_id: str, headers: dict, max_poll_seconds: int = 300) -> Optional[str]:
    """Poll Agnes API until video is ready. Returns download URL or None."""
    start = time.time()
    while time.time() - start < max_poll_seconds:
        try:
            resp = requests.get(
                f"{AGNES_POLL_BASE}/agnesapi?video_id={video_id}",
                headers=headers,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            status = (data.get("status") or "").lower()

            if status == "completed":
                url = (
                    data.get("remixed_from_video_id")
                    or data.get("video_url")
                    or data.get("url")
                )
                if not url and isinstance(data.get("data"), dict):
                    url = data["data"].get("video_url") or data["data"].get("url")
                return url

            if status == "failed":
                err = data.get("error", "unknown error")
                logger.error(f"[VideoGen] Agnes video failed: {err}")
                return None

            logger.info(f"[VideoGen] Polling... status={status} progress={data.get('progress', '?')}%")
        except Exception as e:
            logger.warning(f"[VideoGen] Poll error: {e}")
        time.sleep(20)

    logger.error(f"[VideoGen] Polling timed out after {max_poll_seconds}s")
    return None
