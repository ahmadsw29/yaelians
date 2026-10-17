from pathlib import Path
import fitz

out = Path("generated-artifacts/pdf-inspection")
out.mkdir(parents=True, exist_ok=True)
for path in sorted(Path("attached_assets").glob("*1792232907717.pdf")):
    doc = fitz.open(path)
    print(path.name, "pages:", len(doc), "text chars:", sum(len(p.get_text()) for p in doc))
    (out / (path.stem + ".txt")).write_text("\n\f\n".join(p.get_text() for p in doc))
    if path.name.startswith("B17"):
        doc[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(str(out / "first-page.png"))
        doc[-1].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(str(out / "last-page.png"))
