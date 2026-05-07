import json

log_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\8d9ed907-0103-42d8-b310-664271d3becb\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if '133' in line and '"step_index"' in line:
            with open(r'd:\Vibecoding\TradePilot\scratch\line_133.json', 'w', encoding='utf-8') as out:
                out.write(line)
            break
