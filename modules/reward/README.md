# LinkX · 나의 밤하늘 (Reward Gallery)

이 디렉터리는 **ZHUYUN 담당 리워드 보관함**의 독립 실행 가능한 HTML/CSS/JS 구현입니다. 390×844 기준, 프레임워크 없이 작동합니다. 기존 메인/미션/피드백 화면은 변경하지 않았습니다.

## 실행

프로젝트 최상위 폴더에서 `python -m http.server 8000`을 실행하고 다음 주소에 접속하세요.

- `http://localhost:8000/modules/reward/index.html`
- `http://localhost:8000/modules/reward/index.html?sort=newest` — 최신순으로 시작
- `http://localhost:8000/modules/reward/index.html?reward=5` — 05번 리워드 상세 열기

## 인터랙션

- `오래된순 / 최신순` 메뉴로 별자리 이미지와 클릭 위치를 함께 변경
- 상하 스크롤로 01–08 리워드 탐색
- 기본 전시 상태: 01–05 획득(클릭 가능), 06–08 미획득(45% 투명도, 안내 메시지)
- 획득 리워드 선택 시 해당 아이콘과 이름을 표시하는 모달, 바깥 클릭/닫기/Escape로 닫기
- 05번: 관련 미션 `짧게 먼저 말 걸어보기` 표시; 대화 요약은 실제 저장 데이터가 있을 때만 표시
- `대화 기록 보기`: 기존 팀 `modules/feedback/index.html`의 **예시 연습 로그 화면(17번 상태)** 으로 연결. 실제 사용자 대화 저장 기록과의 연동은 후속 팀 합의 필요
- 뒤로가기: 공통 `shared/navigation.js` 사용

## 팀 통합 계약

- `window.LinkXReward.open(5)`: 05번 리워드 상세 열기
- `window.LinkXReward.sort("newest"|"oldest")`: 정렬
- `window.LinkXReward.current()`: 현재 정렬/상세/획득 ID 반환
- `window.LinkXReward.refresh()`: 공통 스토어에서 획득 상태 다시 읽기

현재 저장소 `shared/store.js` 키 `linkx:v1`의 `unlockedRewards: number[]` 또는 `rewardUnlocked: number[]`가 있으면 획득 상태에 반영합니다. 데이터가 없으면 Figma 전시 샘플인 01–05 획득 상태로 표시합니다. 05번 요약은 `mission.summary` / `mission.feedbackSummary` 등 실제 저장 정보가 있으면 사용하고, 없으면 기록 미연결 상태를 명시합니다.

팀 메인 통합자는 `modules/reward/index.html`을 실제 진입 경로로 연결해야 합니다. **이 PR은 다른 담당자의 `index.html`/모듈을 수정하지 않습니다.** 메인 전시 네비게이터의 기존 리워드 애니메이션(`modules/mission/`)은 별도 흐름이며, 이 보관함 화면으로 넘어오는 연결을 추후 조정해야 합니다.

## Figma 원본

- Reward 오래된순: `1564:5657`
- Reward 최신순: `1798:74305`
- 팀 파일: https://www.figma.com/design/IRJ7lGiMvKZwZ5aTitqQQa/
- `art/`의 PNG는 기존 팀 Figma 별자리와 배경에서 내보낸 리소스입니다. 새 캐릭터나 아이콘을 생성하지 않았습니다.

## 점검 항목

- 모바일 390×844 및 작은 화면에서 좌표/스케일
- 드롭다운 클릭, 2가지 정렬과 스크롤 시작 위치
- 01–05 팝업 열기/닫기, 06–08 미획득 안내
- 05번 미션/요약, 기존 피드백 연습 로그로 이동/돌아오기
- 팀 메인·미션에서 리워드 보관함으로 들어오는 라우트 연결

**아직 하지 않은 작업:** 실제 사용자 대화 기록의 영속적인 상세 연결과 최종 팀 전시 라우팅/엔드 투 엔드 브라우저 테스트.