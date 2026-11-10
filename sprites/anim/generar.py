# Genera las hojas de animación (5 fotogramas: reposo 1, reposo 2, ataque 1, ataque 2, daño) y las skins con accesorios.
# Los accesorios se dibujan a la resolución del sprite y se ajustan a la silueta de la cabeza en cada fotograma.
# Uso: python3 generar.py <carpeta con los fotogramas en bruto: <id>/0..4.png>
from PIL import Image
import json,sys,os
RAW=sys.argv[1]; OUT=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(os.path.dirname(OUT))
PAD=9; NF=5
LINES={'agumon':['agumon','greymon','metalgreymon','wargreymon'],'gabumon':['gabumon','garurumon','weregarurumon','metalgarurumon'],
 'palmon':['palmon','togemon','lillymon'],'gatomon':['gatomon','angewomon'],'gomamon':['gomamon','ikkakumon','zudomon'],
 'patamon':['patamon','angemon','magnaangemon'],'biyomon':['biyomon','birdramon','garudamon'],'tentomon':['tentomon','kabuterimon','megakabuterimon']}
OV=json.load(open(os.path.join(OUT,'ajustes.json')))
def cells(i):
    fr=[Image.open(f'{RAW}/{i}/{k}.png').convert('RGBA') for k in range(NF)]
    bb=None
    for f in fr:
        b=f.getbbox(); bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    w,h=bb[2]-bb[0],bb[3]-bb[1]; S=max(w+4,h+PAD+2)
    out=[]
    for f in fr:
        c=Image.new('RGBA',(S,S),(0,0,0,0)); c.alpha_composite(f.crop(bb),((S-w)//2,S-1-h)); out.append(c)
    return out
def sheet(cs):
    S=cs[0].width; sh=Image.new('RGBA',(S*NF,S),(0,0,0,0))
    for k,c in enumerate(cs): sh.alpha_composite(c,(k*S,0))
    return sh.resize((S*NF*2,S*2),Image.NEAREST)   # x2: el juego amplía sin suavizar
def op(px,S,x,y): return 0<=x<S and 0<=y<S and px[x,y][3]>40
def head0(c):
    S=c.width; px=c.load()
    rows=[[x for x in range(S) if px[x,y][3]>40] for y in range(S)]
    y0=next(y for y in range(S) if rows[y]); y1=max(y for y in range(S) if rows[y])
    best=None
    for y in range(y0,y0+max(3,int((y1-y0)*0.28))):
        xs=rows[y]
        if not xs: continue
        runs=[];s=p=xs[0]
        for x in xs[1:]:
            if x!=p+1: runs.append((s,p)); s=x
            p=x
        runs.append((s,p)); r=max(runs,key=lambda r:r[1]-r[0])
        if best is None or r[1]-r[0]>best[1]-best[0]: best=r
    cx=(best[0]+best[1])//2; wd=min(22,max(6,best[1]-best[0]+1))
    return cx,wd
def top_at(px,S,cx):
    for y in range(S):
        if op(px,S,cx,y): return y
    return S//2
def run(px,S,cx,y,wmax):
    x=cx
    if not op(px,S,x,y):
        for d in range(1,4):
            if op(px,S,cx-d,y): x=cx-d;break
            if op(px,S,cx+d,y): x=cx+d;break
        else: return None
    l=r=x
    while op(px,S,l-1,y) and cx-(l-1)<=wmax//2+1: l-=1
    while op(px,S,r+1,y) and (r+1)-cx<=wmax//2+1: r+=1
    return l,r
def track(c0,c,cx,top):
    # desplazamiento de la cabeza respecto al fotograma 0 (comparación del parche de la cabeza)
    S=c0.width; p0=c0.load(); p=c.load(); best=(1e9,0,0)
    for dy in range(-5,6):
        for dx in range(-6,7):
            e=0
            for y in range(top,top+9):
                for x in range(cx-7,cx+8):
                    a=p0[x,y] if 0<=x<S and 0<=y<S else (0,0,0,0)
                    xx,yy=x+dx,y+dy; b=p[xx,yy] if 0<=xx<S and 0<=yy<S else (0,0,0,0)
                    e+= 60 if (a[3]>40)!=(b[3]>40) else (abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2]))//12 if a[3]>40 else 0
            e+= (abs(dx)+abs(dy))*3
            if e<best[0]: best=(e,dx,dy)
    return best[1],best[2]
