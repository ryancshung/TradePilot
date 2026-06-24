import os
import re
import json

paths = []
for root, dirs, files in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in files:
        if f in ['transcript.jsonl', 'overview.txt']:
            paths.append(os.path.join(root, f))

candidates = []

for path in paths:
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    if 'content' in data and data.get('source') == 'MODEL':
                        content = data['content']
                        if 'importStockCSV' in content:
                            # Search for javascript blocks
                            blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                            for b in blocks:
                                c = b.strip()
                                if 'importStockCSV' in c:
                                    # Make sure it's not a small snippet
                                    candidates.append((len(c), path, c))
                except Exception:
                    pass
    except Exception as e:
        print(f"Error reading {path}: {e}")

candidates.sort(key=lambda x: x[0], reverse=True)
print(f"Found {len(candidates)} candidates in JSONL/overview files.")
for idx, (length, path, code) in enumerate(candidates[:10]):
    print(f"Candidate {idx}: {length} bytes in {path}")
    print(code[:200].replace('\n', ' '))
    print("-" * 60)

if candidates:
    # Write the best one
    best_code = candidates[0][2]
    out_path = r'd:\Vibecoding\TradePilot\scratch\v4_clean_code.gs'
    with open(out_path, 'w', encoding='utf-8') as out:
        out.write(best_code)
    print(f"Wrote clean code of length {len(best_code)} to {out_path}")
