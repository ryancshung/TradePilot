import os
import re
import json

# Search all folders in C:\Users\ryanhung\.gemini for transcript.jsonl
transcripts = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f == 'transcript.jsonl':
            transcripts.append(os.path.join(r, f))

print(f"Found {len(transcripts)} transcript files.")

best_code = ""
best_ver = ""
best_len = 0
best_file = ""

for t_path in transcripts:
    try:
        with open(t_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    # We look for steps from MODEL that contain javascript block with TradePilot
                    if data.get('source') == 'MODEL' and 'content' in data:
                        content = data['content']
                        if 'TradePilot' in content:
                            # Extract javascript code blocks
                            blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                            for b in blocks:
                                b_clean = b.strip()
                                # Look for TradePilot version
                                ver_match = re.search(r'TradePilot\s*-\s*Stock\s*Data\s*Management\s*System\s*\(v([0-9.]+)', b_clean)
                                ver = ver_match.group(1) if ver_match else "0.0"
                                if len(b_clean) > best_len:
                                    best_len = len(b_clean)
                                    best_code = b_clean
                                    best_ver = ver
                                    best_file = t_path
                except Exception as e:
                    pass
    except Exception as e:
        print(f"Error reading {t_path}: {e}")

print(f"Best code found in: {best_file}")
print(f"Version: {best_ver}, Length: {best_len}")

if best_code:
    output_path = r'd:\Vibecoding\TradePilot\scratch\full_clean_code.gs'
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write(best_code)
    print(f"Successfully wrote clean code to {output_path}")
else:
    print("Could not find any code blocks.")
