"use client";

import type { AnalysisResult } from "@/app/(app)/contract/types";
import { type Styles } from "./resultHelpers";
import ContractScoreHero from "./ContractScoreHero";
import ContractResultBody from "./ContractResultBody";

export { SEC_IDS } from "./resultHelpers";

interface Props {
  s: Styles;
  result: AnalysisResult;
  address: string;
  openClauses: Record<number, boolean>;
  toggleClause: (i: number) => void;
  openTerms: Record<number, boolean>;
  toggleTerm: (i: number) => void;
  activeSec: number;
  scrollToSec: (id: string) => void;
  onReanalyze: () => void;
}

export default function ContractResultSections({
  s, result, address,
  openClauses, toggleClause, openTerms, toggleTerm,
  activeSec, scrollToSec, onReanalyze,
}: Props) {
  return (
    <div className={s.pageWrap}>
      <ContractScoreHero s={s} result={result} address={address} onReanalyze={onReanalyze} />
      <ContractResultBody
        s={s}
        result={result}
        openClauses={openClauses}
        toggleClause={toggleClause}
        openTerms={openTerms}
        toggleTerm={toggleTerm}
        activeSec={activeSec}
        scrollToSec={scrollToSec}
      />
    </div>
  );
}
