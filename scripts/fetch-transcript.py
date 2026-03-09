#!/usr/bin/env python3
"""Fetch YouTube transcript via youtube_transcript_api and print JSON to stdout."""

import json
import sys

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

if __name__ == "__main__":
    main()
