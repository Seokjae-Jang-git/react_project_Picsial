import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/PostGrid.css';

// 💡 1. 부모(Search.js)가 준 posts를 받아오되, 내부 상태 이름과 겹치지 않게 initialPosts로 별칭을 줍니다.
function PostGrid({ selectedCategory, sortOption, posts: initialPosts }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🌟 [핵심 추가] 검색 페이지에서 필터링된 결과(initialPosts)가 넘어왔다면?
        if (initialPosts) {
            // 💡 백엔드 검색 API의 단일 THUMB_URL을 카드가 요구하는 THUMB_LIST 배열로 안전하게 가공해줍니다.
            const normalizedPosts = initialPosts.map(post => ({
                ...post,
                THUMB_LIST: post.THUMB_LIST || (post.THUMB_URL ? [post.THUMB_URL] : [])
            }));
            
            setPosts(normalizedPosts);
            setLoading(false);
            return; // 🚀 자체 fetch가 실행되지 않도록 여기서 차단!
        }

        const fetchPosts = async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams({
                    category: selectedCategory,
                    sort: sortOption
                }).toString();

                const response = await fetch(`http://localhost:3010/post?${query}`);
                const data = await response.json();
                
                if (data.success) {
                    setPosts(data.posts);
                }
            } catch (error) {
                console.error("게시물 목록 불러오기 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [selectedCategory, sortOption, initialPosts]); // 💡 initialPosts가 바뀔 때도 감시하도록 추가

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const postDate = new Date(dateString);
        const now = new Date();
        const diffMs = now - postDate;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHrs < 24 && diffHrs > 0) {
            return `${diffHrs}시간 전`;
        }
        return postDate.toLocaleDateString('ko-KR');
    };

    if (loading) return <div className="loading-msg">게시물을 불러오는 중입니다...</div>;
    if (posts.length === 0) return <div className="empty-msg">조건에 맞는 게시물이 없습니다.</div>;

    return (
        <div className="post-grid-container">
            {posts.map(post => (
                <PostCard key={post.POST_ID} post={post} formatTimeAgo={formatTimeAgo} />
            ))}
        </div>
    );
}

/* ==========================================================================
   💡 개별 게시물 카드 컴포넌트 (기존 코드 100% 보존)
   ========================================================================== */
function PostCard({ post, formatTimeAgo }) {
    const navigate = useNavigate(); 
    const [currentImgIdx, setCurrentImgIdx] = useState(0);
    const thumbs = post.THUMB_LIST || [];

    const getSnippet = (text, maxLength = 45) => {
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
        <div className="vertical-post-card" onClick={() => navigate(`/post/${post.POST_ID}`)}>
            <div className="post-photog-header-yt">
                {post.PROFILE_IMAGE_URL ? (
                    <img 
                        src={post.PROFILE_IMAGE_URL} 
                        alt="프로필" 
                        className="yt-photog-avatar"
                    />
                ) : (
                    <svg className="yt-photog-avatar" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor: '#f1f3f5'}}>
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                    </svg>
                )}
                
                <div className="yt-photog-meta">
                    <span className="photog-name">{post.NICKNAME || `회원 ${post.USER_NO}`}</span>
                    <span className="post-time-ago-yt">
                        {post.CREATED_AT ? post.CREATED_AT.split('T')[0] : ''}
                    </span>
                </div>
            </div>

            <div className="post-card-content">
                <div className="post-text-box">
                    <h4 className="post-title-text">{post.TITLE}</h4>
                    <p className="post-main-text">
                        {getSnippet(post.CONTENT)}
                    </p>
                </div>
            </div>

            {/* 미디어 슬라이더 영역 */}
            <div className="post-card-media">
                {thumbs.length > 1 && (
                    <button className="slide-arrow left" onClick={handlePrev}>&lt;</button>
                )}

                <div className="media-placeholder">
                    {thumbs.length > 0 ? (
                        <img 
                            src={thumbs[currentImgIdx]} 
                            alt={`${post.TITLE} - ${currentImgIdx + 1}`} 
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <span>사진 없음</span>
                    )}
                </div>

                {thumbs.length > 1 && (
                    <button className="slide-arrow right" onClick={handleNext}>&gt;</button>
                )}
            </div>

            <div className="post-card-bottom">
                <div className="bottom-item" title="조회수">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span>{post.VIEW_COUNT || 0}</span>
                </div>

                <div className="bottom-item" title="좋아요">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>{post.LIKE_COUNT || 0}</span>
                </div>

                <div className="bottom-item" title="스크랩">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>{post.SCRAP_COUNT || 0}</span>
                </div>

                <div className="bottom-item" title="댓글">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span>{post.COMMENT_COUNT || 0}</span>
                </div>
            </div>
        </div>
    );
}

export default PostGrid;