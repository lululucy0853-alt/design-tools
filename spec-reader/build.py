# -*- coding: utf-8 -*-
"""把一份数据 + 模板拼成可双击打开的看板。
用法: python build.py <数据.js|json> <输出.html>
数据格式见 README 或 skill 的 references/board-schema.md
"""
import sys, io, os
here = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 3:
    print(__doc__); sys.exit(1)
tpl = io.open(os.path.join(here,'board-template.html'), encoding='utf-8').read()
data = io.open(sys.argv[1], encoding='utf-8').read().strip()
if data.endswith(';'): data = data[:-1]
if '/*__DATA__*/' not in tpl:
    print('模板里找不到 /*__DATA__*/ 占位'); sys.exit(2)
out = tpl.replace('/*__DATA__*/', data)
io.open(sys.argv[2], 'w', encoding='utf-8').write(out)
print('OK ->', sys.argv[2], len(out), 'bytes')
