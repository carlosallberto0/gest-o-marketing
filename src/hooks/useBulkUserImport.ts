import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { getPublicAppUrl } from '@/hooks/usePublicAppUrl';

// Tipos para os registros
interface RawUserRecord {
  nome?: string;
  name?: string;
  email?: string;
  perfil?: string;
  role?: string;
  pdv?: string;
  posto?: string;
  modulos?: string;
  modules?: string;
}

export interface ParsedUserRecord {
  linha: number;
  nome: string;
  email: string;
  perfil: string;
  pdv: string;
  modulos: string[];
  pdvId?: string;
  errors: string[];
  isValid: boolean;
}

export interface ImportResult {
  linha: number;
  nome: string;
  email: string;
  perfil: string;
  success: boolean;
  accessLink?: string;
  error?: string;
}

export interface ImportSummary {
  total: number;
  criados: number;
  erros: number;
  results: ImportResult[];
}

interface PDVBasic {
  id: string;
  code: string;
  name: string;
}

const VALID_ROLES = ['manager', 'gerente', 'director', 'diretor', 'coordenador_compras', 'convenience_coordinator', 'coordenador_conveniencia'];
const VALID_MODULES = ['media', 'merchandising', 'midia'];

// Normaliza o nome do perfil para o valor do banco
function normalizeRole(role: string): string {
  const normalized = role.toLowerCase().trim();
  switch (normalized) {
    case 'gerente':
    case 'manager':
      return 'manager';
    case 'diretor':
    case 'director':
      return 'director';
    case 'coordenador_compras':
      return 'coordenador_compras';
    case 'coordenador_conveniencia':
    case 'convenience_coordinator':
      return 'convenience_coordinator';
    default:
      return normalized;
  }
}

// Normaliza os módulos
function normalizeModules(modulos: string): ('media' | 'merchandising')[] {
  if (!modulos) return ['merchandising', 'media'];
  
  const parts = modulos.split(/[,;]/);
  const result: ('media' | 'merchandising')[] = [];
  
  for (const part of parts) {
    const normalized = part.toLowerCase().trim();
    if (normalized === 'media' || normalized === 'midia' || normalized === 'mídia') {
      if (!result.includes('media')) result.push('media');
    } else if (normalized === 'merchandising' || normalized === 'merch') {
      if (!result.includes('merchandising')) result.push('merchandising');
    }
  }
  
  return result.length > 0 ? result : ['merchandising', 'media'];
}

