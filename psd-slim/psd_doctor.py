# -*- coding: utf-8 -*-
"""
psd_doctor.py — PSD 卡顿体检器

不打开 Photoshop，直接读 PSD 二进制，告诉你这个文件为什么卡、重在哪、能省多少。

用法:
    python psd_doctor.py "某个文件.psd"
    python psd_doctor.py "某个文件.psd" --fast      # 跳过 alpha 解码(快，但查不出幽灵层)
    把 PSD 拖到 体检.bat 上也行

体检项:
    ① 幽灵层    图层标称边界撑满画布、实际内容却只有几十像素 —— 内存杀手
    ② 疯狂路径  矢量蒙版锚点上万 —— 重绘杀手
    ③ 兼容合成图 最大化兼容存下的整张合成图 —— 纯体积浪费
    ④ 嵌入智能对象 / 滤镜缓存 / 多余 Alpha 通道
"""
import struct, sys, os, collections

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

MB = 1024.0 * 1024.0
KNOT = frozenset((1, 2, 4, 5))
SUBPATH = frozenset((0, 3))
# PSB 里长度字段为 8 字节的键
BIGKEYS = frozenset(('LMsk Lr16 Lr32 Layr Mt16 Mt32 Mtrn Alph FMsk lnk2 FEid FXid '
                     'PxSD cinf CgEd Txt2 pths SoLd vmsk vsms vscg vogk artb artd '
                     'SoLE PlLd').split())


class Reader(object):
    def __init__(self, f):
        self.f = f

    def u8(self):  return struct.unpack('>B', self.f.read(1))[0]
    def u16(self): return struct.unpack('>H', self.f.read(2))[0]
    def i16(self): return struct.unpack('>h', self.f.read(2))[0]
    def u32(self): return struct.unpack('>I', self.f.read(4))[0]
    def i32(self): return struct.unpack('>i', self.f.read(4))[0]
    def u64(self): return struct.unpack('>Q', self.f.read(8))[0]


