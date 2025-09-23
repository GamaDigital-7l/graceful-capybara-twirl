import { format, parseISO, isValid, parse } from 'date-fns';
import { toZonedTime, formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'; // Importações nomeadas padrão
import { ptBR } from 'date-fns/locale';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data UTC para o fuso horário de São Paulo.
 * @param date A data em UTC (pode ser um objeto Date ou string ISO).
 * @returns Um objeto Date no fuso horário de São Paulo.
 */
export const toSaoPauloTime = (date: Date | string): Date => {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(utcDate)) {
    console.warn("Invalid date provided to toSaoPauloTime:", date);
    return new Date('Invalid Date'); // Retorna um objeto Date inválido para propagar o problema de forma clara
  }
  return toZonedTime(utcDate, SAO_PAULO_TIMEZONE); // Usando a função importada diretamente
};

/**
 * Formata uma data no fuso horário de São Paulo.
 * @param date A data (pode ser um objeto Date ou string ISO).
 * @param formatStr A string de formato (ex: 'dd/MM/yyyy HH:mm').
 * @returns A data formatada como string no fuso horário de São Paulo.
 */
export const formatSaoPauloTime = (date: Date | string, formatStr: string): string => {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(utcDate)) { // Verifica se a data é válida após o parse
    console.warn("Invalid date provided to formatSaoPauloTime:", date);
    return 'Data Inválida'; // Retorna uma string de fallback amigável
  }
  return formatInTimeZone(utcDate, SAO_PAULO_TIMEZONE, formatStr, { locale: ptBR }); // Usando a função importada diretamente
};

/**
 * Parses a 'YYYY-MM-DD' string as a date in the São Paulo timezone,
 * returning a Date object that represents midnight of that day in São Paulo.
 * This is crucial for correctly initializing date pickers.
 * @param dateString The date string in 'YYYY-MM-DD' format.
 * @returns A Date object representing the start of the day in São Paulo timezone.
 */
export const parseSaoPauloDateString = (dateString: string): Date => {
  if (!dateString) {
    return new Date('Invalid Date');
  }
  // Parse the string as a local date (without timezone interpretation)
  const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
  if (!isValid(parsedDate)) {
    console.warn("Invalid date string provided to parseSaoPauloDateString:", dateString);
    return new Date('Invalid Date');
  }
  // Convert this local date to a UTC date that, when viewed in São Paulo, is the correct local date.
  // This effectively "pins" the date to São Paulo's midnight.
  return zonedTimeToUtc(parsedDate, SAO_PAULO_TIMEZONE); // Usando a função importada diretamente
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