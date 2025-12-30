import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistCategory, ChecklistQuestion } from '@/types';

interface DBCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface DBQuestion {
  id: string;
  category_id: string;
  text: string;
  tip: string | null;
  sort_order: number;
  requires_photo: boolean;
  requires_comment: boolean;
  is_critical: boolean;
  requires_material: boolean;
  material_type: string | null;
}

export function useChecklistCategories() {
  return useQuery({
    queryKey: ['checklist-categories'],
    queryFn: async (): Promise<ChecklistCategory[]> => {
      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('checklist_categories')
        .select('*')
        .order('sort_order');

      if (catError) throw catError;

      // Fetch questions
      const { data: questions, error: qError } = await supabase
        .from('checklist_questions')
        .select('*')
        .order('sort_order');

      if (qError) throw qError;

      // Map to frontend types
      return (categories as DBCategory[]).map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        order: cat.sort_order,
        questions: (questions as DBQuestion[])
          .filter(q => q.category_id === cat.id)
          .map(q => ({
            id: q.id,
            categoryId: q.category_id,
            text: q.text,
            tip: q.tip || undefined,
            order: q.sort_order,
            requiresPhoto: q.requires_photo,
            requiresComment: q.requires_comment,
            isCritical: q.is_critical,
            requiresMaterial: q.requires_material,
            materialType: q.material_type || undefined,
          })),
      }));
    },
  });
}

export function usePDVs(moduleFilter?: 'media' | 'merchandising') {
  return useQuery({
    queryKey: ['pdvs', moduleFilter],
    queryFn: async () => {
      let query = supabase
        .from('pdvs')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (moduleFilter) {
        query = query.contains('active_modules', [moduleFilter]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(pdv => ({
        id: pdv.id,
        code: pdv.code,
        name: pdv.name,
        type: pdv.type,
        address: pdv.address,
        city: pdv.city,
        state: pdv.state,
        coordinates: pdv.lat && pdv.lng ? { lat: Number(pdv.lat), lng: Number(pdv.lng) } : undefined,
        managerId: pdv.manager_id || undefined,
        activeModules: pdv.active_modules,
        status: pdv.status as 'active' | 'inactive',
      }));
    },
  });
}
