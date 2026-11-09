"""Build the review PDF. Requires reportlab; optional extracted evidence in .tools/analysis."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'AI Video Editor/Brand/Clear Take - Brand Sheet.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUT), pagesize=(720, 960))
c.setTitle('Clear Take | Original Editing Brand Sheet')
c.setAuthor('AI Video Editor')
INK='#14272B'; PAPER='#F6F2E9'; MINT='#B8E3CC'; CLAY='#D98B70'; SLATE='#A5B6B5'

def box(x,y,w,h,color,r=0):
    c.setFillColor(HexColor(color))
    if r:c.roundRect(x,y,w,h,r,fill=1,stroke=0)
    else:c.rect(x,y,w,h,fill=1,stroke=0)

def text(x,y,s,size=12,color=INK,font='Helvetica'):
    c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,y,s)

def para(x,top,s,width=620,size=12,color=INK,leading=None):
    st=ParagraphStyle('body',fontName='Helvetica',fontSize=size,leading=leading or size*1.45,textColor=HexColor(color))
    p=Paragraph(s,st);_,h=p.wrap(width,900);p.drawOn(c,x,top-h);return top-h

def header(n,title,subtitle,dark=False):
    bg=INK if dark else PAPER;fg=PAPER if dark else INK
    box(0,0,720,960,bg)
    text(48,914,'CLEAR TAKE  /  EDITING DIRECTION',11,MINT if dark else INK,'Helvetica-Bold')
    text(48,850,title,32,fg,'Helvetica-Bold')
    para(48,825,subtitle,620,12,SLATE if dark else INK)
    box(48,48,624,1,SLATE)
    text(48,30,'REVIEW DRAFT 01  •  09 NOV 2026  •  WORKING NAME, NOT FINAL BRAND',8,SLATE if dark else INK)
    text(645,30,f'{n:02d}',10,SLATE if dark else INK)

def section(y,k,title,body):
    text(48,y,k,10,CLAY,'Helvetica-Bold');text(84,y,title,17,INK,'Helvetica-Bold')
    return para(84,y-17,body,572,12)

header(1,'Your point. Made clear.','An original presenter-led system inspired by the structure of your references — not their identities.',True)
text(48,738,'CLARITY OVER CLUTTER.',24,MINT,'Helvetica-Bold')
para(48,712,'Keep the person. Show the context. Make one memorable point.<br/>Warm, informed and expressive — without constant effects.',620,16,PAPER)
# Original graphic-only layout sketch, not copied footage.
box(48,228,242,420,'#294348',18)
text(66,624,'VIEWPOINT / 01',10,MINT,'Helvetica-Bold')
box(117,461,104,114,'#56706F',48)
box(88,333,162,135,'#56706F',45)
box(66,289,205,82,INK,10)
text(81,342,'The context',22,PAPER,'Helvetica-Bold')
text(81,314,'changes the story.',19,MINT,'Helvetica-Bold')
text(66,251,'ORIGINAL LAYOUT SKETCH',8,PAPER)
text(330,620,'01  PRESENTER FIRST',13,MINT,'Helvetica-Bold')
para(330,599,'Let expression and delivery carry the energy. Do not cut simply because a timer says so.',330,13,PAPER)
text(330,508,'02  EVIDENCE ON DEMAND',13,MINT,'Helvetica-Bold')
para(330,487,'Bring in a readable source card when it helps. Return to the person when it no longer does.',330,13,PAPER)
text(330,396,'03  MEANINGFUL CAPTIONS',13,MINT,'Helvetica-Bold')
para(330,375,'Phrase-based text. One highlighted thought. Consistent placement, with room for the face.',330,13,PAPER)
para(48,179,'<b>Originality rule:</b> keep the explanatory principle; leave behind the creators’ marks, team colours, studio look, catchphrases and exact layouts.',624,12,PAPER)
c.showPage()

header(2,'What the references show','Visual samples span all three files. These are distinct styles with a common presenter-and-context structure.')
items=[(1,'KOMBO','2:41 / 30 fps','Upper headline panel stays visible.<br/>Presenter gestures carry activity.<br/>No recurring dialogue captions<br/>seen in sampled frames.'),(2,'ERIC REFERENCE','2:58 / 30 fps','Source clip becomes full-screen;<br/>presenter returns with prominent<br/>phrase captions. Occasional inset,<br/>monochrome beat and end card.'),(3,'BI_BENARD','2:59 / 25 fps','Presenter above changing images.<br/>Purple-lit room is a signature.<br/>Supporting images hold for long<br/>stretches rather than rapid cuts.')]
for j,(n,name,meta,desc) in enumerate(items):
    x=48+j*212
    path=ROOT/f'.tools/analysis/evidence-{n}.jpg'
    if path.exists():c.drawImage(ImageReader(str(path)),x,430,width=196,height=348.44)
    else:box(x,430,196,348,INK);text(x+12,600,'Reference still unavailable',10,PAPER)
    text(x,407,name,12,INK,'Helvetica-Bold');text(x,388,meta,10,INK)
    para(x,370,desc,196,10.5)
box(48,184,624,78,INK,8)
para(66,247,'<b>Shared:</b> vertical framing, a recognizable presenter, visible context and sustained compositions.<br/><b>Not shared:</b> one font, one palette, continuous captions or a proven music/effects formula.',588,12,PAPER)
para(48,151,'Method: frames sampled every 3 seconds plus selected stills; metadata and audio loudness measured. Exact fonts, zoom curves, cut counts and music/effects are not verified. Still labels are approximate: KOMBO 0:34, Eric 1:14, bi_benard 1:30. See the companion analysis for detailed timestamps and limitations.',624,10)
c.showPage()

header(3,'The visual identity','A warm editorial palette, legible captions and a small number of repeatable visual decisions.')
colors=[('INK',INK),('PAPER',PAPER),('MINT',MINT),('CLAY',CLAY),('SLATE',SLATE)]
for j,(name,col) in enumerate(colors):
    x=48+j*126;box(x,674,116,105,col,8)
    if col==PAPER:
        c.setStrokeColor(HexColor(INK));c.roundRect(x,674,116,105,8,stroke=1,fill=0)
    text(x,651,name,10,INK,'Helvetica-Bold');text(x,633,col,10,INK)
section(584,'01','Type with a purpose','Proposed fonts: <b>Manrope Semibold/Bold</b> for captions and headings; <b>Source Serif 4 Italic</b> only for rare quotes. Sentence case by default. Exact reference fonts are unknown.')
box(48,367,624,112,INK,10)
text(70,441,'The context',29,PAPER,'Helvetica-Bold');text(70,402,'changes the story.',29,MINT,'Helvetica-Bold')
text(426,439,'3–7 WORDS',10,MINT,'Helvetica-Bold');text(426,418,'MAXIMUM 2 LINES',10,MINT,'Helvetica-Bold');text(426,397,'ONE HIGHLIGHT',10,MINT,'Helvetica-Bold')
section(328,'02','1080 × 1920 type scale','Hook: <b>76–88 px</b>. Dialogue: <b>58–66 px</b>. Context label: <b>30–36 px</b>. Start caption holds at 0.8–2.2 seconds; extend for reading and synchronize to the actual speech.')
section(216,'03','Contrast and restraint','Paper text on ink; mint for one key phrase. Clay is a small counterpoint accent, not body text. Keep skin tones natural. Avoid pale accent text on paper backgrounds.')
para(48,105,'PDF samples use portable Helvetica/Times equivalents, not installed production fonts. Final font rendering and brand name remain subject to approval.',624,9)
c.showPage()

header(4,'Edit for the argument','A repeatable system — not a preset that forces every video into the same rhythm.')
y=746
for k,title,body in [
('01','Viewpoint → receipt → takeaway','Start presenter-led. Add a temporary evidence card only when needed. Use a full-screen crop plus small presenter inset for dense material. Return to the face for the conclusion.'),
('02','Cut on meaning','Start with 4–8 second presenter holds. Consider a visual reset every 6–12 seconds only when justified. Keep evidence up long enough to read; simple cards may need 3–6 seconds.'),
('03','Use zooms sparingly','Punch in from 100% to 106–110% for an important beat. Start with no more than 2–3 per 30 seconds. Do not confuse a speaker leaning forward with a digital zoom.'),
('04','Motion should explain','Prefer direct cuts. Evidence entry: 180–240 ms, 16–24 px movement plus fade. Exit: 120–180 ms fade. Round to whole frames. No default spins, whip transitions or constant bouncing text.'),
('05','Protect the phone view','At 1080 × 1920, keep critical content initially inside x=90–900, y=180–1570. Test in the actual platform UI. Move captions away from mouths, hands, evidence and interface overlays.')]:
    bottom=section(y,k,title,body);y=bottom-40
box(48,110,624,78,INK,8)
para(66,173,'<b>30-second test:</b> 0–3 hook · 3–8 context · 8–17 viewpoint · 17–24 counterpoint · 24–28 takeaway · 28–30 response prompt.<br/>This is a new short-format template, not the timing of the 3-minute references.',588,11,PAPER)
c.showPage()

header(5,'Sound, delivery & approval','Voice first. Deliberate graphics. A consistent finish — with honest limits on what has been verified.')
text(48,756,'MEASURED REFERENCE AUDIO',12,INK,'Helvetica-Bold')
for j,(name,lufs,peak) in enumerate([('KOMBO','−14.4 LUFS','−0.5 dBTP'),('Eric reference','−14.8 LUFS','+1.2 dBTP'),('bi_benard','−18.8 LUFS','−3.8 dBTP')]):
    x=48+j*212;box(x,659,196,77,INK,8);text(x+14,711,name,11,PAPER);text(x+14,685,lufs,18,MINT,'Helvetica-Bold');text(x+114,685,peak,9,PAPER)
para(48,639,'Whole-file FFmpeg loudness measurements. Positive reconstructed peak in the Eric file suggests limited headroom; it does not prove audible distortion. Music, BPM and individual effects were not identified.',624,10)
section(557,'01','Our sound proposal','Voice remains dominant. Music is optional: licensed, low-density, no competing vocals. Start the bed 18–24 dB below speech; duck further if needed. Use at most a subtle tick for a meaningful reveal, not every caption.')
section(432,'02','House delivery target','Aim for <b>−16 to −14 LUFS integrated</b> and <b>≤ −1 dBTP</b>; verify after AAC encoding. This is a house target, not a platform mandate. Master at 1080 × 1920 from original footage; choose frame rate to suit the source. Do not treat 576p references as masters.')
section(294,'03','Approve these four choices','1. Ink / Paper / Mint palette.<br/>2. Readable captions throughout spoken sections.<br/>3. Temporary evidence cards rather than permanent split-screen.<br/>4. Minimal optional music, not a heavy soundtrack.')
box(48,88,624,76,INK,8)
para(66,149,'<b>Next:</b> apply the approved direction to 15–30 seconds of your own footage. Complete a listening pass, check caption timing and UI safe areas, confirm source permissions, and review on a phone before export.',588,12,PAPER)
c.save()
print(OUT)
