"""Transcribe bounded normalized PCM, never decode arbitrary uploaded media here."""

import argparse
import hashlib
from importlib.metadata import version
import io
import json
import os
import re
from pathlib import Path
import sys
import wave


def verify_model(path):
    manifest_path = path / "vibescroller-model.json"
    if path.is_symlink() or path.is_junction() or not manifest_path.is_file() or manifest_path.is_symlink() or manifest_path.stat().st_size > 10000:
        raise ValueError("LOCAL_ASR_MODEL_INVALID")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("repository") != "Systran/faster-whisper-small.en" or not isinstance(manifest.get("revision"), str) or not re.fullmatch(r"[a-f0-9]{40}", manifest["revision"]):
        raise ValueError("LOCAL_ASR_MODEL_INVALID")
    files = manifest.get("files", {})
    allowed = {"model.bin", "config.json", "tokenizer.json", "vocabulary.json", "vocabulary.txt", "preprocessor_config.json"}
    if not isinstance(files, dict) or not {"model.bin", "config.json", "tokenizer.json"}.issubset(files) or not set(files).issubset(allowed):
        raise ValueError("LOCAL_ASR_MODEL_INVALID")
    for name, expected in files.items():
        candidate = path / name
        if candidate.is_symlink() or not candidate.is_file() or candidate.stat().st_size > 600_000_000:
            raise ValueError("LOCAL_ASR_MODEL_INVALID")
        with candidate.open("rb") as content:
            if hashlib.file_digest(content, "sha256").hexdigest() != expected:
                raise ValueError("LOCAL_ASR_MODEL_CHANGED")
    if version("faster-whisper") != "1.2.1":
        raise ValueError("LOCAL_ASR_RUNTIME_CHANGED")
    return manifest["revision"]


def normalized_pcm(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError("LOCAL_ASR_INPUT_INVALID")
    size = path.stat().st_size
    if not 44 <= size <= 19_500_000:
        raise ValueError("LOCAL_ASR_INPUT_LIMIT")
    with path.open("rb") as content:
        data = content.read(19_500_001)
    if len(data) != size:
        raise ValueError("LOCAL_ASR_INPUT_CHANGED")
    with wave.open(io.BytesIO(data), "rb") as audio:
        frames = audio.getnframes()
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getcomptype()) != (1, 2, 16000, "NONE"):
            raise ValueError("LOCAL_ASR_NORMALIZED_PCM_REQUIRED")
        if not 0 < frames <= 9_600_000:
            raise ValueError("LOCAL_ASR_DURATION_LIMIT")
        pcm = audio.readframes(frames)
        if len(pcm) != frames * 2:
            raise ValueError("LOCAL_ASR_TRUNCATED_INPUT")
    return pcm, frames / 16000, hashlib.sha256(data).hexdigest()


def transcribe(path, model_path):
    pcm, duration, digest = normalized_pcm(path)
    revision = verify_model(model_path)
    import numpy as np
    from faster_whisper import WhisperModel

    samples = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768
    segments = []
    # Silence is not a transcript. Do not introduce a second VAD model.
    if np.max(np.abs(samples)) >= .0004 and np.sqrt(np.mean(samples * samples)) >= .0001:
        model = WhisperModel(str(model_path), device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
        output, _ = model.transcribe(samples, language="en", task="transcribe", beam_size=3,
                                     vad_filter=False, condition_on_previous_text=False,
                                     word_timestamps=False)
        total = 0
        for item in output:
            text = item.text.strip()
            start, end = round(item.start * 1000), round(item.end * 1000)
            if not 0 <= start <= end <= round(duration * 1000) + 1000:
                raise ValueError("LOCAL_ASR_TIMING_INVALID")
            total += len(text)
            if len(segments) >= 200 or len(text) > 4000 or total > 60000:
                raise ValueError("LOCAL_ASR_OUTPUT_LIMIT")
            if text:
                segments.append({"index": len(segments), "startMs": start,
                                 "endMs": min(end, round(duration * 1000)), "text": text})
    return {"schemaVersion": 1, "model": "openai/whisper-small.en",
            "weightDistribution": "Systran/faster-whisper-small.en",
            "weightRevision": revision,
            "runtime": "faster-whisper", "runtimeVersion": "1.2.1",
            "device": "cpu", "computeType": "int8", "language": "en",
            "durationMs": round(duration * 1000), "audioSha256": digest,
            "segments": segments, "coverage": "audio_only",
            "warnings": ["Automatic transcription can contain errors; review the original audio."]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model-directory", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    # Model download is a separate setup step. A job cannot fetch new weights.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    result = transcribe(Path(args.audio), Path(args.model_directory))
    with open(args.output, "x", encoding="utf-8") as output:
        json.dump(result, output, ensure_ascii=False)
    print(json.dumps({"completed": True, "segments": len(result["segments"])}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        code = str(error)
        if not code.startswith("LOCAL_ASR_") or len(code) > 80:
            code = "LOCAL_ASR_FAILED"
        print(code, file=sys.stderr)
        sys.exit(1)
