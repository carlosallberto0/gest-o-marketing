import { useState } from 'react';
import { ChecklistQuestion, AnswerValue } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { HelpCircle, Camera, MessageSquare, Check, X, Minus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QuestionItemProps {
  question: ChecklistQuestion;
  value: AnswerValue;
  observation?: string;
  photoUrl?: string | null;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onObservation: (questionId: string, text: string) => void;
  onPhoto: (questionId: string, photoUrl: string | null) => void;
}

export function QuestionItem({ 
  question, 
  value, 
  observation, 
  photoUrl,
  onAnswer, 
  onObservation,
  onPhoto 
}: QuestionItemProps) {
  const [isExpanded, setIsExpanded] = useState(!!observation || !!photoUrl);

  const answerOptions: { value: AnswerValue; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { value: 'yes', label: 'SIM', icon: <Check className="h-4 w-4" />, activeClass: 'bg-success text-success-foreground border-success' },
    { value: 'no', label: 'NÃO', icon: <X className="h-4 w-4" />, activeClass: 'bg-destructive text-destructive-foreground border-destructive' },
    { value: 'na', label: 'N/A', icon: <Minus className="h-4 w-4" />, activeClass: 'bg-muted-foreground text-white border-muted-foreground' },
  ];

  const hasExtras = !!observation || !!photoUrl;

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all animate-fade-in",
      value === 'yes' && "bg-success/5 border-success/30",
      value === 'no' && "bg-destructive/5 border-destructive/30",
      value === 'na' && "bg-muted border-muted-foreground/20",
      !value && "bg-card border-border"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-start gap-2">
            {question.isCritical && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Item crítico</p>
                </TooltipContent>
              </Tooltip>
            )}
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {question.text}
            </p>
            {question.tip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{question.tip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {question.requiresMaterial && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                Requer material: {question.materialType}
              </span>
            )}
            {question.requiresPhoto && (
              <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">
                Foto obrigatória
              </span>
            )}
            {question.requiresComment && (
              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                Comentário obrigatório
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Answer buttons */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {answerOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onAnswer(question.id, option.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              value === option.value 
                ? option.activeClass 
                : "bg-background border-border text-muted-foreground hover:border-foreground/30"
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}

        <div className="flex items-center gap-1 ml-auto">
          {hasExtras && (
            <span className="text-xs text-muted-foreground mr-2">
              {photoUrl && '📷'} {observation && '💬'}
            </span>
          )}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground",
                  isExpanded && "text-primary"
                )}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-1" />
                    <MessageSquare className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Expandable section for photo and observation */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border space-y-4 animate-slide-up">
            {/* Photo upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Foto {question.requiresPhoto && <span className="text-warning">*</span>}
              </label>
              <PhotoUpload
                value={photoUrl}
                onChange={(url) => onPhoto(question.id, url)}
                placeholder={question.requiresPhoto ? "Foto obrigatória" : "Adicionar foto (opcional)"}
              />
            </div>

            {/* Observation field */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Observação {question.requiresComment && <span className="text-warning">*</span>}
              </label>
              <Textarea
                placeholder={question.requiresComment ? "Observação obrigatória..." : "Adicione uma observação..."}
                value={observation || ''}
                onChange={(e) => onObservation(question.id, e.target.value)}
                className="resize-none text-sm"
                rows={2}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
