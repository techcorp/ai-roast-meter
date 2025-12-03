export enum RoastMode {
  GENTLE_ROAST = 'Gentle Roast',
  COMPLIMENT = 'Wholesome Compliment',
  WHOLESOME_ROAST = 'Wholesome Roast',
}

export type RoastLanguage = 'English' | 'Hindi' | 'Roman Urdu';

export interface RoastResultData {
  roastType: string;
  message: string;
  vibe: string;
}

export interface RoastError {
  message: string;
}