"""Render original factual score graphics with registered-voice WAV narration.
Requires Pillow and imageio-ffmpeg. Narration inputs: .tools/match/01.wav ... 07.wav.
Source facts and editorial limitations are documented beside the exported video.
"""
from pathlib import Path
import math, wave, subprocess, json
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'.tools/match'; OUT=ROOT/'AI Video Editor/Exports'; OUT.mkdir(parents=True,exist_ok=True)
W,H,FPS=1080,1920,30
INK='#14272B'; PAPER='#F6F2E9'; MINT='#B8E3CC'; CLAY='#D98B70'; SLATE='#A5B6B5'; CARD='#20393D'
FONTS=Path('/usr/share/fonts/truetype/dejavu')
def font(size,bold=False): return ImageFont.truetype(str(FONTS/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
def txt(d,xy,s,size=32,fill=PAPER,bold=False): d.text(xy,s,font=font(size,bold),fill=fill)
def centered(d,y,s,size,fill=PAPER,bold=False):
 f=font(size,bold); b=d.textbbox((0,0),s,font=f); d.text(((W-(b[2]-b[0]))/2,y),s,font=f,fill=fill)
scenes=[
 {'label':'THE RESULT','headline':['Eight goals.','Two comebacks.'],'score':'4 : 4','phase':'FULL TIME','rows':[('08 NOV','2026','Old Trafford'),('PREMIER','LEAGUE','Manchester United vs Aston Villa')],'caption':['United recovered from','two-goal deficits twice.']},
 {'label':'THE OPENING','headline':['Villa score twice','inside four minutes.'],'score':'0 : 2','phase':'AFTER 4 MINUTES','rows':[("1′",'Alysson','Aston Villa'),("4′",'Nicolas Jackson','Aston Villa')],'caption':['Two early goals.','Villa lead 2–0.']},
 {'label':'THE FIRST COMEBACK','headline':['United draw level','before the break.'],'score':'2 : 2','phase':'HALF TIME','rows':[("16′",'Bruno Fernandes','Penalty · Manchester United'),("44′",'Youri Tielemans','Manchester United')],'caption':['Fernandes. Tielemans.','Level at half time.']},
 {'label':'AFTER THE BREAK','headline':['Villa restore','a two-goal lead.'],'score':'2 : 4','phase':'AFTER 53 MINUTES','rows':[("48′",'John McGinn','Penalty · Aston Villa'),("53′",'Leon Goretzka','Aston Villa')],'caption':['Two more Villa goals.','United trail again.']},
 {'label':'STOPPAGE TIME / 01','headline':['Zirkzee reduces','the deficit.'],'score':'3 : 4','phase':'90+2 MINUTES','rows':[("90+2′",'Joshua Zirkzee','Manchester United')],'caption':['United score in','second-half stoppage time.']},
 {'label':'STOPPAGE TIME / 02','headline':['Dorgu heads in','the equaliser.'],'score':'4 : 4','phase':'90+6 MINUTES','rows':[("90+6′",'Patrick Dorgu','Manchester United'),('ASSIST','Bruno Fernandes','Corner headed in by Dorgu')],'caption':['A Fernandes corner.','A Dorgu header. Four all.']},
 {'label':'THE FINAL WORD','headline':['Two deficits.','One point each.'],'score':'4 : 4','phase':'FULL TIME','rows':[('0–2','to 2–2','United’s first comeback'),('2–4','to 4–4','United’s second comeback')],'caption':['Manchester United 4','Aston Villa 4']},
]
texts=[
'Eight goals. Two comebacks. Manchester United, four. Aston Villa, four. Old Trafford. November eighth, twenty twenty six.',
'Villa scored twice inside four minutes. Alysson opened the scoring in the first minute. Nicolas Jackson added the second in the fourth.',
'United answered through Bruno Fernandes, from the penalty spot in the sixteenth minute, and Youri Tielemans in the forty fourth. Two all at half time.',
'Villa pulled away again after the break. John McGinn converted a penalty in the forty eighth minute. Leon Goretzka made it four two in the fifty third.',
'United still trailed as second half stoppage time began. Then Joshua Zirkzee scored, at ninety plus two.',
'And at ninety plus six, Patrick Dorgu headed in from a Bruno Fernandes corner. Four all.',
'Full time: Manchester United four, Aston Villa four. United had recovered from a two goal deficit twice.'
]
# Pad each audio segment to an exact frame boundary, preserving sample-accurate scene sync.
lengths=[]; chunks=[]; sr=44100
for i in range(7):
 with wave.open(str(WORK/f'{i+1:02d}.wav')) as a:
  assert a.getnchannels()==1 and a.getsampwidth()==2 and a.getframerate()==sr
  raw=a.readframes(a.getnframes()); dur=a.getnframes()/sr
 frames=math.ceil((dur+.35)*FPS); target=round(frames/FPS*sr)
 chunks.append(raw+b'\0'*(target*2-len(raw))); lengths.append(frames)
with wave.open(str(WORK/'assembled.wav'),'wb') as a:
 a.setnchannels(1);a.setsampwidth(2);a.setframerate(sr);a.writeframes(b''.join(chunks))
# Each chapter has a stable information hierarchy with a staggered entry.
layers=[]
for i,s in enumerate(scenes):
 bg=Image.new('RGB',(W,H),INK);d=ImageDraw.Draw(bg)
 for x in range(-W,W*2,120):d.line((x,0,x+600,H),fill='#183035',width=1)
 d.ellipse((640,-320,1500,540),outline='#284347',width=3)
 txt(d,(88,144),'CLEAR TAKE',30,MINT,True);txt(d,(88,195),'FACTUAL MATCH RECAP',22,SLATE)
 txt(d,(832,155),f'0{i+1} / 07',24,SLATE)
 d.line((88,260,992,260),fill='#496366',width=2)
 txt(d,(88,304),s['label'],26,MINT,True)
 for j,line in enumerate(s['headline']):txt(d,(88,367+j*83),line,60,PAPER,True)
 # Score always uses home-away order, explicitly labelled.
 centered(d,620,s['phase'],26,MINT,True)
 centered(d,663,s['score'],176,PAPER,True)
 txt(d,(112,881),'MAN UNITED',30,PAPER,True);txt(d,(702,881),'ASTON VILLA',30,PAPER,True)
 d.line((88,959,992,959),fill='#496366',width=2)
 # Sources stay visible; full URLs live in source notes shipped with the video.
 txt(d,(88,1535),'SOURCES  ESPN • AL JAZEERA / AFP',23,SLATE)
 txt(d,(88,1575),'Original graphics • AI narration • No match footage',20,SLATE)
 d.line((88,1640,992,1640),fill='#496366',width=2)
 txt(d,(88,1680),'08 NOVEMBER 2026  /  OLD TRAFFORD',23,SLATE)
 rowlayers=[]
 for j,(minute,name,detail) in enumerate(s['rows']):
  im=Image.new('RGBA',(904,142),(0,0,0,0));q=ImageDraw.Draw(im)
  q.rounded_rectangle((0,0,903,141),radius=18,fill=CARD)
  q.rounded_rectangle((0,0,8,141),radius=4,fill=MINT)
  txt(q,(26,44),minute,30 if len(minute)<6 else 24,MINT,True)
  txt(q,(224,24),name,36,PAPER,True)
  txt(q,(224,82),detail,23,SLATE)
  rowlayers.append(im)
 caption=Image.new('RGBA',(904,160),(0,0,0,0));q=ImageDraw.Draw(caption)
 for j,line in enumerate(s['caption']):txt(q,(0,j*59),line,43,MINT if j==1 else PAPER,True)
 layers.append((bg,rowlayers,caption))
 # Export representative frame for QA.
 sample=bg.copy()
 for j,row in enumerate(rowlayers):sample.paste(row,(88,1004+j*158),row)
 sample.paste(caption,(88,1360),caption);sample.save(WORK/f'poster-{i+1}.jpg')
ff=imageio_ffmpeg.get_ffmpeg_exe();output=OUT/'Manchester United vs Aston Villa - 4-4 - Clear Take.mp4'
cmd=[ff,'-v','warning','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-', '-i',str(WORK/'assembled.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-af','loudnorm=I=-15:TP=-1.5:LRA=9','-movflags','+faststart','-shortest',str(output)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
allframes=sum(lengths); globalframe=0
try:
 for i,n in enumerate(lengths):
  bg,rows,caption=layers[i]
  for f in range(n):
   frame=bg.copy();t=f/FPS
   for j,row in enumerate(rows):
    k=max(0,min(1,(t-.12-j*.16)/.4));ease=1-(1-k)**3
    if k:
     overlay=row.copy();overlay.putalpha(row.getchannel('A').point(lambda a:int(a*k)))
     frame.paste(overlay,(88,1004+j*158+int(30*(1-ease))),overlay)
   if t>.5:
    frame.paste(caption,(88,1360),caption)
   dr=ImageDraw.Draw(frame)
   # Progress segmented by actual voice chapter durations, not match minute positions.
   cursor=88
   for j,count in enumerate(lengths):
    width=904*count/allframes
    dr.rectangle((cursor,1760,cursor+width-6,1767),fill=MINT if j<i else '#496366')
    if j==i:dr.rectangle((cursor,1760,cursor+(width-6)*f/max(1,n-1),1767),fill=MINT)
    cursor+=width
   if f<7 and i>0:
    frame=Image.blend(Image.new('RGB',(W,H),INK),frame,.5+.5*f/7)
   p.stdin.write(frame.tobytes());globalframe+=1
  print(f'Chapter {i+1}/7 rendered',flush=True)
finally:
 p.stdin.close()
if p.wait()!=0:raise RuntimeError('FFmpeg render failed')
manifest={'output':str(output.relative_to(ROOT)),'resolution':[W,H],'fps':FPS,'duration_seconds':allframes/FPS,'chapters':[]}
time=0
for i,n in enumerate(lengths):
 manifest['chapters'].append({'start':time,'duration':n/FPS,'voiceover':texts[i],'graphics':scenes[i]});time+=n/FPS
(OUT/'Match recap - timeline.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print(output,flush=True)
