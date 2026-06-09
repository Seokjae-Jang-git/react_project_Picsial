import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import { jwtDecode } from 'jwt-decode';
import './css/PhotogSide.css'; 

function PhotogSide({ profile, setProfile, viewType, setViewType, sortOption, setSortOption }) {
    const navigate = useNavigate(); 

    const handleFollowToggle = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return alert("로그인이 필요합니다.");

        try {
            const decoded = jwtDecode(token);
            
            const targetUserNo = profile.USER_NO;
            const currentStatus = profile.IS_FOLLOWING;
            const isCurrentlyFollowing = currentStatus === 'Y';

            setProfile(prev => ({
                ...prev,
                IS_FOLLOWING: isCurrentlyFollowing ? 'N' : 'Y',
                FOLLOWER_COUNT: isCurrentlyFollowing 
                    ? Math.max(0, prev.FOLLOWER_COUNT - 1) 
                    : prev.FOLLOWER_COUNT + 1
            }));

            const response = await fetch('http://localhost:3010/follow/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    followerNo: decoded.userNo,
                    followingNo: targetUserNo
                })
            });
            const data = await response.json();

            if (!data.success) {
                alert("처리 중 오류가 발생했습니다.");
                setProfile(prev => ({
                    ...prev,
                    IS_FOLLOWING: currentStatus,
                    FOLLOWER_COUNT: isCurrentlyFollowing
                        ? prev.FOLLOWER_COUNT + 1
                        : Math.max(0, prev.FOLLOWER_COUNT - 1)
                }));
            }
        } catch (error) {
            console.error("팔로우 토글 에러:", error);
        }
    };

    const handleMessageClick = () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return alert("로그인이 필요합니다.");

        try {
            const decoded = jwtDecode(token);
            if (decoded.userNo === profile.USER_NO) {
                return alert("자기 자신에게는 메시지를 보낼 수 없습니다.");
            }

            navigate('/message', {
                state: {
                    targetPartner: {
                        USER_NO: profile.USER_NO,
                        NICKNAME: profile.NICKNAME,
                        PROFILE_IMAGE_URL: profile.PROFILE_IMAGE_URL 
                    }
                }
            });
        } catch (error) {
            console.error("메세지 이동 에러:", error);
        }
    };

    return (
        <aside className="photog-sidebar">
            <div className="sidebar-top">
                <button className="photog-back-btn" onClick={() => navigate(-1)}>&lt; 뒤로가기</button>
            </div>

            <div className="photog-profile-section">
                {profile.PROFILE_IMAGE_URL ? (
                    <img 
                        src={profile.PROFILE_IMAGE_URL} 
                        alt="프로필 이미지" 
                        className="photog-profile-img"
                    />
                ) : (
                    <svg className="yt-photog-avatar" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor: '#f1f3f5'}}>
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                    </svg>
                )}
                <h3 className="photog-nickname">{profile.NICKNAME}</h3>
                
                <div className="photog-stats">
                    <div className="stat-row">
                        <div className="stat-group">
                            <span>팔로워</span> <strong>{profile.FOLLOWER_COUNT || 0}</strong>
                        </div>
                        <div className="stat-group">
                            <span>팔로잉</span> <strong>{profile.FOLLOWING_COUNT || 0}</strong>
                        </div>
                    </div>

                    <div className="stat-row">
                        <div className="stat-group">
                            <span>좋아요</span> <strong>{profile.TOTAL_LIKES || 0}</strong>
                        </div>
                        <div className="stat-group">
                            <span>스크랩</span> <strong>{profile.TOTAL_SCRAPS || 0}</strong>
                        </div>
                    </div>

                    <div className="stat-row update-time">
                        <span>업데이트</span>
                        <span>{profile.LAST_UPDATE ? profile.LAST_UPDATE : '기록 없음'}</span>
                    </div>
                </div>

                <div className="photog-actions">
                    <button 
                        className={`btn-follow-photog ${profile.IS_FOLLOWING === 'Y' ? 'followed' : 'unfollowed'}`}
                        onClick={handleFollowToggle} 
                    >
                        {profile.IS_FOLLOWING === 'Y' ? '팔로우 취소' : '팔로우'}
                    </button>
                    <button className="btn-msg-photog" onClick={handleMessageClick}>
                        메시지
                    </button>
                </div>
            </div>

            <div className="sort-section">
                <h3 className="sidebar-title">필터</h3>
                <div className="sort-grid">
                    <div className={`filter-item ${viewType === 'photo' ? 'active' : ''}`} onClick={() => setViewType('photo')}>
                        <div className="radio-circle"></div>사진
                    </div>
                    <div className={`filter-item ${viewType === 'post' ? 'active' : ''}`} onClick={() => setViewType('post')}>
                        <div className="radio-circle"></div>게시물
                    </div>
                </div>
            </div>

            <div className="sort-section">
                <h3 className="sidebar-title">정렬</h3>
                <div className="sort-grid">
                    <div className={`filter-item ${sortOption === 'latest' ? 'active' : ''}`} onClick={() => setSortOption('latest')}>
                        <div className="radio-circle"></div>최신 순
                    </div>
                    <div className={`filter-item ${sortOption === 'oldest' ? 'active' : ''}`} onClick={() => setSortOption('oldest')}>
                        <div className="radio-circle"></div>오래된 순
                    </div>

                    <div className={`filter-item ${sortOption === 'likes' ? 'active' : ''}`} onClick={() => setSortOption('likes')}>
                        <div className="radio-circle"></div>좋아요 순
                    </div>
                    <div className={`filter-item ${sortOption === 'views' ? 'active' : ''}`} onClick={() => setSortOption('views')}>
                        <div className="radio-circle"></div>조회수 순
                    </div>

                    <div className={`filter-item ${sortOption === 'scraps' ? 'active' : ''}`} onClick={() => setSortOption('scraps')}>
                        <div className="radio-circle"></div>스크랩 순
                    </div>
                    <div className={`filter-item ${sortOption === 'comments' ? 'active' : ''}`} onClick={() => setSortOption('comments')}>
                        <div className="radio-circle"></div>댓글 순
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default PhotogSide;