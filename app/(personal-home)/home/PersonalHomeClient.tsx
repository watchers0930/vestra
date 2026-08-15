"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
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
  "광주광역시": {
    "광산구": ["남동","도산동","두정동","비아동","수완동","신가동","운남동","월계동"],
    "남구": ["구동","방림동","봉선동","사직동","주월동"],
    "동구": ["계림동","궁동","남동","동명동","산수동","서남동"],
    "북구": ["문흥동","신안동","운암동","일곡동","임동","중흥동","풍향동"],
    "서구": ["금호동","농성동","동천동","양동","치평동","화정동"],
  },
  "대전광역시": {
    "대덕구": ["대화동","목상동","법동","비래동","신탄진동","오정동"],
    "동구": ["가양동","낭월동","대동","소제동","신촌동","용운동","판암동"],
    "서구": ["갈마동","관저동","내동","도마동","둔산동","탄방동"],
    "유성구": ["구암동","궁동","노은동","덕명동","봉명동","원신흥동","지족동"],
    "중구": ["대흥동","목동","문화동","선화동","은행동","태평동"],
  },
  "울산광역시": {
    "남구": ["달동","삼산동","선암동","신정동","옥동"],
    "동구": ["방어동","서부동","전하동","주전동"],
    "북구": ["강동동","구유동","매곡동","신천동","정자동"],
    "울주군": ["범서읍","삼남면","상북면","서생면","언양읍","온양읍","청량읍"],
    "중구": ["교동","남외동","다운동","복산동","성남동","태화동","학성동"],
  },
  "세종특별자치시": {
    "세종시": ["가람동","고운동","나성동","다정동","대평동","도담동","반곡동","보람동","새롬동","소담동","아름동","어진동","종촌동","한솔동"],
  },
  "경기도": {
    "가평군": ["가평읍","설악면","청평면","하면"],
    "고양시 덕양구": ["능곡동","대덕동","성사동","신원동","원당동","토당동","화정동"],
    "고양시 일산동구": ["백석동","식사동","장항동","중산동"],
    "고양시 일산서구": ["가좌동","구산동","덕이동","대화동","주엽동","탄현동"],
    "과천시": ["갈현동","과천동","관문동","막계동","문원동","별양동","원문동","주암동"],
    "광명시": ["광명동","노온사동","소하동","일직동","철산동","하안동"],
    "광주시": ["곤지암읍","남종면","도척면","실촌읍","오포읍","초월읍","퇴촌면"],
    "구리시": ["갈매동","교문동","사노동","수택동","아천동","인창동"],
    "군포시": ["금정동","당동","대야미동","둔대동","부곡동","산본동"],
    "김포시": ["고촌읍","대곶면","마산동","사우동","양촌읍","운양동","장기동","통진읍"],
    "남양주시": ["별내동","수동면","오남읍","와부읍","조안면","진건읍","화도읍"],
    "부천시": ["괴안동","도당동","상동","소사동","심곡동","원미동"],
    "성남시 분당구": ["구미동","금곡동","백현동","분당동","서현동","수내동","야탑동","운중동","정자동"],
    "성남시 수정구": ["고등동","단대동","상적동","시흥동","신흥동","태평동"],
    "성남시 중원구": ["금광동","도촌동","상대원동","은행동","하대원동"],
    "수원시 권선구": ["고색동","권선동","금곡동","입북동","평동","호매실동"],
    "수원시 영통구": ["망포동","매탄동","원천동","이의동","영통동"],
    "수원시 장안구": ["송죽동","연무동","영화동","율전동","정자동"],
    "수원시 팔달구": ["고등동","교동","남창동","매산로","세류동"],
    "시흥시": ["거모동","과림동","군자동","대야동","매화동","신천동","정왕동"],
    "안산시 단원구": ["고잔동","대부동동","선감동","신길동","원시동","초지동"],
    "안산시 상록구": ["건건동","다목동","본오동","사사동","사동","수암동"],
    "안성시": ["공도읍","금광면","미양면","보개면","서운면","양성면","죽산면"],
    "안양시 동안구": ["갈산동","관양동","비산동","평촌동","호계동"],
    "안양시 만안구": ["박달동","안양동"],
    "양주시": ["광적면","남면","백석읍","은현면","장흥면"],
    "양평군": ["강상면","강하면","개군면","공흥면","단월면","서종면","양평읍"],
    "여주시": ["가남읍","강천면","금사면","대신면","북내면","여주읍"],
    "오산시": ["갈곶동","고현동","금암동","부산동","수청동","원동"],
    "용인시 기흥구": ["공세동","구갈동","기흥동","농서동","동백동","서천동"],
    "용인시 수지구": ["동천동","상현동","성복동","신봉동"],
    "용인시 처인구": ["고림동","남동","모현읍","백암면","양지면"],
    "의왕시": ["고천동","내손동","오전동","월암동","이동"],
    "의정부시": ["가능동","낙양동","민락동","신곡동","의정부동","장암동","호원동"],
    "이천시": ["관고동","대월면","마장면","모가면","부발읍","신둔면"],
    "파주시": ["금촌동","문산읍","법원읍","야당동","운정동","탄현면"],
    "평택시": ["고덕동","군문동","동삭동","세교동","소사동","용이동"],
    "포천시": ["가산면","관인면","군내면","내촌면","소흘읍","영중면"],
    "하남시": ["감북동","감이동","창우동","풍산동"],
    "화성시": ["기산동","남양읍","동탄면","마도면","반월동","봉담읍","우정읍"],
  },
  "강원도": {
    "강릉시": ["강동면","경포동","교동","남동","노암동","성남동","신영동"],
    "고성군": ["간성읍","거진읍","토성면"],
    "동해시": ["나안동","묵호동","북평동","어달동"],
    "삼척시": ["도계읍","미로면","원덕읍","하장면"],
    "속초시": ["교동","금호동","노학동","대포동","도문동"],
    "양구군": ["남면","방산면","양구읍"],
    "양양군": ["강현면","서면","손양면","양양읍"],
    "영월군": ["김삿갓면","무릉도원면","영월읍","주천면"],
    "원주시": ["개운동","관설동","단구동","단계동","봉산동","무실동"],
    "인제군": ["기린면","남면","북면","서화면","인제읍"],
    "정선군": ["고한읍","남면","사북읍","정선읍"],
    "철원군": ["갈말읍","근남면","동송읍","서면"],
    "춘천시": ["교동","동면","동내면","사농동","소양동","우두동"],
    "태백시": ["문곡동","소도동","장성동","철암동"],
    "평창군": ["대화면","미탄면","봉평면","용평면","평창읍"],
    "홍천군": ["남면","동면","북방면","서면","홍천읍"],
    "화천군": ["간동면","사내면","상서면","화천읍"],
    "횡성군": ["강림면","공근면","서원면","우천면","횡성읍"],
  },
  "충청북도": {
    "괴산군": ["감물면","괴산읍","소수면","청천면"],
    "단양군": ["가곡면","단양읍","매포읍","어상천면"],
    "보은군": ["내북면","마로면","보은읍","산외면"],
    "영동군": ["매곡면","상촌면","심천면","양강면","영동읍"],
    "옥천군": ["군북면","동이면","안남면","옥천읍"],
    "음성군": ["금왕읍","대소면","삼성면","소이면","음성읍"],
    "제천시": ["금성면","덕산면","봉양읍","수산면","제천동"],
    "증평군": ["도안면","증평읍"],
    "진천군": ["광혜원면","덕산읍","문백면","백곡면","초평면","진천읍"],
    "청주시 상당구": ["가덕면","낭성면","문의면","미원면","용담동"],
    "청주시 서원구": ["남이면","분평동","산남동","수곡동"],
    "청주시 청원구": ["내수읍","북이면","오창읍","옥산면"],
    "청주시 흥덕구": ["강서동","가경동","복대동","신봉동"],
    "충주시": ["가금면","금가면","노은면","대소원면","충주동"],
  },
  "충청남도": {
    "계룡시": ["금암동","남선면","두마면","엄사면"],
    "공주시": ["반포면","사곡면","신관동","유구읍"],
    "금산군": ["금산읍","금성면","남이면","부리면"],
    "논산시": ["가야곡면","강경읍","광석면","성동면"],
    "당진시": ["당진읍","면천면","석문면","합덕읍"],
    "보령시": ["남포면","대천동","오천면","주산면"],
    "부여군": ["규암면","남면","부여읍","세도면"],
    "서산시": ["대산읍","부석면","서산동","성연면"],
    "서천군": ["마산면","서천읍","한산면"],
    "아산시": ["권곡동","둔포면","배방읍","온양동"],
    "예산군": ["고덕면","광시면","덕산면","예산읍"],
    "천안시 동남구": ["광덕면","동면","병천면","성남면"],
    "천안시 서북구": ["성정동","성환읍","쌍용동","입장면"],
    "청양군": ["대치면","목면","비봉면","청양읍"],
    "태안군": ["근흥면","남면","소원면","태안읍"],
    "홍성군": ["광천읍","서부면","홍동면","홍성읍"],
  },
  "전라북도": {
    "고창군": ["고창읍","대산면","무장면","성내면"],
    "군산시": ["개복동","나운동","신풍동","조촌동"],
    "김제시": ["검산동","교동","금구면","만경읍"],
    "남원시": ["도통동","사매면","인월면","주생면"],
    "무주군": ["무주읍","무풍면","설천면","안성면"],
    "부안군": ["계화면","동진면","부안읍","위도면"],
    "순창군": ["금과면","순창읍","쌍치면","풍산면"],
    "완주군": ["고산면","구이면","봉동읍","삼례읍"],
    "익산시": ["금마면","낭산면","마동","부송동"],
    "임실군": ["강진면","덕치면","삼계면","임실읍"],
    "장수군": ["계남면","장수읍","천천면"],
    "전주시 덕진구": ["금암동","덕진동","만성동","송천동"],
    "전주시 완산구": ["다가동","서서학동","중노송동","평화동"],
    "정읍시": ["고부면","덕천면","신태인읍","정읍동"],
    "진안군": ["마령면","부귀면","진안읍"],
  },
  "전라남도": {
    "강진군": ["강진읍","군동면","도암면","마량면"],
    "고흥군": ["고흥읍","동강면","도덕면","포두면"],
    "곡성군": ["곡성읍","오곡면","오산면"],
    "광양시": ["광양읍","봉강면","옥곡면","중군동"],
    "구례군": ["구례읍","마산면","산동면","토지면"],
    "나주시": ["나주동","남평읍","봉황면","세지면"],
    "담양군": ["담양읍","대덕면","무정면","봉산면"],
    "목포시": ["달동","산정동","상동","용당동"],
    "무안군": ["무안읍","몽탄면","삼향읍","청계면"],
    "보성군": ["겸백면","득량면","벌교읍","보성읍"],
    "순천시": ["낙안면","매곡동","승주읍","왕지동"],
    "신안군": ["비금면","압해읍","임자면","자은면"],
    "여수시": ["돌산읍","삼산면","소라면","여서동"],
    "영광군": ["군남면","낙월면","법성면","영광읍"],
    "영암군": ["덕진면","도포면","삼호읍","영암읍"],
    "완도군": ["고금면","노화읍","완도읍","청산면"],
    "장성군": ["남면","북이면","북하면","장성읍"],
    "장흥군": ["관산읍","대덕읍","안양면","장흥읍"],
    "진도군": ["고군면","군내면","진도읍"],
    "함평군": ["나산면","대동면","함평읍"],
    "해남군": ["계곡면","마산면","북평면","해남읍"],
    "화순군": ["능주면","동면","이서면","화순읍"],
  },
  "경상북도": {
    "경산시": ["경산동","남산면","압량읍","용성면"],
    "경주시": ["건천읍","내남면","보문동","성건동"],
    "고령군": ["개진면","다산면","성산면","우곡면"],
    "구미시": ["고아읍","구평동","도량동","선산읍"],
    "군위군": ["군위읍","부계면","산성면","의흥면"],
    "김천시": ["감문면","개령면","김천동","남면"],
    "문경시": ["가은읍","마성면","문경읍","산양면"],
    "봉화군": ["봉화읍","물야면","상운면","소천면"],
    "상주시": ["낙동면","사벌국면","상주동","화서면"],
    "성주군": ["가천면","성주읍","수륜면","초전면"],
    "안동시": ["길안면","남후면","안동동","임동면"],
    "영덕군": ["강구면","달산면","병곡면","영덕읍"],
    "영양군": ["석보면","수비면","영양읍","일월면"],
    "영주시": ["봉현면","순흥면","영주동","풍기읍"],
    "영천시": ["고경면","금호읍","북안면","영천동"],
    "예천군": ["감천면","개포면","예천읍","용문면"],
    "울릉군": ["북면","서면","울릉읍"],
    "울진군": ["근남면","기성면","매화면","울진읍"],
    "의성군": ["가음면","금성면","봉양면","의성읍"],
    "청도군": ["각북면","금천면","청도읍","화양읍"],
    "청송군": ["부남면","부동면","청송읍","파천면"],
    "칠곡군": ["가산면","기산면","북삼읍","왜관읍"],
    "포항시 남구": ["대송면","동해면","오천읍","포항동"],
    "포항시 북구": ["기계면","기북면","신광면","흥해읍"],
  },
  "경상남도": {
    "거제시": ["거제면","고현동","남부면","옥포동"],
    "거창군": ["거창읍","마리면","남상면","가조면"],
    "고성군": ["개천면","고성읍","동해면","마암면"],
    "김해시": ["가락면","대동면","장유동","주촌면"],
    "남해군": ["고현면","남해읍","미조면","삼동면"],
    "밀양시": ["내일동","무안면","삼랑진읍","상남면"],
    "사천시": ["곤양면","서포면","사천읍","용현면"],
    "산청군": ["금서면","산청읍","삼장면","시천면"],
    "양산시": ["덕계동","동면","물금읍","상북면"],
    "의령군": ["가례면","궁류면","의령읍","정곡면"],
    "진주시": ["금곡면","대곡면","명석면","집현면"],
    "창녕군": ["계성면","남지읍","창녕읍","장마면"],
    "창원시 마산합포구": ["가포동","교방동","산호동","완월동"],
    "창원시 마산회원구": ["내서읍","봉암동","석전동","회원동"],
    "창원시 성산구": ["남양동","대방동","봉곡동","완암동"],
    "창원시 의창구": ["대산면","동읍","북면","팔용동"],
    "창원시 진해구": ["가주동","경화동","석동","여좌동"],
    "통영시": ["광도면","도산면","산양읍","욕지면"],
    "하동군": ["금남면","북천면","악양면","하동읍"],
    "함안군": ["가야읍","군북면","대산면","함안면"],
    "함양군": ["마천면","백전면","서하면","함양읍"],
    "합천군": ["가야면","덕곡면","합천읍","황강면"],
  },
  "제주특별자치도": {
    "서귀포시": ["강정동","남원읍","대정읍","대천동","동홍동","서홍동","성산읍","안덕면","중문동","표선면"],
    "제주시": ["건입동","구좌읍","노형동","삼도동","애월읍","연동","우도면","이도동","일도동","조천읍","추자면","한경면","한림읍","화북동"],
  },
};

