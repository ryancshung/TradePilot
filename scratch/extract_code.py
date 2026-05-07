import json
import os

log_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\8d9ed907-0103-42d8-b310-664271d3becb\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":133' in line:
            data = json.loads(line)
            print(data['content'])
            break
