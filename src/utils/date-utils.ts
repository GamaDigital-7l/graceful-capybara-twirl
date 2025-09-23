import { format, parseISO, isValid } from 'date-fns';
import * as dateFnsTz from 'date-fns-tz'; // Corrigido: 'import *s' para 'import * as'
import { ptBR } from 'date-fns/locale';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data UTC para o fuso horário de São Paulo.
 * Esta função é útil quando você tem uma data em UTC (e.g., de um backend)
 * e quer representá-la corretamente no fuso horário de São Paulo.
 * @param date A data em UTC (pode ser um objeto Date ou string ISO).
 * @returns Um objeto Date no fuso horário de São Paulo.
 */
export const toSaoPauloTime = (date: Date | string): Date => {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(utcDate)) {
    console.warn("Invalid date provided to toSaoPauloTime:", date);
    return new Date('Invalid Date');
  }
  return dateFnsTz.toZonedTime(utcDate, SAO_PAULO_TIMEZONE); // Corrigido: 'utcToZonedTime' para 'toZonedTime'
};

/**
 * Formata uma data para exibição no fuso horário de São Paulo.
 * Esta função tenta ser inteligente sobre o tipo de entrada:
 * - Se for um objeto Date (geralmente do UI, já no fuso horário local), formata diretamente.
 * - Se for uma string YYYY-MM-DD (do Supabase), interpreta como data local e formata.
 * - Se for uma string ISO completa (com Z ou offset), interpreta como UTC e converte para SP antes de formatar.
 * @param date A data (pode ser um objeto Date ou string ISO/YYYY-MM-DD).
 * @param formatStr A string de formato (ex: 'dd/MM/yyyy HH:mm').
 * @returns A data formatada como string no fuso horário de São Paulo.
 */
export const formatSaoPauloTime = (date: Date | string, formatStr: string): string => {
  let dateObj: Date;

  if (typeof date === 'string') {
    // Se for uma string YYYY-MM-DD, crie um objeto Date que a interpreta como data local
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Cria um objeto Date que representa a data à meia-noite no fuso horário local do navegador
      dateObj = new Date(date + 'T00:00:00');
    } else {
      // Para strings ISO completas (e.g., de Supabase timestamp with time zone),
      // parseia como UTC e converte para o fuso horário de SP.
      dateObj = toSaoPauloTime(date);
    }
  } else {
    // Se já for um objeto Date (e.g., do seletor de calendário), assume que está no fuso horário local
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    console.warn("Invalid date provided to formatSaoPauloTime:", date);
    return 'Data Inválida';
  }

  // Usa a função `format` do date-fns, que respeita o fuso horário do objeto Date.
  // Isso evita o problema de dupla conversão de fuso horário que ocorria com `formatInTimeZone`
  // quando o input já era uma data local.
  return format(dateObj, formatStr, { locale: ptBR });
};

/**
 * Formata uma data para exibição de data (ex: '20 de julho de 2024') no fuso horário de São Paulo.
 * @param date A data (pode ser um objeto Date ou string ISO).
 * @returns A data formatada como string.
 */
export const formatSaoPauloDate = (date: Date | string): string => {
  return formatSaoPauloTime(date, 'PPP');
};

/**
 * Formata uma data para exibição de data e hora (ex: '20/07/2024 10:30') no fuso horário de São Paulo.
 * @param date A data (pode ser um objeto Date ou string ISO).
 * @returns A data e hora formatadas como string.
 */
export const formatSaoPauloDateTime = (date: Date | string): string => {
  return formatSaoPauloTime(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Formata uma data para exibição de hora (ex: '10:30') no fuso horário de São Paulo.
 * @param date A data (pode ser um objeto Date ou string ISO).
 * @returns A hora formatada como string.
 */
export const formatSaoPauloHour = (date: Date | string): string => {
  return formatSaoPauloTime(date, 'HH:mm');
};