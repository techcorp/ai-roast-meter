import { RoastMode } from './types';
import { Flame, Heart, Sparkles } from 'lucide-react';

export const APP_NAME = "AI Roast Meter";

export const LANGUAGES = ['English', 'Hindi', 'Roman Urdu'] as const;

export const MODE_CONFIG = {
  [RoastMode.GENTLE_ROAST]: {
    label: "Gentle Roast",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/50",
    description: "Sharp, sarcastic, and meme-style. Good luck!",
  },
  [RoastMode.COMPLIMENT]: {
    label: "Compliment",
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/50",
    description: "Pure wholesome energy boost.",
  },
  [RoastMode.WHOLESOME_ROAST]: {
    label: "Wholesome Roast",
    icon: Sparkles,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    description: "Sweet and spicy. The best of both worlds.",
  },
};

export const LOADING_MESSAGES = [
  "Analyzing vibes...",
  "Consulting the council of roasting...",
  "Heating up the grill...",
  "Measuring wholesome levels...",
  "Preparing emotional damage (jk)...",
  "Scanning for style points...",
];