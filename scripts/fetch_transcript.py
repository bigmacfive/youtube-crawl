import json
import sys

from youtube_transcript_api import NoTranscriptFound, YouTubeTranscriptApi


def pick_transcript(transcript_list, preferred_languages):
    available = list(transcript_list)

    if preferred_languages:
        try:
            return transcript_list.find_transcript(preferred_languages)
        except NoTranscriptFound:
            for language in preferred_languages:
                for transcript in available:
                    translation_codes = [
                        item.language_code for item in transcript.translation_languages
                    ]
                    if transcript.is_translatable and language in translation_codes:
                        return transcript.translate(language)

    if available:
        manual = [item for item in available if not item.is_generated]
        return manual[0] if manual else available[0]

    raise RuntimeError("No transcript tracks were listed for this video.")


def main():
    payload = json.load(sys.stdin)
    video_id = payload.get("videoId", "").strip()
    languages = [item.strip() for item in payload.get("languages", []) if item]

    if not video_id:
        raise RuntimeError("Missing video id.")

    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)
    selected = pick_transcript(transcript_list, languages)
    fetched = selected.fetch()
    available = list(transcript_list)

    response = {
        "video_id": video_id,
        "language_code": selected.language_code,
        "language_label": selected.language,
        "is_generated": selected.is_generated,
        "available_languages": [
            {
                "code": item.language_code,
                "label": item.language,
                "is_generated": item.is_generated,
                "is_translatable": item.is_translatable,
            }
            for item in available
        ],
        "segments": [
            {
                "text": snippet.text,
                "start": snippet.start,
                "duration": snippet.duration,
            }
            for snippet in fetched
        ],
    }

    json.dump(response, sys.stdout)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
