from pathlib import Path
import re

root = Path('/home/ubuntu/travelumrohbonang')
print('=== DRIZZLE REFERENCES ===')
for path in sorted((root / 'lib/db/src/schema').glob('*.ts')):
    text = path.read_text(errors='ignore')
    for line_no, line in enumerate(text.splitlines(), 1):
        if '.references(' in line:
            print(f'{path.relative_to(root)}:{line_no}: {line.strip()}')

print('\n=== SQL REFERENCES ===')
for path in sorted((root / 'supabase/migrations').glob('*.sql')):
    text = path.read_text(errors='ignore')
    for match in re.finditer(r'(?im)^\s*([A-Za-z_][\w]*)\s+([A-Za-z]+(?:\s*\([^)]*\))?)\s+[^\n]*REFERENCES\s+([A-Za-z_][\w]*)\s*\(([^)]+)\)', text):
        print(f'{path.name}:{text.count(chr(10), 0, match.start()) + 1}: child={match.group(1)} type={match.group(2)} parent={match.group(3)}.{match.group(4).strip()}')

print('\n=== TYPE SIGNALS ===')
for path in sorted((root / 'lib/db/src/schema').glob('*.ts')):
    text = path.read_text(errors='ignore')
    for line_no, line in enumerate(text.splitlines(), 1):
        if any(token in line for token in ['uuid(', 'text(', 'varchar(', 'integer(']) and ('id' in line.lower() or 'Id' in line):
            print(f'{path.relative_to(root)}:{line_no}: {line.strip()}')
