import os
import re

files = []
for r, d, fs in os.walk(r'C:\Users\ryanhung\.gemini'):
    for f in fs:
        if f in ['overview.txt', 'transcript.jsonl']:
            files.append(os.path.join(r, f))

# Let's search for TradePilot and stock_db and find the initialization or header values.
# Usually headers are written inside a list like:
# const headers = [...] or values.push([...])
# We will search for 'stock_db' in the file. If found, we'll scan the surrounding lines or search for Chinese characters that represent columns.

for fpath in files:
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # We only care about TradePilot
        if 'TradePilot' not in content:
            continue
            
        print(f"=== Found TradePilot in {fpath} ===")
        
        # Let's find all Chinese string arrays or arrays that seem to have headers
        # We look for a pattern like: headers = [ ... ]
        # Or look for where columns/headers are set on the stock_db sheet.
        # Let's find occurrences of CONFIG.SHEETS.DB or "stock_db"
        # and print 300 characters around it
        matches = re.finditer(r'stock_db', content)
        for m in matches:
            start = max(0, m.start() - 200)
            end = min(len(content), m.end() + 2000)
            snippet = content[start:end]
            # Look for arrays like [ '...', '...' ] in this snippet
            arrays = re.findall(r'(\[[^\]]{50,1500}\])', snippet)
            for arr in arrays:
                if any(x in arr for x in ['代號', '名稱', '日期', '收盤', '成交量', '觀察日', '買進']):
                    # Clean json escape characters if any
                    clean_arr = arr.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")
                    print("Possible headers array:")
                    print(clean_arr)
                    print("="*40)
    except Exception as e:
        pass
