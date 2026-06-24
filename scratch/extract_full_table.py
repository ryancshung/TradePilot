import os
import json

overview_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\a746b07c-bb7c-4b67-b1b8-7cea15392eb5\.system_generated\logs\overview.txt'
out_path = r'd:\Vibecoding\TradePilot\scratch\full_table.txt'

try:
    with open(overview_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if 'TradePilot 欄位定義對照表' in line:
                try:
                    data = json.loads(line)
                    content = data.get('content', '')
                    if content:
                        with open(out_path, 'w', encoding='utf-8') as out:
                            out.write(content)
                        print("Successfully wrote full content to scratch/full_table.txt")
                        break
                except Exception as e:
                    print("JSON parse error on matching line:", e)
except Exception as e:
    print("Error:", e)
