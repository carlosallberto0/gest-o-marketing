-- Create enums
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'director', 'manager', 'collaborator', 'supplier');
CREATE TYPE public.module_access AS ENUM ('media', 'merchandising');
CREATE TYPE public.pdv_type AS ENUM ('posto', 'conveniencia', 'both');
CREATE TYPE public.outdoor_status AS ENUM ('operational', 'non_operational', 'pending_evaluation');
CREATE TYPE public.payment_method AS ENUM ('cash', 'fuel', 'both');
CREATE TYPE public.service_type AS ENUM ('installation', 'maintenance', 'removal', 'replacement');
CREATE TYPE public.service_order_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.answer_value AS ENUM ('yes', 'no', 'na');
CREATE TYPE public.material_type AS ENUM ('promotional', 'printed', 'gift', 'sample', 'display', 'signage', 'sticker', 'banner', 'poster', 'flyer');
CREATE TYPE public.campaign_type AS ENUM ('promotional', 'institutional', 'seasonal', 'launch', 'partnership');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  role user_role NOT NULL DEFAULT 'collaborator',
  modules module_access[] NOT NULL DEFAULT '{}',
  pdv_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PDVs table
CREATE TABLE public.pdvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type pdv_type NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lat DECIMAL,
  lng DECIMAL,
  manager_id UUID REFERENCES public.profiles(id),
  active_modules module_access[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for profiles.pdv_id after pdvs table exists
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_pdv FOREIGN KEY (pdv_id) REFERENCES public.pdvs(id);

-- Outdoors table
CREATE TABLE public.outdoors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  width DECIMAL NOT NULL,
  height DECIMAL NOT NULL,
  area DECIMAL GENERATED ALWAYS AS (width * height) STORED,
  photo_url TEXT,
  contract_id UUID,
  status outdoor_status NOT NULL DEFAULT 'pending_evaluation',
  last_evaluation TIMESTAMP WITH TIME ZONE,
  non_operational_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  farmer_cpf TEXT NOT NULL,
  farmer_phone TEXT,
  farmer_email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  annual_value DECIMAL NOT NULL,
  monthly_value DECIMAL NOT NULL,
  payment_method payment_method NOT NULL,
  auto_renewal BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired')),
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for outdoors.contract_id after contracts table exists
ALTER TABLE public.outdoors ADD CONSTRAINT fk_outdoors_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  service_types service_type[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service Orders table
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  type service_type NOT NULL,
  description TEXT NOT NULL,
  total_cost DECIMAL NOT NULL,
  status service_order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT
);

-- Checklist Categories table
CREATE TABLE public.checklist_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'ClipboardCheck',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklist Questions table
CREATE TABLE public.checklist_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.checklist_categories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  tip TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  requires_material BOOLEAN NOT NULL DEFAULT false,
  material_type material_type,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Merchandising Evaluations table
CREATE TABLE public.merch_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id),
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  total_score INTEGER NOT NULL DEFAULT 0,
  total_possible_points INTEGER NOT NULL DEFAULT 0,
  percentage_score DECIMAL NOT NULL DEFAULT 0,
  category_scores JSONB NOT NULL DEFAULT '{}',
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Evaluation Answers table
CREATE TABLE public.evaluation_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.merch_evaluations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.checklist_questions(id),
  value answer_value,
  observation TEXT,
  photo_url TEXT,
  materials_used TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monthly Media Evaluations table
CREATE TABLE public.media_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id),
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id),
  month_year TEXT NOT NULL,
  status outdoor_status NOT NULL,
  non_operational_reason TEXT,
  measures_confirmed BOOLEAN NOT NULL DEFAULT false,
  observations TEXT,
  lat DECIMAL,
  lng DECIMAL,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Media Evaluation Photos table
