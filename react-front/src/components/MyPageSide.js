import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './css/MyPageSide.css';

const MyPageSide = ({ myUserNo, hashedId, refreshTrigger }) => {
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState({
        NICKNAME: '로딩 중...',
        PROFILE_IMAGE_URL: '',
        FOLLOWER_COUNT: 0,
        FOLLOWING_COUNT: 0,
        TOTAL_LIKES: 0,
        TOTAL_SCRAPS: 0
    });

    useEffect(() => {
        const fetchSidebarData = async () => {
            try {
                const response = await fetch(`http://localhost:3010/mypage?userNo=${myUserNo}`);
                const data = await response.json();
                
                if (data.success) {
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
    }, [myUserNo, refreshTrigger]); 

    return (
        <aside className="mypage-side">
            <div 
                className="mypage-side__profile-box clickable" 
                onClick={() => navigate(`/mypage/${hashedId}`)}
                title="대시보드로 이동"
            >
                <div className="mypage-side__avatar">
                    {profile.PROFILE_IMAGE_URL ? (
                        <img src={profile.PROFILE_IMAGE_URL} alt="프로필" />
                    ) : (
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
                <NavLink to={`/notification`} className={({ isActive }) => isActive ? "mypage-side__link active" : "mypage-side__link"}>
                    알림
                </NavLink>
            </nav>
        </aside>
    );
};

export default MyPageSide;