import s from "./listings-list.module.css";

export default function ListingsListContent() {
  return (
    <div className={s.subListingsGrid}>

      {/* Row 1 Card 1 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg1}`}>
          <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
          <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실맨스</div>
          <div className={s.propMeta}>
            <span className={s.mType}>오피스텔</span>
            <span className={s.mArea}>33.2㎡</span>
            <span className={s.mFloor}>8층</span>
            <span className={s.mDate}>입주 1달 15일 이내</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>2</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 1 Card 2 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg5}`}>
          <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
          <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
          <div className={s.propMeta}>
            <span className={s.mType}>빌라/다세대</span>
            <span className={s.mArea}>59.4㎡</span>
            <span className={s.mFloor}>3층</span>
            <span className={s.mDate}>입주 1달 1일</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>6</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 1 Card 3 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg3}`}>
          <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
          <span className={s.badgeTrust}>안심인증</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>13.5억</div>
          <div className={s.propAddr}>서울시 강남구 대치동 966 대치아이파크</div>
          <div className={s.propMeta}>
            <span className={s.mType}>아파트</span>
            <span className={s.mArea}>84.9㎡</span>
            <span className={s.mFloor}>9/12층</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>49</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 2 Card 1 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg1}`}>
          <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
          <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실맨스</div>
          <div className={s.propMeta}>
            <span className={s.mType}>오피스텔</span>
            <span className={s.mArea}>33.2㎡</span>
            <span className={s.mFloor}>8층</span>
            <span className={s.mDate}>입주 1달 15일 이내</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>2</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 2 Card 2 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg5}`}>
          <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
          <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
          <div className={s.propMeta}>
            <span className={s.mType}>빌라/다세대</span>
            <span className={s.mArea}>59.4㎡</span>
            <span className={s.mFloor}>3층</span>
            <span className={s.mDate}>입주 1달 1일</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>6</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 2 Card 3 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg3}`}>
          <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
          <span className={s.badgeTrust}>안심인증</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>13.5억</div>
          <div className={s.propAddr}>서울시 강남구 대치동 966 대치아이파크</div>
          <div className={s.propMeta}>
            <span className={s.mType}>아파트</span>
            <span className={s.mArea}>84.9㎡</span>
            <span className={s.mFloor}>9/12층</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>49</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 3 Card 1 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg1}`}>
          <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>1.9억<span className={s.months}>12개월</span></div>
          <div className={s.propAddr}>서울시 송파구 잠실동 40 잠실맨스</div>
          <div className={s.propMeta}>
            <span className={s.mType}>오피스텔</span>
            <span className={s.mArea}>33.2㎡</span>
            <span className={s.mFloor}>8층</span>
            <span className={s.mDate}>입주 1달 15일 이내</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>2</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 3 Card 2 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg5}`}>
          <span className={`${s.badgeType} ${s.badgeJeonse}`}>전세</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>2.8억<span className={s.months}>24개월</span></div>
          <div className={s.propAddr}>서울시 마포구 합정동 402-5</div>
          <div className={s.propMeta}>
            <span className={s.mType}>빌라/다세대</span>
            <span className={s.mArea}>59.4㎡</span>
            <span className={s.mFloor}>3층</span>
            <span className={s.mDate}>입주 1달 1일</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>6</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

      {/* Row 3 Card 3 */}
      <div className={s.propertyCard}>
        <div className={`${s.propImg} ${s.pimg3}`}>
          <span className={`${s.badgeType} ${s.badgeSale}`}>매매</span>
          <span className={s.badgeTrust}>안심인증</span>
        </div>
        <div className={s.propBody}>
          <div className={s.propPrice}>13.5억</div>
          <div className={s.propAddr}>서울시 강남구 대치동 966 대치아이파크</div>
          <div className={s.propMeta}>
            <span className={s.mType}>아파트</span>
            <span className={s.mArea}>84.9㎡</span>
            <span className={s.mFloor}>9/12층</span>
          </div>
          <div className={s.propFooter}>
            <span className={s.propLikes}>49</span>
            <span>서울공인중개사</span>
          </div>
        </div>
      </div>

    </div>
  );
}
