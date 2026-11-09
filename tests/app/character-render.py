"""Real FFmpeg smoke test; temporary media never enters Git."""
import tempfile, pathlib, json, subprocess, sys
from PIL import Image, ImageDraw
import imageio_ffmpeg
root=pathlib.Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix='character-test-') as temp:
 p=pathlib.Path(temp)
 im=Image.new('RGBA',(180,300));d=ImageDraw.Draw(im);d.ellipse((20,0,160,140),fill='#ff0000');d.rectangle((40,140,140,300),fill='#ff0000');im.save(p/'hero.png')
 job={'workDir':str(p/'work'),'mediaDir':str(p),'output':str(p/'out.mp4'),'format':'portrait','brand':{'name':'Test','background':'#172B2E','foreground':'#F6F2E9','accent':'#B8E3CC','fontSize':56},'assets':[{'id':'hero','kind':'image','filename':'hero.png'}],'scenes':[{'title':'Character test','body':'Original character artwork in motion.','duration':3,'characterId':'hero','characterPosition':'center','characterMotion':'float'}]}
 (p/'job.json').write_text(json.dumps(job))
 subprocess.run([sys.executable,str(root/'server/render.py'),str(p/'job.json')],check=True)
 ff=imageio_ffmpeg.get_ffmpeg_exe()
 def red_center(t):
  dest=p/f'frame{t}.png'
  subprocess.run([ff,'-v','error','-ss',str(t),'-i',str(p/'out.mp4'),'-frames:v','1',str(dest)],check=True)
  image=Image.open(dest).convert('RGB');points=[(x,y) for y in range(1200,1800) for x in range(400,680) if (lambda c:c[0]>180 and c[1]<90 and c[2]<90)(image.getpixel((x,y)))]
  assert len(points)>1000,'Character missing in exported frames'
  return sum(y for x,y in points)/len(points)
 assert red_center(0)-red_center(2)>10,'Float motion missing'
 print('PASS: real portrait MP4 decodes, character visible, float changes position.')
