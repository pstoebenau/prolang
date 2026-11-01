import json
from openpronounce import phones,speech
rows={}
for a,b in [('Stadt','Staat'),('bitten','bieten'),('schon','schön'),('Mutter','Mütter'),('Maße','Masse')]:
 rows[a+'/'+b]={'a':phones.get_expected_phones(a,'de'),'b':phones.get_expected_phones(b,'de')}
rows['length_normalization']={p:phones.normalize_phone(p,'de') for p in ['a','aː','i','iː','øː','yː','ɛː']}
open('validation/results/german-language-probe.json','w').write(json.dumps(rows,ensure_ascii=False,indent=2))
