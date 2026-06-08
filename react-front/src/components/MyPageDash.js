import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import './css/MyPageDash.css';

const MyPageDash = () => {
    const { myUserNo, hashedId } = useOutletContext(); 
    const navigate = useNavigate();
    
    const [myPhotos, setMyPhotos] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [myProfile, setMyProfile] = useState({});
    
    // 🚀 대시보드 리스트 상태
    const [recentFollowings, setRecentFollowings] = useState([]); // 신규: 내 팔로잉
    const [recentMessages, setRecentMessages] = useState([]);
    const [recentNotis, setRecentNotis] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!myUserNo) return;

            try {
                // 기존 데이터 로드 (사진, 게시물, 프로필, 메시지, 알림)
                const photoRes = await fetch(`http://localhost:3010/mypage/photos?userNo=${myUserNo}&limit=6`);
                if (photoRes.ok) setMyPhotos((await photoRes.json()).list);

                const postRes = await fetch(`http://localhost:3010/mypage/posts?userNo=${myUserNo}&limit=5`);
                if (postRes.ok) setMyPosts((await postRes.json()).list);

                const profileRes = await fetch(`http://localhost:3010/mypage/account?userNo=${myUserNo}`);
                if (profileRes.ok) setMyProfile((await profileRes.json()).user);

                const msgRes = await fetch(`http://localhost:3010/message/recent?userNo=${myUserNo}&limit=3`);
                if (msgRes.ok) setRecentMessages((await msgRes.json()).list);

                const notiRes = await fetch(`http://localhost:3010/notification/recent?userNo=${myUserNo}&limit=4`);
                if (notiRes.ok) setRecentNotis((await notiRes.json()).list);

                // 🚀 신규: 내 팔로잉 (업데이트 순) 데이터 3명 로드
                // 💡 [확인 필요] 백엔드에 이 주소와 일치하는 라우터를 만들어주셔야 합니다!
                const followRes = await fetch(`http://localhost:3010/follow/recent-active?userNo=${myUserNo}&limit=3`);
                if (followRes.ok) {
                    const followData = await followRes.json();
                    if (followData.success) setRecentFollowings(followData.list);
                }

            } catch (error) {
                console.error("대시보드 데이터 로드 실패:", error);
            }
        };
        fetchData();
    }, [myUserNo]);

    // 💡 기존 함수를 지우고 이 코드로 교체하세요! (상대 시간 자동 계산)
