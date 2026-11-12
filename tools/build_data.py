#!/usr/bin/env python3
"""Export the Hyperspace Python importer's encounters.json as GitHub Pages data.

Examples:
  python tools/build_data.py --source 'H:/My Drive/.../Hyperspace Data'
  python tools/build_data.py --source '/somewhere/encounters.json' --copy-images

The default is data-only. --copy-images copies Serebii sprites from the local
importer cache for use on the website. Check publication rights first.
"""
from __future__ import annotations
import argparse
from collections import Counter
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]

def main():
    arg = argparse.ArgumentParser(description=__doc__)
    arg.add_argument('--source', required=True, type=Path, help='Hyperspace Data folder or encounters.json')
    arg.add_argument('--copy-images', action='store_true', help='Copy locally cached images to the website assets folder')
    opts=arg.parse_args()
    source=opts.source.resolve()
    if source.is_dir():
        base=source
        infile=base/'exports'/'encounters.json'
    else:
        infile=source
        base=source.parent.parent if source.parent.name=='exports' else source.parent
    if not infile.exists():
        arg.error(f'Encounter JSON not found: {infile}')
    zones=json.loads(infile.read_text(encoding='utf-8'))
    if not isinstance(zones,list) or len(zones)!=507:
        raise ValueError(f'Expected 507 zones, got {len(zones) if isinstance(zones,list) else type(zones)}')
    cachefile=base/'assets'/'remote_url_cache.json'
    cache=json.loads(cachefile.read_text(encoding='utf-8')) if opts.copy_images and cachefile.exists() else {}
    copied={}
    dest=ROOT/'assets'/'pokemon'
    dest.mkdir(parents=True,exist_ok=True)

    def image_for(m):
        if not opts.copy_images: return None
        url=m.get('remote_image_url')
        rel=cache.get(url)
        if not isinstance(rel,str): return None
        filepath=(base/rel).resolve()
        if not filepath.is_relative_to(base) or not filepath.is_file(): return None
        target=dest/filepath.name
        if filepath!=target and not target.exists(): shutil.copy2(filepath,target)
        copied[filepath.name]=True
        return 'assets/pokemon/'+filepath.name

    def member(m):
        row={
            'name':m['pokemon'], 'form':m.get('form_image_key') or '',
            'rarity':m.get('rarity'), 'level':[m.get('base_min'),m.get('base_max')],
            'alpha':m.get('alpha_chance'), 'alphaLevel':[m.get('alpha_min'),m.get('alpha_max')],
            'types':m.get('types',[])
        }
        path=image_for(m)
        if path: row['image']=path
        return row
    out=[]
    for zone in zones:
        groups=[{'slot':g['slot'],'members':[member(m) for m in g['members']],
                 'rarityTotal':g.get('rarity_total')} for g in zone.get('groups',[])]
        status='possible' if len(groups)!=3 else ('warning' if zone.get('issues') else 'matched')
        out.append({
            'id':zone['zone_id'], 'type':zone['type'], 'star':zone.get('star'),
            'number':zone.get('number'), 'status':status,
            'focus':[{'name':f['pokemon'],'form':f.get('form_image_key') or ''} for f in zone.get('focuses',[])],
            'groups':groups,
            'unassigned':[member(m) for m in zone.get('spawns',[])] if status=='possible' else [],
            'warnings':zone.get('issues',[]), 'source':zone.get('source_url','')
        })
    output=ROOT/'data'/'zones.json'
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    counts=Counter(z['status'] for z in out)
    spawn_count=sum(sum(len(g['members']) for g in z['groups']) + len(z['unassigned']) for z in out)
    assert counts==Counter({'matched':467,'warning':33,'possible':7}),counts
    assert spawn_count==2533,spawn_count
    print(f'Exported {len(out)} zones, {spawn_count} spawn rows, {len(copied)} image files')
    print(f'Status: {dict(counts)}')
    print(f'Data file: {output}, {output.stat().st_size:,} bytes')

if __name__=='__main__':main()
