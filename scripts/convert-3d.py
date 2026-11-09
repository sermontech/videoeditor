"""Convert a trusted local browser export to MP4, optionally adding owned audio."""
import argparse, pathlib, subprocess, tempfile, os
import imageio_ffmpeg

def main():
    parser=argparse.ArgumentParser(description='Convert a local 3D WebM to H.264 MP4. Maximum 30 seconds; no files uploaded. Existing output files are never overwritten.')
    parser.add_argument('input',type=pathlib.Path)
    parser.add_argument('output',type=pathlib.Path)
    parser.add_argument('--audio',type=pathlib.Path,help='Optional local WAV/MP3/M4A/OGG audio; replaces source audio, padded/trimmed to video.')
    args=parser.parse_args()
    source=args.input.expanduser().resolve(); dest=args.output.expanduser().resolve()
    if not source.is_file() or source.suffix.lower() not in ('.webm','.mp4') or source.stat().st_size>200*1024*1024:
        parser.error('Input must be a local WebM/MP4 file up to 200 MB.')
    if dest.suffix.lower()!='.mp4' or dest.exists():parser.error('Choose a new output filename ending in .mp4. Existing files are not overwritten.')
    audio=args.audio.expanduser().resolve() if args.audio else None
    if audio and (not audio.is_file() or audio.suffix.lower() not in ('.wav','.mp3','.m4a','.ogg') or audio.stat().st_size>100*1024*1024):
        parser.error('Audio must be a local WAV/MP3/M4A/OGG up to 100 MB.')
    dest.parent.mkdir(parents=True,exist_ok=True)
    ff=imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix='clear-take-convert-',dir=dest.parent) as temp:
        out=pathlib.Path(temp)/'export.mp4'
        cmd=[ff,'-v','error','-nostdin','-protocol_whitelist','file,pipe,crypto,data','-i',str(source)]
        if audio:cmd+=['-protocol_whitelist','file,pipe,crypto,data','-i',str(audio),'-map','0:v:0','-map','1:a:0','-af','apad,loudnorm=I=-16:TP=-1.5:LRA=9','-shortest']
        else:cmd+=['-map','0:v:0','-map','0:a?']
        cmd+=['-t','30','-vf',"scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",'-r','30','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-threads','2','-movflags','+faststart',str(out)]
        subprocess.run(cmd,check=True,timeout=600)
        subprocess.run([ff,'-v','error','-nostdin','-i',str(out),'-f','null','-'],check=True,timeout=120)
        # Exclusive creation also prevents overwrites if another process creates dest mid-conversion.
        try:
            with dest.open('xb') as target, out.open('rb') as src:
                import shutil
                shutil.copyfileobj(src,target)
        except FileExistsError:
            parser.error('Output already exists; choose another filename.')
    print(f'MP4 created and fully decoded: {dest}')
    print('Video is limited to 30 seconds. Audio is replaced only when --audio is provided.')

if __name__=='__main__':
    main()
