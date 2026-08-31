# -*- coding: utf-8 -*-
"""
获取本机局域网 IPv4 地址（用于 APK 连接电脑后端的 VITE_API_BASE 注入）。
优先用 UDP socket 探测出口 IP；失败则解析 ipconfig 输出兜底。
"""
import socket
import re
import subprocess


def _valid(ip):
    if not ip:
        return False
    if ip.startswith('127.'):
        return False
    if ip.startswith('169.254.'):
        return False
    return True


def get_lan_ip():
    # 方法1：UDP socket 探测本机出口 IP（不实际发送数据包）
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        if _valid(ip):
            return ip
    except Exception:
        pass
    finally:
        s.close()

    # 方法2：解析 ipconfig 输出兜底
    try:
        out = subprocess.check_output(
            ['ipconfig'], shell=True, text=True, errors='ignore')
        for m in re.finditer(r'IPv4[^:]*:\s*([\d.]+)', out):
            ip = m.group(1)
            if _valid(ip):
                return ip
    except Exception:
        pass

    return '127.0.0.1'


if __name__ == '__main__':
    print(get_lan_ip())
