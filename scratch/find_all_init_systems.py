import os
import re

files = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f == 'overview.txt':
            files.append(os.path.join(r, f))

for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        if 'TradePilot' not in content:
            continue
            
        # Search for initSystem
        idx = 0
        while True:
            idx = content.find("function initSystem", idx)
            if idx == -1:
                break
            snippet = content[idx:idx+1500]
            # Check if there is any '股票代號' or other clean chinese text in it
            if '股票' in snippet or '代號' in snippet or '名稱' in snippet:
                print(f"=== Found clean initSystem in {fpath} ===")
                print(snippet)
                print("="*80)
            idx += 19
    except Exception as e:
        pass
