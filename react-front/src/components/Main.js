import React, { useEffect, useState } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

import './css/Main.css';

function Main() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [posts, setPosts] = useState([]);

    const navigate = useNavigate();
    
    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const loggedIn = !!token;
        setIsLoggedIn(loggedIn);

        const fetchPhotos = async () => {
            try {
                const response = await fetch('http://localhost:3010/photo?sort=likes');
                if (!response.ok) {
                    throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.success) {
                    setPhotos(data.photos); 
                }
            } catch (error) {
                console.error("메인 페이지 사진 가져오기 실패:", error);
            }
        };

        const fetchPosts = async () => {
            try {
                const response = await fetch('http://localhost:3010/post?sort=likes');
                if (!response.ok) {
                    throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.success) {
                    setPosts(data.posts); 
                }
            } catch (error) {
                console.error("메인 페이지 게시물 가져오기 실패:", error);
            }
        };

        fetchPhotos();
        fetchPosts(); 

    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    };

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

    const getSnippet = (text, maxLength = 45) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className="main-page-container">
            <Header />

            <main className="main-body">
                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">사진</h2>
                        <button className="more-btn" onClick={()=>navigate('/photo')}>더보기 &gt;</button>
                    </div>
                    <div className="photo-grid">
                        {photos.slice(0, 15).map((photo) => (
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
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                            </svg>
                                        </span>
                                        {photo.COMMENT_COUNT || 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="content-section">
                    <div className="section-header">
                        <h2 className="section-title">게시물</h2>
                        <button className="more-btn" onClick={() => navigate('/post')}>더보기 &gt;</button>
                    </div>
                    
                    <div className="post-grid-container">
                        
                        {posts.slice(0, 5).map((post) => {
                            const thumbs = post.THUMB_LIST || [post.THUMB_URL].filter(Boolean);
                            const currentImgIdx = 0; 

                            return (
                                <div 
                                    key={post.POST_ID} 
                                    className="vertical-post-card" 
                                    onClick={() => navigate(`/post/${post.POST_ID}`)}
                                >
                                    <div className="post-photog-header-yt">
                                        {post.PROFILE_IMAGE_URL ? (
                                            <img 
                                                src={post.PROFILE_IMAGE_URL} 
                                                alt="프로필 이미지" 
                                                className="yt-photog-avatar"
                                            />
                                        ) : (
                                            <svg className="yt-photog-avatar" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor: '#f1f3f5'}}>
                                                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                            </svg>
                                        )}
                                        
                                        <div className="yt-photog-meta">
                                            <span className="photog-name">{post.NICKNAME || `회원 ${post.USER_NO}`}</span>
                                            <span className="post-time-ago-yt">{formatTimeAgo(post.CREATED_AT)}</span>
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

                                    <div className="post-card-media">
                                        <div className="media-placeholder">
                                            {thumbs.length > 0 ? (
                                                <img 
                                                    src={thumbs[currentImgIdx]} 
                                                    alt={post.TITLE} 
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <span>사진 없음</span>
                                            )}
                                        </div>
                                    </div>

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
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Main;