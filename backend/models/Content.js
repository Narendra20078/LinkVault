import mongoose from 'mongoose';
import crypto from 'crypto';

const contentSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  contentType: {
    type: String,
    enum: ['text', 'file'],
    required: true,
  },
  textContent: {
    type: String,
    default: null,
  },
  fileName: {
    type: String,
    default: null,
  },
  fileUrl: {
    type: String,
    default: null,
  },
  fileSize: {
    type: Number,
    default: null,
  },
  mimeType: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // For text: number of times viewed; remaining = maxViews - viewCount
  viewCount: {
    type: Number,
    default: 0,
  },
  // For text: max views allowed; null = unlimited
  maxViews: {
    type: Number,
    default: null,
  },
  // For file: number of times downloaded
  downloadCount: {
    type: Number,
    default: 0,
  },
  // For file: max downloads allowed; null = unlimited
  maxDownloads: {
    type: Number,
    default: null,
  },
  // Optional: password protection (hashed)
  passwordHash: {
    type: String,
    default: null,
  },
  // Text only: one-time view (delete after first view)
  oneTimeView: {
    type: Boolean,
    default: false,
  },
  // File only: one-time download (delete after first download)
  oneTimeDownload: {
    type: Boolean,
    default: false,
  },
  used: {
    type: Boolean,
    default: false,
  },
  // Secret token for manual delete (returned on upload)
  deleteToken: {
    type: String,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

contentSchema.index({ expiresAt: 1 });
contentSchema.index({ userId: 1 });

const Content = mongoose.model('Content', contentSchema);

export default Content;
