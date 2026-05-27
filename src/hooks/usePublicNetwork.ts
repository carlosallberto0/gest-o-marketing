import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicPdv {
  id: string;
  code: string;
  name: string;
  type: string | null;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  bandeira: string | null;
  cnpj: string | null;
  phone: string | null;
  photo_url: string | null;
  maps_url: string | null;
  servicos: string[];
}

export interface ServicoOption {
  key: string;
  label: string;
  display_order: number;
}

export function usePublicNetwork() {
  return useQuery({
    queryKey: ['public-network'],
    queryFn: async () => {
      const [pdvsRes, servicosRes, optionsRes] = await Promise.all([
        supabase
          .from('pdvs')
          .select('id, code, name, type, address, city, state, lat, lng, bandeira, cnpj, phone, photo_url, maps_url, status')
          .or('status.eq.active,status.is.null')
          .order('name'),
        supabase
          .from('pdv_servicos')
          .select('pdv_id, servico_key'),
        supabase
          .from('system_options')
          .select('option_key, option_label, display_order')
          .eq('category', 'servico_posto')
          .eq('is_active', true)
          .order('display_order'),
      ]);

      if (pdvsRes.error) throw pdvsRes.error;
      if (servicosRes.error) throw servicosRes.error;
      if (optionsRes.error) throw optionsRes.error;

      const servicosByPdv = new Map<string, string[]>();
      (servicosRes.data || []).forEach((row: any) => {
        const list = servicosByPdv.get(row.pdv_id) || [];
        list.push(row.servico_key);
        servicosByPdv.set(row.pdv_id, list);
      });

      const pdvs: PublicPdv[] = (pdvsRes.data || []).map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        address: p.address,
        city: p.city,
        state: p.state,
        lat: p.lat,
        lng: p.lng,
        bandeira: p.bandeira,
        cnpj: p.cnpj,
        phone: p.phone,
        photo_url: p.photo_url,
        maps_url: p.maps_url,
        servicos: servicosByPdv.get(p.id) || [],
      }));

      const servicos: ServicoOption[] = (optionsRes.data || []).map((o: any) => ({
        key: o.option_key,
        label: o.option_label,
        display_order: o.display_order,
      }));

      return { pdvs, servicos };
    },
    staleTime: 5 * 60 * 1000,
  });
}
