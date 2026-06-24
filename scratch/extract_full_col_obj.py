import os
import re

overview_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\a746b07c-bb7c-4b67-b1b8-7cea15392eb5\.system_generated\logs\overview.txt'

try:
    with open(overview_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Let's search for: const col = {
    # and match the matching curly braces
    matches = re.finditer(r'const\s+col\s*=\s*\{', content)
    for m in matches:
        start = m.start()
        # Find the matching closing brace '}'
        # We can just take a large chunk of 1000 characters and find the first '}'
        # (or just print the chunk since it's small)
        snippet = content[start:start+1200]
        # Clean up escapes
        snippet = snippet.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")
        print("=== Found col definition ===")
        print(snippet)
        print("="*50)
except Exception as e:
    print("Error:", e)
