# Bundled Korean PDF font

`NotoSansKR-Regular.ttf` is a static weight-400 instance of Google Fonts'
Noto Sans KR variable TTF. It is loaded only when a visitor exports a
conversation PDF. The source is
[`ofl/notosanskr/NotoSansKR[wght].ttf`](https://github.com/google/fonts/blob/4efc2774c63917927efe769ca845def6bd6debae/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf)
at Google Fonts commit `4efc2774c63917927efe769ca845def6bd6debae`.
Source SHA-256:
`194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252`.

The source uses the SIL Open Font License 1.1, copied in [`OFL.txt`](OFL.txt).
The derived family is named `Noto Sans KR`; style and typographic subfamily
are both `Regular` (name IDs 2 and 17), and the PostScript name is
`NotoSansKR-Regular`. The static asset has no variation table and its weight
class is 400. Final asset SHA-256:
`df6907bd771f7f7bc161640325cc125c25da43e084b2b497c2f659e42e2b206d`.

To reproduce, download the linked source to `NotoSansKR-variable.ttf`, verify
its SHA-256, install `fonttools==4.65.0`, then run this from the repository root:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("NotoSansKR-variable.ttf", recalcTimestamp=False)
instantiateVariableFont(font, {"wght": 400}, inplace=True)
for name in font["name"].names:
    if name.nameID in (1, 4, 16):
        name.string = "Noto Sans KR".encode(name.getEncoding())
    elif name.nameID in (2, 17):
        name.string = "Regular".encode(name.getEncoding())
    elif name.nameID == 6:
        name.string = "NotoSansKR-Regular".encode(name.getEncoding())
font["head"].modified = font["head"].created
font.recalcTimestamp = False
font.save("public/fonts/NotoSansKR-Regular.ttf")
```

Geist Sans and Geist Mono are served from the pinned `geist` npm package, which
ships its own `LICENSE.txt` under the same font license. The application
imports their local Next.js font definitions and does not download fonts while
building.
