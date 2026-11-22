"""Kiểm tra nhanh phần xử lý media, không cần Supabase. Chạy: python test_worker.py"""
import subprocess
import sys
import tempfile
from pathlib import Path

import media
import subtitles

SRT = "﻿1\r\n00:00:01,000 --> 00:00:03,500\r\nHello <i>there</i>.\r\n\r\n2\r\n00:01:02,250 --> 00:01:04,000\r\nHow are you?\r\nI am fine &amp; happy.\r\n"
VTT = "WEBVTT\n\n00:01.000 --> 00:03.500 align:start\nHello there.\n\n01:00:00.000 --> 01:00:01.000\nOne hour.\n"


def test_parse():
    c = subtitles.parse(SRT)
    assert [x["text"] for x in c] == ["Hello there.", "How are you? I am fine & happy."], c
    assert c[1]["start"] == 62.25 and c[1]["end"] == 64.0
    v = subtitles.parse(VTT)
    assert v[0]["start"] == 1.0 and v[1]["start"] == 3600.0, v
    print("parse OK")


def test_media(with_whisper: bool):
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        wav = tmp / "speech.wav"
        # Tạo giọng đọc tiếng Anh bằng Windows SAPI để thử toàn bộ chuỗi xử lý.
        ps = (
            "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;"
            f"$s.SetOutputToWaveFile('{wav}'); $s.Speak('Hello there. How are you today? I am learning English.'); $s.Dispose()"
        )
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
        out = tmp / "audio.mp3"
        dur = media.extract_audio(wav, out)
        assert out.exists() and 2 < dur < 15, dur
        print(f"ffmpeg OK ({dur:.1f}s)")
        if with_whisper:
            cues = media.transcribe(out)
            text = " ".join(c["text"] for c in cues).lower()
            assert "hello" in text and "english" in text, text
            print("whisper OK:", text)


if __name__ == "__main__":
    test_parse()
    test_media(with_whisper="--whisper" in sys.argv)
