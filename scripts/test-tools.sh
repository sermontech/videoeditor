#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/env.sh
mkdir -p .tools/test-results
ffmpeg -v error -f lavfi -i testsrc2=size=320x180:rate=24 -t 1 -c:v libx264 -pix_fmt yuv420p -y .tools/test-results/ffmpeg.mp4
ffmpeg -v error -i .tools/test-results/ffmpeg.mp4 -f null -
remotion render tests/remotion/index.jsx SmokeTest .tools/test-results/remotion.mp4 --browser-executable="$HYPERFRAMES_BROWSER_PATH" --concurrency=1
hyperframes lint tests/hyperframes
hyperframes render tests/hyperframes -o "$PWD/.tools/test-results/hyperframes.mp4" --workers 1
whisper-cli --help > .tools/test-results/whisper-help.txt 2>&1
python3 -m yt_dlp --version
python3 -m yt_dlp --enable-file-urls "file://$PWD/.tools/test-results/ffmpeg.mp4" --force-overwrites -o .tools/test-results/ytdlp.mp4
cmp .tools/test-results/ffmpeg.mp4 .tools/test-results/ytdlp.mp4
for clip in ffmpeg remotion hyperframes; do
  ffprobe -v error -show_entries format=duration -of csv=p=0 ".tools/test-results/$clip.mp4"
done
echo 'Smoke checks passed. Whisper transcription requires a trained model; external website downloads are not tested.'
