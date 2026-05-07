import json

log_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\8d9ed907-0103-42d8-b310-664271d3becb\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '133' in line and '"step_index"' in line:
            print(f"Found at line {i}")
            try:
                data = json.loads(line)
                content = data.get('content', '')
                print(f"Content length: {len(content)}")
                # Find javascript block
                start_marker = "```javascript"
                idx = content.find(start_marker)
                if idx != -1:
                    code_start = idx + len(start_marker)
                    code_end = content.find("```", code_start)
                    if code_end != -1:
                        code = content[code_start:code_end].strip()
                        with open(r'd:\Vibecoding\TradePilot\scratch\Code.gs', 'w', encoding='utf-8') as out:
                            out.write(code)
                        print("File written successfully")
                    else:
                        print("End marker not found")
                else:
                    print("Start marker not found")
            except Exception as e:
                print(f"Error parsing: {e}")
            break
