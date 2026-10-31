# Fabrique plan-couleurs.xlsx : le plan de test avec des cases colorées dans l'onglet VMA (comme le fichier du coach).
import zipfile, re, sys, os
src = os.path.join(os.path.dirname(__file__), 'plan-test.xlsx'); dst = os.path.join(os.path.dirname(__file__), 'plan-couleurs.xlsx')
zin = zipfile.ZipFile(src); zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
fills = ['<fill><patternFill patternType="solid"><fgColor rgb="FFBFBFBF"/></patternFill></fill>',   # 2 gris clair (fond)
         '<fill><patternFill patternType="solid"><fgColor rgb="FF92D050"/></patternFill></fill>',   # 3 vert
         '<fill><patternFill patternType="solid"><fgColor indexed="13"/></patternFill></fill>',     # 4 jaune (indexé)
         '<fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/></patternFill></fill>',   # 5 rouge
         '<fill><patternFill patternType="solid"><fgColor theme="1" tint="0.34998626667073579"/></patternFill></fill>']  # 6 gris foncé (thème)
def style(s):
    s = re.sub(r'<fills count="\d+">(.*?)</fills>', lambda m: '<fills count="%d">%s%s</fills>' % (2 + len(fills), m.group(1), ''.join(fills)), s, flags=re.S)
    xfs = ''.join('<xf numFmtId="0" fontId="0" fillId="%d" borderId="0" applyFill="1" xfId="0"/>' % f for f in range(2, 7))
    return re.sub(r'<cellXfs count="1">(.*?)</cellXfs>', lambda m: '<cellXfs count="6">%s%s</cellXfs>' % (m.group(1), xfs), s, flags=re.S)
special = {'H7': 2, 'H8': 2, 'H9': 2, 'H10': 2, 'G28': 3, 'D32': 4, 'B33': 5}   # index de style : 1 gris, 2 vert, 3 jaune, 4 rouge, 5 gris foncé
def sheet(s):
    def f(m):
        ref, col, row = m.group(1), m.group(2), int(m.group(3))
        st = special.get(ref, 1 if 5 <= row <= 34 and 'B' <= col <= 'K' and len(col) == 1 else 0)
        return '<c r="%s" s="%d"' % (ref, st) if st else m.group(0)
    return re.sub(r'<c r="(([A-Z]+)(\d+))"', f, s)
for it in zin.infolist():
    data = zin.read(it.filename).decode('utf8') if it.filename.endswith('.xml') else zin.read(it.filename)
    if it.filename == 'xl/styles.xml': data = style(data)
    if it.filename == 'xl/worksheets/sheet14.xml': data = sheet(data)
    zout.writestr(it, data)
zout.close(); print('écrit', dst)
