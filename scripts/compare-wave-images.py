#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json,math,argparse
parser=argparse.ArgumentParser(description='Compare fixed-phase before/after Canvas PNGs; requires Pillow and NumPy.')
parser.add_argument('directory',type=Path,help='Directory containing {chromium,safari}-{before,after}-CASE.png')
root=parser.parse_args().directory
def mean_window(a,k=7):
 p=np.pad(a,((k//2,k//2),(k//2,k//2)),mode='reflect');i=np.pad(p,((1,0),(1,0))).cumsum(0).cumsum(1)
 return (i[k:,k:]-i[:-k,k:]-i[k:,:-k]+i[:-k,:-k])/(k*k)
def ssim(a,b):
 a=np.asarray(a.convert('L').resize((min(960,a.width),round(a.height*min(960,a.width)/a.width))),dtype=np.float64)
 b=np.asarray(b.convert('L').resize((a.shape[1],a.shape[0])),dtype=np.float64)
 ma,mb=mean_window(a),mean_window(b);va=mean_window(a*a)-ma*ma;vb=mean_window(b*b)-mb*mb;cov=mean_window(a*b)-ma*mb
 return float(np.mean(((2*ma*mb+6.5025)*(2*cov+58.5225))/((ma*ma+mb*mb+6.5025)*(va+vb+58.5225))))
rows=[]
for engine in ['chromium','safari']:
 for old in sorted(root.glob(engine+'-before-*.png')):
  name=old.name.removeprefix(engine+'-before-');new=root/(engine+'-after-'+name)
  if not new.exists():parser.error(f'Missing matching image: {new.name}')
  a=Image.open(old).convert('RGB');b=Image.open(new).convert('RGB');x=np.asarray(a,dtype=np.float32);y=np.asarray(b,dtype=np.float32);d=np.abs(x-y);m=d.max(2);grey=np.asarray(a.convert('L'),dtype=np.float32)
  grad=np.zeros(grey.shape,dtype=bool);grad[:,1:]|=np.abs(np.diff(grey,axis=1))>2;grad[1:,:]|=np.abs(np.diff(grey,axis=0))>2
  mask=np.asarray(Image.fromarray((grad*255).astype('uint8')).filter(ImageFilter.MaxFilter(11)))>0
  mse=float(np.mean((x-y)**2));row={'engine':engine,'case':name[:-4],'size':a.size,'mae_255':float(d.mean()),'rmse_255':math.sqrt(mse),'psnr_db':10*math.log10(255**2/mse) if mse else None,'ssim_960':ssim(a,b),'pct_max_channel_gt8':float((m>8).mean()*100),'pct_max_channel_gt16':float((m>16).mean()*100),'edge_mae_255':float(d[mask].mean()) if mask.any() else 0,'max_delta':float(m.max())};rows.append(row)
  heat=np.zeros_like(x);heat[:,:,0]=np.minimum(m*8,255);heat[:,:,1]=np.minimum(m*2,255);Image.fromarray(heat.astype('uint8')).save(root/(engine+'-diff-'+name))
if not rows:parser.error('No matching before/after PNG pairs found')
(root/'visual-metrics.json').write_text(json.dumps(rows,indent=2))
for engine in ['chromium','safari']:
 r=[x for x in rows if x['engine']==engine]
 if r:print(engine,'cases',len(r),'MAE max',max(x['mae_255'] for x in r),'SSIM min',min(x['ssim_960'] for x in r),'pct>8 max',max(x['pct_max_channel_gt8'] for x in r),'edge MAE max',max(x['edge_mae_255'] for x in r))
