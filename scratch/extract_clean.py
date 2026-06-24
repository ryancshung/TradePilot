import os
import re
import json

paths = []
for root, dirs, files in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in files:
        if f in ['overview.txt', 'transcript.jsonl']:
            paths.append(os.path.join(root, f))

best_code = ""
best_len = 0
best_file = ""

for path in paths:
    try:
        if path.endswith('transcript.jsonl'):
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if 'content' in data and data.get('source') == 'MODEL':
                            content = data['content']
                            if 'importStockCSV' in content:
                                blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                                for b in blocks:
                                    c = b.strip()
                                    if 'importStockCSV' in c and len(c) > best_len:
                                        best_len = len(c)
                                        best_code = c
                                        best_file = path
                    except Exception as je:
                        pass
        else:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if 'importStockCSV' in content:
                blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                for b in blocks:
                    c = b.strip()
                    if 'importStockCSV' in c and len(c) > best_len:
                        best_len = len(c)
                        best_code = c
                        best_file = path
    except Exception as e:
        pass

print(f"Clean best code length: {best_len} in {best_file}")
if best_code:
    out_path = r'd:\Vibecoding\TradePilot\scratch\v4_clean_code.gs'
    with open(out_path, 'w', encoding='utf-8') as out:
        out.write(best_code)
    print("Wrote clean code to scratch/v4_clean_code.gs")
