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


def test_words_to_cues():
    from types import SimpleNamespace as W

    ws = [W(word=" Hello", start=0.0, end=0.4), W(word=" there.", start=0.5, end=0.9),
          W(word=" How", start=1.0, end=1.2), W(word=" are", start=1.3, end=1.4),
          W(word=" you", start=5.0, end=5.2), W(word="?", start=5.2, end=5.3)]
    c = media.words_to_cues(ws)
    assert [x["text"] for x in c] == ["Hello there.", "How are", "you?"], c  # ngắt ở dấu câu và ở chỗ nghỉ lâu
    assert c[0]["start"] == 0.0 and c[2]["end"] == 5.3
    long = [W(word=" w", start=i * 0.1, end=i * 0.1 + 0.05) for i in range(30)]
    assert all(len(x["text"].split()) <= 14 for x in media.words_to_cues(long))
    print("words_to_cues OK")


def test_fill_gaps():
    from types import SimpleNamespace as W

    main = [W(word=" a", start=20.0, end=20.5), W(word=" b", start=21.0, end=21.5),
            W(word=" c", start=30.0, end=30.5)]  # khoảng trống đầu 0-20 và giữa 21.5-30
    fill = [W(word=" intro", start=7.0, end=8.0), W(word=" mid", start=25.0, end=26.0),
            W(word=" noise", start=20.6, end=20.9)]  # noise nằm trong khoảng ngắn (0.5 giây): bỏ
    out = [w.word.strip() for w in media.fill_gaps(main, fill)]
    assert out == ["intro", "a", "b", "mid", "c"], out
    assert [w.word for w in media.fill_gaps([], fill)] == [w.word for w in fill]
    print("fill_gaps OK")


def test_has_gap():
    from types import SimpleNamespace as W

    dense = [W(word=" a", start=0.5, end=1.0), W(word=" b", start=1.2, end=1.6)]
    assert not media.has_gap(dense)  # đầu bài 0.5 giây, giữa 0.2 giây: không cần lượt phụ
    assert media.has_gap([W(word=" a", start=6.0, end=6.5)])  # đầu bài trống 6 giây
    assert media.has_gap([W(word=" a", start=0.0, end=1.0), W(word=" b", start=9.0, end=9.5)])  # giữa bài trống 8 giây
    assert media.has_gap([])  # lượt chính không ra gì: vẫn phải thử lượt phụ
    print("has_gap OK")


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
    test_words_to_cues()
    test_fill_gaps()
    test_has_gap()
    test_media(with_whisper="--whisper" in sys.argv)
