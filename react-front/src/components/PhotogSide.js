import React from 'react';
import { useNavigate } from 'react-router-dom'; // 🚀 뒤로가기를 위해 추가
import { jwtDecode } from 'jwt-decode';
// import './css/Sidebar.css'; 
import './css/PhotogSide.css'; 

function PhotogSide({ profile, setProfile, viewType, setViewType, sortOption, setSortOption }) {
    const navigate = useNavigate(); // 🚀 브라우저 히스토리 라우팅을 위해 초기화

    // 🚀 파라미터 없이 profile 객체에서 바로 값을 꺼내 씁니다
    const handleFollowToggle = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) return alert("로그인이 필요합니다.");

        try {
            const decoded = jwtDecode(token);
            
            // profile 객체에서 필요한 값 추출
            const targetUserNo = profile.USER_NO;
            const currentStatus = profile.IS_FOLLOWING;
            const isCurrentlyFollowing = currentStatus === 'Y';

            // 🚀 1. 프론트엔드 UI 즉각 업데이트 (단일 객체 업데이트)
            setProfile(prev => ({
                ...prev,
                IS_FOLLOWING: isCurrentlyFollowing ? 'N' : 'Y',
                FOLLOWER_COUNT: isCurrentlyFollowing 
                    ? Math.max(0, prev.FOLLOWER_COUNT - 1) 
                    : prev.FOLLOWER_COUNT + 1
            }));

            // 백엔드에 토글 요청
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
                // 🚀 2. 실패 시 롤백 (단일 객체 원상복구)
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

    return (
        <aside className="photog-sidebar">
            <div className="sidebar-top">
                {/* 🚀 바닐라 JS의 window.history.back() 대신 리액트의 navigate(-1) 권장 */}
                <button className="photog-back-btn" onClick={() => navigate(-1)}>&lt; 뒤로가기</button>
            </div>

            {/* 1. 프로필 영역 (CSS 클래스 적용) */}
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
                    {/* 첫 번째 줄: 팔로워 00  팔로잉 00 */}
                    <div className="stat-row">
                        <div className="stat-group">
                            <span>팔로워</span> <strong>{profile.FOLLOWER_COUNT || 0}</strong>
                        </div>
                        <div className="stat-group">
                            <span>팔로잉</span> <strong>{profile.FOLLOWING_COUNT || 0}</strong>
                        </div>
                    </div>

                    {/* 두 번째 줄: 좋아요 00  스크랩 00 */}
                    <div className="stat-row">
                        <div className="stat-group">
                            <span>좋아요</span> <strong>{profile.TOTAL_LIKES || 0}</strong>
                        </div>
                        <div className="stat-group">
                            <span>스크랩</span> <strong>{profile.TOTAL_SCRAPS || 0}</strong>
                        </div>
                    </div>

                    {/* 세 번째 줄: 구분선 및 업데이트 */}
                    <div className="stat-row update-time">
                        <span>업데이트</span>
                        <span>{profile.LAST_UPDATE ? profile.LAST_UPDATE : '기록 없음'}</span>
                    </div>
                </div>

                <div className="photog-actions">
                    <button 
                        className={`btn-follow-photog ${profile.IS_FOLLOWING === 'Y' ? 'followed' : 'unfollowed'}`}
                        onClick={handleFollowToggle} // 🚀 파라미터 없이 바로 호출
                    >
                        {profile.IS_FOLLOWING === 'Y' ? '팔로우 취소' : '팔로우'}
                    </button>
                    <button className="btn-msg-photog" onClick={() => alert('메시지 기능 준비중')}>
                        메시지
                    </button>
                </div>
            </div>

            {/* 2. 보기 타입 필터 (사진/게시물) */}
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

            {/* 3. 정렬 옵션 */}
            <div className="sort-section">
                <h3 className="sidebar-title">정렬</h3>
                <div className="sort-grid">
                    {/* 1열 */}
                    <div className={`filter-item ${sortOption === 'latest' ? 'active' : ''}`} onClick={() => setSortOption('latest')}>
                        <div className="radio-circle"></div>최신 순
                    </div>
                    <div className={`filter-item ${sortOption === 'oldest' ? 'active' : ''}`} onClick={() => setSortOption('oldest')}>
                        <div className="radio-circle"></div>오래된 순
                    </div>

                    {/* 2열 */}
                    <div className={`filter-item ${sortOption === 'likes' ? 'active' : ''}`} onClick={() => setSortOption('likes')}>
                        <div className="radio-circle"></div>좋아요 순
                    </div>
                    <div className={`filter-item ${sortOption === 'views' ? 'active' : ''}`} onClick={() => setSortOption('views')}>
                        <div className="radio-circle"></div>조회수 순
                    </div>

                    {/* 3열 */}
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