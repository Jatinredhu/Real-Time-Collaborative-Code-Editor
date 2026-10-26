import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';

export const LANGUAGES = {
  javascript: { label: 'JavaScript', extension: () => javascript() },
  python: { label: 'Python', extension: () => python() },
  cpp: { label: 'C++', extension: () => cpp() },
  java: { label: 'Java', extension: () => java() },
};

export function languageFor(name) {
  return LANGUAGES[name] ?? LANGUAGES.javascript;
}