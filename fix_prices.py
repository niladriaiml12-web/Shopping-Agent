import re
import os

DB_PATH = "setup_db.py"

with open(DB_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

count = 0
def repl(m):
    global count
    count += 1
    new_price = round(float(m.group(2)) * 94, 2)
    return f'{m.group(1)}{new_price}{m.group(3)}'

# The regex targets lines like: (1, "Organic Raw Honey", "honey", 14.99, "Pure organic raw honey...", 1)
# group 1: (id, "name", "cat", 
# group 2: price
# group 3: , "desc", is_organic)
regex = r'(\(\d+,\s*"[^"]+",\s*"[^"]+",\s*)(\d+(?:\.\d+)?)(,\s*"[^"]+",\s*\d+\))'
new_content = re.sub(regex, repl, content)

with open(DB_PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Matched and replaced {count} prices.")
