# -*- coding: utf-8 -*-
"""将 src 下所有 text-[Npx] 字号统一减 2px（占位符法防链式误替换）"""
import io
import re

FILES = [
    'src/App.jsx',
    'src/components/ItemModal.jsx',
    'src/components/RackCard.jsx',
    'src/components/SearchBar.jsx',
    'src/components/ZoneModal.jsx',
    'src/components/ZoneTabs.jsx',
    'src/index.css',
]

# 目标字号 -> 新字号
MAP = {20: 18, 18: 16, 17: 15, 22: 20, 31: 29, 33: 31, 19: 17}

PAT = re.compile(r'text-\[(\d+)px\]')


def shift(m):
    n = int(m.group(1))
    return f'text-[{MAP.get(n, n)}px]'


for f in FILES:
    with io.open(f, encoding='utf-8', newline='') as fh:
        content = fh.read()
    # 先记录替换次数（用占位符法：先全部换为特殊 token，再换回最终值）
    placeholders = {}
    for old, new in MAP.items():
        placeholders[old] = f'__FS{old}__'
    tmp = content
    for old, ph in placeholders.items():
        tmp = tmp.replace(f'text-[{old}px]', ph)
    for old, new in MAP.items():
        tmp = tmp.replace(placeholders[old], f'text-[{new}px]')
    count = content.count('text-[') - tmp.count('text-[') + tmp.count('text-[')
    # 统计实际变化的数量
    changed = sum(content.count(f'text-[{old}px]') for old in MAP)
    if tmp != content:
        with io.open(f, 'w', encoding='utf-8', newline='') as fh:
            fh.write(tmp)
    print(f'{f}: 替换 {changed} 处')
