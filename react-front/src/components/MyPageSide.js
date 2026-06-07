import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './css/MyPageSide.css';

const MyPageSide = ({ myUserNo, hashedId, refreshTrigger }) => {
    const navigate = useNavigate();
    
    // 1. 상태 구조를 오라클 DB 결과 필드명(대문자)에 맞춰 초기화
    const [profile, setProfile] = useState({
        NICKNAME: '로딩 중...',
        PROFILE_IMAGE_URL: '',
        FOLLOWER_COUNT: 0,
        FOLLOWING_COUNT: 0,
        TOTAL_LIKES: 0,
        TOTAL_SCRAPS: 0
    });

    useEffect(() => {
        // 2. 백엔드 API 호출 함수 정의
        const fetchSidebarData = async () => {
            try {
                // 부모에게 받아온 실제 숫자 ID(myUserNo)를 쿼리스트링에 주입
                const response = await fetch(`http://localhost:3010/mypage?userNo=${myUserNo}`);
                const data = await response.json();
                
                if (data.success) {
                    // 3. 받아온 프로필 객체 전체를 상태에 반영
                    setProfile(data.profile);
                } else {
                    console.error("사이드바 데이터 로드 실패:", data.message);
                }
            } catch (error) {
                console.error("사이드바 API 요청 에러:", error);
            }
        };

        if (myUserNo) {
            fetchSidebarData();
        }
    }, [myUserNo, refreshTrigger]); // 💡 [핵심] 여기에 refreshTrigger를 추가하여, 오른쪽 화면에서 저장 시 이 API가 자동 재실행됩니다!

    return (
        <aside className="mypage-side">
            {/* 💡 상단 프로필 전체 박스에 클릭 이벤트 및 커서 스타일 추가 */}
            <div 
                className="mypage-side__profile-box clickable" 
                onClick={() => navigate(`/mypage/${hashedId}`)}
                title="대시보드로 이동"
            >
                <div className="mypage-side__avatar">
                    {profile.PROFILE_IMAGE_URL ? (
                        <img src={profile.PROFILE_IMAGE_URL} alt="프로필" />
                    ) : (
                        /* 💡 기존 placeholder div 대신 타 페이지와 통일된 SVG 기본 이모티콘 적용 */
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                        </svg>
                    )}
                </div>
                <h3 className="mypage-side__nickname">{profile.NICKNAME}</h3>
                
                <div className="mypage-side__stats">
                    <div className="mypage-side__stat-item">팔로워 <span>{profile.FOLLOWER_COUNT}</span></div>
                    <div className="mypage-side__stat-item">팔로잉 <span>{profile.FOLLOWING_COUNT}</span></div>
                    <div className="mypage-side__stat-item">좋아요 <span>{profile.TOTAL_LIKES}</span></div>
                    <div className="mypage-side__stat-item">스크랩 <span>{profile.TOTAL_SCRAPS}</span></div>
                </div>
            </div>

            {/* 네비게이션 메뉴 목록 (대시보드 버튼 제거 완수) */}
            <nav className="mypage-side__nav">
                <NavLink to={`/mypage/${hashedId}/account`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    내 계정
                </NavLink>
                <NavLink to={`/mypage/${hashedId}/uploads`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    내 업로드
                </NavLink>
                <NavLink to={`/mypage/${hashedId}/scraps`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    내 스크랩
                </NavLink>
                <NavLink to={`/mypage/${hashedId}/followings`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    내 팔로잉
                </NavLink>
                <NavLink to={`/message`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    메세지
                </NavLink>
                <NavLink to={`/mypage/${hashedId}/notifications`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    알림
                </NavLink>
            </nav>
        </aside>
    );
};

export default MyPageSide;