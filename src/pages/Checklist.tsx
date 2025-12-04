import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { QuestionItem } from '@/components/checklist/QuestionItem';
import { CategoryTab } from '@/components/checklist/CategoryTab';
import { mockCategories, mockStores, getScoreBgColor, getScoreLabel } from '@/data/mockData';
import { AnswerValue, QuestionAnswer } from '@/types/checklist';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Store, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Checklist() {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(mockCategories[0].id);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  
  const currentCategory = mockCategories.find(c => c.id === selectedCategory)!;
  const currentCategoryIndex = mockCategories.findIndex(c => c.id === selectedCategory);

  // Calculate scores
  const categoryScores = useMemo(() => {
    const scores: Record<string, { answered: number; total: number; score: number }> = {};
    
    mockCategories.forEach(category => {
      const categoryAnswers = category.questions.map(q => answers[q.id]);
      const answered = categoryAnswers.filter(a => a?.value !== null && a?.value !== undefined).length;
      const yesCount = categoryAnswers.filter(a => a?.value === 'yes' || a?.value === 'na').length;
      const total = category.questions.length;
      const score = answered > 0 ? Math.round((yesCount / answered) * 100) : 0;
      
      scores[category.id] = { answered, total, score };
    });
    
    return scores;
  }, [answers]);

  const totalAnswered = Object.values(categoryScores).reduce((acc, s) => acc + s.answered, 0);
  const totalQuestions = Object.values(categoryScores).reduce((acc, s) => acc + s.total, 0);
  const overallScore = useMemo(() => {
    const allAnswers = Object.values(answers).filter(a => a?.value !== null && a?.value !== undefined);
    if (allAnswers.length === 0) return 0;
    const yesCount = allAnswers.filter(a => a.value === 'yes' || a.value === 'na').length;
    return Math.round((yesCount / allAnswers.length) * 100);
  }, [answers]);

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

  const handleSubmit = () => {
    if (!selectedStore) {
      toast.error('Selecione uma loja antes de enviar');
      return;
    }
    if (totalAnswered < totalQuestions) {
      toast.warning(`Ainda faltam ${totalQuestions - totalAnswered} perguntas para responder`);
      return;
    }
    toast.success('Checklist enviado com sucesso!');
  };

  const goToCategory = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? Math.min(currentCategoryIndex + 1, mockCategories.length - 1)
      : Math.max(currentCategoryIndex - 1, 0);
    setSelectedCategory(mockCategories[newIndex].id);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Avaliação</h1>
            <p className="text-muted-foreground mt-1">
              Preencha o checklist para avaliar a loja
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

        {/* Store Selection */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Loja
              </label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {mockStores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
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
        </div>

        {/* Category Tabs - Horizontal Scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {mockCategories.map(category => (
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
                onAnswer={handleAnswer}
                onObservation={handleObservation}
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
            {mockCategories.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentCategoryIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {currentCategoryIndex < mockCategories.length - 1 ? (
            <Button onClick={() => goToCategory('next')}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              variant="success"
              disabled={totalAnswered < totalQuestions}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Avaliação
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