def dark(c):
    cols=[p[:3] for p in list(c.getdata()) if p[3]>40]; cols.sort(key=lambda q:q[0]*3+q[1]*6+q[2])
    d=cols[len(cols)//50] if cols else (24,24,34)
    return d if d[0]*3+d[1]*6+d[2]<600 else (24,24,34)
class Art:
    def __init__(s,c): s.c=c; s.px=c.load(); s.S=c.width; s.mine={}
    def put(s,x,y,col):
        x=int(x);y=int(y)
        if 0<=x<s.S and 0<=y<s.S: s.mine[(x,y)]=col
    def done(s,ol):
        for (x,y),col in s.mine.items(): s.px[x,y]=col+(255,)
        for (x,y) in list(s.mine):                       # contorno solo donde el accesorio da al fondo
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                q=(x+dx,y+dy)
                if q not in s.mine and 0<=q[0]<s.S and 0<=q[1]<s.S and s.px[q][3]<=40: s.px[q]=ol+(255,)
RED=(214,44,44);RED2=(158,24,32);WH=(255,255,255);WH2=(206,216,232);GO=(255,208,56);GO2=(204,142,22);BR=(128,84,44);BR2=(88,56,26)
NV=(44,50,78);CY=(96,222,255);CY2=(40,146,214);GR=(44,164,76)
def acc(kind,c,cx,top,wd,ol):
    a=Art(c); px=a.px; S=a.S; wmax=int(wd*1.5)+2
    def R(y): return run(px,S,cx,y,wmax)
    if kind=='festival':                                   # gorro de Papá Noel: el ala sigue el ancho de la cabeza
        yb=top+2; r=R(yb) or (cx-wd//2,cx+wd//2); l,rr=max(r[0]-1,cx-6),min(r[1]+1,cx+6); w=rr-l+1
        for x in range(l,rr+1): a.put(x,yb-1,WH); a.put(x,yb,WH if x<rr-w//4 else WH2)
        h=min(6,max(3,int(w*0.6))); 
        for k in range(1,h+1):
            ww=max(1,round(w*(1-k/h)**0.9)); c0=(l+rr)/2+k*0.42
            x0=round(c0-ww/2)
            for x in range(x0,x0+ww): a.put(x,yb-1-k,RED if x<x0+ww-max(1,ww//4) else RED2)
        tx=round((l+rr)/2+h*0.42)+1; ty=yb-1-h+1
        for dx in range(2):
            for dy in range(2): a.put(tx+dx,ty+dy,WH if dy==0 else WH2)
    elif kind=='cristal':                                  # corona apoyada sobre la cabeza
        yb=top; r=R(top+1) or (cx-wd//2,cx+wd//2); l,rr=r[0]+1,r[1]-1
        if rr-l<4: l,rr=cx-2,cx+2
        w=rr-l+1
        for x in range(l,rr+1): a.put(x,yb,GO2); a.put(x,yb-1,GO)
        ph=2 if w<10 else 3
        for px_ in sorted({l,(l+rr)//2,rr}):
            for k in range(ph): a.put(px_,yb-2-k,GO)
            if w>=9 and px_ not in (l,rr): a.put(px_-1,yb-2,GO); a.put(px_+1,yb-2,GO)
        a.put((l+rr)//2,yb-1,RED)
        if w>=9: a.put(l+1,yb-1,CY); a.put(rr-1,yb-1,CY)
    elif kind=='reno':                                     # astas que nacen de la cabeza
        r=R(top+1) or (cx-wd//2,cx+wd//2); w=r[1]-r[0]+1; h=3 if w<10 else 5
        for sx,d in ((r[0]+max(1,w//5),-1),(r[1]-max(1,w//5),1)):
            ty=top_at(px,S,sx)
            for k in range(1,h+1): a.put(sx,ty-k,BR if k>1 else BR2)
            a.put(sx+d,ty-h+1 if h>3 else ty-2,BR); a.put(sx+d*2,ty-h if h>3 else ty-3,BR)
            if h>3: a.put(sx-d,ty-h,BR); a.put(sx+d,ty-2,BR2)
        a.put(cx,top-1,GR); a.put(cx-1,top-1,GR); a.put(cx+1,top-1,RED)
    elif kind=='galactico':                                # goggles subidos a la frente
        yb=top+2; r=R(yb) or (cx-wd//2,cx+wd//2)
        for x in range(r[0],r[1]+1): a.put(x,yb,NV)
        lw=max(2,min(4,(r[1]-r[0]+1)//4)); x0=max(r[0]+1,cx-lw-1-max(0,(r[1]-r[0])//8))
        for n in range(2):
            xs=x0+n*(lw+1)
            for x in range(xs-1,xs+lw+1):
                for y in range(yb-2,yb+2): a.put(x,y,NV)
            for x in range(xs,xs+lw):
                a.put(x,yb-1,CY); a.put(x,yb,CY2)
            a.put(xs,yb-1,WH)
    elif kind=='glitch':                                   # cinta atada: cada fila sigue el borde de la cabeza
        yb=top+2; last=None
        for k,col in ((0,RED),(1,RED2)):
            r=R(yb+k)
            if not r: continue
            for x in range(r[0],r[1]+1): a.put(x,yb+k,col)
            last=r
        if last:
            bx=last[1]+1
            for (dx,dy,col) in ((0,0,RED),(1,1,RED),(2,2,RED2),(0,2,RED2),(1,3,RED2)): a.put(bx+dx,yb+dy,col)
    a.done(ol)
ACCS=['galactico','glitch','cristal','festival','reno']
ids=[]
for i in sorted(os.listdir(RAW)):
    if not os.path.isdir(f'{RAW}/{i}'): continue
    cs=cells(i); name='tank' if i=='ogremon' else i
    sheet(cs).save(f'{OUT}/{name}.png',optimize=True); ids.append(name)
    cs[0].resize((cs[0].width*4,)*2,Image.NEAREST).save(f'{OUT}/f_{name}.png')
review=[]
for key,line in LINES.items():
    for st,i in enumerate(line):
        base=cells(i); cx,wd=head0(base[0]); o=OV.get(f'{key}_{st}',{}); cx+=o.get('dx',0); wd=o.get('w',wd)
        top=top_at(base[0].load(),base[0].width,cx)+o.get('dy',0); ol=dark(base[0])
        tr=[(0,0)]+[track(base[0],c,cx,top) for c in base[1:]]
        for k in ACCS:
            cs=[c.copy() for c in base]
            for c,(dx,dy) in zip(cs,tr):
                t2=top_at(c.load(),c.width,cx+dx) if abs(top_at(c.load(),c.width,cx+dx)-(top+dy))<=2 else top+dy
                acc(k,c,cx+dx,t2+o.get('dy',0)*0,wd,ol)
            sheet(cs).save(f'{OUT}/{key}_{st}_{k}.png',optimize=True); ids.append(f'{key}_{st}_{k}')
            cs[0].resize((cs[0].width*4,)*2,Image.NEAREST).save(f'{ROOT}/sprites/skins/{key}_{st}_{k}.png')
            review.append(cs[0])
json.dump(sorted(ids),open(f'{OUT}/indice.json','w'))
cols=15; T=132; rows=(len(review)+cols-1)//cols
sh=Image.new('RGBA',(cols*T,rows*T),(30,46,90,255))
for n,c in enumerate(review):
    z=max(1,(T-4)//c.width); t=c.resize((c.width*z,c.width*z),Image.NEAREST); sh.alpha_composite(t,((n%cols)*T+(T-t.width)//2,(n//cols)*T+(T-t.height)//2))
sh.save(f'{OUT}/_hoja_skins.png'); print(len(ids),'hojas')
