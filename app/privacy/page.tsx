export const metadata = {
  title: "개인정보처리방침 | VESTRA",
  description: "VESTRA AI 자산관리 플랫폼 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>

      <p className="text-sm text-gray-500 mb-10">시행일: 2026년 3월 1일</p>

      <div className="space-y-10 text-sm text-gray-700 leading-relaxed">
        <p>
          BMI C&S(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 보호하고
          이와 관련한 고충을 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        {/* 제1조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 (수집하는 개인정보 항목)</h2>
          <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다:</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium border-b">구분</th>
                  <th className="px-3 py-2 text-left font-medium border-b">수집 항목</th>
                  <th className="px-3 py-2 text-left font-medium border-b">수집 방법</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 font-medium">필수</td>
                  <td className="px-3 py-2">이름, 이메일, 프로필 이미지</td>
                  <td className="px-3 py-2">소셜 로그인 (Google/카카오/네이버)</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 font-medium">선택</td>
                  <td className="px-3 py-2">사업자등록번호</td>
                  <td className="px-3 py-2">기업/부동산 등급 신청 시 직접 입력</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">자동 수집</td>
                  <td className="px-3 py-2">접속 IP, 서비스 이용 기록, 분석 이력</td>
                  <td className="px-3 py-2">서비스 이용 과정에서 자동 생성</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 (개인정보의 수집·이용 목적)</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회원 식별 및 서비스 제공</li>
            <li>일일 이용량 관리 및 역할 기반 접근 제어</li>
            <li>분석 이력 저장 및 대시보드 제공</li>
            <li>사업자 인증 처리</li>
            <li>서비스 개선 및 통계 분석 (비식별 처리)</li>
            <li>부정 이용 방지 및 서비스 안정성 확보</li>
          </ul>
        </section>

        {/* 제3조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium border-b">항목</th>
                  <th className="px-3 py-2 text-left font-medium border-b">보유 기간</th>
                  <th className="px-3 py-2 text-left font-medium border-b">근거</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2">회원 정보</td>
                  <td className="px-3 py-2">회원 탈퇴 시까지</td>
                  <td className="px-3 py-2">서비스 이용 계약</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2">분석 이력</td>
                  <td className="px-3 py-2">3년</td>
                  <td className="px-3 py-2">서비스 품질 관리</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2">접속 로그</td>
                  <td className="px-3 py-2">3개월</td>
                  <td className="px-3 py-2">통신비밀보호법</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">결제 기록</td>
                  <td className="px-3 py-2">5년</td>
                  <td className="px-3 py-2">전자상거래법</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
          <p>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 다음의 경우 예외로 합니다:</p>
          <ul className="list-decimal pl-5 mt-2 space-y-1.5">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법률의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차에 따라 요청이 있는 경우</li>
          </ul>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>AI 분석 관련 안내:</strong> 이용자가 입력한 등기부등본/계약서 텍스트는 AI 종합 의견 생성을 위해
              OpenAI API로 전송됩니다. 이 과정에서 텍스트에 포함된 주소, 금액 등의 정보가 처리되나,
              OpenAI의 API 데이터 사용 정책에 따라 학습에는 사용되지 않습니다.
            </p>
          </div>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 (개인정보의 파기)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</li>
            <li>전자적 파일 형태의 정보는 복구 및 재생이 불가능한 방법으로 파기하며, 종이 문서는 분쇄기로 파쇄합니다.</li>
          </ul>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 (이용자의 권리·의무)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 프로필 페이지에서 직접 처리 가능합니다.</li>
            <li>이용자는 개인정보의 처리 정지, 삭제를 요청할 수 있으며, 회원 탈퇴를 통해 모든 개인정보의 삭제를 요청할 수 있습니다.</li>
            <li>이용자는 개인정보 보호 관련 불만을 개인정보보호 책임자에게 신고할 수 있습니다.</li>
          </ul>
        </section>

        {/* 제7조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 (쿠키의 사용)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 인증 세션 유지 및 서비스 이용 편의를 위해 쿠키를 사용합니다.</li>
            <li>이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인이 필요한 서비스 이용에 제한이 있을 수 있습니다.</li>
          </ul>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 (개인정보 보호 책임자)</h2>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
            <p><strong>개인정보 보호 책임자:</strong> 김동의</p>
            <p><strong>직책:</strong> 대표이사</p>
            <p><strong>연락처:</strong> 010-8490-9271</p>
            <p><strong>이메일:</strong> privacy@vestra.kr</p>
          </div>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제9조 (개인정보 처리방침 변경)</h2>
          <p>
            본 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및
            정정이 있는 경우에는 변경사항 시행 7일 전부터 서비스 내 공지합니다.
          </p>
        </section>

        {/* 권익침해 구제방법 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제10조 (권익침해 구제방법)</h2>
          <p>개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
            <li>대검찰청 사이버수사과 (spo.go.kr / 1301)</li>
            <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 182)</li>
          </ul>
        </section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
          부칙: 본 개인정보처리방침은 2026년 3월 1일부터 시행합니다.
        </p>
      </div>
    </div>
  );
}
