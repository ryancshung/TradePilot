import os
import re
import json

paths = []
for root, dirs, files in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in files:
        if f in ['overview.txt', 'transcript.jsonl']:
            paths.append(os.path.join(root, f))

results = []

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
                                    if 'importStockCSV' in c:
                                        results.append((len(c), path, c[:100].replace('\n', ' ')))
                    except Exception:
                        pass
        else:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if 'importStockCSV' in content:
                blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                for b in blocks:
                    c = b.strip()
                    if 'importStockCSV' in c:
                        results.append((len(c), path, c[:100].replace('\n', ' ')))
    except Exception as e:
        pass

results.sort(key=lambda x: x[0], reverse=True)
for i, (l, p, snippet) in enumerate(results[:20]):
    print(f"{i}: {l} bytes in {p} - Snippet: {snippet}")
