import shutil
html=open('src/index.html').read().replace('__SPECIES__',open('data/species.json').read())
open('site/index.html','w').write(html)
for f in ['sw.js','manifest.webmanifest']: shutil.copy('src/'+f,'site/'+f)
