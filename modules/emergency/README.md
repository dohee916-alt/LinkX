# 긴급대화
기준: Figma 908:90935 (25개 화면). 첫 응원, 입력 중, 대화 진행, 긴 대화, 답변 재생성, 오류/로딩, 종료 확인, 대화 시작 전환, 출발 안내를 상태로 구성.
## 실행
루트에서 python -m http.server 8000 후 /modules/emergency/ 접속.
오른쪽 상단 별 → ../saved/?tab=emergency&from=emergency. 현재 저장목록은 연결 확인용 임시 화면이다. 돌아갈 때 resume=1로 대화 복원.
## QA
?preview=input / long / scroll / loading / regenerate / error&error=network / transition / departure / confirm.
오류 종류: prepare, network, response, general. 에러 프레임 91537은 로딩 상태.
## 아직 검증할 사항
AI 응답은 Figma 문구를 이용한 시연 데이터이며 실제 AI 호출 없음. 입력 중 OS 키보드는 브라우저 네이티브 키보드 사용. 버튼 이동 비율 및 전환 시간은 임시 값이며 원본 프로토타입 타이밍 확인 필요. 캐릭터 꼬리 동작은 별도 확인 필요. 다녀왔어/나가기의 실제 팀원 목적지는 공통 navigation에서 변경.
원본 Figma 에셋은 현재 로컬 다운로드 DNS 오류로 미등록. assets/emergency에 정확한 원본을 추가하고 브라우저 화면 확인 필요. 현재 CSS와 기능은 구현 초안이며 픽셀 검수 완료본이 아님.
