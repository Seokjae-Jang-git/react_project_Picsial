import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
// 💡 CSS는 업로드 페이지와 구조가 100% 동일하므로 MyUpload.css를 그대로 재사용하거나 복사해서 쓰시면 됩니다.
import './css/MyUpload.css'; 

// 💡 공유해주신 PostCard 컴포넌트 (동일하게 유지)
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
                        {formatTimeAgo(post.CREATED_AT)} 
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

// ==========================================================================
// 메인 컴포넌트: MyScrap
// ==========================================================================
function MyScrap() {
    const navigate = useNavigate(); 
    const location = useLocation(); 
    const { myUserNo } = useOutletContext(); 

    const [uploadType, setUploadType] = useState(location.state?.activeTab || 'photo');
    const [selectedCategory, setSelectedCategory] = useState('');
    // 💡 스크랩 페이지이므로 기본 정렬을 'scrap_latest'로 설정합니다.
    const [sortOrder, setSortOrder] = useState('scrap_latest');
    const [categories, setCategories] = useState([]);
    
    const [photoList, setPhotoList] = useState([]);
    const [postList, setPostList] = useState([]);

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

    // 💡 [API 1] 내가 스크랩한 사진 목록 호출
    const fetchMyScrapPhotos = async (userNo, category = '', sort = 'scrap_latest') => {
        try {
            const response = await fetch(
                `http://localhost:3010/mypage/scrap/photos?userNo=${userNo}&limit=12&category=${category}&sort=${sort}`
            );
            const data = await response.json();
            if (data.success) setPhotoList(data.list); 
        } catch (error) {
            console.error("스크랩 사진 조회 실패:", error);
        }
    };

    // 💡 [API 2] 내가 스크랩한 게시물 목록 호출
    const fetchMyScrapPosts = async (userNo, category = '', sort = 'scrap_latest') => {
        try {
            const response = await fetch(
                `http://localhost:3010/mypage/scrap/posts?userNo=${userNo}&limit=6&category=${category}&sort=${sort}`
            );
            const data = await response.json();
            if (data.success) setPostList(data.list);
        } catch (error) {
            console.error("스크랩 게시물 조회 실패:", error);
        }
    };

    // [API 3] 사진 카테고리
    const fetchPhotoCategories = async () => {
        try {
            const response = await fetch('http://localhost:3010/mypage/photo');
            const data = await response.json();
            if (data.success) setCategories(data.categories);
        } catch (error) {
            console.error("사진 카테고리 조회 실패:", error);
        }
    };

    // [API 4] 게시물 카테고리
    const fetchPostCategories = async () => {
        try {
            const response = await fetch('http://localhost:3010/mypage/post');
            const data = await response.json();
            if (data.success) setCategories(data.categories);
        } catch (error) {
            console.error("게시물 카테고리 조회 실패:", error);
        }
    };

    // 대시보드 쪽지 감지
    useEffect(() => {
        if (location.state?.activeTab) {
            setUploadType(location.state.activeTab);
        }
    }, [location.state]);

    // 탭 전환 감지
    useEffect(() => {
        setSelectedCategory(''); 
        if (uploadType === 'photo') {
            fetchPhotoCategories();
        } else {
            fetchPostCategories();
        }
    }, [uploadType]);

    // 조건별 데이터 로드
    useEffect(() => {
        if (!myUserNo) return;
        if (uploadType === 'photo') {
            fetchMyScrapPhotos(myUserNo, selectedCategory, sortOrder);
        } else {
            fetchMyScrapPosts(myUserNo, selectedCategory, sortOrder);
        }
    }, [uploadType, selectedCategory, sortOrder, myUserNo]);

    return (
        // 💡 CSS 클래스명은 스타일 유지를 위해 my-upload-container를 재사용합니다.
        <div className="my-upload-container">
            
            {/* [상단 영역] 사진 / 게시물 전환 라디오 버튼 */}
            <div className="type-radio-group">
                <label className="radio-tab-label">
                    <input 
                        type="radio" 
                        value="photo" 
                        checked={uploadType === 'photo'} 
                        onChange={(e) => setUploadType(e.target.value)} 
                    />
                    <span className="radio-tab-btn">사진</span>
                </label>
                
                <label className="radio-tab-label">
                    <input 
                        type="radio" 
                        value="post" 
                        checked={uploadType === 'post'} 
                        onChange={(e) => setUploadType(e.target.value)} 
                    />
                    <span className="radio-tab-btn">게시물</span>
                </label>
            </div>

            <div className="filter-select-group">
                <select 
                    className="filter-select"
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="">카테고리</option>
                    {categories.map((cat) => (
                        <option key={cat.CATEGORY_ID} value={cat.CATEGORY_ID}>
                            {cat.CATEGORY_NAME}
                        </option>
                    ))}
                </select>

                <select 
                    className="filter-select"
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                >
                    {/* 💡 스크랩 전용 정렬 옵션 추가 */}
                    <option value="scrap_latest">스크랩 최신순</option>
                    <option value="scrap_oldest">스크랩 오래된순</option>
                    <option value="latest">작성 최신순</option>
                    <option value="oldest">작성 오래된순</option>
                    <option value="likes">좋아요순</option>
                    <option value="views">조회수순</option>
                    <option value="comments">댓글순</option>
                </select>
            </div>

            {uploadType === 'photo' ? (
                <div className="photo-grid">
                    {photoList.length > 0 ? (
                        photoList.map((photo) => (
                            <div 
                                key={photo.PHOTO_ID} 
                                className="photo-card-wrapper"
                                onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)}
                            >
                                <img 
                                    src={photo.THUMB_URL || photo.IMAGE_URL} 
                                    alt={photo.TITLE} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                        </span>
                                        {photo.LIKE_COUNT || 0}
                                    </div>
                                    <div className="stat-item">
                                        <span className="grid-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                        </span>
                                        {photo.SCRAP_COUNT || 0}
                                    </div>
                                    <div className="stat-item">
                                        <span className="grid-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                        </span>
                                        {photo.COMMENT_COUNT || 0}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: 'span 6', textAlign: 'center', padding: '5px' }}>
                            스크랩한 사진이 없습니다.
                        </div>
                    )}
                </div>
            ) : (
                <div className="post-grid-container">
                    {postList.length > 0 ? (
                        postList.map((post) => (
                            <PostCard 
                                key={post.POST_ID} 
                                post={post} 
                                formatTimeAgo={formatTimeAgo} 
                            />
                        ))
                    ) : (
                        <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '20px' }}>
                            스크랩한 게시물이 없습니다.
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

export default MyScrap;