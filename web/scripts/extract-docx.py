import sys
import zipfile
import xml.etree.ElementTree as ET

path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read("word/document.xml"))

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
paras = []
for p in root.iter(W + "p"):
    text = "".join(t.text or "" for t in p.iter(W + "t"))
    if text.strip():
        paras.append(text)

print("PARAS", len(paras))
for i, line in enumerate(paras):
    print(f"{i + 1:03d}|{line}")
