import os
import re

path = r'C:\Users\ryanhung\.gemini\antigravity\brain\605fa049-9c26-4536-97c6-7926c7569835\.system_generated\logs\overview.txt'

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Let's find all javascript blocks starting with TradePilot
blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
best_block = ""
for b in blocks:
    c = b.strip()
    if 'TradePilot - Stock Data' in c and len(c) > len(best_block) and 'step_index' not in c[:150]:
        best_block = c

print(f"Found best block of size: {len(best_block)}")
if best_block:
    with open(r'd:\Vibecoding\TradePilot\scratch\v4_clean_code.gs', 'w', encoding='utf-8') as out:
        out.write(best_block)
    print("Wrote clean code to scratch/v4_clean_code.gs")
