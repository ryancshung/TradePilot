import os
import re
import codecs

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
            content = f.read()
        
        if 'TradePilot' not in content:
            continue
            
        # overview.txt contains raw tool calls or steps where strings are JSON-escaped.
        # Let's extract any blocks of text that look like javascript code, but first
        # we can unescape the whole overview.txt content to make regex matching easy!
        
        # Unescape unicode escape sequences and newlines
        # A simple way to unescape is to wrap it in a json array or just use codecs.escape_decode
        try:
            # We can find all occurrences of "CodeContent":"..." in the file, which are written by write_to_file
            matches = re.finditer(r'"CodeContent"\s*:\s*"((?:[^"\\]|\\.)*)"', content)
            for m in matches:
                escaped_code = m.group(1)
                # Unescape using bytes decode
                try:
                    # Replace double backslashes and escaped quotes
                    raw_bytes = escaped_code.encode('utf-8')
                    unescaped_code = raw_bytes.decode('unicode-escape')
                    
                    if 'TradePilot' in unescaped_code and len(unescaped_code) > best_len:
                        best_len = len(unescaped_code)
                        best_code = unescaped_code
                        best_file = o_path
                        # extract version
                        ver_match = re.search(r'TradePilot\s*-\s*Stock\s*Data\s*Management\s*System\s*\(v([0-9.]+)', unescaped_code)
                        best_ver = ver_match.group(1) if ver_match else "0.0"
                except Exception as e:
                    # Fallback unescape
                    pass
        except Exception as e:
            print("Regex finditer error:", e)
            
    except Exception as e:
        print(f"Error reading {o_path}: {e}")

print(f"Best code found in: {best_file}")
print(f"Version: {best_ver}, Length: {best_len}")

if best_code:
    output_path = r'd:\Vibecoding\TradePilot\scratch\full_clean_code.gs'
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write(best_code)
    print(f"Successfully wrote clean code to {output_path}")
    
    # Also find and print the headers or columns definitions in this best code!
    print("\n--- Analysing Columns in the Code ---")
    # Look for CONFIG or dbHeaders or setHeaders
    db_headers_match = re.search(r'const\s+dbHeaders\s*=\s*\[(.*?)\]', best_code, re.DOTALL)
    if db_headers_match:
        print("Found dbHeaders definition:")
        print(db_headers_match.group(0))
    else:
        # Search for any array like structure inside initSystem
        init_idx = best_code.find("function initSystem")
        if init_idx != -1:
            print("Found initSystem function:")
            print(best_code[init_idx:init_idx+1500])
else:
    print("Could not find any code blocks in overview.txt files.")
