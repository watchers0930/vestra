export const metadata = {
  title: "법적고지 | VESTRA",
  description: "VESTRA AI 자산관리 플랫폼 법적고지 및 면책사항",
};

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">법적고지</h1>

      <p className="text-sm text-gray-500 mb-10">시행일: 2026년 3월 1일</p>

      <div className="space-y-10">
        {/* 1. 서비스 성격 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 (서비스의 성격 및 면책)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              VESTRA(이하 &ldquo;본 서비스&rdquo;)가 제공하는 부동산 분석 결과는 인공지능(AI) 및 자체 분석 엔진에
              의해 생성된 <strong>참고용 정보</strong>이며, 법률적 조언, 투자 권유, 세무 상담 또는 감정평가를
              대체하지 않습니다.
            </p>
            <p>
              본 서비스의 분석 결과를 근거로 한 부동산 거래, 투자, 계약 체결 등 모든 의사결정에 대한 책임은
              전적으로 이용자에게 있으며, BMI C&S(이하 &ldquo;회사&rdquo;)는 분석 결과의 정확성, 완전성,
              적시성을 보증하지 않습니다.
            </p>
            <p>
              <strong>부동산 거래 시 반드시 법무사, 공인중개사, 변호사, 세무사, 감정평가사 등 관련 전문가와
              상담하시기 바랍니다.</strong>
            </p>
          </div>
        </section>

        {/* 2. 데이터 출처 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 (데이터 출처 및 정확성)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>본 서비스는 다음의 공공데이터 및 외부 서비스를 활용하여 분석을 수행합니다:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>국토교통부 실거래가 공개시스템 (아파트 매매/전월세 실거래 데이터)</li>
              <li>대한법률구조공단 판례검색 서비스</li>
              <li>OpenAI GPT 모델 (AI 종합 의견 생성)</li>
              <li>자체 개발 분석 엔진 (등기부등본 파싱, 매매가 추정, 계약서 분석, 세무 계산)</li>
            </ul>
            <p>
              공공데이터는 해당 기관의 업데이트 주기에 따라 실시간 시세와 차이가 있을 수 있으며,
              AI 분석 결과는 모델의 특성상 오류를 포함할 수 있습니다. 회사는 데이터의 정확성이나
              분석 결과의 신뢰성에 대해 법적 책임을 지지 않습니다.
            </p>
          </div>
        </section>

        {/* 3. AI 분석 한계 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 (AI 분석의 한계)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>본 서비스의 AI 분석에는 다음과 같은 기술적 한계가 존재합니다:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>등기부등본 OCR/파싱 과정에서 텍스트 인식 오류가 발생할 수 있습니다.</li>
              <li>시세 추정은 과거 실거래 데이터에 기반하며, 미래 가격을 보장하지 않습니다.</li>
              <li>계약서 분석은 텍스트 기반이며, 계약의 법적 효력을 판단하지 않습니다.</li>
              <li>세무 계산은 2026년 기준 세법에 따른 추정치이며, 개별 상황에 따라 실제 세액과 차이가 있을 수 있습니다.</li>
              <li>전세 안전 분석은 공개된 데이터 범위 내에서의 판단이며, 임대인의 재정 상태 등 비공개 정보는 반영되지 않습니다.</li>
            </ul>
          </div>
        </section>

        {/* 4. 서비스 제공 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 (서비스 제공 및 중단)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              회사는 서비스의 안정적 운영을 위해 노력하나, 다음의 경우 사전 통보 없이 서비스가
              중단되거나 변경될 수 있습니다:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>시스템 점검, 업데이트, 장애 발생 시</li>
              <li>외부 API (국토교통부, OpenAI 등)의 서비스 장애 또는 정책 변경 시</li>
              <li>천재지변, 국가비상사태 등 불가항력 사유 발생 시</li>
            </ul>
            <p>
              이로 인한 서비스 중단, 데이터 손실, 분석 결과의 지연 등에 대해 회사는 책임을 지지 않습니다.
            </p>
          </div>
        </section>

        {/* 5. 지적재산권 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 (지적재산권)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              본 서비스의 분석 엔진, 알고리즘, UI 디자인, 로고, 콘텐츠 등 일체의 지적재산권은
              회사에 귀속됩니다. 이용자는 서비스를 통해 제공받은 분석 결과를 개인적 용도로만
              사용할 수 있으며, 회사의 사전 서면 동의 없이 상업적 목적으로 복제, 배포, 전송할 수 없습니다.
            </p>
          </div>
        </section>

        {/* 6. 준거법 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 (준거법 및 관할)</h2>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              본 법적고지의 해석 및 적용에 관한 사항은 대한민국 법률에 따르며,
              서비스 이용과 관련한 분쟁의 관할법원은 서울중앙지방법원으로 합니다.
            </p>
          </div>
        </section>

        {/* 회사 정보 */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">회사 정보</h2>
          <div className="text-sm text-gray-600 leading-relaxed space-y-1.5">
            <p><strong>상호:</strong> BMI C&S</p>
            <p><strong>대표이사:</strong> 김동의</p>
            <p><strong>사업자등록번호:</strong> 263-87-03481</p>
            <p><strong>주소:</strong> 서울시 강남구 테헤란로 322 한신인터밸리24 1712, 13호</p>
            <p><strong>전화:</strong> 010-8490-9271</p>
            <p><strong>이메일:</strong> support@vestra.kr</p>
          </div>
        </section>
      </div>
    </div>
  );
}
