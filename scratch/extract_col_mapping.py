import os

overview_path = r'C:\Users\ryanhung\.gemini\antigravity\brain\a746b07c-bb7c-4b67-b1b8-7cea15392eb5\.system_generated\logs\overview.txt'
out_path = r'd:\Vibecoding\TradePilot\scratch\col_mapping.txt'

try:
    with open(overview_path, 'rb') as f:
        data = f.read()
    
    idx = 0
    snippets = []
    while True:
        idx = data.find(b'dbHeaders.indexOf', idx)
        if idx == -1:
            break
        
        start = max(0, idx - 500)
        end = min(len(data), idx + 2000)
        snippet = data[start:end]
        
        try:
            decoded = snippet.decode('utf-8', errors='replace')
            snippets.append(decoded)
        except Exception as e:
            snippets.append(f"Decode error: {e}")
        
        idx += 17
        
    with open(out_path, 'w', encoding='utf-8') as out:
        for i, snip in enumerate(snippets):
            out.write(f"=== SNIPPET {i+1} ===\n")
            out.write(snip)
            out.write("\n" + "="*50 + "\n")
            
    print(f"Successfully wrote {len(snippets)} snippets to {out_path}")
except Exception as e:
    print("Error:", e)
