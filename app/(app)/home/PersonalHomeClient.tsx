"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import s from "./personal-home.module.css";

const REGIONS: Record<string, Record<string, string[]>> = {
  "서울특별시": {
    "강남구": ["개포동","논현동","대치동","도곡동","삼성동","수서동","압구정동","역삼동","일원동","청담동"],
    "강동구": ["강일동","고덕동","길동","둔촌동","명일동","상일동","성내동","암사동","천호동"],
    "강북구": ["미아동","번동","수유동","우이동"],
    "강서구": ["가양동","개화동","공항동","내발산동","마곡동","방화동","화곡동"],
    "관악구": ["남현동","봉천동","신림동"],
    "광진구": ["광장동","구의동","군자동","능동","중곡동","자양동","화양동"],
    "구로구": ["가리봉동","개봉동","고척동","구로동","오류동","온수동","항동"],
    "금천구": ["독산동","시흥동"],
    "노원구": ["공릉동","상계동","월계동","중계동","하계동"],
    "도봉구": ["도봉동","방학동","쌍문동","창동"],
    "동대문구": ["답십리동","이문동","장안동","전농동","제기동","청량리동","회기동","휘경동"],
    "동작구": ["노량진동","대방동","동작동","본동","사당동","상도동","신대방동"],
    "마포구": ["공덕동","대흥동","도화동","망원동","상암동","서교동","신수동","아현동","합정동"],
    "서대문구": ["남가좌동","북가좌동","신촌동","연희동","창천동","홍은동","홍제동"],
    "서초구": ["내곡동","반포동","방배동","서초동","신원동","양재동","우면동","잠원동"],
    "성동구": ["금호동","마장동","사근동","성수동","송정동","옥수동","왕십리동","행당동"],
    "성북구": ["길음동","돈암동","동소문동","석관동","성북동","장위동","종암동"],
    "송파구": ["가락동","거여동","문정동","방이동","삼전동","석촌동","송파동","잠실동","풍납동"],
    "양천구": ["목동","신월동","신정동"],
    "영등포구": ["당산동","대림동","도림동","문래동","신길동","양평동","여의도동","영등포동"],
    "용산구": ["갈월동","남영동","동자동","서계동","이촌동","이태원동","청파동","한강로동","한남동"],
    "은평구": ["갈현동","녹번동","대조동","불광동","수색동","신사동","응암동","증산동"],
    "종로구": ["가회동","경운동","교남동","누상동","명륜동","부암동","사직동","삼청동","세종로","인사동","창신동","혜화동"],
    "중구": ["남산동","다동","명동","무교동","소공동","신당동","을지로","장충동","중림동","충무로","황학동"],
    "중랑구": ["면목동","묵동","상봉동","신내동","중화동"],
  },
  "부산광역시": {
    "강서구": ["강동동","눌차동","대저동","명지동","범방동"],
    "금정구": ["금사동","남산동","노포동","두구동","서동","선두구동","장전동"],
    "기장군": ["기장읍","날개읍","일광면","정관면","철마면"],
    "남구": ["대연동","문현동","용당동","용호동","우암동"],
    "동구": ["범일동","수정동","초량동"],
    "동래구": ["낙민동","명장동","복천동","사직동","안락동","온천동"],
    "부산진구": ["개금동","당감동","범전동","부전동","양정동","전포동"],
    "북구": ["구포동","덕천동","만덕동","화명동"],
    "사상구": ["감전동","괘법동","덕포동","모라동","삼락동","주례동"],
    "사하구": ["감천동","괴정동","구평동","다대동","당리동","하단동"],
    "서구": ["남부민동","동대신동","부용동","서대신동","아미동"],
    "수영구": ["광안동","남천동","망미동","민락동","수영동"],
    "연제구": ["거제동","연산동"],
    "영도구": ["남항동","동삼동","봉래동","신선동","청학동"],
    "중구": ["광복동","남포동","보수동","신창동","중앙동"],
    "해운대구": ["반여동","반송동","송정동","우동","재송동","중동","좌동"],
  },
  "대구광역시": {
    "남구": ["대명동","봉덕동","이천동"],
    "달서구": ["감삼동","두류동","상인동","송현동","월성동","유천동"],
    "달성군": ["가창면","구지면","논공읍","다사읍","옥포읍","유가읍","화원읍"],
    "동구": ["검사동","공산동","동내동","방촌동","신암동","신천동"],
    "북구": ["관음동","국우동","노원동","동호동","복현동","산격동"],
    "서구": ["내당동","비산동","평리동"],
    "수성구": ["고모동","만촌동","범물동","범어동","수성동","중동"],
    "중구": ["공평동","남산동","대신동","동성로","삼덕동","수창동","태평로"],
  },
  "인천광역시": {
    "강화군": ["강화읍","교동면","길상면","삼산면","서도면","양도면","양사면","하점면","화도면"],
    "계양구": ["계산동","귤현동","다남동","병방동","용종동","작전동"],
    "남동구": ["간석동","구월동","남촌동","논현동","만수동","서창동"],
    "동구": ["금창동","만석동","송림동","송현동","창영동"],
    "미추홀구": ["관교동","도화동","문학동","숭의동","용현동","주안동"],
    "부평구": ["갈산동","부개동","부평동","삼산동","산곡동","십정동"],
    "서구": ["가좌동","검단동","검암동","공촌동","당하동","마전동"],
    "연수구": ["동춘동","선학동","송도동","연수동","옥련동"],
    "옹진군": ["북도면","백령면","연평면","영흥면","자월면"],
    "중구": ["신흥동","운북동","운서동","을왕동","중산동"],
  },
  "경기도": {
    "가평군": ["가평읍","설악면","청평면","하면"],
    "고양시 덕양구": ["능곡동","대덕동","성사동","신원동","원당동","토당동","화정동"],
    "고양시 일산동구": ["백석동","식사동","장항동","중산동"],
    "고양시 일산서구": ["가좌동","구산동","덕이동","대화동","주엽동","탄현동"],
    "과천시": ["갈현동","과천동","관문동","막계동","문원동","별양동","원문동","주암동"],
    "광명시": ["광명동","노온사동","소하동","일직동","철산동","하안동"],
    "성남시 분당구": ["구미동","금곡동","백현동","분당동","서현동","수내동","야탑동","운중동","정자동"],
    "수원시 권선구": ["고색동","권선동","금곡동","입북동","평동","호매실동"],
    "수원시 영통구": ["망포동","매탄동","원천동","이의동","영통동"],
    "용인시 기흥구": ["공세동","구갈동","기흥동","농서동","동백동","서천동"],
    "용인시 수지구": ["동천동","상현동","성복동","신봉동"],
    "파주시": ["금촌동","문산읍","법원읍","야당동","운정동","탄현면"],
    "화성시": ["기산동","남양읍","동탄면","마도면","반월동","봉담읍","우정읍"],
  },
  "강원도": {
    "강릉시": ["강동면","경포동","교동","남동","노암동","성남동","신영동"],
    "춘천시": ["교동","동면","동내면","사농동","소양동","우두동"],
    "원주시": ["개운동","관설동","단구동","단계동","봉산동","무실동"],
  },
  "충청북도": {
    "청주시 상당구": ["가덕면","낭성면","문의면","미원면","용담동"],
    "청주시 서원구": ["남이면","분평동","산남동","수곡동"],
    "청주시 청원구": ["내수읍","북이면","오창읍","옥산면"],
    "청주시 흥덕구": ["강서동","가경동","복대동","신봉동"],
  },
  "충청남도": {
    "천안시 동남구": ["광덕면","동면","병천면","성남면"],
    "천안시 서북구": ["성정동","성환읍","쌍용동","입장면"],
    "아산시": ["권곡동","둔포면","배방읍","온양동"],
  },
  "전라북도": {
    "전주시 덕진구": ["금암동","덕진동","만성동","송천동"],
    "전주시 완산구": ["다가동","서서학동","중노송동","평화동"],
  },
  "전라남도": {
    "여수시": ["돌산읍","삼산면","소라면","여서동"],
    "순천시": ["낙안면","매곡동","승주읍","왕지동"],
    "목포시": ["달동","산정동","상동","용당동"],
  },
  "경상북도": {
    "포항시 남구": ["대송면","동해면","오천읍","포항동"],
    "포항시 북구": ["기계면","기북면","신광면","흥해읍"],
    "경주시": ["건천읍","내남면","보문동","성건동"],
    "구미시": ["고아읍","구평동","도량동","선산읍"],
  },
  "경상남도": {
    "창원시 성산구": ["남양동","대방동","봉곡동","완암동"],
    "창원시 의창구": ["대산면","동읍","북면","팔용동"],
    "김해시": ["가락면","대동면","장유동","주촌면"],
    "양산시": ["덕계동","동면","물금읍","상북면"],
  },
  "제주특별자치도": {
    "서귀포시": ["강정동","남원읍","대정읍","대천동","동홍동","서홍동","성산읍","안덕면","중문동","표선면"],
    "제주시": ["건입동","구좌읍","노형동","삼도동","애월읍","연동","우도면","이도동","일도동","조천읍","추자면","한경면","한림읍","화북동"],
  },
  "광주광역시": {
    "광산구": ["남동","도산동","두정동","비아동","수완동","신가동","운남동","월계동"],
    "북구": ["문흥동","신안동","운암동","일곡동","임동","중흥동","풍향동"],
    "서구": ["금호동","농성동","동천동","양동","치평동","화정동"],
  },
  "대전광역시": {
    "서구": ["갈마동","관저동","내동","도마동","둔산동","탄방동"],
    "유성구": ["구암동","궁동","노은동","덕명동","봉명동","원신흥동","지족동"],
  },
  "울산광역시": {
    "남구": ["달동","삼산동","선암동","신정동","옥동"],
    "울주군": ["범서읍","삼남면","상북면","서생면","언양읍","온양읍","청량읍"],
  },
  "세종특별자치시": {
    "세종시": ["가람동","고운동","나성동","다정동","대평동","도담동","반곡동","보람동","새롬동","소담동","아름동","어진동","종촌동","한솔동"],
  },
};

