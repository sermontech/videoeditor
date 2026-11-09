"""Local render engine. Uses original text cards and optional uploaded media, no AI claims."""
import sys,json,pathlib,subprocess,os,math
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageEnhance
import imageio_ffmpeg
job=json.loads(pathlib.Path(sys.argv[1]).read_text());work=pathlib.Path(job['workDir']);work.mkdir(parents=True,exist_ok=True)
ff=imageio_ffmpeg.get_ffmpeg_exe();brand=job['brand'];dims={'portrait':(1080,1920),'landscape':(1920,1080),'square':(1080,1080)};W,H=dims[job['format']]
fonts=[os.environ.get('CREATOR_FONT',''),'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','C:/Windows/Fonts/arialbd.ttf','/System/Library/Fonts/Supplemental/Arial Bold.ttf']
fontpath=next((p for p in fonts if p and pathlib.Path(p).exists()),None)
if not fontpath:raise RuntimeError('Install DejaVu Sans or set CREATOR_FONT.')
def font(n):return ImageFont.truetype(fontpath,n)
def wrap(d,text,f,width):
 lines=[];line=''
 for word in text.split():
  if d.textlength(word,font=f)>width:
   if line:lines.append(line);line=''
   partial=''
   for ch in word:
    if d.textlength(partial+ch,font=f)>width:lines.append(partial);partial=ch
    else:partial+=ch
   line=partial;continue
  test=(line+' '+word).strip()
  if d.textlength(test,font=f)>width and line:lines.append(line);line=word
  else:line=test
 if line:lines.append(line)
 return lines
assets={a['id']:a for a in job['assets']};clips=[];report=[]
for i,s in enumerate(job['scenes']):
 bg=Image.new('RGB',(W,H),brand['background']);asset=assets.get(s.get('assetId'));video=None
 if asset:
  source=str(pathlib.Path(job['mediaDir'])/asset['filename'])
  if asset['kind']=='video':
   video=source;thumb=work/f'thumb{i}.jpg';subprocess.run([ff,'-v','error','-y','-protocol_whitelist','file,pipe,crypto,data','-i',source,'-frames:v','1',str(thumb)],check=True,timeout=30);pic=Image.open(thumb)
  else:pic=Image.open(source)
  pic=ImageOps.exif_transpose(pic).convert('RGB');bg=ImageEnhance.Brightness(ImageOps.fit(pic,(W,H))).enhance(.32)
 # Transparent overlay permits genuine moving video when a video asset is selected.
 overlay=Image.new('RGBA',(W,H),(0,0,0,150) if video else (0,0,0,0));d=ImageDraw.Draw(overlay);margin=int(W*.085);width=W-2*margin
 d.line((margin,H*.13,W-margin,H*.13),fill=brand['accent'],width=3)
 d.text((margin,H*.075),brand['name'].upper(),font=font(28),fill=brand['accent'])
 heading_size=28
 while d.textlength(s['title'],font=font(heading_size))>width and heading_size>14:heading_size-=1
 d.text((margin,H*.20),s['title'],font=font(heading_size),fill=brand['accent'])
 size=brand['fontSize'];maxheight=H*.45
 while True:
  lines=wrap(d,s['body'],font(size),width)
  if len(lines)*size*1.38<=maxheight or size<=30:break
  size-=2
 if len(lines)*size*1.38>maxheight:raise ValueError('Text does not fit. Shorten this scene.')
 y=H*.31
 for line in lines:d.text((margin,y),line,font=font(size),fill=brand['foreground']);y+=size*1.38
 d.text((margin,H*.82),f'{i+1:02d} / {len(job["scenes"]):02d}',font=font(24),fill=brand['accent'])
 d.line((margin,H*.88,W-margin,H*.88),fill=brand['foreground'],width=2)
 d.line((margin,H*.88,margin+width*(i+1)/len(job['scenes']),H*.88),fill=brand['accent'],width=5)
 png=work/f'{i}.png';clip=work/f'{i}.mp4'
 if video:overlay.save(png);cmd=[ff,'-v','error','-y','-stream_loop','-1','-protocol_whitelist','file,pipe,crypto,data','-i',video,'-loop','1','-i',str(png),'-filter_complex',f'[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[v];[v][1:v]overlay=0:0','-an']
 else:bg.paste(overlay,(0,0),overlay);bg.save(png);cmd=[ff,'-v','error','-y','-loop','1','-i',str(png)]
 cmd+=['-t',str(s['duration']),'-r','30','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-threads','2',str(clip)]
 subprocess.run(cmd,check=True,timeout=120);clips.append(clip);report.append({'scene':i+1,'fontSize':size,'lines':len(lines),'fitted':True})
 print(json.dumps({'progress':int((i+1)/len(job['scenes'])*85)}),flush=True)
concat=work/'clips.txt';concat.write_text(''.join(f"file '{p.name}'\n" for p in clips))
joined=work/'joined.mp4';subprocess.run([ff,'-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(joined)],check=True,timeout=60)
cmd=[ff,'-v','error','-y','-i',str(joined)];audio=assets.get(job.get('audioId'))
if audio:cmd+=['-protocol_whitelist','file,pipe,crypto,data','-i',str(pathlib.Path(job['mediaDir'])/audio['filename']),'-map','0:v','-map','1:a','-af','apad,loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','aac','-b:a','192k','-shortest']
cmd+=['-c:v','copy','-movflags','+faststart',job['output']];subprocess.run(cmd,check=True,timeout=90)
# Verify every exported frame/audio packet can be decoded, not just file presence.
subprocess.run([ff,'-v','error','-i',job['output'],'-f','null','-'],check=True,timeout=90)
print(json.dumps({'progress':100,'report':report}),flush=True)
