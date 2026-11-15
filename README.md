# MOA Faith
말씀, 묵상, 기도와 예배당을 함께 이용하는 신앙 앱입니다.

## 실행
```sh
npm ci
npm run dev
```

## 검사
```sh
npm run build
npm test
npm run test:faith-startup
```

`.env.example`의 Firebase 웹 설정을 사용합니다. 로그인은 기본 계정과 AI 활동 계정을 별도로 유지합니다. 예배당의 접속 정보·캐릭터·공동 기도는 로그인 계정으로 공유됩니다.

## 구조
- `src/app`: Faith 진입 화면과 계정·업데이트 처리
- `src/apps/meditation`: 피드, 묵상·기도, 예배당, 질문, 내 기록
- `src/features/improvements`: Faith 질문 탭에 포함된 앱 개선 기능
- `src/services`: Firebase 연결과 세션 저장
- `scripts`: 시작·브라우저·데이터 권한 검사

앱 목록과 다른 앱의 화면·소스는 제거했습니다. 예전 앱 주소도 Faith로 연결됩니다. 기존 서버 데이터는 삭제하지 않습니다. PWA는 작성 중인 초안을 확인한 뒤 사용자가 업데이트를 적용하는 방식을 유지합니다.

운영: https://sohn0356-git.github.io/MOA/
