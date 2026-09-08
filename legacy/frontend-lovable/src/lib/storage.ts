import { supabase } from '@/integrations/supabase/client';

export async function uploadPhoto(
  file: File | Blob,
  folder: string = 'photos'
): Promise<string | null> {
  try {
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadPhoto:', error);
    return null;
  }
}

export async function uploadBase64Photo(
  base64: string,
  folder: string = 'photos'
): Promise<string | null> {
  try {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    return uploadPhoto(blob, folder);
  } catch (error) {
    console.error('Error in uploadBase64Photo:', error);
    return null;
  }
}

export async function deletePhoto(url: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const urlParts = url.split('/photos/');
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from('photos')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting photo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePhoto:', error);
    return false;
  }
}
