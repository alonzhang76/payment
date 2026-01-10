#!/usr/bin/env python3
"""
简单的HTTP代理服务器，用于绕过CORS限制访问NAS数据
运行方式: python proxy.py
然后收支表.html中使用: http://localhost:8000/proxy?url=http://192.168.31.2:5005/DataBackup/收支表备份_2026-01-05.json
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request
import base64
import json

# 配置
NAS_HOST = '192.168.31.2'
NAS_PORT = 5005
PROXY_PORT = 8000
USERNAME = 'it'
PASSWORD = 'Aalon2601'

class ProxyHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        """处理GET请求"""
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)

        if parsed_path.path == '/proxy':
            # 获取目标URL
            target_url = params.get('url', [None])[0]

            if not target_url:
                self.send_error(400, 'Missing url parameter')
                return

            try:
                # 构建认证头
                auth_string = base64.b64encode(f'{USERNAME}:{PASSWORD}'.encode()).decode()

                # 创建请求
                req = urllib.request.Request(
                    target_url,
                    headers={
                        'Authorization': f'Basic {auth_string}',
                        'Accept': '*/*'
                    }
                )

                # 发送请求
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = response.read()

                    # 发送响应
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
                    self.end_headers()
                    self.wfile.write(data)

            except Exception as e:
                self.send_error(502, f'代理请求失败: {str(e)}')
        else:
            self.send_error(404, 'Not Found')

    def do_OPTIONS(self):
        """处理预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f'[代理] {args[0]}')

def run_server():
    """启动代理服务器"""
    server_address = ('', PROXY_PORT)
    httpd = HTTPServer(server_address, ProxyHandler)
    print(f'✅ 代理服务器已启动!')
    print(f'   访问地址: http://localhost:{PROXY_PORT}/proxy?url=<NAS_URL>')
    print(f'   示例: http://localhost:{PROXY_PORT}/proxy?url=http://{NAS_HOST}:{NAS_PORT}/DataBackup/收支表备份_2026-01-05.json')
    print(f'\n按 Ctrl+C 停止服务器')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
