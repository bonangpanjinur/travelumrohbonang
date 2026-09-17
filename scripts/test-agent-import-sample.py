import csv
import re
from pathlib import Path

sample = Path('/tmp/agent-import-sample.csv')
sample.write_text('''nama,kode_agen,telepon,gender,alamat,email,branch_id,kode_cabang,komisi,status
Agen Valid Pusat,,081234567890,P,Jl. Pusat 1,valid@example.com,branch_pusat,VINS,0,Aktif
Agen Valid Plus,,+6281234567890,L,Jl. Pusat 2,branch_pusat,VINS,5,Aktif
Agen Invalid Phone,,0211234567,P,Jl. Salah 1,invalid@example.com,branch_pusat,VINS,0,Aktif
Agen Invalid Code,A003VINSU26,081234567891,P,Jl. Salah 2,wrong-code@example.com,branch_pusat,VINS,0,Aktif
''', encoding='utf-8')

phone_re = re.compile(r'^\+628\d{8,11}$')
code_re = re.compile(r'^A\d{3}[A-Z0-9]+\d{2}$')

def normalize_phone(raw):
    raw = raw.strip()
    cleaned = re.sub(r'[\s\-().]', '', raw)
    digits = re.sub(r'\D', '', cleaned[1:] if cleaned.startswith('+62') else cleaned)
    if digits.startswith('62'):
        return '+' + digits
    if digits.startswith('0'):
        return '+62' + digits[1:]
    if digits.startswith('8'):
        return '+62' + digits
    return '+' + digits

with sample.open(newline='', encoding='utf-8') as handle:
    rows = list(csv.DictReader(handle))

results = []
for row in rows:
    phone = normalize_phone(row['telepon'])
    phone_ok = phone_re.fullmatch(phone) is not None
    code = row['kode_agen'].strip()
    code_ok = not code or (code_re.fullmatch(code) is not None and 'VINSU' not in code)
    results.append((row['nama'], phone, phone_ok, code_ok))

assert results[0][1] == '+6281234567890' and results[0][2] and results[0][3]
assert results[1][1] == '+6281234567890' and results[1][2] and results[1][3]
assert not results[2][2]
assert not results[3][3]

print('SAMPLE_ROWS=', len(rows))
for name, phone, phone_ok, code_ok in results:
    print(f'{name}: normalized_phone={phone}, phone_valid={phone_ok}, code_valid={code_ok}')
print('RESULT=PASS')
