#!/usr/bin/env node
/**
 * 简单的HTTP代理服务器，用于绕过CORS限制访问NAS数据
 * 认证信息通过请求头从客户端传递，不存储在服务器端
 */

const http = require('http');
const url = require('url');

const NAS_HOST = '192.168.31.2';
const NAS_PORT = 5005;
const PROXY_PORT = 8000;

const server = http.createServer();

// 处理文件列表请求
async function handleListFiles(req, res) {
    try {
        // 获取认证信息
        let authHeader = req.headers['authorization'];
        if (!authHeader) {
            const username = req.headers['x-nas-username'];
            const password = req.headers['x-nas-password'];
            if (username && password) {
                authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
            }
        }

        // 使用PROPFIND请求列出DataBackup目录
        const options = {
            hostname: NAS_HOST,
            port: NAS_PORT,
            path: '/DataBackup/',
            method: 'PROPFIND',
            headers: {
                'Depth': '1',
                'Accept': '*/*'
            },
            timeout: 15000
        };

        if (authHeader) {
            options.headers['Authorization'] = authHeader;
        }

        const protocol = http;
        const proxyReq = protocol.request(options, (proxyRes) => {
            let responseData = '';
            
            proxyRes.on('data', (chunk) => {
                responseData += chunk;
            });
            
            proxyRes.on('end', () => {
                if (proxyRes.statusCode === 207) {
                    // 成功获取WebDAV目录列表
                    const files = parseWebDAVResponse(responseData);
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify(files));
                } else {
                    res.writeHead(proxyRes.statusCode, {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(`Failed to list files: ${proxyRes.statusCode} ${proxyRes.statusText}`);
                }
            });
        });

        proxyReq.on('error', (error) => {
            console.error(`[代理] 列出文件错误: ${error.message}`);
            res.writeHead(502, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(`Proxy error: ${error.message}`);
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.writeHead(504, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('Request timeout');
        });

        proxyReq.end();
    } catch (error) {
        console.error(`[代理] 处理文件列表请求错误: ${error.message}`);
        res.writeHead(500, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(`Server error: ${error.message}`);
    }
}

// 解析WebDAV PROPFIND响应，提取JSON文件信息
function parseWebDAVResponse(xmlData) {
    const files = [];
    
    // 简单的XML解析，提取文件名和修改时间
    const fileRegex = /<d:response>([\s\S]*?)<\/d:response>/g;
    let match;
    
    while ((match = fileRegex.exec(xmlData)) !== null) {
        const response = match[1];
        
        // 提取href
        const hrefRegex = /<d:href>(.*?)<\/d:href>/;
        const hrefMatch = response.match(hrefRegex);
        if (!hrefMatch) continue;
        
        const href = hrefMatch[1];
        if (!href.endsWith('.json')) continue;
        
        // 提取lastmodified
        const modifiedRegex = /<d:getlastmodified>(.*?)<\/d:getlastmodified>/;
        const modifiedMatch = response.match(modifiedRegex);
        const modified = modifiedMatch ? new Date(modifiedMatch[1]).toISOString() : null;
        
        // 提取文件名
        const fileName = href.split('/').pop();
        
        files.push({
            name: fileName,
            path: href,
            lastModified: modified,
            url: `http://${NAS_HOST}:${NAS_PORT}${href}`
        });
    }
    
    // 按修改时间排序，最新的在前面
    return files.sort((a, b) => {
        if (!a.lastModified) return 1;
        if (!b.lastModified) return -1;
        return new Date(b.lastModified) - new Date(a.lastModified);
    });
}

server.on('request', (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // 处理CORS预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-NAS-Username, X-NAS-Password'
        });
        res.end();
        return;
    }

    // 处理 /proxy 请求
    if (parsedUrl.pathname === '/proxy') {
        if (parsedUrl.query.action === 'list') {
            // 列出DataBackup文件夹中的JSON文件
            handleListFiles(req, res);
            return;
        } else if (parsedUrl.query.url) {
            // 代理请求到NAS
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing required parameter: url or action=list');
            return;
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
    }

    const targetUrl = parsedUrl.query.url;
    let urlObj;
    try {
        urlObj = new URL(targetUrl);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid URL');
        return;
    }

    // 获取客户端传递的认证信息
    // 优先使用 Authorization header，其次是自定义 header
    let authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        const username = req.headers['x-nas-username'];
        const password = req.headers['x-nas-password'];
        if (username && password) {
            authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
        }
    }

    const protocol = urlObj.protocol === 'https:' ? require('https') : http;
    const targetPort = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);

    const options = {
        hostname: urlObj.hostname,
        port: targetPort,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
            'Accept': '*/*'
        },
        timeout: 15000
    };

    // 如果有认证信息，添加到请求头
    if (authHeader) {
        options.headers['Authorization'] = authHeader;
    }

    const proxyReq = protocol.request(options, (proxyRes) => {
        // 设置CORS头
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Authorization, Content-Type, X-NAS-Username, X-NAS-Password';
        
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
        console.error(`[代理] 错误: ${error.message}`);
        try {
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`代理请求失败: ${error.message}`);
            }
        } catch (e) {}
    });

    proxyReq.on('timeout', () => {
        console.error(`[代理] 请求超时`);
        proxyReq.destroy();
        try {
            if (!res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('请求超时');
            }
        } catch (e) {}
    });

    proxyReq.end();
});

server.listen(PROXY_PORT, () => {
    console.log(`✅ 代理服务器已启动!`);
    console.log(`   访问地址: http://localhost:${PROXY_PORT}/proxy?url=<NAS_URL>`);
    console.log(`   认证方式: 通过请求头传递 (X-NAS-Username / X-NAS-Password)`);
    console.log(`   按 Ctrl+C 停止服务器\n`);
});

process.on('SIGINT', () => {
    console.log('\n正在停止代理服务器...');
    server.close(() => {
        console.log('服务器已停止');
        process.exit(0);
    });
});
