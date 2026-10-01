# Vérifie les exigences d'installation Android 11+ : resources.arsc non compressé et aligné sur 4 octets.
import sys, zipfile, struct
f = sys.argv[1]; z = zipfile.ZipFile(f); raw = open(f,'rb').read(); bad = 0
for i in z.infolist():
    off = i.header_offset; n, e = struct.unpack('<HH', raw[off+26:off+30]); data = off + 30 + n + e
    if i.filename == 'resources.arsc':
        ok = i.compress_type == 0 and data % 4 == 0
        print('resources.arsc', 'stocké' if i.compress_type == 0 else 'COMPRESSÉ', 'aligné' if data % 4 == 0 else 'NON ALIGNÉ'); bad |= not ok
    elif i.compress_type == 0 and data % 4: print('non aligné :', i.filename); bad = 1
sys.exit(1 if bad else 0)
