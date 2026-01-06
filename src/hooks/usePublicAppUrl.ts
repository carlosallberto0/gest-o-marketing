/**
 * Hook para obter a URL pública canônica do sistema.
 * Isso garante que todos os links de acesso gerados usem sempre o mesmo domínio,
 * independentemente de onde o super admin está logado (preview, editor, produção).
 */

// URL pública canônica do sistema - ÚNICA FONTE DA VERDADE
const PUBLIC_APP_URL = 'https://gestao-e-marketing.lovable.app';

export function usePublicAppUrl() {
  return PUBLIC_APP_URL;
}

export function getPublicAppUrl() {
  return PUBLIC_APP_URL;
}
