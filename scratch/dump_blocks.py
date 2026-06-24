import os
import re

path = r'C:\Users\ryanhung\.gemini\antigravity\brain\605fa049-9c26-4536-97c6-7926c7569835\.system_generated\logs\overview.txt'

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)

for i, b in enumerate(blocks):
    c = b.strip()
    
    # Check if it looks escaped and unescape it
    if c.count('\\n') > c.count('\n'):
        c_clean = c.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
    else:
        c_clean = c
        
    out_file = f'd:\\Vibecoding\\TradePilot\\scratch\\block_{i}.gs'
    with open(out_file, 'w', encoding='utf-8') as out:
        out.write(c_clean)
    
    snippet = c_clean[:120].replace('\n', ' ')
    print(f"Block {i}: {len(c_clean)} characters, path={out_file}")
    print(f"  Snippet: {snippet}")
    print("-" * 50)
