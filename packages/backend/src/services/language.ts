import { franc } from 'franc';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'auto', name: 'Auto-detect language', nativeName: 'Auto-detect' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

const ISO3_TO_ISO1: Record<string, string> = {
  eng: 'en',
  tam: 'ta',
  hin: 'hi',
  tel: 'te',
  kan: 'kn',
  mal: 'ml',
  ben: 'bn',
  mar: 'mr',
  guj: 'gu',
  pan: 'pa',
  urd: 'ur',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  cmn: 'zh',
  zho: 'zh',
  jpn: 'ja',
};

const ISO1_TO_NAME: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
};

/**
 * Detect language from text using franc and Unicode script heuristics.
 */
export function detectLanguage(text: string): { code: string; name: string; confidence: number } {
  if (!text || text.trim().length < 5) {
    return { code: 'en', name: 'English', confidence: 0.5 };
  }

  const sample = text.slice(0, 2000);

  // Unicode script heuristics for Indian and CJK scripts (fallback/primary boost)
  if (/[஀-௿]/.test(sample)) {
    return { code: 'ta', name: 'Tamil', confidence: 0.95 };
  }
  if (/[ऀ-ॿ]/.test(sample)) {
    return { code: 'hi', name: 'Hindi', confidence: 0.95 };
  }
  if (/[ఀ-౿]/.test(sample)) {
    return { code: 'te', name: 'Telugu', confidence: 0.95 };
  }
  if (/[ഀ-ൿ]/.test(sample)) {
    return { code: 'ml', name: 'Malayalam', confidence: 0.95 };
  }
  if (/[ಀ-೿]/.test(sample)) {
    return { code: 'kn', name: 'Kannada', confidence: 0.95 };
  }
  if (/[ঀ-৿]/.test(sample)) {
    return { code: 'bn', name: 'Bengali', confidence: 0.95 };
  }
  if (/[઀-૿]/.test(sample)) {
    return { code: 'gu', name: 'Gujarati', confidence: 0.95 };
  }
  if (/[਀-੿]/.test(sample)) {
    return { code: 'pa', name: 'Punjabi', confidence: 0.95 };
  }
  if (/[؀-ۿ]/.test(sample)) {
    return { code: 'ur', name: 'Urdu', confidence: 0.90 };
  }
  if (/[一-鿿]/.test(sample)) {
    return { code: 'zh', name: 'Chinese', confidence: 0.95 };
  }
  if (/[぀-ヿ]/.test(sample)) {
    return { code: 'ja', name: 'Japanese', confidence: 0.95 };
  }

  // Use franc for Latin and other scripts
  const iso3 = franc(sample, { minLength: 3 });
  if (iso3 && iso3 !== 'und') {
    const iso1 = ISO3_TO_ISO1[iso3] || 'en';
    const name = ISO1_TO_NAME[iso1] || 'English';
    return { code: iso1, name, confidence: 0.85 };
  }

  return { code: 'en', name: 'English', confidence: 0.6 };
}

export function getLanguageName(code: string): string {
  return ISO1_TO_NAME[code] || code;
}
