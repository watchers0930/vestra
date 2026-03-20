# Data Integration Plan — 공공 데이터 3종 연동

## 개요
Vestra의 데이터 소스를 2개→5개로 확대하여 예측 정확도와 서비스 신뢰도를 향상시킨다.

## 추가 데이터 소스

### 1. 한국부동산원 R-ONE API
- **데이터**: 매매/전세 가격지수, 시장 통계
- **URL**: `https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do`
- **활용**: prediction-engine 시장사이클 분석에 공식 지수 반영
- **인증**: R-ONE 인증키 (무료)

### 2. 서울 열린데이터광장 실거래가 API
- **데이터**: 서울시 부동산 실거래가 (세분화)
- **URL**: `http://openapi.seoul.go.kr:8088/{KEY}/{TYPE}/tbLnOpendataRtmsV/...`
- **활용**: 서울 지역 데이터 크로스체크, MOLIT과 교차 검증
- **인증**: 서울시 인증키 (무료)

### 3. 건축물대장 API (기존 building-api.ts 고도화)
- **데이터**: 건물 용도, 면적, 층수, 건축년도, 공시가격
- **URL**: `http://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo`
- **활용**: 건물 상세정보를 예측 변수로 추가
- **인증**: MOLIT_API_KEY 재사용 (무료)

## 구현 순서
1. building-api.ts 고도화 (주소 파싱, 캐싱, 에러 핸들링)
2. reb-api.ts 신규 (한국부동산원 가격지수)
3. seoul-data-api.ts 신규 (서울시 실거래가)
4. prediction-engine.ts에 새 데이터 소스 통합
5. predict-value API 라우트에서 새 데이터 활용

## 예상 결과
- 데이터 소스: 2개 → 5개
- 시장 분석 근거: 자체 계산 → 공식 지수 + 자체 분석 병행
- 서울 지역 정밀도 향상
- 건물 특성 반영한 예측 고도화
