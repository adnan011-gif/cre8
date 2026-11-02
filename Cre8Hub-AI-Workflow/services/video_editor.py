"""
video_editor.py
Cre8Studio video pipeline:
  - Short generator: script → TTS voiceover + Imagen scene cards → MP4
  - AI Clipper: raw video upload → Gemini timestamp analysis → trimmed vertical MP4
"""
import os
import re
import json
import uuid
import logging
import textwrap
from pathlib import Path
from typing import List, Optional, Literal

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "outputs" / "videos"
TEMP_DIR   = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "outputs" / "temp"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# 1. SHORT GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def generate_short(
    script: str,
    title: str = "Cre8Hub Short",
    voice_mode: Literal["voiced", "silent"] = "voiced",
    output_tag: Literal["organic", "ad"] = "organic",
    creator_id: str = "default",
) -> dict:
    """
    Convert a text script into a vertical 9:16 MP4 short.
    voiced  → TTS audio + captioned slides
    silent  → captioned slides only (creator records their own voiceover)
    Returns { filename, url, duration_seconds, voice_mode }
    """
    try:
        from moviepy.editor import (
            ImageClip, AudioFileClip, TextClip,
            CompositeVideoClip, concatenate_videoclips,
        )
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np

        # Split script into scenes (paragraphs or sentences)
        scenes = _split_into_scenes(script)
        job_id = str(uuid.uuid4())[:8]
        clips = []

        for i, scene_text in enumerate(scenes):
            duration = _estimate_duration(scene_text) if voice_mode == "voiced" else 4.0
            # Create slide image
            slide_path = _make_slide(scene_text, i, job_id)
            img_clip = ImageClip(str(slide_path)).set_duration(duration)

            if voice_mode == "voiced":
                audio_path = _tts(scene_text, job_id, i)
                if audio_path:
                    audio = AudioFileClip(str(audio_path))
                    img_clip = img_clip.set_audio(audio)

            clips.append(img_clip)

        final = concatenate_videoclips(clips, method="compose")
        out_filename = f"{creator_id}_{output_tag}_{voice_mode}_{job_id}.mp4"
        out_path = OUTPUT_DIR / out_filename
        final.write_videofile(
            str(out_path),
            fps=24,
            codec="libx264",
            audio_codec="aac",
            logger=None,
            ffmpeg_params=["-movflags", "+faststart"],
        )
        _cleanup_temp(job_id)

        return {
            "filename": out_filename,
            "url": f"/outputs/videos/{out_filename}",
            "duration_seconds": round(final.duration, 1),
            "voice_mode": voice_mode,
            "output_tag": output_tag,
        }

    except Exception as e:
        logger.error(f"[VideoEditor] Short generation failed: {e}")
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# 2. AI RAW VIDEO CLIPPER
# ─────────────────────────────────────────────────────────────────────────────

def clip_raw_video(
    video_path: str,
    creator_id: str = "default",
    max_clips: int = 3,
) -> List[dict]:
    """
    Upload a raw video to Gemini, get high-energy timestamp suggestions,
    then trim & crop to vertical 9:16 MP4s with burned-in captions.
    Returns list of { filename, url, start, end, caption }.
    """
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        logger.error("GOOGLE_API_KEY not set — cannot analyse video")
        return []

    try:
        timestamps = _gemini_analyse_video(video_path, api_key, max_clips)
    except Exception as e:
        logger.error(f"[VideoClipper] Gemini analysis failed: {e}")
        return []

    results = []
    for i, seg in enumerate(timestamps):
        try:
            out = _trim_and_crop(video_path, seg, creator_id, i)
            results.append({**out, **seg})
        except Exception as e:
            logger.warning(f"[VideoClipper] Skipping clip {i}: {e}")

    return results


