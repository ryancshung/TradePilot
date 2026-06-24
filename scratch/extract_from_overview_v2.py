import os
import json
import re

overviews = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f == 'overview.txt':
            overviews.append(os.path.join(r, f))

print(f"Found {len(overviews)} overview files.")

best_code = ""
best_ver = ""
best_len = 0
best_file = ""

for o_path in overviews:
    try:
        with open(o_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_idx, line in enumerate(f):
                if 'stock_db' not in line:
                    continue
                try:
                    # Let's parse this JSON line
                    data = json.loads(line)
                    
                    # 1. Search in content
                    content = data.get('content', '')
                    if content and 'TradePilot' in content:
                        blocks = re.findall(r'```javascript(.*?)```', content, re.DOTALL)
                        for b in blocks:
                            b_clean = b.strip()
                            if len(b_clean) > best_len:
                                best_len = len(b_clean)
                                best_code = b_clean
                                best_file = f"{o_path} (line {line_idx+1})"
                                ver_match = re.search(r'TradePilot\s*-\s*Stock\s*Data\s*Management\s*System\s*\(v([0-9.]+)', b_clean)
                                best_ver = ver_match.group(1) if ver_match else "0.0"
                                
                    # 2. Search in tool_calls
                    tool_calls = data.get('tool_calls', [])
                    for tc in tool_calls:
                        args = tc.get('args', {})
                        for arg_val in args.values():
                            if isinstance(arg_val, str) and 'TradePilot' in arg_val:
                                if len(arg_val) > best_len:
                                    best_len = len(arg_val)
                                    best_code = arg_val.strip()
                                    best_file = f"{o_path} (line {line_idx+1} tc)"
                                    ver_match = re.search(r'TradePilot\s*-\s*Stock\s*Data\s*Management\s*System\s*\(v([0-9.]+)', arg_val)
                                    best_ver = ver_match.group(1) if ver_match else "0.0"
                except Exception as e:
                    pass
    except Exception as e:
        print(f"Error reading {o_path}: {e}")

print(f"Best code found in: {best_file}")
print(f"Version: {best_ver}, Length: {best_len}")

if best_code:
    output_path = r'd:\Vibecoding\TradePilot\scratch\full_clean_code.gs'
    # Remove lines containing line numbers if it was formatted like that
    # The format might be "1: const CONFIG = ..."
    lines = best_code.split('\n')
    clean_lines = []
    for l in lines:
        m = re.match(r'^\s*\d+:\s*(.*)', l)
        if m:
            clean_lines.append(m.group(1))
        else:
            clean_lines.append(l)
    clean_code = '\n'.join(clean_lines)
    
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write(clean_code)
    print(f"Successfully wrote clean code to {output_path}")
    
    # Analyze headers in this code
    print("\n--- Analysing Columns ---")
    
    # 1. Search for dbHeaders array
    db_headers_match = re.search(r'const\s+dbHeaders\s*=\s*\[(.*?)\]', clean_code, re.DOTALL)
    if db_headers_match:
        print("FOUND dbHeaders:")
        print(db_headers_match.group(0))
    else:
        # Search for any array like structure inside initSystem
        init_idx = clean_code.find("function initSystem")
        if init_idx != -1:
            print("FOUND initSystem function body:")
            print(clean_code[init_idx:init_idx+2000])
        else:
            # Let's search for "headers = ["
            headers_match = re.search(r'headers\s*=\s*\[(.*?)\]', clean_code, re.DOTALL)
            if headers_match:
                print("FOUND headers:")
                print(headers_match.group(0))
            else:
                print("No headers match, printing first 2000 chars of code:")
                print(clean_code[:2000])
else:
    print("Could not find any code blocks.")