export default function PersonalHomeClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const userName = session?.user?.name || "회원";
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const featRef = useRef<HTMLDivElement>(null);

  const sigunguList = sido ? Object.keys(REGIONS[sido] ?? {}) : [];
  const dongList = sido && sigungu ? (REGIONS[sido]?.[sigungu] ?? []) : [];

  function handleSido(v: string) { setSido(v); setSigungu(""); setDong(""); }
  function handleSigungu(v: string) { setSigungu(v); setDong(""); }

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
    <div className={s.wrap}>

      {/* ─── NAV ─── */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/home" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li><Link href="/listings">매물검색</Link></li>
            <li><Link href="/renewal/jeonse">전세보호</Link></li>
            <li><Link href="/renewal/rights">권리분석</Link></li>
            <li><Link href="/renewal/monitoring">등기감시</Link></li>
            <li><Link href="/renewal/contract">계약검토</Link></li>
            <li><Link href="/renewal/price-map">시세전망</Link></li>
            <li><Link href="/renewal/expert">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            {isLoggedIn ? (
              <>
                <span>{userName}님</span>
                <span className={s.navAuthDivider}>|</span>
                <Link href="/profile">마이페이지</Link>
                <span className={s.navAuthDivider}>|</span>
                <a onClick={() => signOut({ redirectTo: "/" })} style={{ cursor: "pointer" }}>로그아웃</a>
              </>
            ) : (
              <>
                <Link href="/login">로그인</Link>
                <span className={s.navAuthDivider}>|</span>
                <Link href="/signup">회원가입</Link>
              </>
            )}
          </div>
          <button
            className={`${s.navHamburger} ${menuOpen ? s.open : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴"
          >
            <span /><span /><span />
          </button>
        </div>
        <ul className={`${s.navMobileMenu} ${menuOpen ? s.open : ""}`}>
          <li><Link href="/listings">매물검색</Link></li>
          <li><Link href="/renewal/jeonse">전세보호</Link></li>
          <li><Link href="/renewal/rights">권리분석</Link></li>
          <li><Link href="/renewal/monitoring">등기감시</Link></li>
          <li><Link href="/renewal/contract">계약검토</Link></li>
          <li><Link href="/renewal/price-map">시세전망</Link></li>
          <li><Link href="/renewal/expert">전문가상담</Link></li>
          <li>
            <div className={s.navMobileAuth}>
              {isLoggedIn ? (
                <>
                  <span>{userName}님</span>
                  <Link href="/profile">마이페이지</Link>
                  <a onClick={() => signOut({ redirectTo: "/" })} style={{ cursor: "pointer" }}>로그아웃</a>
                </>
              ) : (
                <>
                  <Link href="/login">로그인</Link>
                  <Link href="/signup">회원가입</Link>
                </>
              )}
            </div>
          </li>
        </ul>
      </nav>

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
                {Object.keys(REGIONS).map((r) => <option key={r}>{r}</option>)}
              </select>
              <select value={sigungu} disabled={!sido} onChange={(e) => handleSigungu(e.target.value)}>
                <option value="">시 / 군 / 구 선택</option>
                {sigunguList.map((sg) => <option key={sg}>{sg}</option>)}
              </select>
              <select value={dong} disabled={!sigungu} onChange={(e) => setDong(e.target.value)}>
                <option value="">동 / 읍 / 면 선택</option>
                {dongList.map((d) => <option key={d}>{d}</option>)}
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
              <p className={s.featureDesc}>강구 을구 권리관계를 사가 분석하여 위험도와<br />시가 위험도를 한에서 한다면 제공합니다.</p>
            </div>
          </div>
          <div className={s.featureCard}>
            <div className={`${s.featureImg} ${s.fimg3}`} />
            <div className={s.featureBody}>
              <h3 className={s.featureTitle}>등기감시</h3>
              <p className={s.featureDesc}>등기부동의 변동을 실시간으로 감시하고<br />우경성 권흥 중점을 제공합니다.</p>
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
                <div className={s.propMeta}><span>아파트단지</span><span>84.9㎡</span><span>9층</span><span>12층</span></div>
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
                <div className={s.propMeta}><span>오피스텔</span><span>33.2㎡</span><span>유형</span><span>입주 1달 15일 이내</span></div>
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
                <div className={s.propMeta}><span>아파트</span><span>59.4㎡</span><span>4층</span><span>입주 1달 1일 일</span></div>
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
                <div className={s.propMeta}><span>아파트</span><span>59.4㎡</span><span>4층</span><span>입주 1달 1일 일</span></div>
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
                <div className={s.propMeta}><span>아파트단지</span><span>84.9㎡</span><span>9층</span><span>12층</span></div>
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
                <div className={s.propMeta}><span>오피스텔</span><span>33.2㎡</span><span>유형</span><span>입주 1달 15일 이내</span></div>
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
              <span className={s.specName}>법무사 김도현</span>
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

      {/* ─── FOOTER ─── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerLogo}>
              <div className={s.flogoIcon}>V</div>
              <span className={s.flogoText}>VESTRA</span>
            </div>
            <p className={s.footerTagline}>
              The Digital Curator of Real Estate<br />
              AI 기반 부동산 자산관리 플랫폼
            </p>
            <div className={s.footerContact}>
              BMI C&S | 대표이사 김동의<br />
              사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
              서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
              고객센터 010-8490-9271
            </div>
          </div>
          <div>
            <p className={s.footerColTitle}>Legal</p>
            <ul className={s.footerLinks}>
              <li><Link href="/privacy">개인정보처리방침</Link></li>
              <li><Link href="/terms">이용약관</Link></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Product</p>
            <ul className={s.footerLinks}>
              <li><Link href="#">기능 소개</Link></li>
              <li><Link href="/pricing">요금제</Link></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Company</p>
            <ul className={s.footerLinks}>
              <li><Link href="#">회사 소개</Link></li>
              <li><Link href="#">채용</Link></li>
              <li><Link href="#">뉴스레터</Link></li>
            </ul>
          </div>
          <div>
            <p className={s.footerColTitle}>Connect</p>
            <ul className={s.footerLinks}>
              <li><Link href="#">LinkedIn</Link></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 BMI-C&amp;S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>

    </div>
  );
}
