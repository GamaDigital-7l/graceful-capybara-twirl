import { format, parseISO } from 'date-fns';
import * as dateFnsTz from 'date-fns-tz'; // Importar como namespace
import { ptBR } from 'date-fns/locale';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data UTC para o fuso horário de São Paulo.
 * @param date A data em UTC (pode ser um objeto Date ou string ISO).
 * @returns Um objeto Date no fuso horário de São Paulo.
 */
export const toSaoPauloTime = (date: Date | string): Date => {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsTz.utcToZonedTime(utcDate, SAO_PAULO_TIMEZONE);
};

/**
 * Formata uma data no fuso horário de São Paulo.
 * @param date A data (pode ser um objeto Date ou string ISO).
 * @param formatStr A string de formato (ex: 'dd/MM/yyyy HH:mm').
 * @returns A data formatada como string no fuso horário de São Paulo.
 */
export const formatSaoPauloTime = (date: Date | string, formatStr: string): string => {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsTz.formatInTimeZone(utcDate, SAO_PAULO_TIMEZONE, formatStr, { locale: ptBR });
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