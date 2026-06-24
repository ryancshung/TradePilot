import os
import re

files = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f == 'overview.txt':
            files.append(os.path.join(r, f))

# We will read as raw bytes to avoid any decoding loss
for fpath in files:
    try:
        with open(fpath, 'rb') as f:
            content_bytes = f.read()
        
        if b'TradePilot' not in content_bytes:
            continue
            
        # Let's search for dbHeaders in bytes
        # Pattern: const dbHeaders = [ or dbHeaders = [
        # In bytes: b'dbHeaders' ... b'['
        idx = content_bytes.find(b'dbHeaders')
        if idx != -1:
            # Get a snippet of 2000 bytes
            snippet = content_bytes[idx:idx+2000]
            print(f"=== Raw bytes from {fpath} ===")
            
            # Let's try to decode using different encodings
            encodings = ['utf-8', 'big5', 'gbk', 'utf-16', 'latin-1']
            for enc in encodings:
                try:
                    decoded = snippet.decode(enc, errors='replace')
                    # If we find Chinese stock words, it's likely the correct one!
                    if '最高' in decoded or '最低' in decoded or '觀察' in decoded or '股票' in decoded:
                        print(f"[{enc}] Success:")
                        print(decoded[:800])
                        print("-" * 30)
                except Exception as e:
                    pass
    except Exception as e:
        pass
