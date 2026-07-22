#!/usr/bin/env python3
"""
clone_voice.py — clone a voice from a short sample and speak arbitrary text,
using OpenVoice V2 (+ MeloTTS) on CPU. Free, local, open-source.

This is Step 2's voice engine. It's importable and also runs standalone:

    python clone_voice.py \
        --text "Hello from my cloned voice." \
        --voice reference.wav \
        --out speech.wav

The output .wav is what feeds the Wav2Lip step (animate_photo.sh) to make a reel.

Notes for an Intel Mac (CPU):
- The reference sample can be short (~10-30s of clean speech works well).
- First run downloads/loads models and is slow; later runs are faster.
- Runs on CPU by default (device="cpu").
"""
import argparse
import os
import sys


def synthesize(
    text,
    reference_audio,
    out_path,
    checkpoints_dir,
    language="EN",
    speaker_key="EN-US",
    speed=1.0,
    device="cpu",
):
    """Generate `out_path` (wav) speaking `text` in the voice of `reference_audio`."""
    # Imported lazily so `--help` works even before OpenVoice is installed.
    import torch
    from openvoice import se_extractor
    from openvoice.api import ToneColorConverter
    from melo.api import TTS

    converter_dir = os.path.join(checkpoints_dir, "converter")
    config_path = os.path.join(converter_dir, "config.json")
    ckpt_path = os.path.join(converter_dir, "checkpoint.pth")
    for p in (config_path, ckpt_path):
        if not os.path.isfile(p):
            sys.exit(
                f"ERROR: missing OpenVoice checkpoint: {p}\n"
                "Run setup_voice_mac.sh and download checkpoints_v2 (see README)."
            )

    # 1) Tone-color converter (carries the target voice's timbre).
    tone_color_converter = ToneColorConverter(config_path, device=device)
    tone_color_converter.load_ckpt(ckpt_path)

    # 2) Extract the speaker embedding from the reference sample.
    print(f"==> Extracting voice characteristics from: {reference_audio}")
    target_se, _ = se_extractor.get_se(reference_audio, tone_color_converter, vad=True)

    # 3) Base speech with MeloTTS.
    print("==> Generating base speech (MeloTTS)...")
    model = TTS(language=language, device=device)
    speaker_ids = model.hps.data.spk2id
    if speaker_key not in speaker_ids:
        available = ", ".join(speaker_ids.keys())
        sys.exit(f"ERROR: speaker '{speaker_key}' not found. Available: {available}")
    speaker_id = speaker_ids[speaker_key]

    se_file = speaker_key.lower().replace("_", "-")
    source_se_path = os.path.join(checkpoints_dir, "base_speakers", "ses", f"{se_file}.pth")
    if not os.path.isfile(source_se_path):
        sys.exit(f"ERROR: missing base speaker embedding: {source_se_path}")
    source_se = torch.load(source_se_path, map_location=device)

    tmp_path = out_path + ".base.wav"
    model.tts_to_file(text, speaker_id, tmp_path, speed=speed)

    # 4) Convert the base speech into the cloned voice.
    print("==> Applying cloned voice (tone-color conversion)...")
    tone_color_converter.convert(
        audio_src_path=tmp_path,
        src_se=source_se,
        tgt_se=target_se,
        output_path=out_path,
        message="@MyShell",
    )
    if os.path.exists(tmp_path):
        os.remove(tmp_path)

    print(f"==> Cloned-voice audio written to: {out_path}")
    return out_path


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    default_ckpts = os.path.join(here, "OpenVoice", "checkpoints_v2")

    ap = argparse.ArgumentParser(description="Clone a voice and speak text (OpenVoice V2, CPU).")
    ap.add_argument("--text", help="Text to speak. Or use --text-file.")
    ap.add_argument("--text-file", help="Path to a .txt file with the text to speak.")
    ap.add_argument("--voice", required=True, help="Reference audio (.wav/.mp3) of the voice to clone.")
    ap.add_argument("--out", default="speech.wav", help="Output .wav path (default: speech.wav).")
    ap.add_argument("--checkpoints", default=default_ckpts, help="OpenVoice checkpoints_v2 dir.")
    ap.add_argument("--language", default="EN", help="MeloTTS language (default: EN).")
    ap.add_argument("--speaker", default="EN-US", help="Base accent/speaker key (default: EN-US).")
    ap.add_argument("--speed", type=float, default=1.0, help="Speech speed (default: 1.0).")
    ap.add_argument("--device", default="cpu", help="cpu (default) or cuda/mps if available.")
    args = ap.parse_args()

    if args.text_file:
        with open(args.text_file, "r", encoding="utf-8") as fh:
            text = fh.read().strip()
    elif args.text:
        text = args.text
    else:
        ap.error("provide --text or --text-file")

    if not os.path.isfile(args.voice):
        sys.exit(f"ERROR: reference voice not found: {args.voice}")

    synthesize(
        text=text,
        reference_audio=args.voice,
        out_path=args.out,
        checkpoints_dir=args.checkpoints,
        language=args.language,
        speaker_key=args.speaker,
        speed=args.speed,
        device=args.device,
    )


if __name__ == "__main__":
    main()
