import { useState } from 'react';
import { ChecklistQuestion, AnswerValue } from '@/types/checklist';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle, Camera, MessageSquare, Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuestionItemProps {
  question: ChecklistQuestion;
  value: AnswerValue;
  observation?: string;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onObservation: (questionId: string, text: string) => void;
}

export function QuestionItem({ question, value, observation, onAnswer, onObservation }: QuestionItemProps) {
  const [showObservation, setShowObservation] = useState(!!observation);

  const answerOptions: { value: AnswerValue; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { value: 'yes', label: 'SIM', icon: <Check className="h-4 w-4" />, activeClass: 'bg-success text-success-foreground border-success' },
    { value: 'no', label: 'NÃO', icon: <X className="h-4 w-4" />, activeClass: 'bg-destructive text-destructive-foreground border-destructive' },
    { value: 'na', label: 'N/A', icon: <Minus className="h-4 w-4" />, activeClass: 'bg-muted-foreground text-white border-muted-foreground' },
  ];

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
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowObservation(!showObservation)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Observation field */}
      {showObservation && (
        <div className="mt-3 animate-slide-up">
          <Textarea
            placeholder="Adicione uma observação..."
            value={observation || ''}
            onChange={(e) => onObservation(question.id, e.target.value)}
            className="resize-none text-sm"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
