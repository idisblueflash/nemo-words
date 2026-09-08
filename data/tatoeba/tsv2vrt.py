import sys, re
tok = re.compile(r"\w+|[^\w\s]", re.UNICODE)
out = open("data/tatoeba/eng.vrt", "w", encoding="utf-8")
n = 0
with open("data/tatoeba/eng_sentences.tsv", encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 3:
            continue
        sid, _lang, text = parts[0], parts[1], parts[2]
        toks = tok.findall(text)
        if not toks:
            continue
        out.write(f'<s id="{sid}">\n')
        for t in toks:
            out.write(t.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;") + "\n")
        out.write("</s>\n")
        n += 1
out.close()
print("sentences:", n)
