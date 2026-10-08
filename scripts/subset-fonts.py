"""
Make the site's web fonts small: keep only the characters the site uses (plus all of Latin-1, for safety)
and only the weights the design uses. Reads the full fonts in fonts-src/, writes fonts/*.woff2 and
fonts/coverage.json (the characters every font covers, checked by tests/fonts.test.js).

Run after adding text with new characters:  pip install fonttools brotli && python3 scripts/subset-fonts.py
"""
import glob, json, os
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# file name -> weight range kept (the design uses 400 / 500 / 600; code uses 400 / 500)
FONTS = {
    "source-sans-3-latin-wght-normal": (400, 600), "source-sans-3-latin-wght-italic": (400, 600),
    "newsreader-latin-wght-normal": (400, 600), "newsreader-latin-wght-italic": (400, 600),
    "jetbrains-mono-latin-wght-normal": (400, 500),
}
FEATURES = ["kern", "liga", "calt", "tnum", "pnum", "lnum", "onum", "case", "ccmp", "locl", "mark", "mkmk"]

def site_text():
    chars = set(chr(c) for c in range(0x20, 0x7F)) | set(chr(c) for c in range(0xA0, 0x100))  # ASCII + Latin-1
    chars |= set("“”‘’–—…•→←↑↓·×≈≤≥€°±")
    sources = ["index.html", "scripts/guides.js", "scripts/pages.js", "scripts/build-site.js"] + glob.glob(os.path.join(ROOT, "js", "**", "*.js"), recursive=True)
    for f in sources:
        with open(os.path.join(ROOT, f), encoding="utf8") as fh:
            chars |= set(fh.read())
    return "".join(sorted(c for c in chars if 0x20 <= ord(c) < 0x2E80))

def main():
    text = site_text()
    coverage = {}
    for name, (lo, hi) in FONTS.items():
        font = TTFont(os.path.join(ROOT, "fonts-src", name + ".woff2"), lazy=False)
        opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = FEATURES; opts.name_IDs = ["*"]; opts.notdef_outline = True
        sub = subset.Subsetter(opts); sub.populate(text=text); sub.subset(font)
        font = instancer.instantiateVariableFont(font, {"wght": (lo, hi)})
        font.flavor = "woff2"
        out = os.path.join(ROOT, "fonts", name + ".woff2")
        font.save(out)
        coverage[name] = "".join(sorted(chr(c) for c in font.getBestCmap()))
        print(f"{name}: {os.path.getsize(out) // 1024} KB, weights {lo}-{hi}")
    with open(os.path.join(ROOT, "fonts", "coverage.json"), "w", encoding="utf8") as fh:
        json.dump(coverage, fh, ensure_ascii=False, indent=0)

if __name__ == "__main__":
    main()
