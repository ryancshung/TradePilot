import os
import re
import json

files = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f in ['overview.txt', 'transcript.jsonl']:
            files.append(os.path.join(r, f))

# Let's search for any array of strings in JavaScript or Python format
# e.g., ["...", "..."] or ['...', '...']
# We want arrays that contain common stock terms like '代號', '名稱', '日期', '收盤', etc.

keywords = ['代號', '名稱', '日期', '收盤', '成交量', '開盤']

for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines):
            # Check if line contains javascript array
            if any(k in line for k in keywords) and '[' in line and ']' in line:
                # Find all array-like structures [...]
                arrays = re.findall(r'(\[[^\]]+\])', line)
                for arr in arrays:
                    if len(arr) > 100 and any(k in arr for k in keywords):
                        print(f"File: {fpath} (Line {i+1})")
                        print(arr[:1000])
                        print("-" * 50)
    except Exception as e:
        pass
