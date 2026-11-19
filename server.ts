import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface FirebaseConfig {
  projectId: string;
}

function getFirebaseProjectId(): string {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as FirebaseConfig;
    return parsed.projectId;
  }
  return '';
}

const FIREBASE_PROJECT_ID = getFirebaseProjectId();

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase public certificates');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  certsExpiresAt = now + maxAgeSec * 1000;
  cachedCerts = (await resp.json()) as Record<string, string>;
  return cachedCerts;
}

function base64UrlDecode(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
  return Buffer.from(padded, 'base64');
}

interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid token algorithm or missing key ID');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }
  if (!payload.iat || payload.iat > nowSec + 300) {
    throw new Error('Token issued in the future');
  }
  if (FIREBASE_PROJECT_ID) {
    if (payload.aud !== FIREBASE_PROJECT_ID) {
      throw new Error('Invalid token audience');
    }
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
      throw new Error('Invalid token issuer');
    }
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Invalid token subject');
  }

  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown token key ID');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signature = base64UrlDecode(signatureB64);
  const valid = verifier.verify(cert, signature);
  if (!valid) {
    throw new Error('Invalid token signature');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
  };
}

interface AuthenticatedRequest extends Request {
  firebaseUser?: VerifiedFirebaseUser;
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    const user = await verifyFirebaseIdToken(token);
    if (!user.emailVerified) {
      res.status(403).json({ error: 'Email verification required before uploading media' });
      return;
    }
    req.firebaseUser = user;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Invalid authentication token',
    });
  }
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are supported'));
    }
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR, {
    maxAge: '7d',
    fallthrough: false,
  }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ConnectSphere',
      timestamp: new Date().toISOString(),
    });
  });

  app.post(
    '/api/upload',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          res.status(400).json({ error: message });
          return;
        }
        if (!req.file || !req.firebaseUser) {
          res.status(400).json({ error: 'No image file provided' });
          return;
        }

        const ext = ALLOWED_MIME_TYPES[req.file.mimetype] || 'jpg';
        const safeUid = req.firebaseUser.uid.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(UPLOADS_DIR, safeUid);
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }

        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
        const destPath = path.join(userDir, filename);
        fs.writeFileSync(destPath, req.file.buffer);

        res.status(201).json({
          url: `/uploads/${safeUid}/${filename}`,
          size: req.file.size,
          mimeType: req.file.mimetype,
        });
      });
    }
  );

  // Error handler for /uploads missing files or API errors
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/uploads') || req.path.startsWith('/api')) {
      const status = (err as { status?: number })?.status || 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(status).json({ error: message });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConnectSphere server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ConnectSphere server:', err);
  process.exit(1);
});
