/**
 * Converte URLs do Google Drive para URL de acesso direto à imagem
 * 
 * Formatos suportados:
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * 
 * Converte para:
 * - https://lh3.googleusercontent.com/d/FILE_ID
 */
export function convertGoogleDriveUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Se não é do Google Drive, retorna como está
  if (!url.includes('drive.google.com')) {
    return url;
  }
  
  let fileId: string | null = null;
  
  // Formato: https://drive.google.com/open?id=FILE_ID
  const openIdMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch) {
    fileId = openIdMatch[1];
  }
  
  // Formato: https://drive.google.com/file/d/FILE_ID/view
  const fileViewMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!fileId && fileViewMatch) {
    fileId = fileViewMatch[1];
  }
  
  // Se encontrou o ID, retorna a URL direta
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  
  // Se não conseguiu extrair, retorna a URL original
  return url;
}

/**
 * Verifica se uma URL é do Google Drive
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  return url?.includes('drive.google.com') || false;
}
