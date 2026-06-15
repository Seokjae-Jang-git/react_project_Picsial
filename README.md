# 📷 Picsial (픽셜) 
> 사진 관련 소셜 미디어 채널 Picsial(픽셜) 입니다. <br>
많은 정보 공유와 관심 부탁 드립니다.

***
![대표사진](https://github.com/Seokjae-Jang-git/react_project_Picsial/blob/31311da814027d8f66384dee1a45147c9cd9c1ee/readme_images/logo_picsial.png)

## 🍀 프로젝트 소개
픽셜은 사진 (Picture) + 관계(Social)의 합성어로,<br>
사진을 취미 또는 전문으로 하는 사람들이 **고화질의 사진을 서로 공유하고 좋은 영감과 아이디어를 얻는** 사이트 입니다.<br>
또한 사진 외 촬영 팁, 출사, 강의 등 정보 공유 및 홍보도 가능합니다.

- 피드 종류를 **사진/게시물**로 나누었습니다.
- 사진은 **사진 자체에 집중**하고, 사진 외 촬영 팁, 출사, 강의 등은 게시물에서 다룹니다.
- **다양한 카테고리 필터와 정렬 기능**을 통해 많은 사진과 게시물을 편하게 조회가 가능합니다.
- **관심 작가(사용자)를 팔로우** 하여 업로드한 사진과 게시물을 볼 수 있습니다.
***
## 📆 개발 기간
- 26.5.28 ~ 6.8 (9일)
***
## ✨ 개발 목적
- 다양한 사진을 공유하고 사용자들 간에 소통을 통해, 사진의 아름다움과 매력을 느낄 수 있는 장소를 만들고자 함. 
- 사진 외 관련 컨텐츠 (촬영 팁, 출사, 강의 등)도 하나의 장소에서 접할 수 있도록 설계
- 프로 작가와 스튜디오는 홍보 및 프로젝트를 만들 수 있는 기회의 장소 제공
- 아마추어 작가는 전문 작가의 영향을 받아 촬영 기술 향상 기회의 장소 제공
***
## 🛠 사용 기술

| 구분 | 기술 스택 |
| :--- | :--- |
| **Language** | ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) |
| **Frontend** | ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)|
| **Backend** | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) ![Synology](https://img.shields.io/badge/Synology-0067E6?style=for-the-badge&logo=synology&logoColor=white)|
| **Database** | ![Oracle](https://img.shields.io/badge/Oracle-%23F80000.svg?style=for-the-badge&logo=oracle&logoColor=white)|
| **Auth & Security** | ![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens) ![Bcrypt](https://img.shields.io/badge/Bcrypt-white?style=for-the-badge&logo=linux-foundation&logoColor=black) |

***
## 📌 주요 기능
### **1. 고화질 사진 보기**
 - 사용자들이 업로드한 고화질의 사진을 **카테고리 필터와 정렬**을 통해 한눈에 보기 가능 
 - 사진 상세페이지에서 사진 이미지를 확대하여 **사진만 보기** 가능
 - **촬영 정보 및 사진의 메타정보** 보기 가능

***
### **2. 게시물 보기**
 - 사용자들이 업로드한 게시물을 **카테고리 필터와 정렬**을 통해 한눈에 보기 가능
 - 게시물 상세페이지에서 전체 게시글 확인 가능 및 첨부파일 다운 가능 
 - 사진 관련 콘텐츠를 접할 수 있음 (강의, 장비, 촬영 팁, 출사 등)
   
***
### **3. 팔로잉**
- 활동 중인 작가(사용자)와 대표 사진들을 보고 팔로우/팔로우 취소, 메세지 보내기 가능
- 메시지 버튼 클릭 시 작가와 1대1 메시지 대화 가능
- 작가(사용자) 프로필 이미지 클릭 시 작가의 상세페이지로 이동
- 작가 상세 페이지에서 작가의 사진 및 게시물을 모아보기 가능

***
### **4. 스크랩**
- 좋아요와 구분된 스크랩 기능을 제공
- 스크랩을 한 사진과 게시물을 마이페이지에서 모아보기 가능
  
***
### **5. 업로드**
- 사진/게시물 구분한 업로드 기능을 제공
- 사진 다중 업로드 지원, 사진 첨부 시 자동으로 사진 메타데이터 채취
- 카테고리, 태그 지정 가능
- 업로드 하는 파일이 **외부 미디어 서버(NAS)에 저장되고 조회**되는 구조 설계

***
### **6. 마이페이지**
- 내 활동 관련 대쉬보드 제공 (내 프로필, 팔로잉, 메세지, 알림, 내 사진, 내 게시물)
- 내 통계 정보 제공 (팔로워 수, 팔로잉 수, 총 좋아요 수, 총 스크랩 수)
- 내 계정: 프로필 및 선호 카테고리 수정, 계정 삭제 가능
- 내 업로드: 내가 업로드한 사진 및 게시물 모아보기 가능
- 내 스크랩: 내가 스크랩한 사진 및 게시물 모아보긱 가능
- 내 팔로잉: 내가 팔로잉한 작가를 모아보고, 상세페이지 이동, 팔로우 취소, 메세지 보내기 가능

***
### **7. 메세지**
- 쪽지 형식의 메세지를 대화 형식의 메세지로 구현 (HTTP REST API)
- 팔로잉 목록을 보여주어 편리성 향상
- 대화창 열기/닫기 가능, 대화상대 차단/해제 가능
- 대화 상대 검색하여 대화 시작 가능
- 읽지 않은 메세지 뱃지 알림 가능

***
### **8. 알림**
- 타입 (좋아요, 스크랩, 댓글, 팔로우, 메세지) 필터, 정렬 기능 제공
- 안읽은 메세지 뱃지 알림 적용 및 모두 읽음 기능 제공
- 알림 클릭 시, 해당 게시물 또는 메세지, 작가 상세로 이동 

***
## 참조
### **1.설계 자료**
- ERD  https://drive.google.com/file/d/1ujnA0RB_OlbIBEC6mi_KOKXnzKo4TNHY/view?usp=sharing
- 화면 정의서  https://drive.google.com/file/d/1l70aB0mHD2ZWIUAJLD54a1zSe71e2qFG/view?usp=sharing

### **2.소개 PPT**
- Picsial 소개 PPT https://drive.google.com/file/d/1HLjAZxOVSn6Vrcj7yZXiCJbMo0CRDSOk/view?usp=sharing

### **3.시연 영상**
- 회원가입 https://drive.google.com/file/d/1RuSZxU1uL_EwhI-gtq8th60kqRX9m-Pa/view?usp=sharing
- 로그인, 메인페이지 https://drive.google.com/file/d/1KzRP_r3EIOJWAQRR-U_DK7cnWJ4Ynpa8/view?usp=sharing
- 사진 https://drive.google.com/file/d/1Milj1TUhtUylWurOLZzqkEmQgdTq1g3_/view?usp=sharing
- 게시물 https://drive.google.com/file/d/1M8QVlA823VpbWqNc4AdgtcGIdSSs8brA/view?usp=sharing
- 팔로잉 https://drive.google.com/file/d/1Oai4s2XohqBHSeZ_DgxzYh8OmCk5dh_m/view?usp=sharing
- 업로드 https://drive.google.com/drive/folders/1iObE4ZwWlAPJAvaTkxjpVgnBivFHcg23?usp=sharing
- 마이페이지 https://drive.google.com/drive/folders/1xXLllzF2nW0YCeMajCX178V8A2i1MwmW?usp=sharing
- 메시지 https://drive.google.com/file/d/1mxfr1eq3f6aATASSKRJwEP9ioDqyjehx/view?usp=sharing
- 알림 https://drive.google.com/file/d/1ZITXr1KRK0ip1Sa_r0OQnMNqQfk37KL2/view?usp=sharing

***
## 💎 프로젝트 후기
### 😎 만족한 점
- 개인프로젝트로 혼자서 기획&설계 ~ 개발 ~ 디버깅까지 수행을 통해 프로젝트의 전반적인 부분을 고르게 경험을 한것 같아 배운점이 많았다.
- 프론트엔드와 백엔드의 관계와 역할에 대하여 이해가 가능했고, 문제가 발생했을때 어느 부분을 찾아가서 해결해야 하는지 알게 되었다.
- 개발 프로젝트에 대한 두려움이 많이 사라졌으며, 다음에도 기회가 있다면 더 향상된 개발 능력으로 더 나은 시스템을 개발 할 수 있을 것 같다.

### 😥 아쉬웠던 점
- 혼자서 프로젝트를 하다보니 해야할 것이 많은데 시간은 제한적이어서 미완성인 부분이 남아 아쉬움이 있다.

