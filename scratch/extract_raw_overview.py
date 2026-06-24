import os
import re

path = r'C:\Users\ryanhung\.gemini\antigravity\brain\605fa049-9c26-4536-97c6-7926c7569835\.system_generated\logs\overview.txt'

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Let's find all javascript blocks
blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
print(f"Found {len(blocks)} blocks raw.")

for idx, b in enumerate(blocks):
    c = b.strip()
    # Check if this block contains our core function
    if 'importStockCSV' in c:
        # Detect if it's JSON escaped (contains literal \\n and very few actual newlines)
        actual_newlines = c.count('\n')
        literal_newlines = c.count('\\n')
        print(f"Block {idx}: length={len(c)}, actual_newlines={actual_newlines}, literal_newlines={literal_newlines}")
        
        if literal_newlines > actual_newlines:
            print("Decoding escaped JSON string...")
            try:
                # We can wrap in double quotes and use json.loads to decode it cleanly
                # But since it has unescaped quotes, we can do a simple unicode_escape or replace
                # Actually, let's do unicode_escape
                c_clean = c.encode('utf-8').decode('unicode-escape')
            except Exception as e:
                # Fallback: manually replace common escapes
                c_clean = c.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
        else:
            c_clean = c
            
        print(f"Decoded Block {idx}: length={len(c_clean)}")
        if len(c_clean) > 2000:
            out_path = r'd:\Vibecoding\TradePilot\scratch\v4_clean_code.gs'
            with open(out_path, 'w', encoding='utf-8') as out:
                out.write(c_clean)
            print(f"Wrote clean code of length {len(c_clean)} to {out_path}")
            break
