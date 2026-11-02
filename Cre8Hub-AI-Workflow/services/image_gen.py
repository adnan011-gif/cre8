import base64
import logging
import math
import os
import random
import time
from io import BytesIO
from pathlib import Path
from typing import Literal, List, Optional

import requests
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "outputs" / "images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ASPECT_RATIOS = {
    "16:9": "wide landscape 16:9 aspect ratio",
    "1:1":  "square 1:1 aspect ratio",
    "9:16": "tall vertical portrait 9:16 aspect ratio",
}

WIDTH_HEIGHT = {
    "16:9": (1024, 576),
    "1:1":  (1024, 1024),
    "9:16": (576, 1024),
}

PURPOSE_TAGS = {
    "thumbnail":    "YouTube thumbnail, bold title text space, high contrast, eye-catching",
    "poster":       "marketing poster, professional design, clean layout",
    "post":         "social media post, vibrant, engaging",
    "ad_creative":  "advertisement creative, call-to-action, commercial quality",
}

POLLINATION_URL = "https://image.pollinations.ai/prompt"
POLLINATION_TIMEOUT = 90

# Zone indices in the 3x3 grid, by position
#   0 1 2   (top row)
#   3 4 5   (center row)
#   6 7 8   (bottom row)

FIELD_STYLES = {
    "brand_name": {
        "font_size_min": 28, "font_size_max": 40,
        "preferred_zones": {"thumbnail": [0], "poster": [0], "post": [0], "ad_creative": [0]},
        "accent": None,
    },
    "headline": {
        "font_size_min": 40, "font_size_max": 64,
        "preferred_zones": {"thumbnail": [7, 4], "poster": [4, 1], "post": [4, 1], "ad_creative": [4, 1]},
        "accent": None,
    },
    "pricing": {
        "font_size_min": 36, "font_size_max": 56,
        "preferred_zones": {"thumbnail": [8], "poster": [8, 7], "post": [8], "ad_creative": [8, 7]},
        "accent": "#E53935",
    },
    "features": {
        "font_size_min": 20, "font_size_max": 28,
        "preferred_zones": {"thumbnail": [6], "poster": [6, 3], "post": [6], "ad_creative": [6, 3]},
        "accent": None,
    },
    "cta": {
        "font_size_min": 32, "font_size_max": 42,
        "preferred_zones": {"thumbnail": [7], "poster": [7, 8], "post": [7], "ad_creative": [7, 8]},
        "accent": "#2196F3",
    },
}

FONT_CACHE = {}


