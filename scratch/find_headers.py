import os
import re

files = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f in ['overview.txt', 'transcript.jsonl', 'Code.gs', 'v3.1_code.txt']:
            files.append(os.path.join(r, f))

found_headers = []
for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        # Find something like: const headers = [ ... ]
        # We can use a general regex to find arrays containing '股票代號'
        matches = re.findall(r'(\[\s*(?:["\'][^"\']+["\']\s*,\s*)*["\']股票代號["\']\s*,\s*.*?\])', content, re.DOTALL)
        for m in matches:
            if len(m) > 100:
                found_headers.append((fpath, m))
    except Exception as e:
        pass

found_headers.sort(key=lambda x: len(x[1]), reverse=True)
if found_headers:
    print(f"Found headers in {found_headers[0][0]} with length {len(found_headers[0][1])}:")
    print(found_headers[0][1])
else:
    print("No headers match found. Let's look for any 'initSystem' block.")
    # Search for initSystem function
    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            idx = content.find("function initSystem")
            if idx != -1:
                print(f"Found initSystem in {fpath}:")
                print(content[idx:idx+2500])
                break
        except Exception as e:
            pass
