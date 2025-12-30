-- Add requires_comment column to checklist_questions
ALTER TABLE checklist_questions 
ADD COLUMN requires_comment boolean NOT NULL DEFAULT false;