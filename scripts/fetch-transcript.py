#!/usr/bin/env python3
"""Fetch YouTube transcript via youtube_transcript_api and print JSON to stdout."""

import json
import sys
import warnings

# Suppress urllib3/SSL warnings that pollute stderr
warnings.filterwarnings("ignore")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: fetch-transcript.py <video_id> [lang1,lang2,...]"}), file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1]
    languages = sys.argv[2].split(",") if len(sys.argv) > 2 and sys.argv[2] else []

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        print(json.dumps({"error": "youtube_transcript_api is not installed. Run: pip3 install youtube-transcript-api"}), file=sys.stderr)
        sys.exit(1)

    try:
        api = YouTubeTranscriptApi()

        # List available transcripts
        transcript_list = list(api.list(video_id))
        available_languages = []
        for t in transcript_list:
            available_languages.append({
                "code": t.language_code,
                "label": t.language,
                "is_generated": t.is_generated,
                "is_translatable": t.is_translatable,
            })

        # Fetch transcript with preferred languages
        if languages:
            result = api.fetch(video_id, languages=languages)
        else:
            result = api.fetch(video_id)

        segments = []
        for s in result.snippets:
            segments.append({
                "text": s.text,
                "start": s.start,
                "duration": s.duration,
            })

        output = {
            "video_id": result.video_id,
            "language_code": result.language_code,
            "language_label": result.language,
            "is_generated": result.is_generated,
            "available_languages": available_languages,
            "segments": segments,
        }

        print(json.dumps(output))

    except Exception as e:
        # Extract a user-friendly message from the exception
        msg = str(e)
        # Strip the long "please create an issue" boilerplate from youtube_transcript_api
        marker = "If you are sure that the described cause"
        idx = msg.find(marker)
        if idx > 0:
            msg = msg[:idx].strip().rstrip(",").rstrip()

        # Provide friendlier messages for common errors
        lower = msg.lower()
        if "no transcript" in lower or "disabled" in lower:
            msg = "No transcript available for this video."
        elif "video unavailable" in lower or "video is unavailable" in lower:
            msg = "Video not found. Please check the URL."
        elif "too many requests" in lower:
            msg = "YouTube rate limit reached. Please try again later."

        print(json.dumps({"error": msg}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
