import express from 'express';
import Content from '../models/Content.js';
import generateId from '../utils/generateId.js';
import { generateDeleteToken } from '../utils/deleteToken.js';
import { upload } from '../middleware/upload.js';
import { uploadFileToSupabase, deleteFileFromSupabase } from '../utils/uploadToSupabase.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Helper: verify password for content
async function verifyContentPassword(content, password) {
  if (!content.passwordHash) return true;
  if (!password) return false;
  return bcrypt.compare(password, content.passwordHash);
}

// Helper: delete content and its file
async function deleteContentAndFile(content) {
  if (content.fileUrl && content.fileUrl.startsWith('http')) {
    await deleteFileFromSupabase(content.fileUrl);
  } else if (content.fileUrl && content.fileUrl.startsWith('/api/files/')) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const file = files.find(f => f.startsWith(content.uniqueId));
      if (file) {
        try { fs.unlinkSync(path.join(uploadsDir, file)); } catch (_) {}
      }
    }
  }
  await Content.deleteOne({ _id: content._id });
}

// Upload text or file (optional auth)
router.post('/upload', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    const { text, expiresInMinutes, expiresAt: expiresAtInput, password, oneTimeView, maxViews, oneTimeDownload, maxDownloads } = req.body;
    const file = req.file;

    if (!text && !file) {
      return res.status(400).json({ success: false, error: 'Either text or file must be provided' });
    }
    if (text && file) {
      return res.status(400).json({ success: false, error: 'Cannot upload both text and file.' });
    }

    const uniqueId = generateId();
    
    // Calculate expiry: prefer expiresAt date/time, fallback to minutes, default 10 minutes
    let expiresAt;
    if (expiresAtInput) {
      expiresAt = new Date(expiresAtInput);
      if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        return res.status(400).json({ success: false, error: 'Invalid expiry date/time. Must be in the future.' });
      }
    } else {
      const expiresIn = expiresInMinutes ? parseInt(expiresInMinutes, 10) * 60 * 1000 : 10 * 60 * 1000;
      expiresAt = new Date(Date.now() + expiresIn);
    }

    const isText = !!text;
    let contentData = {
      uniqueId,
      expiresAt,
      contentType: isText ? 'text' : 'file',
      deleteToken: generateDeleteToken(),
      userId: req.user ? req.user._id : null,
    };
    if (isText) {
      contentData.oneTimeView = oneTimeView === true || oneTimeView === 'true';
      contentData.maxViews = maxViews != null && maxViews !== '' ? Math.max(1, parseInt(maxViews, 10)) : null;
    } else {
      contentData.oneTimeDownload = oneTimeDownload === true || oneTimeDownload === 'true';
      contentData.maxDownloads = maxDownloads != null && maxDownloads !== '' ? Math.max(1, parseInt(maxDownloads, 10)) : null;
    }

    if (password && String(password).trim()) {
      contentData.passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    if (text) {
      contentData.textContent = text;
    } else {
      try {
        const uploadResult = await uploadFileToSupabase(file, uniqueId);
        contentData.fileUrl = uploadResult.fileUrl;
        contentData.fileName = uploadResult.fileName;
        contentData.fileSize = uploadResult.fileSize;
        contentData.mimeType = uploadResult.mimeType;
      } catch (err) {
        console.warn('Supabase upload failed, using local storage:', err.message);
        contentData.fileUrl = `/api/files/${uniqueId}`;
        contentData.fileName = file.originalname;
        contentData.fileSize = file.size;
        contentData.mimeType = file.mimetype;
        const ext = path.extname(file.originalname);
        const newPath = path.join(process.cwd(), 'uploads', `${uniqueId}${ext}`);
        fs.renameSync(file.path, newPath);
      }
    }

    const content = await Content.create(contentData);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    res.status(201).json({
      success: true,
      data: {
        uniqueId: content.uniqueId,
        url: `${frontendUrl}/content/${content.uniqueId}`,
        expiresAt: content.expiresAt,
        deleteToken: content.deleteToken,
        passwordProtected: !!content.passwordHash,
        oneTimeView: content.oneTimeView,
        maxViews: content.maxViews,
        oneTimeDownload: content.oneTimeDownload,
        maxDownloads: content.maxDownloads,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Max 50MB.' });
    }
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
});

// Get content metadata (no view count increment). Password in query.
router.get('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    const content = await Content.findOne({ uniqueId: id });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    if (new Date() > content.expiresAt) {
      await deleteContentAndFile(content);
      return res.status(410).json({ success: false, error: 'Content has expired' });
    }

    const ok = await verifyContentPassword(content, password);
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: 'Password required',
        requiresPassword: true,
      });
    }

    if (content.contentType === 'text') {
      if (content.used) {
        return res.status(410).json({ success: false, error: 'Content was one-time and has already been viewed' });
      }
      if (content.maxViews != null && content.viewCount >= content.maxViews) {
        return res.status(403).json({ success: false, error: 'Maximum view count reached' });
      }
    } else {
      if (content.maxDownloads != null && content.downloadCount >= content.maxDownloads) {
        return res.status(403).json({ success: false, error: 'Maximum download count reached' });
      }
    }

    res.json({
      success: true,
      data: {
        contentType: content.contentType,
        textContent: content.textContent,
        fileName: content.fileName,
        fileUrl: content.fileUrl,
        fileSize: content.fileSize,
        mimeType: content.mimeType,
        createdAt: content.createdAt,
        expiresAt: content.expiresAt,
        viewCount: content.viewCount,
        maxViews: content.maxViews,
        downloadCount: content.downloadCount,
        maxDownloads: content.maxDownloads,
        oneTimeView: content.oneTimeView,
        oneTimeDownload: content.oneTimeDownload,
        passwordProtected: !!content.passwordHash,
      },
    });
  } catch (err) {
    console.error('Retrieve error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve content' });
  }
});

