# -*- coding: utf-8 -*-
"""从原始 198x32 白底 LOGO 生成 8K 高清透明版 LOGO"""
import sys, os
from PIL import Image, ImageFilter, ImageOps

SRC = r"C:\Users\Administrator\AppData\Roaming\WPS 灵犀\paste\image_20260901_154630_d872f077.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "shiteng-logo.png")
TARGET_W = 7680  # 8K 宽
STEPS = [4, 4, 4, 3]  # 逐级放大倍数，乘积约 38.8x

def white_to_transparent(im, keep_alpha=255, blur=0.5):
    """白底转透明：越接近白色 alpha 越低，核心彩色像素强制不透明"""
    im = im.convert("RGBA")
    r, g, b, a = im.split()
    import math
    # 到白色的距离（0=纯白）
    dist = ImageChops_white_dist(im)
    # alpha = 255 处完全不透明
    na = a.point(lambda v: 255)  # 保留原 alpha 结构
    # 用距离图计算透明：纯白 -> 0，越有颜色越不透明
    import numpy as np
    rn = np.asarray(im.convert("RGB")).astype(np.float32)
    d = np.abs(rn - 255).sum(axis=2) / 3.0  # 0~255 平均距离
    # 平滑
    d = d / 255.0
    # 核心像素（有明显颜色）强制 alpha=255
    core = (d > 0.28).astype(np.float32)
    # 边缘过渡
    alpha_map = np.clip(d / 0.18, 0, 1) * 255
    alpha_map = np.where(core > 0, 255, alpha_map)
    na = Image.fromarray(alpha_map.astype(np.uint8), "L")
    return Image.merge("RGBA", (r, g, b, na))


def ImageChops_white_dist(im):
    from PIL import ImageChops
    # 近似距离：合成到黑底与白底差
    black_bg = Image.new("RGB", im.size, (0, 0, 0))
    white_bg = Image.new("RGB", im.size, (255, 255, 255))
    rgb = im.convert("RGB")
    d1 = ImageChops.difference(rgb, white_bg).convert("L")
    return d1


def upscale(im, target_w):
    """多次 Lanczos 逐级放大 + 每级轻微锐化"""
    cur = im
    cur_w = cur.width
    for step in STEPS:
        cur = cur.resize((cur.width * step, cur.height * step), Image.LANCZOS)
        cur = cur.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))
    # 最后一次精确到目标宽
    if cur.width != target_w:
        ratio = target_w / cur.width
        cur = cur.resize((target_w, round(cur.height * ratio)), Image.LANCZOS)
    return cur


def main():
    src = Image.open(SRC).convert("RGBA")
    print("src:", src.size, src.mode)
    # 白底转透明
    transp = white_to_transparent(src)
    # 放大到 8K
    big = upscale(transp, TARGET_W)
    # 最终锐化
    big = big.filter(ImageFilter.UnsharpMask(radius=3, percent=160, threshold=2))
    big.save(OUT, "PNG")
    print("saved:", OUT, big.size, big.mode)
    # 校验透明角落
    px = big.getpixel((2, 2))
    print("corner px:", px)


if __name__ == "__main__":
    main()
