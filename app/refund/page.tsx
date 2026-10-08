export const metadata = {
  title: "취소 및 환불 정책 | VESTRA",
  description: "VESTRA AI 자산관리 플랫폼 유료 서비스 취소 및 환불 정책",
};

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">취소 및 환불 정책</h1>

      <p className="text-sm text-gray-500 mb-10">시행일: 2026년 1월 1일</p>

      <div className="space-y-10 text-sm text-gray-700 leading-relaxed">
        <p>
          본 정책은 BMI C&amp;S(이하 &ldquo;회사&rdquo;)가 운영하는 VESTRA 서비스(이하 &ldquo;서비스&rdquo;)의
          유료 서비스 이용에 관한 결제 취소 및 환불 기준을 정합니다. 본 정책은 「전자상거래 등에서의 소비자보호에
          관한 법률」(이하 &ldquo;전자상거래법&rdquo;), 「콘텐츠산업진흥법」 및 문화체육관광부 「콘텐츠이용자보호지침」을
          따릅니다. 본 정책에 정하지 않은 사항은 관련 법령 및 서비스 이용약관에 따릅니다.
        </p>

        {/* 제1조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 (유료 서비스의 종류)</h2>
          <p>회사가 제공하는 유료 서비스는 다음과 같습니다.</p>
          <ul className="list-decimal pl-5 mt-2 space-y-2">
            <li>
              <strong>구독 서비스</strong>: 월간 또는 연간 단위로 결제하는 정기 이용권(프로, 비즈니스).
              결제 기간 동안 AI 분석, 리포트 다운로드, 등기 감시 등 플랜별 기능을 제공하는 디지털 콘텐츠 서비스입니다.
            </li>
            <li>
              <strong>단건(1회성) 서비스</strong>: 등기부등본 발급 대행 등 건별로 결제하여 1회 제공받는 서비스입니다.
            </li>
          </ul>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 (구독 요금)</h2>
          <p>구독 서비스의 요금은 다음과 같습니다. (부가가치세 포함, 단위: 원)</p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium border-b">플랜</th>
                  <th className="px-3 py-2 text-left font-medium border-b">월간 결제</th>
                  <th className="px-3 py-2 text-left font-medium border-b">연간 결제</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="px-3 py-2">무료 (FREE)</td><td className="px-3 py-2">0원</td><td className="px-3 py-2">-</td></tr>
                <tr className="border-b"><td className="px-3 py-2">프로 (PRO)</td><td className="px-3 py-2">29,900원 / 월</td><td className="px-3 py-2">299,000원 / 년</td></tr>
                <tr><td className="px-3 py-2">비즈니스 (BUSINESS)</td><td className="px-3 py-2">99,000원 / 월</td><td className="px-3 py-2">990,000원 / 년</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-gray-500">
            ※ 연간 결제는 월간 대비 2개월분이 할인된 금액입니다. 요금은 회사 정책에 따라 변경될 수 있으며, 변경 시
            결제 화면 및 서비스 내에 사전 고지합니다. 이미 결제한 구독의 요금은 해당 이용 기간 동안 변경되지 않습니다.
          </p>
        </section>

        {/* 제3조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 (청약철회 — 결제 후 7일 이내)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>
              이용자는 유료 서비스 결제일부터 <strong>7일 이내</strong>이고, 해당 유료 콘텐츠의 이용을
              <strong> 개시하지 않은 경우</strong> 청약을 철회하고 <strong>전액 환불</strong>을 받을 수 있습니다.
            </li>
            <li>
              아래 각 경우에는 전자상거래법 제17조 제2항에 따라 청약철회가 제한될 수 있습니다. 회사는 이 경우
              청약철회가 제한된다는 사실을 결제 화면에 명확히 표시합니다.
              <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
                <li>이용자가 유료 콘텐츠의 이용(AI 분석 실행, 리포트 다운로드, 등기 감시 등록 등)을 이미 개시한 경우</li>
                <li>단건 서비스의 제공이 이미 완료된 경우</li>
              </ul>
            </li>
            <li>
              다만, 가분적(可分的)으로 제공되는 구독 서비스에서 <strong>아직 제공되지 않은 기간</strong>에
              해당하는 부분은 이용 개시 이후에도 제4조에 따라 청약철회(중도 해지 환불)가 가능합니다.
            </li>
          </ul>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 (구독 중도 해지 및 환불)</h2>
          <p>
            이용자는 언제든지 마이페이지에서 구독을 해지할 수 있습니다. 중도 해지 시 환불 기준은 다음과 같으며,
            환불액 산정 시 이미 이용한 기간은 할인 전 월간 정가를 기준으로 공제합니다.
          </p>
          <ul className="list-decimal pl-5 mt-3 space-y-2">
            <li>
              <strong>월간 구독</strong>: 결제 후 7일 이내이고 콘텐츠를 이용하지 않은 경우 전액 환불합니다.
              콘텐츠 이용을 개시한 경우 당월 이용요금은 환불되지 않으며, 해지 신청 시 다음 결제일부터 정기결제가
              중지되고 이미 결제한 당월 이용 기간까지는 서비스가 유지됩니다.
            </li>
            <li>
              <strong>연간 구독</strong>: 중도 해지 시 아래 금액을 환불합니다.
              <div className="mt-2 pl-4 border-l-2 border-gray-200 text-gray-600">
                환불액 = 결제금액 − (이미 이용한 개월 수 × 월간 정가) − 공제액
              </div>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
                <li>1개월 미만 이용 기간은 1개월로 계산합니다.</li>
                <li>공제액은 「콘텐츠이용자보호지침」에 따라 총 결제금액의 10%를 초과하지 않습니다.</li>
                <li>위 산식에 따라 환불액이 0원 이하인 경우 환불되지 않습니다.</li>
              </ul>
            </li>
          </ul>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 (단건 서비스의 환불)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>
              등기부등본 발급 대행 등 단건 서비스는 <strong>발급·제공이 완료되기 전</strong>에는 전액 환불이 가능합니다.
            </li>
            <li>
              결제 후 회사의 시스템 오류, 외부 기관 연동 실패 등으로 <strong>서비스가 제공되지 못한 경우</strong>
              결제금액 전액을 환불합니다.
            </li>
            <li>
              발급·제공이 정상적으로 완료된 경우, 해당 콘텐츠는 제공 완료된 디지털 콘텐츠로서 단순 변심에 의한
              환불이 제한됩니다.
            </li>
          </ul>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 (회사 귀책 사유로 인한 환불)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>
              회사의 귀책 사유로 서비스를 정상적으로 이용하지 못한 경우(중대한 서비스 장애, 콘텐츠 하자 등),
              이용자는 이용하지 못한 기간 또는 내용에 대하여 환불을 요청할 수 있습니다.
            </li>
            <li>
              이 경우 제4조의 공제 없이, 이용하지 못한 기간에 해당하는 금액을 일할(日割) 계산하여 환불합니다.
            </li>
          </ul>
        </section>

        {/* 제7조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 (환불이 제한되는 경우)</h2>
          <p>다음의 경우에는 환불이 제한될 수 있습니다.</p>
          <ul className="list-decimal pl-5 mt-2 space-y-1.5">
            <li>이용자의 귀책 사유로 콘텐츠가 멸실·훼손된 경우(회사가 제공한 콘텐츠의 하자는 제외)</li>
            <li>이용자가 유료 콘텐츠의 이용을 개시하여 그 가치가 현저히 감소한 경우</li>
            <li>부정한 방법으로 발급받은 무료 이용권·할인·프로모션 혜택에 의한 결제</li>
            <li>관련 법령 또는 이용약관을 위반하여 서비스 이용이 제한·정지된 경우</li>
          </ul>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 (환불 신청 및 처리 절차)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>
              환불은 마이페이지의 구독 해지 기능 또는 고객센터(아래 제10조)를 통해 신청할 수 있습니다.
            </li>
            <li>
              회사는 환불 사유가 확인되면 신청일부터 <strong>3영업일 이내</strong>에 환불을 처리합니다.
            </li>
            <li>
              환불은 원칙적으로 결제한 수단으로 이루어집니다. 신용카드 결제의 경우 카드 결제 취소로 처리되며,
              카드사의 사정에 따라 승인 취소 반영까지 추가 시간이 소요될 수 있습니다.
            </li>
            <li>
              결제 대행사(토스페이먼츠 등)의 결제 취소 정책 및 금융기관의 처리 일정에 따라 실제 환급 시점이
              달라질 수 있습니다.
            </li>
          </ul>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제9조 (정기결제 자동갱신의 해지)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>
              구독은 결제 주기(월간/연간)에 따라 자동으로 갱신될 수 있으며, 이용자는 다음 결제일 전까지 언제든지
              마이페이지에서 자동갱신을 해지할 수 있습니다.
            </li>
            <li>
              자동갱신을 해지하면 다음 결제가 청구되지 않으며, 이미 결제한 기간까지는 서비스가 정상 제공됩니다.
            </li>
            <li>
              회사는 자동 결제 예정일 및 결제 금액을 사전에 안내합니다.
            </li>
          </ul>
        </section>

        {/* 제10조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제10조 (문의 및 사업자 정보)</h2>
          <div className="space-y-1">
            <p><strong>상호:</strong> BMI C&amp;S</p>
            <p><strong>대표자:</strong> 김동의</p>
            <p><strong>사업자등록번호:</strong> 263-87-03481</p>
            <p><strong>통신판매업 신고번호:</strong> 2025-경기광명-0189</p>
            <p><strong>고객센터:</strong> 010-8490-9271</p>
          </div>
          <p className="mt-3 text-gray-600">
            환불·결제 관련 문의는 고객센터로 연락 주시기 바랍니다. 회사와 이용자 간 분쟁이 원만히 해결되지 않는
            경우 「콘텐츠산업진흥법」에 따른 콘텐츠분쟁조정위원회 또는 「소비자기본법」에 따른 한국소비자원에
            조정을 신청할 수 있습니다.
          </p>
        </section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
          부칙: 본 정책은 2026년 1월 1일부터 시행합니다.
        </p>
      </div>
    </div>
  );
}
