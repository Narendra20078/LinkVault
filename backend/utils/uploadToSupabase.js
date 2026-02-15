import supabase from '../config/supabase.js';
import fs from 'fs';
import path from 'path';

export const uploadFileToSupabase = async (file, uniqueId) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const fileExtension = path.extname(file.originalname);
  const fileName = `${uniqueId}${fileExtension}`;
  const bucketName = process.env.SUPABASE_BUCKET || 'data';

  // Read file buffer
  const fileBuffer = fs.readFileSync(file.path);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  // Clean up local file
  fs.unlinkSync(file.path);

  return {
    fileUrl: urlData.publicUrl,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
};

export const deleteFileFromSupabase = async (fileUrl) => {
  if (!supabase || !fileUrl) {
    return;
  }

  try {
    // Extract filename from URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];
    const bucketName = process.env.SUPABASE_BUCKET || 'linkvault-files';

    await supabase.storage
      .from(bucketName)
      .remove([fileName]);
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
  }
};