const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const postDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - postDate;
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHrs < 24) return `${diffHrs}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return postDate.toLocaleDateString('ko-KR');
};

    const getSnippet = (text, maxLength = 45) => {
        // ... 기존 코드 유지
        if (!text) return '';
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    };

    return (
        <div className="mypage-dash">
            
            {/* 🚀 상단 4열 패널 영역 (MyPageDash.js 내부 수정구역) */}
            <div className="dash-top-panels">
                
                {/* 1. 내 프로필 패널 (profile-board로 개별 제어) */}
                <div className="dash-panel profile-board" onClick={() => navigate(`/mypage/${hashedId}/account`)}>
                    <div className="panel-header">
                        <h4>내 프로필</h4>
                    </div>
                    <div className="panel-content profile-content">
                        <ul className="profile-text-info">
                            <li><span className="label">아이디</span> {myProfile.USER_ID || ''}</li>
                            <li><span className="label">닉네임</span> {myProfile.NICKNAME || ''}</li>
                            <li><span className="label">이메일</span> {myProfile.EMAIL || ''}</li>
                        </ul>
                        <div className="profile-avatar-box">
                            {myProfile.PROFILE_IMAGE_URL ? (
                                <img src={myProfile.PROFILE_IMAGE_URL} alt="프로필" className="dash-avatar large-avatar" />
                            ) : (
                                <div className="dash-avatar-placeholder large-avatar">
                                    <svg viewBox="0 0 24 24" fill="#ccc"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/></svg>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="profile-intro-box">
                        <span className="label">내 소개</span>
                        <p className="intro-text">{myProfile.INTRO || '소개글이 없습니다.'}</p>
                    </div>
                </div>

                {/* 2. 내 팔로잉 패널 (following-board로 개별 제어) */}
                <div className="dash-panel following-board" onClick={() => navigate(`/mypage/${hashedId}/followings`)}>
                    <div className="panel-header">
                        <h4>내 팔로잉</h4>
                    </div>
                    <div className="panel-content list-content">
                        {recentFollowings.length > 0 ? (
                            recentFollowings.map((user, idx) => (
                                <div key={idx} className="recent-user-item">
                                    <div className="user-avatar-wrapper">
                                        <img src={user.PROFILE_IMAGE_URL || '/default-avatar.png'} alt="프로필" className="user-thumb-img" />
                                    </div>
                                    <span className="user-nickname">{user.NICKNAME}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-panel-text">팔로잉한 작가가 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 3. 메세지 패널 (message-board로 개별 제어) */}
                <div className="dash-panel message-board" onClick={() => navigate('/message')}>
                    <div className="panel-header">
                        <h4>메세지</h4>
                    </div>
                    <div className="panel-content list-content">
                        {recentMessages.length > 0 ? (
                            recentMessages.map((msg, idx) => (
                                <div key={idx} className="recent-user-item">
                                    <div className="user-avatar-wrapper">
                                        <img src={msg.PROFILE_IMAGE_URL || '/default-avatar.png'} alt="프로필" className="user-thumb-img" />
                                        {msg.UNREAD_COUNT > 0 && <span className="unread-dot"></span>}
                                    </div>
                                    <span className="user-nickname">{msg.NICKNAME}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-panel-text">최근 대화 상대가 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 4. 알림 패널 (★오늘의 주인공! noti-board로 독자적 크기 제어) */}
                {/* MyPageDash.js 내부 - 알림 보드 구역 최종본 */}
                <div className="dash-panel noti-board" onClick={() => navigate('/notification')}>
                    <div className="panel-header">
                        <h4>알림</h4>
                    </div>
                    <div className="panel-content noti-content">
                        {recentNotis.length > 0 ? (
                            recentNotis.map((noti, idx) => (
                                <div key={idx} className="recent-noti-item">
                                    {/* 💡 중복되던 소괄호 태그를 지우고 백엔드의 완성형 문장을 다이렉트로 출력합니다. */}
                                    <p className="noti-text">
                                        {noti.MESSAGE}
                                    </p>
                                    <span className="noti-time">{formatTimeAgo(noti.CREATED_AT)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-panel-text">새로운 알림이 없습니다.</p>
                        )}
                    </div>
                </div>

            </div>


            {/* 내 사진 영역 */}
            <section className="mypage-dash__section">
                <div className="mypage-dash__section-header">
                    <h4>내 사진</h4>
                    <button className="more-btn" onClick={() => navigate(`/mypage/${hashedId}/uploads`, { state: { activeTab: 'photo' } })}>더보기 &gt;</button>
                </div>
                
                <div className="photo-grid">
                    {myPhotos.slice(0, 5).map((photo) => (
                        <div key={photo.PHOTO_ID} className="photo-card-wrapper" onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)}>
                            <img src={photo.THUMB_URL || photo.IMAGE_URL} alt={photo.TITLE} className="photo-image" loading="lazy" decoding="async" />
                            <div className="stats-overlay">
                                <div className="stat-item">
                                    <span className="grid-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </span>
                                    {photo.VIEW_COUNT || 0}
                                </div>
                                <div className="stat-item">
                                    <span className="grid-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    </span>
                                    {photo.LIKE_COUNT || 0}
                                </div>
                                <div className="stat-item">
                                    <span className="grid-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                    </span>
                                    {photo.SCRAP_COUNT || 0}
                                </div>
                                <div className="stat-item">
                                    <span className="grid-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                    </span>
                                    {photo.COMMENT_COUNT || 0}
                                </div>
                            </div>
                        </div>
                    ))}
                    {myPhotos.length === 0 && <p className="mypage-dash__empty">업로드한 사진이 없습니다.</p>}
                </div>
            </section>

            {/* 내 게시물 영역 */}
            <section className="mypage-dash__section">
                <div className="mypage-dash__section-header">
                    <h4 className="mypage-dash__section-title">내 게시물</h4>
                    <button className="mypage-dash__more-btn" onClick={() => navigate(`/mypage/${hashedId}/uploads`, { state: { activeTab: 'post' } })}>더보기 &gt;</button>
                </div>
                <div className="post-grid-container">
                    {myPosts.slice(0, 5).map((post) => {
                        const thumbs = post.THUMB_LIST || [];
                        return (
                            <div key={post.POST_ID} className="vertical-post-card" onClick={() => navigate(`/post/${post.POST_ID}`)}>
                                <div className="post-card-top">
                                    <span className="post-photog">{post.NICKNAME || '회원'}</span>
                                    <span className="post-time">{formatTimeAgo(post.CREATED_AT)}</span>
                                </div>
                                <div className="post-card-content">
                                    <div className="post-text-box">
                                        <h4 className="post-title-text">{post.TITLE}</h4>
                                        <p className="post-main-text">{getSnippet(post.CONTENT)}</p>
                                    </div>
                                </div>
                                <div className="post-card-media">
                                    <div className="media-placeholder">
                                        {thumbs.length > 0 ? <img src={thumbs[0]} alt={post.TITLE} referrerPolicy="no-referrer" /> : <span>사진 없음</span>}
                                    </div>
                                </div>
                                <div className="post-card-bottom">
                                    {/* 기존 하단 좋아요 통계 동일 유지 */}
                                </div>
                            </div>
                        );
                    })}
                    {myPosts.length === 0 && <p className="mypage-dash__empty">작성한 게시물이 없습니다.</p>}
                </div>
            </section>
        </div>
    );
};

export default MyPageDash;