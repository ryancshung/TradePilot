import json
import os

log_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\8d9ed907-0103-42d8-b310-664271d3becb\.system_generated\logs\overview.txt'
output_path = r'd:\Vibecoding\TradePilot\scratch\Code.gs'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":133' in line:
            data = json.loads(line)
            content = data['content']
            # Find the first ```javascript block
            start_marker = "```javascript"
            end_marker = "```"
            start_idx = content.find(start_marker)
            if start_idx != -1:
                start_idx += len(start_marker)
                end_idx = content.find(end_marker, start_idx)
                if end_idx != -1:
                    code = content[start_idx:end_idx].strip()
                    with open(output_path, 'w', encoding='utf-8') as out:
                        out.write(code)
            break
