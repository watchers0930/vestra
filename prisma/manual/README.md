# PDF-only 비회원 감시 DB 배포 게이트

`GuestMonitoring.role`을 읽고 쓰는 버전은 아래 순서를 모두 통과하기 전
배포·운영 승격 금지다. 기존 배포 스크립트가 이 검사를 자동 실행하지 않으므로
배포 담당자가 대상 환경별 성공 결과를 릴리스 기록에 남겨야 한다.
테스트 DB 통과는 운영 DB 통과를 대신하지 않는다.

1. 격리된 테스트 DB의 백업·복원 방법과 기존 앱 롤백 버전을 확인한다.
2. 테스트 DB에 `guest-monitoring-role.sql`을 수동 적용한다.
3. 테스트 앱과 같은 DB 사용자·스키마로 아래 읽기 전용 검증을 실행한다.
   테이블·컬럼 누락, TEXT가 아닌 타입, NOT NULL, 기본값, SELECT 권한 부족은
   빈 테이블에서도 실패해야 한다. 실패하거나 연결 대상을 확인할 수 없으면 중단한다.
4. `npx prisma generate` 후 해당 DB를 사용하는 테스트 환경에서 ORM의
   `guestMonitoring.findMany({ select: { role: true }, take: 1 })` 성공과
   owner/tenant 신청·결제·달력·cron 회귀를 확인한다. 컬럼 추가 전 레코드의
   `role = null`도 확인하며, 임의 기본값·기존 데이터 backfill은 하지 않는다.
5. 운영 대상·백업·복원 방법 확인 후 **대장님이 운영 DB에 SQL을 수동 적용**한다.
   운영 앱과 같은 DB 사용자·스키마로 3번 검증 및 4번 ORM 읽기를 다시 통과해야 한다.
6. 위 결과가 모두 성공한 뒤 코드의 테스트 배포와 smoke 검증을 진행한다.
   운영 승격은 별도 지시 후 진행하며, 승격 직전 운영 DB 게이트를 재실행한다.

아래 명령은 DB 인증 정보가 준비된 셸에서 실행한다. `PGSERVICE`는 배포 대상과
동일한 사용자·DB·search_path를 가리키는 서비스로 설정한다. URL·비밀번호를
명령 인자나 릴리스 기록에 남기지 않는다. Prisma URL의 `?schema=`를 쓰는 경우
psql 서비스에도 동일한 search_path를 설정해야 한다.

```sh
# 읽기 전용 사전 검사: 종료 코드 0만 통과. SQL 오류 후 계속 진행하지 않는다.
psql -X --set=ON_ERROR_STOP=1 --file=prisma/manual/verify-guest-monitoring-role.sql
```

적용 SQL의 `IF NOT EXISTS`는 멱등 재실행만 지원한다. 기존 동명 컬럼의 타입이나
제약이 다르면 검증을 통과하지 못하므로 자동 변환하지 말고 별도 검토한다.
검증 SQL은 DDL·데이터 수정을 수행하지 않는다. 이 파일 추가만으로 운영 DB 적용이
완료된 것은 아니다.

롤백 시 앱을 이전 버전으로 복구하고 nullable `role` 컬럼과 결제 증거를 유지한다.
컬럼 DROP, 운영 `prisma db push`/`migrate` 실행은 이 절차에 포함되지 않는다.