// Normaliza header (remove acentos e lowercase)
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Valida email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function useBulkUserImport() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedUserRecord[]>([]);
  const [pdvs, setPdvs] = useState<PDVBasic[]>([]);

  // Gera template CSV
  const generateTemplate = useCallback(() => {
    const template = `nome;email;perfil;pdv;modulos
Carlos Silva;carlos@empresa.com;gerente;Posto Centro;merchandising,media
Maria Santos;maria@empresa.com;diretor;;merchandising,media
João Ferreira;joao@empresa.com;gerente;Posto Sul;media`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_usuarios.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Busca PDVs para mapeamento
  const fetchPDVs = useCallback(async () => {
    const { data, error } = await supabase
      .from('pdvs')
      .select('id, code, name')
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar PDVs:', error);
      return [];
    }
    
    setPdvs(data || []);
    return data || [];
  }, []);

  // Parseia arquivo Excel/CSV
  const parseFile = useCallback(async (file: File): Promise<ParsedUserRecord[]> => {
    const pdvList = await fetchPDVs();
    const pdvMap = new Map(pdvList.map(p => [p.name.toLowerCase(), p]));
    const pdvCodeMap = new Map(pdvList.map(p => [p.code.toLowerCase(), p]));
    
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<RawUserRecord>(worksheet, { defval: '' });
    
    const seenEmails = new Set<string>();
    const records: ParsedUserRecord[] = [];
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const linha = i + 2; // +2 porque Excel começa em 1 e tem header
      const errors: string[] = [];
      
      // Normaliza as chaves do objeto
      const normalizedRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        normalizedRow[normalizeHeader(key)] = String(value || '').trim();
      }
      
      // Extrai campos
      const nome = normalizedRow['nome'] || normalizedRow['name'] || '';
      const email = (normalizedRow['email'] || normalizedRow['e-mail'] || '').toLowerCase();
      const perfil = normalizedRow['perfil'] || normalizedRow['role'] || normalizedRow['cargo'] || '';
      const pdvNome = normalizedRow['pdv'] || normalizedRow['posto'] || '';
      const modulos = normalizedRow['modulos'] || normalizedRow['modules'] || 'merchandising,media';
      
      // Validações
      if (!nome) {
        errors.push('Nome é obrigatório');
      }
      
      if (!email) {
        errors.push('Email é obrigatório');
      } else if (!isValidEmail(email)) {
        errors.push('Email inválido');
      } else if (seenEmails.has(email)) {
        errors.push('Email duplicado no arquivo');
      } else {
        seenEmails.add(email);
      }
      
      const normalizedRole = normalizeRole(perfil);
      if (!perfil) {
        errors.push('Perfil é obrigatório');
      } else if (!['manager', 'director', 'coordenador_compras', 'convenience_coordinator'].includes(normalizedRole)) {
        errors.push(`Perfil inválido: ${perfil}. Use: gerente, diretor, coordenador_compras ou coordenador_conveniencia`);
      }
      
      // Mapeia PDV
      let pdvId: string | undefined;
      if (pdvNome) {
        const pdvMatch = pdvMap.get(pdvNome.toLowerCase()) || pdvCodeMap.get(pdvNome.toLowerCase());
        if (pdvMatch) {
          pdvId = pdvMatch.id;
        } else {
          errors.push(`PDV não encontrado: ${pdvNome}`);
        }
      }
      
      const normalizedModules = normalizeModules(modulos);
      if (normalizedModules.length === 0) {
        errors.push('Pelo menos um módulo é obrigatório');
      }
      
      records.push({
        linha,
        nome,
        email,
        perfil: normalizedRole,
        pdv: pdvNome,
        modulos: normalizedModules,
        pdvId,
        errors,
        isValid: errors.length === 0,
      });
    }
    
    setParsedRecords(records);
    return records;
  }, [fetchPDVs]);

  // Processa importação
  const processImport = useCallback(async (records: ParsedUserRecord[]): Promise<ImportSummary> => {
    const validRecords = records.filter(r => r.isValid);
    const results: ImportResult[] = [];
    let criados = 0;
    
    setIsProcessing(true);
    setProgress(0);
    
    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      
      try {
        const response = await supabase.functions.invoke('create-user', {
          body: {
            name: record.nome,
            email: record.email,
            role: record.perfil,
            modules: record.modulos,
            pdvId: record.pdvId,
          },
        });
        
        if (response.error) {
          results.push({
            linha: record.linha,
            nome: record.nome,
            email: record.email,
            perfil: record.perfil,
            success: false,
            error: response.error.message,
          });
        } else if (!response.data.success) {
          results.push({
            linha: record.linha,
            nome: record.nome,
            email: record.email,
            perfil: record.perfil,
            success: false,
            error: response.data.error || 'Erro ao criar usuário',
          });
        } else {
          criados++;
          results.push({
            linha: record.linha,
            nome: record.nome,
            email: record.email,
            perfil: record.perfil,
            success: true,
            accessLink: response.data.accessLink,
          });
        }
      } catch (error) {
        results.push({
          linha: record.linha,
          nome: record.nome,
          email: record.email,
          perfil: record.perfil,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
      
      setProgress(Math.round(((i + 1) / validRecords.length) * 100));
    }
    
    // Adiciona registros inválidos como erros
    const invalidRecords = records.filter(r => !r.isValid);
    for (const record of invalidRecords) {
      results.push({
        linha: record.linha,
        nome: record.nome,
        email: record.email,
        perfil: record.perfil,
        success: false,
        error: record.errors.join('; '),
      });
    }
    
    const summary: ImportSummary = {
      total: records.length,
      criados,
      erros: records.length - criados,
      results,
    };
    
    setSummary(summary);
    setIsProcessing(false);
    
    // Invalida queries para atualizar lista
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    
    return summary;
  }, [queryClient]);

  // Exporta links de acesso
  const exportAccessLinks = useCallback((results: ImportResult[]) => {
    const successResults = results.filter(r => r.success && r.accessLink);
    
    if (successResults.length === 0) return;
    
    const csv = [
      'nome;email;perfil;link_acesso',
      ...successResults.map(r => 
        `${r.nome};${r.email};${r.perfil};${r.accessLink}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `links_acesso_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Exporta log de erros
  const exportErrorLog = useCallback((results: ImportResult[]) => {
    const errorResults = results.filter(r => !r.success);
    
    if (errorResults.length === 0) return;
    
    const csv = [
      'linha;nome;email;erro',
      ...errorResults.map(r => 
        `${r.linha};${r.nome};${r.email};${r.error}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erros_importacao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Reset
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setSummary(null);
    setParsedRecords([]);
  }, []);

  return {
    // Estados
    isProcessing,
    progress,
    summary,
    parsedRecords,
    pdvs,
    
    // Funções
    generateTemplate,
    parseFile,
    processImport,
    exportAccessLinks,
    exportErrorLog,
    reset,
  };
}
