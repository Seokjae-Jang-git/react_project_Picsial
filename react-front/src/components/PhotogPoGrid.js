import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/PhotogPoGrid.css';

function PhotogPoGrid({ userNo, sortOption }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userNo) return;

        const fetchPosts = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:3010/photog/posts/${userNo}?sort=${sortOption}`);
                const data = await response.json();
                
                if (data.success) {
                    setPosts(data.posts);
                }
            } catch (error) {
                console.error("작가의 게시물 목록을 불러오는 중 오류 발생:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [userNo, sortOption]);

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const postDate = new Date(dateString);
        const now = new Date();
        const diffMs = now - postDate;
        
        // 밀리초를 분, 시간, 일 단위로 변환
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);
        
        // 조건별로 세밀하게 시간 텍스트 반환
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHrs < 24) return `${diffHrs}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        
        return postDate.toLocaleDateString('ko-KR');
    };

    if (loading) return <div className="photog-grid-loading">게시물을 불러오는 중입니다...</div>;
    if (!posts || posts.length === 0) return <div className="photog-grid-empty">작성한 게시물이 없습니다.</div>;

    return (
        <div className="photog-post-grid">
            {posts.map(post => (
                <PhotogPostCard key={post.POST_ID} post={post} formatTimeAgo={formatTimeAgo} />
            ))}
        </div>
    );
}

/* ==========================================
   내부 컴포넌트: 개별 게시물 카드
   ========================================== */
function PhotogPostCard({ post, formatTimeAgo }) {
    const navigate = useNavigate(); 
    const [currentImgIdx, setCurrentImgIdx] = useState(0);
    
    let thumbs = [];
    if (Array.isArray(post.THUMB_LIST)) {
        thumbs = post.THUMB_LIST;
    } else if (typeof post.THUMB_LIST === 'string') {
        try { thumbs = JSON.parse(post.THUMB_LIST); } catch(e) { thumbs = []; }
    } else if (post.THUMB_URL) {
        thumbs = [post.THUMB_URL]; 
    }

    const getSnippet = (text, maxLength = 60) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handlePrev = (e) => {
        e.stopPropagation(); 
        setCurrentImgIdx((prev) => (prev === 0 ? thumbs.length - 1 : prev - 1));
    };

    const handleNext = (e) => {
        e.stopPropagation(); 
        setCurrentImgIdx((prev) => (prev === thumbs.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="photog-post-card" onClick={() => navigate(`/post/${post.POST_ID}`)}>
            <div className="photog-post-top">
                <span className="photog-post-time">{formatTimeAgo(post.CREATED_AT)}</span>
            </div>

            <div className="photog-post-content">
                <h4 className="photog-post-title">{post.TITLE}</h4>
                <p className="photog-post-snippet">{getSnippet(post.CONTENT)}</p>
            </div>

            <div className="photog-post-media">
                {thumbs.length > 1 && (
                    <button className="photog-slide-arrow left" onClick={handlePrev}>&lt;</button>
                )}

                <div className="photog-media-box">
                    {thumbs.length > 0 ? (
                        <img 
                            src={thumbs[currentImgIdx]} 
                            alt={`${post.TITLE} - ${currentImgIdx + 1}`} 
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="photog-no-media"><span>No Image</span></div>
                    )}
                </div>

                {thumbs.length > 1 && (
                    <button className="photog-slide-arrow right" onClick={handleNext}>&gt;</button>
                )}
            </div>

            <div className="photog-post-bottom">
                <div className="photog-bottom-item" title="조회수">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <span>{post.VIEW_COUNT || 0}</span>
                </div>
                <div className="photog-bottom-item" title="좋아요">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span>{post.LIKE_COUNT || 0}</span>
                </div>
                <div className="photog-bottom-item" title="스크랩">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>{post.SCRAP_COUNT || 0}</span>
                </div>
                <div className="photog-bottom-item" title="댓글">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    <span>{post.COMMENT_COUNT || 0}</span>
                </div>
            </div>
        </div>
    );
}

export default PhotogPoGrid;