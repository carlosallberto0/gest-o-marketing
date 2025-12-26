-- Converter URLs do Google Drive para formato de acesso direto à imagem
-- Formato original: https://drive.google.com/open?id=FILE_ID ou /file/d/FILE_ID/view
-- Formato novo: https://lh3.googleusercontent.com/d/FILE_ID

UPDATE outdoors 
SET 
  photo_url = 
    CASE 
      -- Formato: https://drive.google.com/open?id=FILE_ID
      WHEN photo_url ~ 'drive\.google\.com/open\?id=' THEN
        'https://lh3.googleusercontent.com/d/' || 
        (regexp_match(photo_url, 'id=([a-zA-Z0-9_-]+)'))[1]
      -- Formato: https://drive.google.com/file/d/FILE_ID/view
      WHEN photo_url ~ 'drive\.google\.com/file/d/' THEN
        'https://lh3.googleusercontent.com/d/' || 
        (regexp_match(photo_url, '/d/([a-zA-Z0-9_-]+)'))[1]
      ELSE photo_url
    END,
  updated_at = now()
WHERE photo_url LIKE '%drive.google.com%';