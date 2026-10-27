# 어릴 적 육성·꾸미기 게임에 대한 짧은 설문

세종대학교 콘텐츠 기획 수업 과제를 위해 외부 프레임워크 없이 만든 모바일 대응 설문입니다. `index.html`은 응답을 받고, `Code.gs`는 Google Sheets에 응답을 저장합니다. 응답 원본은 스프레드시트를 소유한 Google 계정에서만 확인하며 공개 결과 API는 제공하지 않습니다.

## 1. Google Sheets 만들기

1. Google Drive에서 **새로 만들기 → Google 스프레드시트**를 누릅니다.
2. 파일 이름을 `육성 꾸미기 게임 설문 응답`처럼 알아보기 쉽게 바꿉니다.
3. 시트에서 **확장 프로그램 → Apps Script**를 누릅니다.
4. Apps Script 편집기의 기존 코드를 모두 지우고 이 저장소의 `Code.gs` 내용을 전부 붙여 넣습니다.
5. 저장 아이콘을 누릅니다. `응답` 시트와 열 이름은 첫 응답 때 자동 생성되므로 직접 만들 필요가 없습니다.

`Code.gs`는 스프레드시트에 연결된 Apps Script에서 사용해야 합니다. Apps Script 홈페이지에서 독립 프로젝트를 만들면 활성 스프레드시트를 찾지 못합니다.

## 2. Apps Script 웹 앱 배포

1. 편집기 오른쪽 위 **배포 → 새 배포**를 누릅니다.
2. **유형 선택**의 톱니바퀴에서 **웹 앱**을 고릅니다.
3. 설명에 `설문 API`를 입력합니다.
4. **다음 사용자로 실행**은 `나`를 선택합니다.
5. **액세스 권한이 있는 사용자**는 `모든 사용자`를 선택합니다. 항목이 없으면 Workspace 관리자가 외부 공개를 제한한 것이므로 관리자에게 권한을 요청해야 합니다.
6. **배포**를 누르고, 처음 나타나는 Google 권한 화면에서 스프레드시트 접근을 승인합니다.
7. 배포 후 `/exec`로 끝나는 **웹 앱 URL**을 복사합니다. `/dev` 주소는 사용하지 않습니다.

코드를 바꾼 뒤에는 **배포 → 배포 관리 → 연필 아이콘 → 새 버전 → 배포**로 반영해야 합니다. 저장만으로 기존 배포가 갱신되지는 않습니다.

## 3. SCRIPT_URL 연결

복사한 `/exec` URL을 다음 두 위치의 따옴표 안에 넣습니다.

- `index.html` 상단 스크립트의 `const SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';`
- `results.html` 상단 스크립트의 `const SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';`

예시:

```js
const SCRIPT_URL = 'https://script.google.com/macros/s/배포_ID/exec';
```

두 파일에는 같은 URL을 넣습니다. `Code.gs`에는 URL을 넣지 않습니다.

## 4. 동작 확인

1. `index.html`을 브라우저에서 엽니다.
2. 필수 문항을 비운 채 **다음**을 눌러 경고를 확인합니다.
3. Q4에서 `해본 적 없다`, Q5에서 `없다`가 다른 보기와 동시에 선택되지 않는지 확인합니다.
4. Q5에서 `없다`를 고르면 Q6을 건너뛰고 Q7로 이동하는지 확인합니다.
5. Google Sheets에 `응답` 탭과 새 행이 생겼는지 확인합니다.
6. Google Sheets의 `응답` 탭에서 제출된 응답을 확인합니다. 시트를 공유하지 않으면 소유자만 볼 수 있습니다.

응답이 저장되지 않으면 웹 앱 공개 범위가 `모든 사용자`인지, `index.html`에 `/exec` URL을 넣었는지 확인합니다.

## 5. GitHub Pages 배포

1. 네 파일을 GitHub 저장소의 `main` 브랜치 루트에 올립니다.
2. 저장소의 **Settings → Pages**로 갑니다.
3. Source에서 `Deploy from a branch`를 고릅니다.
4. Branch는 `main`, 폴더는 `/(root)`를 선택하고 **Save**를 누릅니다.
5. 몇 분 뒤 표시되는 `https://사용자명.github.io/저장소명/` 주소로 접속합니다.
6. GitHub Pages에는 설문 페이지인 `index.html`만 배포됩니다. 결과는 Google Sheets에서 확인합니다.

## 파일 구성

- `index.html`: 10문항 설문, 필수 검증, 조건부 이동, 제출
- `results.html`: 로컬 분석용 대시보드이며 GitHub Pages에는 배포하지 않음
- `Code.gs`: Google Sheets 저장 및 공개 결과 조회 차단
- `README.md`: 설치와 배포 안내
