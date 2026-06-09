# 📷 Picsial (픽셜) 
> 사진 관련 소셜 미디어 채널 Picsial(픽셜) 입니다. <br>
고화질 촬영 사진을 공유하고 좋은 영감과 아이디어를 얻는 곳 입니다. <br>
또한 사진 외 촬영 팁, 출사, 강의 등 정보 공유 및 홍보도 가능합니다. <br>
많은 정보 공유와 관심 부탁 드립니다.

***
![대표사진](https://github.com/chchjjj/react_sns_project/blob/main/images/main.JPG)


## 🍀 프로젝트 소개
모멘티어리는 순간(moment) + 다이어리(diary)의 합성어로,


사진 한 장과 함께 **일상의 순간을 기록하고 감사하며, 또 다른 사람들과 나눌 수 있는** 사이트입니다.


- 피드 종류를 나누어 1) 감사/반성/소망을 말하거나, 2) 일상 기록용으로 사용 가능
- 공개 여부에 따라 자신만의 프라이빗한 다이어리로 활용하거나 다른 사람과의 SNS로 사용
- 랜덤피드를 통해 다른 사용자들의 기록을 보며 응원(댓글)하고, 팔로우하며, 개별 메세지 발송 가능
***
## 📆 개발 기간
- 25.11.25 ~ 25.12.02 (1주일)
***
## ✨ 개발 목적
- 감사 일기의 효과가 여러 매체를 통해 알려지면서, 간단하게 긍정적 하루를 기록할 수 있는 공간을 만들고자 함
- 바쁜 현대인을 위해 불필요한 요소를 제거하고 핵심 기능만 남긴 조용한 SNS로 설계
- 일상 기록과 감사 표현을 모두 수용하는 가벼운 형태의 개인 기록 공간
- 복잡한 사회 속에서 현대인들의 긍정적 루틴 형성과 서로에게 작은 위로가 되었으면 함
***
## 🛠 사용 기술

| 구분 | 기술 스택 |
| :--- | :--- |
| **Language** | ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) |
| **Frontend** | ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white) |
| **Backend** | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) |
| **Database** | ![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white) |
| **Auth & Security** | ![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens) ![Bcrypt](https://img.shields.io/badge/Bcrypt-white?style=for-the-badge&logo=linux-foundation&logoColor=black) |

***
## 📌 주요 기능
### **1.  피드 기록**
![등록](https://github.com/chchjjj/react_sns_project/blob/main/images/register.JPG)
 - 사용자는 하루의 감사/반성/소망을 얘기하거나, 일상 기록용으로 선택 가능
 - 사진 한 장을 항상 첨부하여 그 날의 하루를 시각적으로도 기록할 수 있도록 함
 - 공개/비공개를 통해 혼자만의 일기장으로도, 다른 사람과 공유할 수 있는 SNS로도 활용 가능
   

***
### **2.  내 기록 모아보기(목록 불러오기, 수정, 삭제)**
![피드](https://github.com/chchjjj/react_sns_project/blob/main/images/feed.JPG)


<table>
  <tr>
    <td align="center">
      <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/feedDetail.JPG" height="300"/>
    </td>
    <td align="center">
      <img src="https://github.com/chchjjj/react_sns_project/blob/main/images/feedImage.JPG" height="300"/>
    </td>
  </tr>
</table>




 - 로그인 시 기본으로 사용자의 피드 목록 화면으로 이동함.
 - 공개여부 상관 없이 사용자의 모든 게시글이 조회되며, 5개씩 페이징 처리
 - 특정 게시글 클릭 시 모달창으로 사진, 내용, 댓글, 좋아요 기록 표시
 - 댓글 단 사용자 아이콘 클릭 시 팔로우/메시지 발송 가능하며 사진 클릭 시 원본 크기로 확인 가능
 - 게시글 수정, 삭제 가능


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
