# 📷 Picsial (픽셜) 
> 사진 관련 소셜 미디어 채널 Picsial(픽셜) 입니다. <br>
많은 정보 공유와 관심 부탁 드립니다.

***
![대표사진](https://github.com/Seokjae-Jang-git/react_project_Picsial/blob/3bb1274f8e72f4b30f722572b51b012491900576/logo_picsial.png)

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
- 26.5.28 ~ 6.8 (8일)
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
| **Backend** | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) |
| **Database** | ![Oracle](https://img.shields.io/badge/Oracle-%23F80000.svg?style=for-the-badge&logo=oracle&logoColor=white)|
| **Auth & Security** | ![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens) ![Bcrypt](https://img.shields.io/badge/Bcrypt-white?style=for-the-badge&logo=linux-foundation&logoColor=black) |

***
## 📌 주요 기능
### **1. 고화질 사진 보기**
![등록](https://github.com/chchjjj/react_sns_project/blob/main/images/register.JPG)
 - 사용자들이 업로드한 고화질의 사진을 **카테고리 필터와 정렬**을 통해 한눈에 보기 가능 
 - 사진 상세페이지에서 사진 이미지를 확대하여 **사진만 보기** 가능
 - **촬영 정보 및 사진의 메타정보** 보기 가능
***
### **2. 게시물 보기**
![피드](https://github.com/chchjjj/react_sns_project/blob/main/images/feed.JPG)
 - 사용자들이 업로드한 게시물을 **카테고리 필터와 정렬**을 통해 한눈에 보기 가능
 - 게시물 상세페이지에서 전체 게시글 확인 가능 및 첨부파일 다운 가능 
 - 사진 관련 콘텐츠를 접할 수 있음 (강의, 장비, 촬영 팁, 출사 등)
***
### **3. 팔로잉**

- 활동 중인 작가(사용자)와 대표 사진들을 보고 팔로우/팔로우 취소, 메세지 보내기 가능
- 메시지 버튼 클릭 시 작가와 1대1 메시지 대화 가능
- 작가(사용자) 프로필 이미지 클릭 시 작가의 상세페이지로 이동

***
4. 스크랩
***
### **3.  랜덤피드, 팔로우/언팔로우, 좋아요, 댓글 기능**
![랜덤](https://github.com/chchjjj/react_sns_project/blob/main/images/randomFeed.JPG)
- 메뉴 중 '피드' 클릭 시, 로그인 사용자를 제외한 다른 사용자들의 '공개' 상태 피드가 랜덤으로 2개씩 게시
- 우측 상단 '새로고침' 버튼 통해 새로운 피드 확인 가능 (무한 스크롤 버전으로 보완 고려중)
- 게시글마다 우측 상단의 팔로우/언팔로우 & DM(다이렉트 메세지) 버튼 통해 작업 가능
- 좋아요 버튼 클릭 시 색상 변경 및 DB에 기록 저장 (재클릭 시 원복 및 DB 삭제)
- 댓글 등록, 삭제 기능 (본인이 쓴 댓글 옆에만 휴지통 버튼 생성)
<br>
  

 ![랜덤2](https://github.com/chchjjj/react_sns_project/blob/main/images/randomFeed2.JPG)
<p align="center">
  <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/randomFeed3.JPG" width="460"/>
</p>


- 게시글 작성자 아이콘 클릭 시 해당 사용자의 피드 모아보기 & 상세보기 모달창 생성
- 게시글 작성자의 비공개 게시글은 포함되어 있지 않음 (다른 사용자가 볼 때는 총 3개지만, 실제로는 5개)


***
### **4.  알림 기능**
<table>
  <tr>
    <td align="center" width="40%">
      <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/alert.JPG" height="320"/>
    </td>
    <td align="center" width="60%">
      <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/alertCheck.JPG" height="320"/>
    </td>
  </tr>
</table>


- 다른 사용자가 내 게시글에 댓글을 남기거나 DM(다이렉트 메세지)을 보낸 경우,<br>
알림 메뉴에 빨갛게 표시가 뜨며 확인하지 않은 알림은 노란색으로 구분되어 표시됨.
- 알림 클릭 시 해당 화면으로 이동되고(채팅방 또는 댓글이 달린 게시물), 확인 시 메뉴의 빨간 표시 및 노란색 컬러 사라짐


***
### **5.  채팅 기능**
<p align="center">
  <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/chatRoom.JPG" width="630"/>
</p>


- 유저 A와 유저 B간 처음 채팅 시 최초 1회 새로운 채팅방이 개설되며,<br>그 이후로는 해당 채팅방에서 메세지를 주고 받는다.
- 상기 4번 기능대로, 메세지를 받은 사용자는 알림 확인 전까지 '알림' 메뉴에 빨갛게 표시가 뜬다.


***
### **6.  마이페이지**
![마이페이지](https://github.com/chchjjj/react_sns_project/blob/main/images/myPage.JPG)
- 로그인 한 사용자는 마이페이지에서 본인의 게시글 개수, 팔로워/팔로잉 수 확인 가능.
- 팔로워/팔로잉 목록도 표시되며, 팔로잉(내가 팔로우한 사람)을 취소할 수 있다.
- 우측 상단 톱니바퀴 버튼을 통해 정보수정이 가능하다. (프로필 사진 등록 보완 중)


***
### **7.  로그인, 회원가입, 비밀번호 재설정**
![로그인](https://github.com/chchjjj/react_sns_project/blob/main/images/login.JPG)
![회원가입](https://github.com/chchjjj/react_sns_project/blob/main/images/join.JPG)
<table width="100%">
  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/pwdReset.JPG" width="100%"/>
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/pwdReset2.JPG" width="100%"/>
    </td>
  </tr>
</table>


- 아이디 중복확인, 아이디 & 비밀번호 정규식
- 비밀번호 변경을 원할 경우 기본 정보를 통한 계정을 찾은 후 변경 가능
- 회원가입 및 비밀번호 변경 시 비밀번호는 해시화 하여 DB에 저장됨


***
## 💎 프로젝트 후기
### 😎 만족한 점
- 이번 개인 프로젝트는 새롭게 React를 활용한 점이 재미있었음
- 원하는 라이브러리, MUI를 활용하는 면에서 흥미를 느낌
- 실제로도 관심이 있었던 감사일기 및 부담 없는 SNS를 만든 것에 대한 뿌듯함


### 😥 아쉬웠던 점
- '테마'적으로는 만족스러웠지만, 좀 더 기능성 있는 API를 활용했다면 더욱 완성도 높은 프로젝트가 되었을 거라고 생각함
- 로그인 이후의 UI를 조금 더 보완하면 보기 좋을듯함


***
## 💚 최종 회고
두번째로 진행한 개인 프로젝트로서, 자유롭게 아이디어를 구상하고 변형하는 점에서 재미를 느꼈습니다.<br>
첫번째 개인 프로젝트에서는 정말 CRUD만 핵심적으로 다루었다면,<br>
이번에는 채팅, 알림, 랜덤 피드 등 일상과 좀 더 가까운 형태의 웹사이트를 만들어 내어 뿌듯했습니다.<br>
좀 더 욕심을 내어 기능적 퀄리티를 높였어야 했다는 아쉬움이 남지만, 한 단계씩 발전할 수 있다는 기대감이 생겼습니다.
