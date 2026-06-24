with open(r'd:\Vibecoding\TradePilot\scratch\col_mapping.txt', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

with open(r'd:\Vibecoding\TradePilot\scratch\filtered_col_mapping.txt', 'w', encoding='utf-8') as out:
    for line in lines:
        if any(col in line for col in ['BF', 'BJ', '支撐', '壓力', '買入下緣', '買進觀察', '區間買進', '前-成交', '現-成交']):
            out.write(line)
