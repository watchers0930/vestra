/**
 * 한국어 부동산 문서 토크나이저 (규칙 기반)
 *
 * @module lib/nlp/tokenizer
 */

import type { Token } from "../nlp-ner-pipeline";

// 조사/어미 패턴 (부동산 문서에서 자주 등장)
const PARTICLES = [
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '으로', '로',
  '와', '과', '도', '만', '까지', '부터', '에게', '한테', '께',
  '이며', '이고', '이나', '으로서', '로서', '에서의', '에의',
];

/**
 * 규칙 기반 한국어 토크나이저
 * 정규표현식 패턴으로 공백/구두점 분리 + 조사 분리
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  const rawTokenRegex = /[가-힣a-zA-Z0-9]+(?:[.\-/][가-힣a-zA-Z0-9]+)*|[^\s가-힣a-zA-Z0-9]/g;
  let match: RegExpExecArray | null;

  while ((match = rawTokenRegex.exec(text)) !== null) {
    const tokenText = match[0];
    const start = match.index;

    if (/[가-힣]/.test(tokenText)) {
      const separated = separateParticle(tokenText);
      if (separated.length > 1) {
        let offset = start;
        for (const part of separated) {
          tokens.push({
            text: part.text,
            pos: part.isParticle ? 'JOSA' : 'NOUN',
            start: offset,
            end: offset + part.text.length,
          });
          offset += part.text.length;
        }
        continue;
      }
    }

    tokens.push({
      text: tokenText,
      pos: classifyPOS(tokenText),
      start,
      end: start + tokenText.length,
    });
  }

  return tokens;
}

function separateParticle(word: string): Array<{ text: string; isParticle: boolean }> {
  const sortedParticles = [...PARTICLES].sort((a, b) => b.length - a.length);

  for (const particle of sortedParticles) {
    if (word.endsWith(particle) && word.length > particle.length) {
      const stem = word.slice(0, -particle.length);
      if (stem.length >= 1) {
        return [
          { text: stem, isParticle: false },
          { text: particle, isParticle: true },
        ];
      }
    }
  }

  return [{ text: word, isParticle: false }];
}

function classifyPOS(text: string): string {
  if (/^\d+$/.test(text)) return 'NUM';
  if (/^[가-힣]+$/.test(text)) return 'NOUN';
  if (/^[a-zA-Z]+$/.test(text)) return 'ALPHA';
  if (/^[^\w\s]$/.test(text)) return 'PUNCT';
  return 'OTHER';
}
