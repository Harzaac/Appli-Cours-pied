# python3 test/compare.py shots/base shots/apres  -> liste les captures qui diffèrent
import sys,os
from PIL import Image, ImageChops
a,b=sys.argv[1],sys.argv[2];bad=0
for f in sorted(os.listdir(a)):
    if not f.endswith('.png'): continue
    pb=os.path.join(b,f)
    if not os.path.exists(pb): print('manque',f); bad+=1; continue
    x=Image.open(os.path.join(a,f)).convert('RGB'); y=Image.open(pb).convert('RGB')
    if x.size!=y.size: print('taille',f,x.size,y.size); bad+=1; continue
    d=ImageChops.difference(x,y).getbbox()
    if d: print('diffère',f,d); bad+=1
print('identiques' if not bad else f'{bad} capture(s) différente(s)')
