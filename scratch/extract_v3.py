import os

log_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\8d9ed907-0103-42d8-b310-664271d3becb\.system_generated\logs\overview.txt'
output_path = r'd:\Vibecoding\TradePilot\scratch\Code.gs'

with open(log_path, 'rb') as f:
    data = f.read()

# Find all occurrences of ```javascript
marker = b'```javascript'
indices = []
start = 0
while True:
    idx = data.find(marker, start)
    if idx == -1: break
    indices.append(idx)
    start = idx + 1

if indices:
    # Try the last few ones until we find a large block
    for idx in reversed(indices):
        code_start = idx + len(marker)
        code_end = data.find(b'```', code_start)
        if code_end != -1:
            code = data[code_start:code_end].strip()
            if len(code) > 2000: # Assuming the full script is large
                with open(output_path, 'wb') as out:
                    out.write(code)
                print(f"Extracted block of size {len(code)} from index {idx}")
                break
else:
    print("No blocks found")
