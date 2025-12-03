import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://gateway-service:8081';

// Security headers with CSP configured for Vite apps
const helmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", GATEWAY_URL],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    // Disable HSTS when we are serving plain HTTP (e.g., direct EC2 access).
    // Set ENABLE_HSTS=true to re-enable when traffic is terminated over HTTPS.
    hsts: process.env.ENABLE_HSTS === 'true' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: process.env.ENABLE_COOP === 'true' ? undefined : false,
    originAgentCluster: process.env.ENABLE_ORIGIN_AGENT_CLUSTER === 'true'
        ? undefined
        : false,
};

app.use(helmet(helmetOptions));

// Enable gzip compression
app.use(compression());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'frontend',
        gatewayUrl: GATEWAY_URL,
        timestamp: new Date().toISOString()
    });
});

// API proxy to gateway service
app.use('/api', createProxyMiddleware({
    target: GATEWAY_URL,
    changeOrigin: true,
    xfwd: true, // ✅ Pass X-Forwarded-* headers
    pathRewrite: {
        '^/api': '/api', // Keep /api prefix
    },
    onProxyReq: (proxyReq, req, res) => {
        // Forward original headers before sending any body content
        if (req.headers['x-username']) {
            proxyReq.setHeader('X-Username', req.headers['x-username']);
        }
        if (req.headers['authorization']) {
            proxyReq.setHeader('Authorization', req.headers['authorization']);
        }

        // Rebuild JSON body if it was parsed by express.json()
        if (req.body && Object.keys(req.body).length && req.method !== 'GET') {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }

        // Log proxy requests in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[PROXY] ${req.method} ${req.path} -> ${GATEWAY_URL}${req.path}`);
        }
    },
    onError: (err, req, res) => {
        console.error('[PROXY ERROR]', err.message);
        res.status(502).json({
            error: 'Bad Gateway',
            message: 'Failed to connect to backend service',
            details: process.env.NODE_ENV !== 'production' ? err.message : undefined
        });
    },
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
}));

// Serve static files from dist directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Don't cache HTML files
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        // Don't cache config.json
        if (filePath.endsWith('config.json')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
    }
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV !== 'production' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`🚀 Frontend server running on port ${PORT}`);
    console.log(`📡 Proxying /api requests to: ${GATEWAY_URL}`);
    console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
    console.log(`📁 Serving static files from: ${distPath}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60));
});
