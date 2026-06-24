import os
import re

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
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
        for b in blocks:
            c = b.strip()
            if 'importStockCSV' in c:
                # Detect and unescape
                actual_nl = c.count('\n')
                literal_nl = c.count('\\n')
                if literal_nl > actual_nl:
                    c_clean = c.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
                else:
                    c_clean = c
                
                # Filter out blocks that have truncated logs inside
                if '{"step_index":' in c_clean or 'USER_EXPLICIT' in c_clean:
                    continue
                    
                if len(c_clean) > best_len:
                    best_len = len(c_clean)
                    best_code = c_clean
                    best_file = path
    except Exception as e:
        print(f"Error on {path}: {e}")

print(f"Absolute best clean code found: {best_len} characters in {best_file}")
if best_code:
    out_path = r'd:\Vibecoding\TradePilot\scratch\v4_clean_code.gs'
    with open(out_path, 'w', encoding='utf-8') as out:
        out.write(best_code)
    print(f"Wrote clean best code to {out_path}")
