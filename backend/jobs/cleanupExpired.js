import cron from 'node-cron';
import Content from '../models/Content.js';
import { deleteFileFromSupabase } from '../utils/uploadToSupabase.js';
import fs from 'fs';
import path from 'path';

// Run cleanup job every 5 minutes
export const startCleanupJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      
      // Find all expired content
      const expiredContents = await Content.find({
        expiresAt: { $lt: now },
      });

      console.log(`Cleaning up ${expiredContents.length} expired items...`);

      for (const content of expiredContents) {
        // Delete file from Supabase if applicable
        if (content.fileUrl && content.fileUrl.startsWith('http')) {
          await deleteFileFromSupabase(content.fileUrl);
        } else if (content.fileUrl && content.fileUrl.startsWith('/api/files/')) {
          // Delete local file
          const uploadsDir = path.join(process.cwd(), 'uploads');
          const files = fs.readdirSync(uploadsDir);
          const file = files.find(f => f.startsWith(content.uniqueId));
          if (file) {
            const filePath = path.join(uploadsDir, file);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }

        // Delete from database
        await Content.deleteOne({ _id: content._id });
      }

      console.log(`Cleanup completed. Deleted ${expiredContents.length} items.`);
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  });

  console.log('Cleanup job started. Running every 5 minutes.');
};
