# LinkX · 나의 밤하늘 — A안

390×844 순수 HTML/CSS/JS. 최신 zhuyun Figma A안의 별자리, 밝은 원본 배경, 중앙 상세 팝업과 미션 회고를 구현합니다.

## 확인 경로

- 팀 전시 루트 → `리워드` → 별 누르기 → `리워드 확인하기` → 보관함
- 전시 메뉴의 `나의 밤하늘` → 보관함 직접 진입
- `/modules/reward/index.html?sort=newest` (기본) / `?sort=oldest`
- `/modules/reward/index.html?reward=5` (상세 바로 열기)

05 → 미션 회고 보기 → 상세로 돌아가기 → 닫기를 실제로 사용할 수 있습니다. 더 이상 존재하지 않는 `/modules/feedback/`를 iframe으로 열지 않습니다. 회고는 보관함 내부의 접근 가능한 화면으로 표시하므로 목록의 정렬과 스크롤 위치를 유지합니다.

수령 화면에서 보관함으로 들어온 경우 상단 뒤로 버튼은 `modules/mission/index.html?view=reward-3`로 돌아갑니다. 보상 애니메이션을 다시 재생하거나 보상을 중복 획득하지 않습니다.

## 데이터 계약

공통 `shared/store.js`의 `linkx:v1` 스토어를 사용합니다. 다른 팀 데이터는 덮어쓰지 않습니다.

- `unlockedRewards: number[]`: 획득한 보상. 빈 배열은 빈 보관함입니다. 기존 `rewardUnlocked` / `rewards.unlocked`도 읽습니다.
- `rewardRecords: { [rewardId]: { rewardId, missionId?, missionTitle?, acquiredAt?, reflection?, title?, achievement?, next?, source? } }`
- `acquiredAt`: ISO 날짜. 획득한 보상끼리 시각순으로 정렬하고, 미획득 보상은 그 뒤에 둡니다. 예전 시각 없는 전시 데이터는 기존 01→05 획득 순서를 유지합니다.
- `mission.rewardId` 또는 `mission.id === "greeting-05"`로 보상이 명확하게 연결된 경우 `reflection` / `feedbackSummary` / `summary` / `reviewSummary`를 읽습니다. 관련 없는 현재 미션의 요약을 05에 표시하지 않습니다.
- `claimReward(5)`는 재호출해도 기존 획득 시각과 회고를 유지합니다.

기존 전시 기본값은 01–05 획득입니다. 저장 데이터가 전혀 없을 때만, 팀 Figma 및 텍스트모드의 학생회관 인사 보고를 바탕으로 한 05 예시 회고를 제공합니다. 회고 화면에서 `예시 회고`로 표시합니다. 명시적인 획득 목록/기록이 있으면 예시를 섞지 않고, 누락된 회고는 빈 상태로 표시합니다.

01–04의 미확정 획득 조건은 구현에 넣지 않았습니다. 기존 보상명과 의미 설명만 표시합니다. 실사용자 회고를 저장하는 상위 모듈은 위 데이터 계약으로 값을 전달해야 합니다.

## 소재 및 검증

`art/reward-01.png`~`reward-08.png`, `trajectory.png`는 같은 팀 Figma 원본의 투명 내보내기이며 실제 노드, 이름, 상태는 DOM으로 표시합니다. 고정 별자리 PNG의 순서/획득 상태에 UI를 의존하지 않습니다.

```
python3 -m http.server 8765
node --test tests/reward-data.test.mjs
```

브라우저에서 수령→보관함→05→회고→반환, 양쪽 정렬, 미획득 06–08, 닫기/ESC, 수령 화면 반환을 확인합니다.
