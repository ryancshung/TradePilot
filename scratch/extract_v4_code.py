import os
import json
import re

overview_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\605fa049-9c26-4536-97c6-7926c7569835\.system_generated\logs\overview.txt'
out_path = r'd:\Vibecoding\TradePilot\scratch\v4_clean_code.gs'

try:
    with open(overview_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Let's search for CodeContent inside JSON lines
    matches = re.finditer(r'"CodeContent"\s*:\s*"((?:[^"\\]|\\.)*)"', content)
    best_len = 0
    best_code = ""
    for m in matches:
        escaped_code = m.group(1)
        try:
            # Decode using unicode_escape
            raw_bytes = escaped_code.encode('utf-8')
            unescaped = raw_bytes.decode('unicode-escape')
            if 'TradePilot' in unescaped and len(unescaped) > best_len:
                best_len = len(unescaped)
                best_code = unescaped
        except Exception as e:
            pass
            
    if best_code:
        with open(out_path, 'w', encoding='utf-8') as out:
            out.write(best_code)
        print(f"Successfully wrote {best_len} chars to {out_path}")
        
        # Analyze columns in this v4 code!
        print("--- Headers Analysis ---")
        db_headers_match = re.search(r'const\s+dbHeaders\s*=\s*\[(.*?)\]', best_code, re.DOTALL)
        if db_headers_match:
            print("FOUND dbHeaders:")
            print(db_headers_match.group(0))
        else:
            # Search for any array like structure inside initSystem
            init_idx = best_code.find("function initSystem")
            if init_idx != -1:
                print("FOUND initSystem body:")
                print(best_code[init_idx:init_idx+1500])
    else:
        print("Could not find any CodeContent in this file.")
except Exception as e:
    print("Error:", e)
