# TubeForge AI - AI 기반 YouTube 콘텐츠 제작 도구

## 프로젝트 개요
- **프로젝트명**: TubeForge AI (longporm0310)
- **목표**: AI를 활용한 YouTube 영상 스크립트, 썸네일, 음성 생성 자동화 도구
- **주요 기능**:
  - Google Gemini AI를 활용한 스크립트 자동 생성
  - AI 썸네일 이미지 생성
  - TTS(Text-to-Speech) 음성 생성
  - 트렌딩 주제 분석 및 추천
  - 실시간 채팅 기능 (Socket.io)
  - 다국어 지원 (한국어, 영어)

## 배포 URL
- **메인 도메인**: https://callai.my
- **서브 도메인**: https://www.callai.my
- **Cloudflare Pages**: https://longporm0310.pages.dev
- **최신 배포**: https://d2d61615.longporm0310.pages.dev
- **GitHub**: https://github.com/langsb16-collab/longporm0310

## 기술 스택
- **Frontend**: React 19 + TypeScript
- **스타일링**: TailwindCSS 4.1 + Motion (Framer Motion)
- **AI 서비스**: Google Gemini API (gemini-3.1-pro, gemini-2.5-flash)
- **아이콘**: Lucide React
- **빌드 도구**: Vite 6.2
- **배포**: Cloudflare Pages

## 주요 기능

### 완료된 기능
✅ **대시보드**
- 프로젝트 통계 및 현황 표시
- 최근 프로젝트 목록 보기

✅ **영상 제작 (Create)**
- 주제 입력 및 영상 길이 설정
- AI 스크립트 자동 생성
- 썸네일 프롬프트 생성 및 이미지 생성
- TTS 음성 생성

✅ **트렌드 분석 (Trends)**
- AI 기반 트렌딩 주제 추천
- 성장률 및 트렌드 이유 분석

✅ **채팅 기능 (Chat)**
- 실시간 메시지 교환
- 음성 메시지 녹음 및 전송
- 다국어 번역 기능

✅ **FAQ**
- AI 기반 FAQ 시스템

### API 엔드포인트
현재 프론트엔드 전용 배포로, 백엔드 API는 클라이언트 측에서 직접 Google Gemini API를 호출합니다.

**주요 API 기능:**
- `generateScript(topic, duration, showSource)` - 스크립트 생성
- `generateThumbnailPrompt(script)` - 썸네일 프롬프트 생성
- `generateImage(prompt)` - 썸네일 이미지 생성
- `generateAudio(text)` - TTS 음성 생성
- `getTrendingTopics()` - 트렌딩 주제 조회
- `translateMessage(text, targetLang)` - 메시지 번역

### 미구현 기능
⏳ **백엔드 통합**
- Express + Socket.io 서버는 Cloudflare Pages에서 지원하지 않아 프론트엔드만 배포됨
- 프로젝트 저장/관리 기능 비활성화 (SQLite DB 사용 불가)
- 실시간 채팅 기능 비활성화 (Socket.io 서버 필요)

⏳ **데이터 영속성**
- localStorage 또는 Cloudflare D1으로 대체 필요

## 환경 변수 설정

### 🔑 Google Gemini API 키 설정 방법

TubeForge AI는 Google Gemini API를 사용합니다. API 키를 설정하는 방법은 3가지입니다:

#### 방법 1: 브라우저에서 직접 입력 (가장 간단)
1. 웹사이트 접속: https://callai.my
2. "영상 만들기" 탭에서 "제작 시작" 버튼 클릭
3. API 키 입력 프롬프트가 나타나면 키 입력
4. 키는 브라우저 localStorage에 저장되어 다음부터는 입력 불필요

#### 방법 2: 로컬 개발 환경 (.env 파일)
```bash
# .env 파일 생성
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

#### 방법 3: Cloudflare Pages 환경 변수
1. Cloudflare Dashboard → Pages → longporm0310
2. Settings → Environment variables
3. 추가: `GEMINI_API_KEY` 또는 `VITE_GEMINI_API_KEY`
4. 값: your_gemini_api_key_here

**API 키 발급:**
- https://aistudio.google.com/apikey 에서 무료 발급 가능
```

## 로컬 개발

### 필수 조건
- Node.js 18+
- Google Gemini API Key

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Express + Socket.io)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## Cloudflare Pages 배포

### 배포 명령어
```bash
# 빌드
npm run build

# Cloudflare Pages에 배포
npx wrangler pages deploy dist --project-name longporm0310
```

### 배포 상태
- ✅ **활성**: 배포 완료 및 정상 작동
- **플랫폼**: Cloudflare Pages
- **마지막 업데이트**: 2026-03-10

## 데이터 아키텍처

### 현재 구조 (프론트엔드 전용)
- **클라이언트 측 상태 관리**: React useState/useEffect
- **API 호출**: Google Gemini API (직접 호출)
- **저장소**: 없음 (세션 기반)

### 원래 설계 (백엔드 포함)
- **데이터베이스**: SQLite (better-sqlite3)
- **실시간 통신**: Socket.io
- **테이블 구조**:
  - `projects`: 프로젝트 정보 (id, title, topic, duration, status, script, urls 등)
  - `messages`: 채팅 메시지 (id, user_id, text, type, urls, created_at)

## 다음 개발 단계

### 우선순위 높음
1. **Cloudflare D1 통합** - SQLite 데이터베이스를 Cloudflare D1으로 마이그레이션
2. **Cloudflare Durable Objects** - 실시간 채팅 기능을 Durable Objects로 구현
3. **Cloudflare Workers** - API 엔드포인트를 Workers로 구현

### 우선순위 중간
4. **사용자 인증** - Cloudflare Access 또는 OAuth 통합
5. **파일 업로드** - Cloudflare R2 스토리지 통합
6. **프로젝트 관리 개선** - 프로젝트 CRUD 기능 완성

### 우선순위 낮음
7. **성능 최적화** - Code splitting 및 lazy loading
8. **SEO 개선** - Meta tags 및 sitemap 추가
9. **분석 도구** - Google Analytics 또는 Cloudflare Analytics 통합

## 사용 가이드

1. **대시보드 탭**: 프로젝트 현황 및 통계 확인
2. **영상 만들기 탭**: 
   - 영상 주제 입력
   - 영상 길이 선택 (1-30분)
   - "스크립트 생성" 클릭
   - "썸네일 생성" 클릭
   - "음성 생성" 클릭
3. **트렌드 탭**: AI 추천 트렌딩 주제 확인
4. **채팅 탭**: 팀원과 실시간 소통 (현재 비활성화)

## 라이선스
Private Project

## 문의
- GitHub: https://github.com/langsb16-collab/longporm0310
- Email: langsb16@gmail.com
