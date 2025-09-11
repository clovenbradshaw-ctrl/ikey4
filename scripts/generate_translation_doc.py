import re
from pathlib import Path
from bs4 import BeautifulSoup

ATTRS = ["placeholder", "title", "alt", "value", "aria-label", "label"]
files = ['index.html', 'dispatch.html', 'invite.html']
sections = {}

for file in files:
    content = Path(file).read_text(encoding='utf-8')
    soup = BeautifulSoup(content, 'html.parser')
    for script in soup(['script', 'style']):
        script.extract()
    lines = [s.strip() for s in soup.stripped_strings if re.search('[A-Za-z]', s)]
    # merge split quoted lines
    merged = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.endswith('"') and i + 1 < len(lines) and lines[i+1].startswith('"'):
            merged.append(line[:-1] + lines[i+1][1:])
            i += 2
        else:
            merged.append(line)
            i += 1
    lines = merged
    for tag in soup.find_all():
        for attr in ATTRS:
            val = tag.get(attr)
            if not val:
                continue
            candidates = val if isinstance(val, list) else [val]
            for v in candidates:
                if isinstance(v, str) and re.search('[A-Za-z]', v):
                    lines.append(v.strip())
    alerts = re.findall(r"alert\('([^']+)'\)", content)
    lines.extend(alerts)
    cleaned = []
    seen = set()
    for line in lines:
        line = line.replace('"', '')
        if '<' in line or '>' in line:
            continue
        if line.strip() and line not in seen:
            seen.add(line)
            cleaned.append(line)
    sections[file] = cleaned

with open('TRANSLATION_TERMS.md', 'w', encoding='utf-8') as f:
    f.write('# Translation Terms\n\n')
    f.write('List of user-visible strings requiring translation for full multilingual support.\n\n')
    for file, strings in sections.items():
        f.write(f'## {file}\n')
        for s in strings:
            f.write(f'- {s}\n')
        f.write('\n')
