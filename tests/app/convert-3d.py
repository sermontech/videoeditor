"""Conversion smoke test: real FFmpeg, optional audio, overwrite protection."""
import pathlib,tempfile,subprocess,sys,hashlib
import imageio_ffmpeg
root=pathlib.Path(__file__).resolve().parents[2]
ff=imageio_ffmpeg.get_ffmpeg_exe()
with tempfile.TemporaryDirectory(prefix='clear-take-conversion-test-') as temp:
 p=pathlib.Path(temp);video=p/'source.webm';audio=p/'tone.wav';out=p/'output.mp4'
 subprocess.run([ff,'-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=15','-t','1','-c:v','libvpx-vp9',str(video)],check=True)
 subprocess.run([ff,'-v','error','-f','lavfi','-i','sine=frequency=440:duration=0.5',str(audio)],check=True)
 command=[sys.executable,str(root/'scripts/convert-3d.py'),str(video),str(out),'--audio',str(audio)]
 subprocess.run(command,check=True)
 # Require both streams, not just a playable silent output.
 subprocess.run([ff,'-v','error','-i',str(out),'-map','0:v:0','-map','0:a:0','-f','null','-'],check=True)
 digest=hashlib.sha256(out.read_bytes()).hexdigest()
 result=subprocess.run(command,capture_output=True)
 assert result.returncode!=0
 assert hashlib.sha256(out.read_bytes()).hexdigest()==digest
 print('PASS: real MP4 video/audio streams decode; existing output cannot be overwritten.')