// Record one view (text only). Called when user views text content. View count decreases remaining.
router.post('/content/:id/record-view', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body || req.query;

    const content = await Content.findOne({ uniqueId: id });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    if (content.contentType !== 'text') {
      return res.status(400).json({ success: false, error: 'Record-view is for text content only' });
    }

    if (new Date() > content.expiresAt) {
      return res.status(410).json({ success: false, error: 'Content has expired' });
    }

    if (content.used) {
      return res.status(410).json({ success: false, error: 'Already viewed (one-time)' });
    }

    const ok = await verifyContentPassword(content, password);
    if (!ok) {
      return res.status(403).json({ success: false, error: 'Password required', requiresPassword: true });
    }

    if (content.maxViews != null && content.viewCount >= content.maxViews) {
      return res.status(403).json({ success: false, error: 'Maximum view count reached' });
    }

    content.viewCount += 1;
    if (content.oneTimeView) {
      content.used = true;
      await content.save();
      await deleteContentAndFile(content);
      return res.json({ success: true, data: { viewCount: content.viewCount, remainingViews: 0, oneTimeViewed: true } });
    }
    await content.save();
    const remainingViews = content.maxViews != null ? Math.max(0, content.maxViews - content.viewCount) : null;
    res.json({ success: true, data: { viewCount: content.viewCount, remainingViews } });
  } catch (err) {
    console.error('Record view error:', err);
    res.status(500).json({ success: false, error: 'Failed to record view' });
  }
});

// Serve file and record one download (download count only; increments per download)
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const password = req.query.password;

    const content = await Content.findOne({ uniqueId: id });
    if (!content || content.contentType !== 'file') {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    if (new Date() > content.expiresAt) {
      return res.status(410).json({ success: false, error: 'File has expired' });
    }
    const ok = await verifyContentPassword(content, password);
    if (!ok) {
      return res.status(403).json({ success: false, error: 'Password required', requiresPassword: true });
    }
    if (content.maxDownloads != null && content.downloadCount >= content.maxDownloads) {
      return res.status(403).json({ success: false, error: 'Maximum download count reached' });
    }

    content.downloadCount += 1;
    const oneTimeDownload = content.oneTimeDownload;
    await content.save();

    if (content.fileUrl && content.fileUrl.startsWith('http')) {
      if (oneTimeDownload) await deleteContentAndFile(content);
      return res.redirect(content.fileUrl);
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    const file = files.find(f => f.startsWith(id));
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found on server' });
    }
    const filePath = path.join(uploadsDir, file);
    res.download(filePath, content.fileName, () => {
      if (oneTimeDownload) deleteContentAndFile(content).catch(() => {});
    });
  } catch (err) {
    console.error('File serve error:', err);
    res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

// Manual delete (with deleteToken or auth + ownership)
router.delete('/content/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteToken = req.body?.deleteToken || req.query?.deleteToken;

    const content = await Content.findOne({ uniqueId: id });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    const canDelete = (req.user && content.userId && content.userId.toString() === req.user._id.toString()) ||
      (deleteToken && content.deleteToken === deleteToken);
    if (!canDelete) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this content' });
    }

    await deleteContentAndFile(content);
    res.json({ success: true, message: 'Content deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

// List my uploads (auth required)
router.get('/content/mine/list', protect, async (req, res) => {
  try {
    const list = await Content.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('uniqueId contentType fileName createdAt expiresAt viewCount maxViews oneTimeView downloadCount maxDownloads oneTimeDownload passwordHash')
      .lean();
    res.json({
      success: true,
      data: list.map(c => ({
        uniqueId: c.uniqueId,
        contentType: c.contentType,
        fileName: c.fileName,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        viewCount: c.viewCount,
        maxViews: c.maxViews,
        oneTimeView: c.oneTimeView,
        downloadCount: c.downloadCount,
        maxDownloads: c.maxDownloads,
        oneTimeDownload: c.oneTimeDownload,
        passwordProtected: !!c.passwordHash,
      })),
    });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ success: false, error: 'Failed to list content' });
  }
});

export default router;
