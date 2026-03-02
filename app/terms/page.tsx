import { FileText } from "lucide-react";

export const metadata = {
  title: "이용약관 | VESTRA",
  description: "VESTRA AI 자산관리 플랫폼 이용약관",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <FileText size={28} className="text-primary" />
        <h1 className="text-2xl font-bold text-gray-900">이용약관</h1>
      </div>

      <p className="text-sm text-gray-500 mb-10">시행일: 2026년 3월 1일</p>

      <div className="space-y-10 text-sm text-gray-700 leading-relaxed">
        {/* 제1조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 (목적)</h2>
          <p>
            본 약관은 BMI C&S(이하 &ldquo;회사&rdquo;)가 운영하는 VESTRA 서비스(이하 &ldquo;서비스&rdquo;)의
            이용 조건 및 절차, 회사와 이용자의 권리·의무를 규정하는 것을 목적으로 합니다.
          </p>
        </section>

        {/* 제2조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 (용어의 정의)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>&ldquo;서비스&rdquo;란 회사가 제공하는 AI 기반 부동산 분석 플랫폼을 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
            <li>&ldquo;회원&rdquo;이란 소셜 로그인을 통해 계정을 생성한 이용자를 말합니다.</li>
            <li>&ldquo;게스트&rdquo;란 회원 가입 없이 서비스를 제한적으로 이용하는 자를 말합니다.</li>
          </ul>
        </section>

        {/* 제3조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 시행일 7일 전부터 서비스 내 공지합니다.</li>
            <li>변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ul>
        </section>

        {/* 제4조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 (회원 가입 및 등급)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회원 가입은 Google, 카카오, 네이버 소셜 계정을 통해 이루어집니다.</li>
            <li>
              회원 등급 및 일일 이용 한도는 다음과 같습니다:
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium border-b">등급</th>
                      <th className="px-3 py-2 text-left font-medium border-b">일일 분석</th>
                      <th className="px-3 py-2 text-left font-medium border-b">이용 범위</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="px-3 py-2">게스트</td><td className="px-3 py-2">2회</td><td className="px-3 py-2">기본 분석</td></tr>
                    <tr className="border-b"><td className="px-3 py-2">개인 (PERSONAL)</td><td className="px-3 py-2">5회</td><td className="px-3 py-2">전체 기능</td></tr>
                    <tr className="border-b"><td className="px-3 py-2">기업 (BUSINESS)</td><td className="px-3 py-2">50회</td><td className="px-3 py-2">전체 + 리포트</td></tr>
                    <tr><td className="px-3 py-2">부동산 (REALESTATE)</td><td className="px-3 py-2">100회</td><td className="px-3 py-2">전체 + 리포트 + 포트폴리오</td></tr>
                  </tbody>
                </table>
              </div>
            </li>
            <li>기업/부동산 등급은 사업자등록번호 제출 및 관리자 승인을 통해 부여됩니다.</li>
          </ul>
        </section>

        {/* 제5조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 (서비스의 내용)</h2>
          <p>회사가 제공하는 서비스는 다음과 같습니다:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>등기부등본 종합 분석 (권리분석)</li>
            <li>계약서 AI 검토</li>
            <li>세무 시뮬레이션</li>
            <li>시세 분석 및 전망</li>
            <li>전세 안전 분석</li>
            <li>AI 어시스턴트 상담</li>
          </ul>
        </section>

        {/* 제6조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 (이용자의 의무)</h2>
          <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
          <ul className="list-decimal pl-5 mt-2 space-y-1.5">
            <li>허위 정보를 입력하거나 타인의 정보를 도용하는 행위</li>
            <li>서비스의 분석 결과를 회사의 동의 없이 상업적으로 이용하는 행위</li>
            <li>서비스의 운영을 방해하거나 비정상적인 방법으로 접근하는 행위</li>
            <li>자동화된 수단(봇, 크롤러 등)으로 서비스를 이용하는 행위</li>
            <li>기타 관련 법령에 위반되는 행위</li>
          </ul>
        </section>

        {/* 제7조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 (서비스의 변경 및 중단)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>회사는 운영상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</li>
            <li>서비스 변경 또는 중단 시 회사는 사전에 서비스 내 공지합니다. 다만, 긴급한 사유가 있는 경우 사후에 공지할 수 있습니다.</li>
            <li>무료로 제공되는 서비스의 변경 또는 중단에 대해 회사는 별도의 보상 책임을 지지 않습니다.</li>
          </ul>
        </section>

        {/* 제8조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 (면책 및 책임 제한)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>
              본 서비스의 분석 결과는 <strong>참고용 정보</strong>이며, 법률적 조언, 투자 권유,
              세무 상담을 구성하지 않습니다. 분석 결과를 근거로 한 의사결정에 대한 책임은
              전적으로 이용자에게 있습니다.
            </li>
            <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
            <li>이용자의 귀책사유로 인한 서비스 장애에 대해 회사는 책임을 지지 않습니다.</li>
            <li>회사는 이용자가 서비스에 게재한 정보의 신뢰성, 정확성에 대해 책임을 지지 않습니다.</li>
          </ul>
        </section>

        {/* 제9조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제9조 (지적재산권)</h2>
          <p>
            서비스의 분석 엔진, 알고리즘, 디자인, 콘텐츠 등 일체의 지적재산권은 회사에 귀속됩니다.
            이용자는 회사의 사전 동의 없이 이를 복제, 전송, 출판, 배포, 방송 등 기타 방법에 의하여
            영리 목적으로 이용하거나 제3자에게 이용하게 할 수 없습니다.
          </p>
        </section>

        {/* 제10조 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">제10조 (분쟁 해결)</h2>
          <ul className="list-decimal pl-5 space-y-2">
            <li>본 약관의 해석 및 적용에 관한 사항은 대한민국 법률에 따릅니다.</li>
            <li>서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 서울중앙지방법원을 제1심 관할법원으로 합니다.</li>
          </ul>
        </section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
          부칙: 본 약관은 2026년 3월 1일부터 시행합니다.
        </p>
      </div>
    </div>
  );
}