def generate_images(
    prompt: str,
    aspect_ratio: Literal["16:9", "1:1", "9:16"] = "16:9",
    purpose: Literal["thumbnail", "poster", "post", "ad_creative"] = "thumbnail",
    num_images: int = 4,
    creator_id: str = "default",
    reference_image_url: Optional[str] = None,
    guidance_scale: Optional[float] = None,
    enhance: bool = True,
    negative_prompt: Optional[str] = None,
    text_fields: Optional[dict] = None,
) -> List[dict]:
    """
    Generate images using Pollinations.ai free API (klein model).
    Supports reference image for style transfer.
    text_fields: dict with keys brand_name, headline, pricing, features (list), cta.
    Each field is auto-styled (size, color, position) based on field type and image analysis.
    """
    from urllib.parse import quote

    ratio_hint = ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS["16:9"])
    purpose_hint = PURPOSE_TAGS.get(purpose, "")
    w, h = WIDTH_HEIGHT.get(aspect_ratio, WIDTH_HEIGHT["16:9"])
    full_prompt = f"{prompt}, {ratio_hint}, {purpose_hint}, high quality, detailed"

    model = "klein"

    results = []
    for i in range(num_images):
        try:
            seed = random.randint(0, 2**31 - 1)
            url = (
                f"{POLLINATION_URL}/{quote(full_prompt)}"
                f"?width={w}&height={h}&seed={seed}&nologo=true"
                f"&model={model}&enhance={'true' if enhance else 'false'}"
            )
            if guidance_scale is not None:
                url += f"&guidance_scale={guidance_scale}"
            if negative_prompt:
                url += f"&negative_prompt={quote(negative_prompt)}"
            if reference_image_url:
                url += f"&image={quote(reference_image_url)}"

            resp = requests.get(url, timeout=POLLINATION_TIMEOUT)
            resp.raise_for_status()

            img_bytes = resp.content
            filename = f"{creator_id}_{purpose}_{aspect_ratio.replace(':', 'x')}_{i}.png"
            filepath = OUTPUT_DIR / filename

            if text_fields:
                img = Image.open(BytesIO(img_bytes)).convert("RGBA")
                draw = ImageDraw.Draw(img)
                apply_structured_text(draw, img, text_fields, purpose)
                img = img.convert("RGB")
                img.save(filepath, "PNG")
                with open(filepath, "rb") as f:
                    img_bytes = f.read()
            else:
                with open(filepath, "wb") as f:
                    f.write(img_bytes)

            b64 = base64.b64encode(img_bytes).decode("utf-8")
            results.append({
                "filename": filename,
                "url": f"/outputs/images/{filename}",
                "base64": b64,
                "aspect_ratio": aspect_ratio,
                "purpose": purpose,
            })

            logger.info(f"[ImageGen] Image {i + 1}/{num_images} saved ({len(img_bytes)} bytes)")

            if i < num_images - 1:
                time.sleep(1)

        except Exception as img_err:
            logger.warning(f"[ImageGen] Image {i} failed: {img_err}")
            continue

    if results:
        logger.info(f"[ImageGen] Generated {len(results)} images for creator={creator_id}")
        return results

    logger.warning("[ImageGen] No images generated — returning placeholders.")
    return _placeholder_images(num_images)


# ── Structured text overlay engine ─────────────────────────────────────────


