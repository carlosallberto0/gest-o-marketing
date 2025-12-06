import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { QuestionItem } from '@/components/checklist/QuestionItem';
import { CategoryTab } from '@/components/checklist/CategoryTab';
import { SignaturePad } from '@/components/ui/signature-pad';
import { useChecklistCategories, usePDVs } from '@/hooks/useChecklistData';
import { useSimplifiedChecklistCategories } from '@/hooks/useSimplifiedChecklist';
import { useCreateMerchEvaluation } from '@/hooks/useMerchEvaluation';
import { getScoreBgColor, getScoreLabel } from '@/lib/helpers';
import { AnswerValue, QuestionAnswer } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar, Fuel, Send, ChevronLeft, ChevronRight, Camera, AlertCircle, Loader2, PenTool, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function Checklist() {
  const { user, profile } = useAuth();
  const isCollaborator = profile?.role === 'collaborator';
  
  const [selectedPDV, setSelectedPDV] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  
  // Use simplified checklist for collaborators
  const { data: fullCategories = [], isLoading: fullLoading } = useChecklistCategories();
  const { data: simplifiedCategories = [], isLoading: simplifiedLoading } = useSimplifiedChecklistCategories();
  
  const categories = isCollaborator ? simplifiedCategories : fullCategories;
  const categoriesLoading = isCollaborator ? simplifiedLoading : fullLoading;
  
  const { data: pdvs = [], isLoading: pdvsLoading } = usePDVs('merchandising');
  const createEvaluation = useCreateMerchEvaluation();

  // Set first category when data loads
  useMemo(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const currentCategoryIndex = categories.findIndex(c => c.id === selectedCategory);

  // Calculate scores
  const categoryScores = useMemo(() => {
    const scores: Record<string, { answered: number; total: number; score: number }> = {};
    
    categories.forEach(category => {
      const categoryAnswers = category.questions.map(q => answers[q.id]);
      const answered = categoryAnswers.filter(a => a?.value !== null && a?.value !== undefined).length;
      const yesCount = categoryAnswers.filter(a => a?.value === 'yes' || a?.value === 'na').length;
      const total = category.questions.length;
      const score = answered > 0 ? Math.round((yesCount / answered) * 100) : 0;
      
      scores[category.id] = { answered, total, score };
    });
    
    return scores;
  }, [answers, categories]);

  const totalAnswered = Object.values(categoryScores).reduce((acc, s) => acc + s.answered, 0);
  const totalQuestions = Object.values(categoryScores).reduce((acc, s) => acc + s.total, 0);
  const overallScore = useMemo(() => {
    const allAnswers = Object.values(answers).filter(a => a?.value !== null && a?.value !== undefined);
    if (allAnswers.length === 0) return 0;
    const yesCount = allAnswers.filter(a => a.value === 'yes' || a.value === 'na').length;
    return Math.round((yesCount / allAnswers.length) * 100);
  }, [answers]);

  // Count photos
  const totalPhotos = Object.values(answers).filter(a => a.photoUrl).length;

  // Check for missing required photos
  const missingRequiredPhotos = useMemo(() => {
    const missing: string[] = [];
    categories.forEach(category => {
      category.questions.forEach(question => {
        if (question.requiresPhoto && answers[question.id]?.value && !answers[question.id]?.photoUrl) {
          missing.push(question.id);
        }
      });
    });
    return missing;
  }, [answers, categories]);

  const canSubmit = totalAnswered === totalQuestions && missingRequiredPhotos.length === 0 && signatureUrl;

  const handleAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        value,
      }
    }));
  };

  const handleObservation = (questionId: string, observation: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        observation,
      }
    }));
  };

  const handlePhoto = (questionId: string, photoUrl: string | null) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        photoUrl,
      }
    }));
    if (photoUrl) {
      toast.success('Foto adicionada com sucesso!');
    }
  };

  const handleSignatureSave = async (signatureDataUrl: string) => {
    setIsUploadingSignature(true);
    try {
      // Convert base64 to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const fileName = `signatures/${user?.id}/${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/png',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      setSignatureUrl(urlData.publicUrl);
      setShowSignatureDialog(false);
      toast.success('Assinatura confirmada!');
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Erro ao salvar assinatura');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPDV) {
      toast.error('Selecione um PDV antes de enviar');
      return;
    }
    if (totalAnswered < totalQuestions) {
      toast.warning(`Ainda faltam ${totalQuestions - totalAnswered} perguntas para responder`);
      return;
    }
    if (missingRequiredPhotos.length > 0) {
      toast.error(`${missingRequiredPhotos.length} foto(s) obrigatória(s) não foram anexadas`);
      return;
    }
    if (!signatureUrl) {
      toast.error('É necessário assinar o checklist antes de enviar');
      setShowSignatureDialog(true);
      return;
    }

    try {
      await createEvaluation.mutateAsync({
        pdvId: selectedPDV,
        answers,
        categories,
        signatureUrl,
      });
      toast.success('Checklist enviado com sucesso!');
      // Reset form
      setAnswers({});
      setSelectedPDV('');
      setSignatureUrl(null);
    } catch (error) {
      toast.error('Erro ao enviar checklist');
      console.error(error);
    }
  };

  const goToCategory = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? Math.min(currentCategoryIndex + 1, categories.length - 1)
      : Math.max(currentCategoryIndex - 1, 0);
    setSelectedCategory(categories[newIndex].id);
  };

  if (categoriesLoading || pdvsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (categories.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma categoria encontrada</h2>
          <p className="text-muted-foreground">Entre em contato com o administrador para configurar o checklist.</p>
        </div>
      </AppLayout>
    );
  }

  if (!currentCategory) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isCollaborator ? 'Checklist Operacional' : 'Nova Avaliação de Merchandising'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isCollaborator 
                ? 'Preencha os itens operacionais básicos do PDV'
                : 'Preencha o checklist para avaliar o PDV'
              }
            </p>
          </div>
          
          {/* Score Badge */}
          {totalAnswered > 0 && (
            <div className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-xl",
              getScoreBgColor(overallScore)
            )}>
              <div className="text-white">
                <p className="text-xs opacity-80">Score Atual</p>
                <p className="text-2xl font-bold">{overallScore}%</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-white text-sm">
                <p className="font-medium">{getScoreLabel(overallScore)}</p>
                <p className="text-xs opacity-80">{totalAnswered}/{totalQuestions}</p>
              </div>
            </div>
          )}
        </div>

        {/* PDV Selection */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                PDV
              </label>
              <Select value={selectedPDV} onValueChange={setSelectedPDV}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um PDV" />
                </SelectTrigger>
                <SelectContent>
                  {pdvs.map(pdv => (
                    <SelectItem key={pdv.id} value={pdv.id}>
                      {pdv.name} ({pdv.city}/{pdv.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data
              </label>
              <div className="h-10 px-3 rounded-lg border border-input bg-background flex items-center text-sm text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </div>
            </div>
          </div>

          {/* Stats row */}
          {totalAnswered > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>{totalPhotos} foto(s) anexada(s)</span>
              </div>
              {missingRequiredPhotos.length > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span>{missingRequiredPhotos.length} foto(s) obrigatória(s) pendente(s)</span>
                </div>
              )}
              {signatureUrl ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span>Assinatura confirmada</span>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSignatureDialog(true)}
                  className="ml-auto"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Assinar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs - Horizontal Scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {categories.map(category => (
            <CategoryTab
              key={category.id}
              category={category}
              isActive={selectedCategory === category.id}
              score={categoryScores[category.id]?.answered === categoryScores[category.id]?.total 
                ? categoryScores[category.id]?.score 
                : undefined}
              answeredCount={categoryScores[category.id]?.answered || 0}
              totalCount={categoryScores[category.id]?.total || 0}
              onClick={() => setSelectedCategory(category.id)}
            />
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{currentCategory.name}</h2>
            <span className="text-sm text-muted-foreground">
              {categoryScores[currentCategory.id]?.answered || 0} de {currentCategory.questions.length} respondidas
            </span>
          </div>

          {currentCategory.questions.map((question, index) => (
            <div 
              key={question.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <QuestionItem
                question={question}
                value={answers[question.id]?.value || null}
                observation={answers[question.id]?.observation}
                photoUrl={answers[question.id]?.photoUrl}
                onAnswer={handleAnswer}
                onObservation={handleObservation}
                onPhoto={handlePhoto}
              />
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => goToCategory('prev')}
            disabled={currentCategoryIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center gap-1">
            {categories.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentCategoryIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {currentCategoryIndex < categories.length - 1 ? (
            <Button onClick={() => goToCategory('next')}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              variant="default"
              disabled={!canSubmit || createEvaluation.isPending}
              className="bg-success hover:bg-success/90"
            >
              {createEvaluation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Avaliação
            </Button>
          )}
        </div>

        {/* Signature reminder if on last category */}
        {currentCategoryIndex === categories.length - 1 && !signatureUrl && totalAnswered === totalQuestions && missingRequiredPhotos.length === 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-center gap-3">
            <PenTool className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Assinatura Pendente</p>
              <p className="text-sm text-muted-foreground">Você precisa assinar o checklist antes de enviar</p>
            </div>
            <Button onClick={() => setShowSignatureDialog(true)}>
              Assinar Agora
            </Button>
          </div>
        )}
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinatura do Responsável</DialogTitle>
            <DialogDescription>
              Desenhe sua assinatura no campo abaixo para confirmar a avaliação
            </DialogDescription>
          </DialogHeader>
          {isUploadingSignature ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <SignaturePad 
              onSave={handleSignatureSave}
              onClear={() => setSignatureUrl(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}