def _gemini_analyse_video(video_path: str, api_key: str, max_clips: int) -> List[dict]:
    """Ask Gemini to identify the most viral/high-energy segments."""
    import google.genai as genai
    from google.genai import types as genai_types

    client = genai.Client(api_key=api_key)

    # Upload the video file
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    prompt = f"""
Watch this video carefully. Identify the {max_clips} most engaging, high-energy,
or viral-worthy segments that would work well as short clips.
For each segment return ONLY valid JSON in this exact format (no markdown):
[
  {{"start": "MM:SS", "end": "MM:SS", "caption": "short caption under 10 words", "reason": "why this segment"}},
  ...
]
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            genai_types.Part.from_bytes(data=video_bytes, mime_type="video/mp4"),
            prompt,
        ],
    )

    raw = response.text.strip()
    # Strip markdown fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip("` \n")
    return json.loads(raw)


def _make_caption_clip(text: str, video_width: int, duration: float):
    """Create a caption ImageClip using Pillow (avoids ImageMagick dependency)."""
    from moviepy.editor import ImageClip
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont

    # Semi-transparent bar at bottom 20% of frame
    bar_height = int(video_width * 0.2)
    img = Image.new("RGBA", (video_width, bar_height), (0, 0, 0, 120))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/Library/Fonts/Arial Bold.ttf", 32)
    except Exception:
        try:
            font = ImageFont.truetype("/Library/Fonts/Arial.ttf", 32)
        except Exception:
            font = ImageFont.load_default()

    # Wrap text manually (max ~25 chars per line for 9:16 width)
    words = text.split()
    lines = []
    line = ""
    for w in words:
        test = line + " " + w if line else w
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] < video_width - 40:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)

    # Draw each line centred, with black stroke outline
    total_h = sum(draw.textbbox((0, 0), l, font=font)[3] - draw.textbbox((0, 0), l, font=font)[1] for l in lines)
    y_start = (bar_height - total_h) // 2
    y = y_start
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        x = (video_width - lw) // 2
        # Stroke
        for dx, dy in [(-2, -2), (-2, 2), (2, -2), (2, 2)]:
            draw.text((x + dx, y + dy), line, font=font, fill="black")
        # Fill
        draw.text((x, y), line, font=font, fill="white")
        y += bbox[3] - bbox[1]

    return ImageClip(np.array(img), transparent=True)\
        .set_position(("center", 0.82), relative=True)\
        .set_duration(duration)


def _trim_and_crop(video_path: str, seg: dict, creator_id: str, idx: int) -> dict:
    """Trim video to segment and crop to 9:16 vertical with caption overlay."""
    from moviepy.editor import VideoFileClip, CompositeVideoClip, ImageClip
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont

    start = _ts_to_seconds(seg.get("start", "0:00"))
    end   = _ts_to_seconds(seg.get("end",   "0:30"))
    caption = seg.get("caption", "")

    clip = VideoFileClip(video_path).subclip(start, end)

    # Crop to 9:16 (centre crop)
    w, h = clip.size
    target_w = int(h * 9 / 16) // 2 * 2
    if target_w < w:
        x1 = (w - target_w) // 2
        clip = clip.crop(x1=x1, width=target_w)

    # Burn-in caption (Pillow-based — no ImageMagick needed)
    if caption:
        txt_clip = _make_caption_clip(caption, clip.w, clip.duration)
        clip = CompositeVideoClip([clip, txt_clip])

    job_id = str(uuid.uuid4())[:6]
    filename = f"{creator_id}_clip_{idx}_{job_id}.mp4"
    out_path = OUTPUT_DIR / filename
    clip.write_videofile(str(out_path), fps=24, codec="libx264", audio_codec="aac", logger=None, ffmpeg_params=["-movflags", "+faststart"])

    return {"filename": filename, "url": f"/outputs/videos/{filename}"}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _split_into_scenes(script: str, max_chars: int = 200) -> List[str]:
    """Split script into short scenes suitable for individual slides."""
    paragraphs = [p.strip() for p in script.split("\n") if p.strip()]
    scenes = []
    for para in paragraphs:
        if len(para) <= max_chars:
            scenes.append(para)
        else:
            # Further split long paragraphs at sentence boundaries
            sentences = re.split(r'(?<=[.!?])\s+', para)
            chunk = ""
            for sent in sentences:
                if len(chunk) + len(sent) < max_chars:
                    chunk += " " + sent
                else:
                    if chunk:
                        scenes.append(chunk.strip())
                    chunk = sent
            if chunk:
                scenes.append(chunk.strip())
    return scenes or [script[:max_chars]]


def _estimate_duration(text: str, wpm: int = 130) -> float:
    """Estimate how many seconds it takes to speak the text."""
    words = len(text.split())
    return max(2.0, round(words / wpm * 60, 1))


def _tts(text: str, job_id: str, index: int) -> Optional[Path]:
    """Generate TTS audio file using gTTS."""
    try:
        from gtts import gTTS
        out = TEMP_DIR / f"audio_{job_id}_{index}.mp3"
        gTTS(text=text, lang="en", slow=False).save(str(out))
        return out
    except Exception as e:
        logger.warning(f"[TTS] Failed: {e}")
        return None


def _make_slide(text: str, index: int, job_id: str) -> Path:
    """Create a 1080x1920 (9:16) slide PNG with the scene text."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np

        W, H = 1080, 1920
        bg_colors = [
            (15, 15, 30), (10, 20, 40), (20, 10, 35),
            (5, 25, 45),  (25, 10, 40), (10, 10, 50),
        ]
        bg = bg_colors[index % len(bg_colors)]
        img = Image.new("RGB", (W, H), color=bg)
        draw = ImageDraw.Draw(img)

        # Wrap text
        wrapped = textwrap.fill(text, width=30)
        try:
            font = ImageFont.truetype("/Library/Fonts/Arial.ttf", 60)
        except Exception:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), wrapped, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (W - tw) // 2
        y = (H - th) // 2
        draw.text((x, y), wrapped, fill="white", font=font)

        # Branding strip
        try:
            brand_font = ImageFont.truetype("/Library/Fonts/Arial Bold.ttf", 36)
        except Exception:
            brand_font = font
        draw.text((W // 2 - 80, H - 100), "CRE8HUB", fill=(100, 160, 255), font=brand_font)

        out = TEMP_DIR / f"slide_{job_id}_{index}.png"
        img.save(str(out))
        return out

    except Exception as e:
        logger.error(f"[Slide] PIL failed: {e} — using blank")
        from PIL import Image
        img = Image.new("RGB", (1080, 1920), color=(15, 15, 30))
        out = TEMP_DIR / f"slide_{job_id}_{index}.png"
        img.save(str(out))
        return out


def _ts_to_seconds(ts: str) -> float:
    """Convert MM:SS or HH:MM:SS string to float seconds."""
    parts = ts.strip().split(":")
    parts = [float(p) for p in parts]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0.0


def _cleanup_temp(job_id: str):
    """Remove temp files for a completed job."""
    for f in TEMP_DIR.glob(f"*_{job_id}_*"):
        try:
            f.unlink()
        except Exception:
            pass
