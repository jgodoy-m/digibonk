# Genera skins con accesorios en pixel art sobre cada Digimon y cada etapa (no recolores)
from PIL import Image
import json,sys
R='/home/user/digibonk/'; A='sprites/adventure/'
LINES={
 'agumon':['sprites/agumon.png','sprites/greymon.png',A+'metalgreymon.png',A+'wargreymon.png'],
 'gabumon':['sprites/gabumon.png','sprites/garurumon.png',A+'weregarurumon.png',A+'metalgarurumon.png'],
 'palmon':['sprites/palmon.png','sprites/togemon.png',A+'lillymon.png'],
 'gatomon':['sprites/gatomon.png','sprites/angewomon.png'],
 'gomamon':['sprites/gomamon.png','sprites/ikkakumon.png',A+'zudomon.png'],
 'patamon':['sprites/patamon.png','sprites/angemon.png',A+'magnaangemon.png'],
 'biyomon':['sprites/biyomon.png','sprites/birdramon.png',A+'garudamon.png'],
 'tentomon':[A+'tentomon.png',A+'kabuterimon.png',A+'megakabuterimon.png']}
PAL={'R':(214,40,40),'r':(150,20,28),'W':(255,255,255),'w':(205,215,230),'G':(255,205,50),'g':(200,140,20),'B':(120,78,40),'b':(84,52,24),
     'K':(40,44,60),'C':(90,220,255),'c':(40,140,210),'N':(40,160,70),'n':(22,104,44),'P':(255,120,170),'Y':(255,235,120),'O':(245,140,40)}
ACC={ # id: (rejilla, cuánto se hunde en la cabeza en píxeles de la rejilla)
 'festival':(["........WW.",".......RWW.","......RRR..",".....RRRr..","....RRRRr..","...RRRRRRr.","..RRRRRRRr.",".WWWWWWWWWw","WWWWWWWWWWw",".wwwwwwwww."],3),   # gorro de Papá Noel
 'reno':(["B.B.....B.B","BBB.....BBB",".Bb.....bB.",".BB.....BB.","..B..N..B..","..Bb.NRN.B.","...NNRNN..."],2),                               # astas de reno con acebo
 'cristal':(["G...G...G","GG.GGG.GG","GGGGGGGGG","GRGGCGGRG","gggggggggg"[:9]],2),                                                                  # corona
 'galactico':([".KKKKKKKKK.","KWCcKKKWCcK","KCccK.KCccK",".KKK...KKK."],3),                                                                         # goggles
 'glitch':(["RRRRRRRRR..","RrRRRRRRRRR",".rrrrrrr.Rr","..........r"],3)}                                                                             # cinta roja
OV=json.load(open(R+'sprites/skins/ajustes.json'))
def head(im):
    w,h=im.size; g=w//4; a=im.resize((g,g),Image.NEAREST).split()[3].load()
    rows=[[x for x in range(g) if a[x,y]>40] for y in range(g)]
    y0=next(y for y in range(g) if rows[y]); y1=max(y for y in range(g) if rows[y])
    band=range(y0, y0+max(3,int((y1-y0)*0.28)))
    # cabeza: el tramo contiguo más ancho en la franja superior
    best=None
    for y in band:
        xs=rows[y]; 
        if not xs: continue
        runs=[];s=xs[0];p=xs[0]
        for x in xs[1:]:
            if x!=p+1: runs.append((s,p)); s=x
            p=x
        runs.append((s,p)); r=max(runs,key=lambda r:r[1]-r[0])
        if best is None or r[1]-r[0]>best[1]-best[0]: best=(r[0],r[1],y)
    cx=(best[0]+best[1])/2; wd=best[1]-best[0]+1
    # tope de la cabeza: primera fila opaca en la columna central
    top=next(y for y in range(g) if a[int(cx),y]>40)
    return g,cx,top,wd
def make(path,acc,ov):
    im=Image.open(R+path).convert('RGBA'); g,cx,top,wd=head(im)
    grid,sink=ACC[acc]; gw=len(grid[0]); gh=len(grid)
    sc=2 if wd>=20 else 1
    sc=ov.get('s',sc); cx+=ov.get('dx',0); top+=ov.get('dy',0)
    pad=max(0,(gh-sink)*sc-top+1)                      # lienzo más alto si el accesorio se sale por arriba
    G=g+pad; small=Image.new('RGBA',(G,G),(0,0,0,0)); small.paste(im.resize((g,g),Image.NEAREST),((G-g)//2,pad))
    ox=int(round(cx-gw*sc/2))+(G-g)//2; oy=top+pad-(gh-sink)*sc
    px=small.load(); cells=set()
    for j,row in enumerate(grid):
        for i,ch in enumerate(row):
            if ch=='.': continue
            for a in range(sc):
                for b in range(sc):
                    x,y=ox+i*sc+a, oy+j*sc+b
                    if 0<=x<G and 0<=y<G: px[x,y]=PAL[ch]+(255,); cells.add((x,y))
    for (x,y) in list(cells):                              # contorno oscuro de 1 píxel
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            q=(x+dx,y+dy)
            if q not in cells and 0<=q[0]<G and 0<=q[1]<G and (px[q][3]<40 ): px[q]=(24,24,34,255)
    return small.resize((G*4,G*4),Image.NEAREST)
tiles=[];labels=[]
for key,line in LINES.items():
    for st,path in enumerate(line):
        for acc in ACC:
            out=make(path,acc,OV.get(f'{key}_{st}_{acc}',OV.get(f'{key}_{st}',{})))
            out.save(f'{R}sprites/skins/{key}_{st}_{acc}.png')
            if acc in ('festival','galactico'): tiles.append(out.resize((110,110),Image.NEAREST)); labels.append(f'{key}_{st}')
cols=14; rows=(len(tiles)+cols-1)//cols
sh=Image.new('RGBA',(cols*112,rows*112),(30,46,90,255))
for i,t in enumerate(tiles): sh.alpha_composite(t,((i%cols)*112+1,(i//cols)*112+1))
sh.save(R+'sprites/skins/_hoja.png'); print(len(tiles), labels[::2])