CREATE TABLE public.media_evaluation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.media_evaluations(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trade Materials table
CREATE TABLE public.trade_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type material_type NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  unit_cost DECIMAL NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type campaign_type NOT NULL,
  target_pdv_ids UUID[] NOT NULL DEFAULT '{}',
  required_materials JSONB NOT NULL DEFAULT '[]',
  kpi_targets JSONB NOT NULL DEFAULT '{"targetScore": 85, "targetCoverage": 90}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outdoors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_evaluation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create function to check if user has module access
CREATE OR REPLACE FUNCTION public.has_module_access(user_id UUID, module_name module_access)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT module_name = ANY(modules) FROM public.profiles WHERE id = user_id;
$$;

-- RLS Policies

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- PDVs: authenticated users can read, admins can manage
CREATE POLICY "Authenticated users can view PDVs" ON public.pdvs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage PDVs" ON public.pdvs FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Outdoors: users with media access can read, admins can manage
CREATE POLICY "Users can view outdoors" ON public.outdoors FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'media')
);
CREATE POLICY "Admins can manage outdoors" ON public.outdoors FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Contracts: users with media access can view, admins can manage
CREATE POLICY "Users can view contracts" ON public.contracts FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'media')
);
CREATE POLICY "Admins can manage contracts" ON public.contracts FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Suppliers: users with media access can view, admins can manage
CREATE POLICY "Users can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'media')
);
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Service Orders: users with media access can view, directors+ can manage
CREATE POLICY "Users can view service orders" ON public.service_orders FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'media')
);
CREATE POLICY "Directors can manage service orders" ON public.service_orders FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director')
);

-- Checklist Categories/Questions: users with merch access can read, admins can manage
CREATE POLICY "Users can view categories" ON public.checklist_categories FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'merchandising')
);
CREATE POLICY "Admins can manage categories" ON public.checklist_categories FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

CREATE POLICY "Users can view questions" ON public.checklist_questions FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'merchandising')
);
CREATE POLICY "Admins can manage questions" ON public.checklist_questions FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Merch Evaluations: users can view/create their own or all if admin
CREATE POLICY "Users can view merch evaluations" ON public.merch_evaluations FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'merchandising')
);
CREATE POLICY "Users can create merch evaluations" ON public.merch_evaluations FOR INSERT TO authenticated WITH CHECK (
  public.has_module_access(auth.uid(), 'merchandising') AND evaluator_id = auth.uid()
);
CREATE POLICY "Users can update own evaluations" ON public.merch_evaluations FOR UPDATE TO authenticated USING (
  evaluator_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Evaluation Answers: tied to evaluation permissions
CREATE POLICY "Users can view answers" ON public.evaluation_answers FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'merchandising')
);
CREATE POLICY "Users can manage answers" ON public.evaluation_answers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.merch_evaluations e WHERE e.id = evaluation_id AND (e.evaluator_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('super_admin', 'admin')))
);

-- Media Evaluations: users with media access can create/view
CREATE POLICY "Users can view media evaluations" ON public.media_evaluations FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'media')
);
CREATE POLICY "Users can create media evaluations" ON public.media_evaluations FOR INSERT TO authenticated WITH CHECK (
  public.has_module_access(auth.uid(), 'media') AND evaluator_id = auth.uid()
);

-- Media Evaluation Photos
CREATE POLICY "Users can view media photos" ON public.media_evaluation_photos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.media_evaluations e WHERE e.id = evaluation_id)
);
CREATE POLICY "Users can add media photos" ON public.media_evaluation_photos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.media_evaluations e WHERE e.id = evaluation_id AND e.evaluator_id = auth.uid())
);

-- Trade Materials: users with merch access can view, admins can manage
CREATE POLICY "Users can view materials" ON public.trade_materials FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'merchandising')
);
CREATE POLICY "Admins can manage materials" ON public.trade_materials FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Campaigns: users with merch access can view, directors+ can manage
CREATE POLICY "Users can view campaigns" ON public.campaigns FOR SELECT TO authenticated USING (
  public.has_module_access(auth.uid(), 'merchandising')
);
CREATE POLICY "Directors can manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (
  public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director')
);

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Storage policies for photos bucket
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos');

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, modules)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'collaborator'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data -> 'modules'))::module_access[], ARRAY['merchandising']::module_access[])
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pdvs_updated_at BEFORE UPDATE ON public.pdvs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outdoors_updated_at BEFORE UPDATE ON public.outdoors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.trade_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();