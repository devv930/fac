import PyPDF2
from pathlib import Path
path = Path('FAC 202 Arts and Technology_040837.pdf')
reader = PyPDF2.PdfReader(path)
print('pages', len(reader.pages))
for i, p in enumerate(reader.pages):
    print('--- PAGE', i+1, '---')
    text = p.extract_text()
    print(text or '[NO TEXT]')