def apply_structured_text(
    draw: ImageDraw.ImageDraw,
    img: Image.Image,
    fields: dict,
    purpose: str,
):
    """
    Draw structured text fields (brand_name, headline, pricing, features, cta)
    with auto-styled font size, color, and position based on field type and image analysis.
    """
    w, h = img.size
    gray = img.convert("L")
    margin = int(w * 0.05)
    cell_w = (w - 2 * margin) // 3
    cell_h = (h - 2 * margin) // 3

    zones = {}
    for row in range(3):
        for col in range(3):
            idx = row * 3 + col
            x1 = margin + col * cell_w
            y1 = margin + row * cell_h
            region = gray.crop((x1, y1, x1 + cell_w, y1 + cell_h))
            pixels = list(region.getdata())
            avg = sum(pixels) / len(pixels)
            variance = sum((p - avg) ** 2 for p in pixels) / len(pixels)
            std = variance ** 0.5
            zones[idx] = {"x": x1, "y": y1, "w": cell_w, "h": cell_h, "brightness": avg, "texture": std}

    occupied = []

    field_order = ["brand_name", "headline", "pricing", "features", "cta"]

    for field_name in field_order:
        value = fields.get(field_name)
        if not value:
            continue
        if field_name == "features" and isinstance(value, list):
            value = [v for v in value if v.strip()]
            if not value:
                continue
            text = "\n".join(f"\u2022 {v}" for v in value)
        else:
            text = str(value).strip()
            if not text:
                continue

        style = FIELD_STYLES.get(field_name, FIELD_STYLES["headline"])
        preferred = style["preferred_zones"].get(purpose, [])
        if not preferred:
            preferred = list(range(9))

        font_size = _pick_font_size(text, style, cell_h, cell_w)
        font = _load_font(font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

        zone = _pick_best_zone(zones, style, text, tw, th, w, h, margin, font_size, occupied, preferred)
        if zone is None:
            continue

        fill_color = zone["color"]
        stroke_color = zone["stroke"]
        stroke_width = 3 if _is_light_color(fill_color) else 1

        # zone.x/y are already centered within the cell
        x = zone["x"]
        y = zone["y"]
        x = max(margin, min(x, w - tw - margin))
        y = max(margin, min(y, h - th - margin))

        draw.text((x, y), text, font=font, fill=fill_color,
                  stroke_width=stroke_width, stroke_color=stroke_color)
        padding = 15
        occupied.append((x - padding, y - padding, x + tw + padding, y + th + padding))


def _pick_font_size(text: str, style: dict, cell_h: int, cell_w: int) -> int:
    """Choose a font size based on field type and available space."""
    lines = text.count("\n") + 1
    min_sz = style["font_size_min"]
    max_sz = style["font_size_max"]
    max_by_height = (cell_h - 20) // max(lines, 1)
    max_by_width = cell_w // max(len(line) for line in text.split("\n")) * 2 if text else max_sz
    return max(min_sz, min(max_sz, max_by_height, max_by_width))


def _pick_best_zone(
    zones: dict,
    style: dict,
    text: str,
    tw: int,
    th: int,
    img_w: int,
    img_h: int,
    margin: int,
    font_size: int,
    occupied: list,
    preferred: list,
) -> Optional[dict]:
    """
    Score preferred zones by contrast + texture, penalising overlaps.
    Returns the best zone with color info, or None if all zones fail.
    """
    candidates = []

    for idx in preferred:
        z = zones.get(idx)
        if not z:
            continue

        avg = z["brightness"]
        std = z["texture"]

        accent = style.get("accent")
        if accent and _accent_contrast_ok(accent, avg):
            fill_color = accent
            stroke_color = "#FFFFFF" if _is_light_color(fill_color) else "#000000"
        else:
            is_dark_zone = avg < 128
            fill_color = "#FFFFFF" if is_dark_zone else "#222222"
            stroke_color = "#000000" if is_dark_zone else "#FFFFFF"

        is_light = _is_light_color(fill_color)
        contrast_score = (255 - avg) if is_light else avg
        texture_score = max(0, 255 - std)
        score = contrast_score * 0.6 + texture_score * 0.4

        cx = z["x"] + (z["w"] - tw) // 2
        cy = z["y"] + (z["h"] - th) // 2
        cx = max(margin, min(cx, img_w - tw - margin))
        cy = max(margin, min(cy, img_h - th - margin))

        if occupied:
            candidate_rect = (cx, cy, cx + tw, cy + th)
            for orect in occupied:
                if _rects_overlap(candidate_rect, orect):
                    score -= 100000
                    break

        candidates.append({
            "score": score,
            "x": cx,
            "y": cy,
            "w": z["w"],
            "h": z["h"],
            "color": fill_color,
            "stroke": stroke_color,
        })

    if not candidates:
        return None
    candidates.sort(key=lambda c: -c["score"])
    return candidates[0]


def _accent_contrast_ok(hex_accent: str, zone_brightness: float) -> bool:
    """Check if an accent color provides enough contrast against the zone."""
    h = hex_accent.lstrip("#")
    if len(h) != 6:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    accent_bright = (r * 299 + g * 587 + b * 114) / 1000
    return abs(accent_bright - zone_brightness) > 70


# ── Helper functions ────────────────────────────────────────────────────────


def _load_font(font_size: int) -> ImageFont.FreeTypeFont:
    """Load a bold font, falling back to regular then default."""
    if font_size in FONT_CACHE:
        return FONT_CACHE[font_size]
    font_size = max(12, min(font_size, 200))
    try:
        font = ImageFont.truetype("/Library/Fonts/Arial Bold.ttf", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("/Library/Fonts/Arial.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()
    FONT_CACHE[font_size] = font
    return font


def _is_light_color(hex_color: str) -> bool:
    """Return True if the hex color is perceived as light."""
    h = hex_color.lstrip("#")
    if len(h) == 6:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        brightness = (r * 299 + g * 587 + b * 114) / 1000
        return brightness > 128
    return True


def _rects_overlap(a: tuple, b: tuple) -> bool:
    """Check if two rectangles (x1, y1, x2, y2) overlap."""
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


def _placeholder_images(count: int) -> List[dict]:
    return [
        {
            "filename": f"placeholder_{i}.png",
            "url": f"/outputs/images/placeholder_{i}.png",
            "base64": None,
            "aspect_ratio": "16:9",
            "purpose": "placeholder",
            "error": "Image generation unavailable — Pollinations.ai request failed",
        }
        for i in range(count)
    ]
