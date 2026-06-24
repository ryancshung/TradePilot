import os
import re
import json

path = r'C:\Users\ryanhung\.gemini\antigravity\brain\605fa049-9c26-4536-97c6-7926c7569835\.system_generated\logs\overview.txt'

try:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            if 'content' in data:
                content = data['content']
                if 'importStockCSV' in content:
                    blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                    for b_idx, b in enumerate(blocks):
                        c = b.strip()
                        # Unescape code
                        try:
                            # If it has literal \\n, decode it
                            c_decoded = c.encode('utf-8').decode('unicode-escape')
                        except Exception:
                            c_decoded = c
                        
                        print(f"Line {idx}, Block {b_idx}: {len(c_decoded)} bytes")
                        if 'importStockCSV' in c_decoded:
                            out_path = f'd:\\Vibecoding\\TradePilot\\scratch\\v4_clean_code.gs'
                            with open(out_path, 'w', encoding='utf-8') as out:
                                out.write(c_decoded)
                            print(f"Wrote clean code of length {len(c_decoded)} to {out_path}")
        except Exception as e:
            print(f"Line {idx} error: {e}")
except Exception as e:
    print(f"File error: {e}")
