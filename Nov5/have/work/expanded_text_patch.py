from pathlib import Path
p=Path('work/expanded_pdf_engine.py')
s=p.read_text();start=s.index('def tokens(');end=s.index('\ndef newpdf(',start)
s=s[:start]+'''# Fractions sit on the mathematical axis of the surrounding type.
# Mixed numbers stay together across line breaks.
def tokens(s):
 return re.findall(r"[−-]?\\d+ +\\{[^{}]+/[^{}]+\\}|\\{[^{}]+/[^{}]+\\}|[^\\s{}]+|[ \\t]+|\\n",clean(s))
def fraction_parts(t):
 m=re.fullmatch(r"(?:(.*?) +)?\\{([^{}]+)/([^{}]+)\\}",t)
 return m.groups() if m else None

def tw(t,size,font='Old'):
 frac=fraction_parts(t)
 if frac:
  whole,n,d=frac; fs=size*.88
  fw=max(pdfmetrics.stringWidth(n,font,fs),pdfmetrics.stringWidth(d,font,fs))+size*.32
  return (pdfmetrics.stringWidth(whole,font,size)+size*.22 if whole else 0)+fw
 return pdfmetrics.stringWidth(t,font,size)
def wrap_lines(s,w,size=12,font='Old'):
 lines=[];line=[];width=0
 for token in tokens(s):
  if token=='\\n':lines.append(line);line=[];width=0;continue
  ww=tw(token,size,font)
  if width+ww>w and line:
   lines.append(line);line=[];width=0
   if token.isspace():continue
  line.append(token);width+=ww
 if line:lines.append(line)
 return lines

def text_height(s,w,size=12,font='Old',leading=None):
 return sum(max(leading or size*1.32,size*1.88 if any(fraction_parts(t) for t in ln) else 0) for ln in wrap_lines(s,w,size,font))

def text(c,s,x,y,w,size=12.5,font='Old',color='black',leading=None):
 color=HexColor(color) if color.startswith('#') else color
 c.setFillColor(color);leading=leading or size*1.32
 for ln in wrap_lines(s,w,size,font):
  xx=x;hasfrac=any(fraction_parts(t) for t in ln)
  for t in ln:
   frac=fraction_parts(t);c.setFont(font,size)
   if frac:
    whole,n,d=frac;ww=tw(t,size,font);fs=size*.88
    if whole:
     c.drawString(xx,y,whole);off=pdfmetrics.stringWidth(whole,font,size)+size*.22
    else:off=0
    fw=ww-off;axis=y+size*.29
    c.setFont(font,fs)
    c.drawCentredString(xx+off+fw/2,axis+size*.25,n)
    c.drawCentredString(xx+off+fw/2,axis-size*.84,d)
    c.setStrokeColor(color);c.setLineWidth(max(.45,size*.042));c.line(xx+off+size*.04,axis,xx+ww-size*.04,axis)
   else:c.drawString(xx,y,t)
   xx+=tw(t,size,font)
  y-=max(leading,size*1.88 if hasfrac else leading)
 return y
''' +s[end:]
s=s.replace("ROOT=Path('outputs/DoubleAdvanced_Math_Program')","ROOT=Path('outputs/DoubleAdvanced_Expanded')")
p.write_text(s)