def parse_path_block(data):
    """数矢量路径的锚点数与子路径数"""
    if len(data) < 8:
        return 0, 0
    body = data[8:]
    knots = subs = 0
    for i in range(len(body) // 26):
        sel = struct.unpack_from('>H', body, i * 26)[0]
        if sel in KNOT:
            knots += 1
        elif sel in SUBPATH:
            subs += 1
    return knots, subs


def unpackbits(buf, out_len):
    """PackBits 解压"""
    out = bytearray(out_len)
    si = di = 0
    n = len(buf)
    while si < n and di < out_len:
        b = buf[si]; si += 1
        if b < 128:
            cnt = b + 1
            out[di:di + cnt] = buf[si:si + cnt]; si += cnt; di += cnt
        elif b > 128:
            cnt = 257 - b
            out[di:di + cnt] = bytes((buf[si],)) * cnt; si += 1; di += cnt
    return out


def analyze(path, fast=False):
    f = open(path, 'rb')
    r = Reader(f)
    size = os.path.getsize(path)

    if f.read(4) != b'8BPS':
        raise ValueError('不是 PSD/PSB 文件')
    ver = r.u16(); f.read(6)
    channels = r.u16(); H = r.u32(); W = r.u32(); depth = r.u16(); mode = r.u16()
    PSB = (ver == 2)
    usz = r.u64 if PSB else r.u32

    f.seek(r.u32(), 1)                       # color mode data
    irb_len = r.u32(); irb_end = f.tell() + irb_len
    dpi = None
    while f.tell() < irb_end - 4:
        if f.read(4) != b'8BIM':
            break
        rid = r.u16()
        n = r.u8(); f.read(n)
        if (n + 1) % 2:
            f.read(1)
        rl = r.u32(); start = f.tell()
        if rid == 1005:
            dpi = r.u32() / 65536.0
        f.seek(start + rl + (rl % 2))
    f.seek(irb_end)

    lm_len = usz(); lm_end = f.tell() + lm_len
    li_len = usz(); li_end = f.tell() + li_len
    lcount = abs(r.i16())

    layers = []
    for _ in range(lcount):
        top, left, bottom, right = r.i32(), r.i32(), r.i32(), r.i32()
        nch = r.u16()
        chans = [[r.i16(), usz()] for _ in range(nch)]
        f.read(4); blend = f.read(4).decode('latin1')
        opacity = r.u8(); clip = r.u8(); flags = r.u8(); f.read(1)
        visible = not (flags & 2)
        extra_len = r.u32(); extra_end = f.tell() + extra_len
        mlen = r.u32(); f.seek(mlen, 1)
        f.seek(r.u32(), 1)                   # blending ranges
        n = r.u8(); nm_b = f.read(n); p = (n + 1) % 4
        if p:
            f.read(4 - p)
        try:
            name = nm_b.decode('gbk')
        except Exception:
            name = nm_b.decode('latin1', 'replace')
        keys, knots, subs, vbytes, lsct = {}, 0, 0, 0, None
        while f.tell() < extra_end - 8:
            sig = f.read(4)
            if sig not in (b'8BIM', b'8B64'):
                break
            key = f.read(4).decode('latin1')
            alen = r.u64() if (PSB and key in BIGKEYS) else r.u32()
            start = f.tell()
            if key == 'luni':
                try:
                    name = f.read(r.u32() * 2).decode('utf-16-be', 'replace')
                except Exception:
                    pass
            elif key in ('vmsk', 'vsms'):
                f.seek(start)
                k, s = parse_path_block(f.read(alen))
                knots += k; subs += s; vbytes += alen
            elif key == 'lsct':
                f.seek(start); lsct = r.u32() if alen >= 4 else 0
            keys[key] = alen
            f.seek(start + alen)
        f.seek(extra_end)
        layers.append(dict(
            name=name, top=top, left=left, bottom=bottom, right=right,
            w=right - left, h=bottom - top, chans=chans, nch=nch,
            px=sum(c[1] for c in chans), blend=blend, opacity=opacity,
            clip=clip, visible=visible, mask=mlen > 0, keys=keys,
            knots=knots, subs=subs, vbytes=vbytes, lsct=lsct))

    # 图层通道数据的文件偏移
    off = f.tell()
    for L in layers:
        L['offsets'] = []
        for c in L['chans']:
            L['offsets'].append(off)
            off += c[1]

    # 组路径（PSD 自下而上存储，倒序遍历才对）
    stack = []
    for L in reversed(layers):
        if L['lsct'] in (1, 2):
            L['path'] = ' / '.join(stack) if stack else '(根)'
            stack.append(L['name'])
        elif L['lsct'] == 3:
            L['path'] = ''
            if stack:
                stack.pop()
        else:
            L['path'] = ' / '.join(stack) if stack else '(根)'

    # 全局附加数据
    f.seek(li_end)
    f.seek(r.u32(), 1)                       # global layer mask info
    glob = {}
    while f.tell() < lm_end - 12:
        sig = f.read(4)
        if sig not in (b'8BIM', b'8B64'):
            break
        key = f.read(4).decode('latin1')
        alen = r.u64() if (PSB and key in BIGKEYS) else r.u32()
        glob[key] = glob.get(key, 0) + alen
        f.seek(alen + (4 - alen % 4) % 4, 1)

    composite = size - lm_end

    # —— 幽灵层检测：解 alpha 通道求真实内容边界 ——
    ghosts = []
    if not fast:
        big = [L for L in layers
               if L['lsct'] is None and L['w'] * L['h'] >= 0.8 * W * H]
        for L in big:
            idx = next((i for i, c in enumerate(L['chans']) if c[0] == -1), None)
            if idx is None:
                continue
            h, w = L['h'], L['w']
            if h <= 0 or w <= 0:
                continue
            f.seek(L['offsets'][idx])
            comp = r.u16()
            if comp != 1:                    # 只处理 RLE（zip 压缩的跳过）
                continue
            rowlens = struct.unpack('>%dH' % h, f.read(h * 2))
            body = f.read(L['chans'][idx][1] - 2 - h * 2)
            p = 0
            minr = minc = None
            maxr = maxc = -1
            for row in range(h):
                rl = rowlens[row]
                line = unpackbits(body[p:p + rl], w); p += rl
                if any(line):
                    lo = next(i for i, v in enumerate(line) if v)
                    hi = w - 1 - next(i for i, v in enumerate(reversed(line)) if v)
                    if minr is None:
                        minr = row
                    maxr = row
                    minc = lo if minc is None else min(minc, lo)
                    maxc = max(maxc, hi)
            if minr is None:
                bw = bh = 0
            else:
                bw, bh = maxc - minc + 1, maxr - minr + 1
            ratio = (bw * bh) / float(w * h)
            if ratio < 0.5:
                mem = w * h * L['nch']
                ghosts.append(dict(L=L, bw=bw, bh=bh, ratio=ratio, mem=mem))

    return dict(size=size, W=W, H=H, depth=depth, channels=channels, PSB=PSB,
                dpi=dpi, layers=layers, glob=glob, composite=composite,
                lm_len=lm_len, ghosts=ghosts, name=os.path.basename(path),
                fast=fast)


def report(a):
    W, H, size = a['W'], a['H'], a['size']
    L = a['layers']
    px = sum(x['px'] for x in L)
    content = [x for x in L if x['lsct'] is None]
    heavy_paths = sorted([x for x in L if x['knots'] > 800], key=lambda x: -x['knots'])
    ghosts = sorted(a['ghosts'], key=lambda g: -g['mem'])

    print('=' * 78)
    print(' PSD 体检报告   %s' % a['name'])
    print('=' * 78)
    print(' 文件大小 %.1f MB      画布 %d x %d px (%.1f MPix)   %d-bit %s'
          % (size / MB, W, H, W * H / 1e6, a['depth'], 'PSB' if a['PSB'] else 'PSD'))
    print(' 图层 %d 个 (内容层 %d)   文档通道 %d%s'
          % (len(L), len(content), a['channels'],
             '  ← 多带 %d 个 Alpha 通道' % (a['channels'] - 3) if a['channels'] > 3 else ''))

    print('\n── 体积构成 ' + '─' * 63)
    rows = [('图层像素数据', px, '真内容'),
            ('兼容合成图', a['composite'], '整幅平面化预览(CC2019 存 8-bit PSD 必写,省不掉——2026-08-26 实测)'),
            ('矢量蒙版路径', sum(x['vbytes'] for x in L), '路径锚点数据'),
            ('嵌入智能对象', a['glob'].get('lnk2', 0) + a['glob'].get('lnkD', 0), '智能对象的原始文件'),
            ('滤镜特效缓存', a['glob'].get('FEid', 0) + a['glob'].get('FXid', 0), '智能滤镜留下的缓存'),
            ('图案预设', a['glob'].get('Patt', 0), '文档内嵌的图案')]
    for nm, b, note in rows:
        if b > 64 * 1024:
            print('   %-14s %8.1f MB  %4.0f%%   %s' % (nm, b / MB, b * 100.0 / size, note))

    print('\n── ① 幽灵层（边界撑满画布，实际内容极小）' + '─' * 34)
    if a['fast']:
        print('   [--fast 模式跳过了这项检测]')
    elif not ghosts:
        print('   没有。')
    else:
        tot_mem = sum(g['mem'] for g in ghosts)
        print('   %-14s %-12s %-12s %s' % ('图层名', '标称尺寸', '真实内容', '所在组'))
        for g in ghosts[:15]:
            x = g['L']
            print('   %-14s %-12s %-12s %s'
                  % (x['name'][:13], '%dx%d' % (x['w'], x['h']),
                     '%dx%d' % (g['bw'], g['bh']), x['path'][:30]))
        if len(ghosts) > 15:
            print('   …还有 %d 个' % (len(ghosts) - 15))
        print('   ▸ 这 %d 个层在内存里占 %.1f GB，每次滚动/落笔 PS 都要重算一遍。'
              % (len(ghosts), tot_mem / 1024.0 ** 3))
        print('   ▸ 重建边界后可降到几乎为零，且完全无损。')

    print('\n── ② 疯狂路径层（矢量蒙版锚点爆炸）' + '─' * 40)
    if not heavy_paths:
        print('   没有。')
    else:
        tot_k = sum(x['knots'] for x in L)
        hk = sum(x['knots'] for x in heavy_paths)
        print('   %-14s %10s %10s %-12s %s' % ('图层名', '锚点数', '子路径', '尺寸', '所在组'))
        for x in heavy_paths[:15]:
            print('   %-14s %10d %10d %-12s %s'
                  % (x['name'][:13], x['knots'], x['subs'],
                     '%dx%d' % (x['w'], x['h']), x['path'][:26]))
        if len(heavy_paths) > 15:
            print('   …还有 %d 个' % (len(heavy_paths) - 15))
        print('   ▸ 全文档 %d 个锚点，这 %d 个层就占 %.0f%%。'
              % (tot_k, len(heavy_paths), hk * 100.0 / max(tot_k, 1)))
        print('   ▸ 栅格化它们，重绘开销直接归零，视觉几乎无差。')

    print('\n── 建议 ' + '─' * 68)
    save = 0
    n = 1
    if ghosts:
        gp = sum(g['L']['px'] for g in ghosts)
        print('   %d. 重建 %d 个幽灵层的边界              省 %.0f MB + %.1f GB 内存'
              % (n, len(ghosts), gp / MB, sum(g['mem'] for g in ghosts) / 1024.0 ** 3)); n += 1
        save += gp
    if heavy_paths:
        vb = sum(x['vbytes'] for x in heavy_paths)
        print('   %d. 栅格化 %d 个疯狂路径层              省 %.0f MB + 重绘开销'
              % (n, len(heavy_paths), vb / MB)); n += 1
        save += vb
    lnk = a['glob'].get('lnk2', 0) + a['glob'].get('FEid', 0)
    if lnk > 4 * MB:
        print('   %d. (可选) 栅格化智能对象                省 %.0f MB' % (n, lnk / MB)); n += 1
    if a['channels'] > 3:
        print('   %d. (可选) 删掉多余的 Alpha 通道        每次刷新少算 %.0f MB'
              % (n, W * H * (a['channels'] - 3) / MB)); n += 1
    if save:
        print('\n   前几项做完 ≈ %.0f MB  →  %.0f MB   （画布不用动）'
              % (size / MB, (size - save) / MB))
    else:
        print('   这个文件没什么好清的。')
    print('=' * 78)


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    fast = '--fast' in sys.argv
    if not args:
        print(__doc__)
        sys.exit(1)
    for p in args:
        report(analyze(p, fast=fast))
        print()