export default function PersonalHomeClient() {
  const router = useRouter();
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [activeDot, setActiveDot] = useState(0);
  const featRef = useRef<HTMLDivElement>(null);

  const sigunguList = sido ? Object.keys(REGIONS[sido] ?? {}) : [];
  const dongList = sido && sigungu ? (REGIONS[sido]?.[sigungu] ?? []) : [];

  function handleSido(v: string) {
    setSido(v);
    setSigungu("");
    setDong("");
  }

  function handleSigungu(v: string) {
    setSigungu(v);
    setDong("");
  }

  function goToArea() {
    const params = new URLSearchParams();
    if (sido) params.set("sido", sido);
    if (sigungu) params.set("sigungu", sigungu);
    if (dong) params.set("dong", dong);
    router.push(`/listings?${params.toString()}`);
  }

  useEffect(() => {
    const el = featRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollLeft / (el.offsetWidth - 14));
      setActiveDot(idx);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ fontFamily: "'Paperlogy', 'Apple SD Gothic Neo', 'Noto Sans KR', -apple-system, sans-serif", color: "#1a1d2e", fontSize: 14, lineHeight: "1.05" }}>

      {/* ─── HERO ─── */}
      <section className={s.hero}>
        <div className={s.heroPhoto} />
        <div className={s.heroInner}>
          <div className={s.heroText}>
            <p className={s.heroEyebrow}>AI-Powered Real Estate Curation</p>
            <h1 className={s.heroHeadline}>
              보이지 않는 위험까지 감지하는<br />
              부동산 권리분석 플랫폼
            </h1>
            <div className={s.heroBrand}>VESTRA</div>
            <p className={s.heroDesc}>
              VESTRA는 수만 개의 데이터 포인트를 정밀하게 분석하여<br />
              전문가의 통찰력을 디지털화합니다.
            </p>
          </div>
          <div className={s.heroRight}>
            <p className={s.heroSearchLabel}>살고 싶은 집을 찾아보세요</p>
            <div className={s.heroSearchStack}>
              <select value={sido} onChange={(e) => handleSido(e.target.value)}>
                <option value="">시 / 도 선택</option>
                {Object.keys(REGIONS).map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <select
                value={sigungu}
                disabled={!sido}
                onChange={(e) => handleSigungu(e.target.value)}
              >
                <option value="">시 / 군 / 구 선택</option>
                {sigunguList.map((sg) => (
                  <option key={sg}>{sg}</option>
                ))}
              </select>
              <select
                value={dong}
                disabled={!sigungu}
                onChange={(e) => setDong(e.target.value)}
              >
                <option value="">동 / 읍 / 면 선택</option>
                {dongList.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <button onClick={goToArea}>찾아가기</button>
            </div>
          </div>
        </div>
        <div className={s.heroFooter}>
          <span>출원 유형: 부동산 거래 위험도 산출장치 및 방법</span>
          <span className={s.heroFooterDivider}>|</span>
          <span>출원번호: 10-2026-0085160</span>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className={s.features}>
        <div className={s.featuresInner} ref={featRef}>
          <div className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg1}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>전세 위험도 분석</h3>
              <p className={s.featureDesc}>계약 정보를 입력하면 전세를 설정 필요성과<br />시가 위험도를 AI가 자동 분석합니다.</p>
            </div>
          </div>
          <div className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg2}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>등기부 관리 분석</h3>
              <p className={s.featureDesc}>갑구 을구 권리관계를 사가 분석하여 위험도와<br />시가 위험도를 한눈에 제공합니다.</p>
            </div>
          </div>
          <div className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg3}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>등기감시</h3>
              <p className={s.featureDesc}>등기부등본의 변동을 실시간으로 감시하고<br />우선순위 권리 변동을 즉시 알립니다.</p>
            </div>
          </div>
        </div>
        <div className={s.featureDots}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${s.dot} ${activeDot === i ? s.dotActive : ""}`} />
          ))}
        </div>
      </section>

      {/* ─── LISTINGS ─── */}
      <section className={s.listings} id="listings">
        <div className={s.listingsInner}>
          <h2 className={s.sectionHeading}>베스트라 인증 안심 매물</h2>
          <div className={s.listingsGrid}>

            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg3}`}>
                <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
                <span className={s.badgeTrust}>안심매물</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>13.5억</div>
                <div className={s.propAddr}>서울시 강남구 대치동 966 대치아파트</div>
                <div className={s.propMeta}>
                  <span>아파트단지</span><span>84.9㎡</span><span>9층</span><span>12층</span>
                </div>
                <div className={s.propFooter}><span>49</span><span>서울부동산중개사</span></div>
              </div>
            </div>

            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg1}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
                <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실빌딩</div>
                <div className={s.propMeta}>
                  <span>오피스텔</span><span>33.2㎡</span><span>유형</span><span>입주 1달 15일 이내</span>
                </div>
                <div className={s.propFooter}><span>2</span><span>서울부동산중개사</span></div>
              </div>
            </div>

            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg5}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
                <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
                <div className={s.propMeta}>
                  <span>아파트</span><span>59.4㎡</span><span>4층</span><span>입주 1달 1일</span>
                </div>
                <div className={s.propFooter}><span>6</span><span>서울부동산중개사</span></div>
              </div>
            </div>

            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg2}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
                <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
                <div className={s.propMeta}>
                  <span>아파트</span><span>59.4㎡</span><span>4층</span><span>입주 1달 1일</span>
                </div>
                <div className={s.propFooter}><span>6</span><span>서울부동산중개사</span></div>
              </div>
            </div>

            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg6}`}>
                <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
                <span className={s.badgeTrust}>안심매물</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>13.5억</div>
                <div className={s.propAddr}>서울시 강남구 대치동 966 대치아파트</div>
                <div className={s.propMeta}>
                  <span>아파트단지</span><span>84.9㎡</span><span>9층</span><span>12층</span>
                </div>
                <div className={s.propFooter}><span>49</span><span>서울부동산중개사</span></div>
              </div>
            </div>

            <div className={s.propertyCard}>
              <div className={`${s.propImg} ${s.pimg4}`}>
                <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
              </div>
              <div className={s.propBody}>
                <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
                <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실빌딩</div>
                <div className={s.propMeta}>
                  <span>오피스텔</span><span>33.2㎡</span><span>유형</span><span>입주 1달 15일 이내</span>
                </div>
                <div className={s.propFooter}><span>2</span><span>서울부동산중개사</span></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SPECIALIST ─── */}
      <section className={s.specialist}>
        <div className={s.specialistInner}>
          <h2 className={s.specialistTitle}>베스트라와 함께 하는 부동산 SPECIALIST</h2>
          <div className={s.specialistGrid}>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar1}`} />
              <span className={s.specRole}>조은법무법인</span>
              <span className={s.specName}>변호사 홍길동</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar2}`} />
              <span className={s.specRole}>회계법인 회계법인</span>
              <span className={s.specName}>회계사 강정동</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar3}`} />
              <span className={s.specRole}>대림법무법인</span>
              <span className={s.specName}>법무사 유재석</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar4}`} />
              <span className={s.specRole}>하나공인중개사사무소</span>
              <span className={s.specName}>중개사 박민준</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
            <div className={s.specCard}>
              <div className={`${s.specAvatar} ${s.savatar5}`} />
              <span className={s.specRole}>한울법무법인</span>
              <span className={s.specName}>변호사 이수진</span>
              <button className={s.specBtn}>문의하기</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
