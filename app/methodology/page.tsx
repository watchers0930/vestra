import { VScoreMethodology } from "@/components/common/VScoreMethodology";

export const metadata = {
  title: "V-Score 방법론·검증 성능 | VESTRA",
  description: "VESTRA V-Score(부동산 안전성 점수)의 산출 원리·가중치·검증 성능·한계를 투명하게 공개합니다.",
};

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">V-Score 방법론·검증 성능</h1>
      <p className="text-sm text-gray-500 mb-10">
        공공데이터·등기부 기반으로 산출하는 부동산 안전성 점수의 원리와 검증 결과를 투명하게 공개합니다.
      </p>
      <VScoreMethodology />
    </div>
  );
}
