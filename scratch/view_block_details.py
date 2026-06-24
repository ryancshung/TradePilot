import os

with open(r'd:\Vibecoding\TradePilot\scratch\block_details.txt', 'w', encoding='utf-8') as out:
    for i in range(6):
        path = f'd:\\Vibecoding\\TradePilot\\scratch\\block_{i}.gs'
        if os.path.exists(path):
            size = os.path.getsize(path)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            snippet = content[:200].replace('\n', ' ')
            out.write(f"Block {i}: {size} bytes, path={path}\n")
            out.write(f"  Snippet: {snippet}\n")
            out.write("-" * 80 + "\n")
