import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistCategory } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// Simplified checklist shows only operational (non-critical) items for collaborators
// Categories to include for simplified checklist
const SIMPLIFIED_CATEGORIES = [
  'Interior da Loja',
  'Frente de Caixa',
  'Colaboradores',
];

export function useSimplifiedChecklistCategories() {
  const { profile } = useAuth();
  const isCollaborator = profile?.role === 'collaborator';

  return useQuery({
    queryKey: ['checklist-categories', 'simplified', isCollaborator],
    queryFn: async (): Promise<ChecklistCategory[]> => {
      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('checklist_categories')
        .select('*')
        .order('sort_order');

      if (catError) throw catError;

      // Fetch questions
      let questionsQuery = supabase
        .from('checklist_questions')
        .select('*')
        .order('sort_order');

      // For collaborators, only get non-critical questions
      if (isCollaborator) {
        questionsQuery = questionsQuery.eq('is_critical', false);
      }

      const { data: questions, error: qError } = await questionsQuery;

      if (qError) throw qError;

      // Filter categories for collaborators
      let filteredCategories = categories;
      if (isCollaborator) {
        filteredCategories = categories.filter(cat => 
          SIMPLIFIED_CATEGORIES.some(name => 
            cat.name.toLowerCase().includes(name.toLowerCase())
          )
        );
      }

      // Map to frontend types
      return filteredCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        order: cat.sort_order,
        questions: questions
          .filter(q => q.category_id === cat.id)
          .map(q => ({
            id: q.id,
            categoryId: q.category_id,
            text: q.text,
            tip: q.tip || undefined,
            order: q.sort_order,
            requiresPhoto: q.requires_photo,
            isCritical: q.is_critical,
            requiresMaterial: q.requires_material,
            materialType: q.material_type || undefined,
          })),
      })).filter(cat => cat.questions.length > 0); // Only include categories with questions
    },
  });
}
