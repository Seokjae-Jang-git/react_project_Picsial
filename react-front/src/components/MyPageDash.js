import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import './css/MyPageDash.css';

const MyPageDash = () => {
    const { myUserNo, hashedId } = useOutletContext(); 
    
    const navigate = useNavigate();
    const [myPhotos, setMyPhotos] = useState([]);
    const [myPosts, setMyPosts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            // 사진 가져오기
            const photoRes = await fetch(`http://localhost:3010/mypage/photos?userNo=${myUserNo}&limit=6`);
            const photoData = await photoRes.json();
            if (photoData.success) setMyPhotos(photoData.list);

            // 게시물 가져오기
            const postRes = await fetch(`http://localhost:3010/mypage/posts?userNo=${myUserNo}&limit=5`);
            const postData = await postRes.json();
            if (postData.success) setMyPosts(postData.list);
        };
        if (myUserNo) fetchData();
    }, [myUserNo]);

    // Main.js에서 가져온 유틸 함수들
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const postDate = new Date(dateString);
        return postDate.toLocaleDateString('ko-KR');
    };

    const getSnippet = (text, maxLength = 45) => {
        if (!text) return '';
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    };

    return (
        <div className="mypage-dash">
            {/* 사진 섹션 */}
            <section className="mypage-dash__section">
                <div className="mypage-dash__section-header">
                    <h4>내 사진</h4>
                    <button className="more-btn" onClick={() => navigate(`/mypage/${hashedId}/uploads`)}>더보기 &gt;</button>
                </div>
                
                <div className="photo-grid">
                    {myPhotos.slice(0, 6).map((photo) => (
                        <div 
                            key={photo.PHOTO_ID} 
                            className="photo-card-wrapper" 
                            onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)}
                        >
                            <img 
                                src={photo.THUMB_URL || photo.IMAGE_URL} 
                                alt={photo.TITLE || 'Picsial 사진'} 
                                className="photo-image"
                                loading="lazy" 
                                decoding="async"
                            />

                            <div className="stats-overlay">
                                    <div className="stat-item">
                                        <span className="grid-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                        </span>
                                        {photo.VIEW_COUNT || 0}
                                    </div>
                                    <div className="stat-item">
                                        <span className="grid-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                            </svg>
                                        </span>
                                        {photo.LIKE_COUNT || 0}
                                    </div>
                                    <div className="stat-item">
                                        <span className="grid-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        </span>
                                        {photo.SCRAP_COUNT || 0}
                                    </div>
                                    <div className="stat-item">
                                        <span className="grid-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                            </svg>
                                        </span>
                                        {photo.COMMENT_COUNT || 0}
                                    </div>
                                </div>

                            {/* 필요시 메인처럼 통계 오버레이를 마이페이지에 붙여도 무방합니다 */}
                        </div>
                    ))}
                    {myPhotos.length === 0 && <p className="mypage-dash__empty">업로드한 사진이 없습니다.</p>}
                </div>
            </section>

            {/* MyPageDash.js 내부의 '내 게시물' 렌더링 세션 파트 교체 */}
            <section className="mypage-dash__section">
                <div className="mypage-dash__section-header">
                    <h4 className="mypage-dash__section-title">내 게시물</h4>
                    {/* 💡 두 번째 인자로 state 객체를 넘겨 목적지 탭 정보를 전달합니다. */}
                    <button 
                        className="mypage-dash__more-btn" 
                        onClick={() => navigate(`/mypage/${hashedId}/uploads`, { state: { activeTab: 'post' } })}
                    >
                        더보기 &gt;
                    </button>
                </div>
                <div className="post-grid-container">
                    {myPosts.slice(0, 6).map((post) => {
                        // Main.js의 슬라이더 첫 장 고정 규칙 그대로 이식
                        const thumbs = post.THUMB_LIST || [];

                        return (
                            <div 
                                key={post.POST_ID} 
                                className="vertical-post-card" 
                                onClick={() => navigate(`/post/${post.POST_ID}`)}
                            >
                                <div className="post-card-top">
                                    <span className="post-photog">{post.NICKNAME || '회원'}</span>
                                    <span className="post-time">{formatTimeAgo(post.CREATED_AT)}</span>
                                </div>

                                <div className="post-card-content">
                                    <div className="post-text-box">
                                        <h4 className="post-title-text">{post.TITLE}</h4>
                                        <p className="post-main-text">
                                            {getSnippet(post.CONTENT)}
                                        </p>
                                    </div>
                                </div>

                                {/* 미디어(사진) 영역 우측 밸런스 */}
                                <div className="post-card-media">
                                    <div className="media-placeholder">
                                        {thumbs.length > 0 ? (
                                            <img 
                                                src={thumbs[0]} 
                                                alt={post.TITLE} 
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <span>사진 없음</span>
                                        )}
                                    </div>
                                </div>

                                {/* 하단 통계 바 */}
                                    <div className="post-card-bottom">
                                        <div className="bottom-item" title="조회수">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                            <span>{post.VIEW_COUNT || 0}</span>
                                        </div>
                                        <div className="bottom-item" title="좋아요">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                            <span>{post.LIKE_COUNT || 0}</span>
                                        </div>
                                        <div className="bottom-item" title="스크랩">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                            <span>{post.SCRAP_COUNT || 0}</span>
                                        </div>
                                        <div className="bottom-item" title="댓글">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                            <span>{post.COMMENT_COUNT || 0}</span>
                                        </div>
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