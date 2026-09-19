"""Reproducible personal-photo optimisation and licensed audio preparation.
Run with the supplied archive directory; originals are never modified.
"""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib, json, re, subprocess

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
OUT = ROOT / 'dist/assets/photos'
OUT.mkdir(parents=True, exist_ok=True)
mapping = (WORK / 'ZR-Saimun-Photo-Location-Mapping-2026-09-16.md').read_text()
groups, seen, duplicates, missing = {}, {}, [], []
rows = re.findall(r'^- `([^`]+)` — ([^\n]+)', mapping, re.M)
rows += [('IMG_8250.jpeg','Beijing, China'),('IMG_8249.jpeg','Beijing, China'),('IMG_4632.jpeg','London, United Kingdom')]
for filename, desc in rows:
    src = WORK / 'upload' / filename
    if not src.exists():
        if 'duplicate' not in desc: missing.append(filename)
        continue
    with Image.open(src) as raw:
        im = ImageOps.exif_transpose(raw).convert('RGB')
        fingerprint = hashlib.sha256(str(im.size).encode()+im.tobytes()).hexdigest()
        if fingerprint in seen:
            duplicates.append({'excluded':filename,'canonical':seen[fingerprint]}); continue
        seen[fingerprint] = filename
        if 'exact byte-for-byte duplicate' in desc: continue
        city = desc.split(',')[0].split(';')[0]
        if city.startswith('NTV'): city='NTV'
        if city.startswith('Turkey'): city='Türkiye'
        if city.startswith('London'): city='London'
        im.thumbnail((1600,1800),Image.Resampling.LANCZOS)
        stem = src.stem.replace('(1)','-1').replace('(2)','-2').replace('(3)','-3')
        dest = OUT / ('archive-'+stem+'.webp')
        im.save(dest,'WEBP',quality=88,method=5)
        groups.setdefault(city,[]).append({'src':'./assets/photos/'+dest.name,'caption':('Graduation day · London' if 'graduation' in desc else 'NTV · A short professional chapter' if city=='NTV' else city+' · Personal travel archive'),'kind':'Personal photograph','original':filename,'width':im.width,'height':im.height})
(ROOT/'dist/photo-manifest.json').write_text(json.dumps(groups,ensure_ascii=False,indent=2))
(ROOT/'PHOTO-AUDIT.json').write_text(json.dumps({'uniqueUploadedPhotos':len(seen),'duplicatesExcluded':duplicates,'missingFiles':missing},ensure_ascii=False,indent=2))

audio=ROOT/'dist/assets/audio'; audio.mkdir(exist_ok=True)
sounds=WORK/'sound-sources'
interface=sounds/'kenney_interface-sounds/Audio'
impact=sounds/'kenney_impact-sounds/Audio'
recipes={
 'engine-idle':(sounds/'loop_0.wav','volume=2,lowpass=f=1400'),
 'engine-drive':(sounds/'loop_3_0.wav','volume=2,lowpass=f=2600'),
 'engine-boost':(sounds/'loop_5_0.wav','volume=1.5,afade=t=out:st=0.2:d=0.4'),
 'soft-brake':(interface/'scratch_002.ogg','volume=0.7'),
 'collision':(impact/'impactMetal_medium_002.ogg','volume=0.8'),
 'glass-break':(impact/'impactGlass_heavy_001.ogg','volume=0.7'),
 'photo-discover':(interface/'camera_001.ogg' if (interface/'camera_001.ogg').exists() else interface/'select_002.ogg','volume=0.65'),
 'city-arrival':(interface/'confirmation_004.ogg','volume=0.7'),
 'snow-wind':(sounds/'wind woosh loop.ogg','lowpass=f=2100,volume=0.8'),
 'rain-weather':(sounds/'Rain OGG/1.ogg','volume=0.7'),
 'hot-desert':(sounds/'wind woosh loop.ogg','lowpass=f=750,volume=0.6'),
 'coastal-ambience':(sounds/'Rain OGG/4.ogg','lowpass=f=900,tremolo=f=0.12:d=0.65,volume=0.5'),
 'jet-flyby':(sounds/'wind woosh loop.ogg','highpass=f=180,lowpass=f=3800,volume=0.65,afade=t=in:d=0.5,afade=t=out:st=2:d=1'),
 'ui-open':(interface/'open_003.ogg','volume=0.4'),
 'ui-close':(interface/'close_001.ogg','volume=0.4'),
 'repair':(interface/'confirmation_003.ogg','volume=0.5'),
 'snow-step':(impact/'footstep_snow_000.ogg','volume=0.5')
}
for name,(src,filters) in recipes.items():
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-t','12' if name!='jet-flyby' else '3','-af',filters,'-ar','44100','-ac','2','-codec:a','libmp3lame','-b:a','128k',str(audio/(name+'.mp3'))],check=True)
print(json.dumps({'photos':sum(map(len,groups.values())),'cities':list(groups),'duplicates':len(duplicates),'missing':missing,'sounds':len(recipes)}))
