import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'; // 💡 아웃렛 컨텍스트 훅 임포트 추가
import './css/MyUpload.css';

function MyUpload() {
    // 💡 기존 임시 하드코딩(const loginUserNo = 1;)을 과감히 제거합니다.
    // MyPage.js의 Outlet이 공유해 주는 실시간 로그인 유저 번호(myUserNo)를 바인딩합니다.
    const { myUserNo } = useOutletContext(); 

    const [uploadType, setUploadType] = useState('photo');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortOrder, setSortOrder] = useState('latest');
    const [categories, setCategories] = useState([]);
    
    const [photoList, setPhotoList] = useState([]);
    const [postList, setPostList] = useState([]);

    // [API 1] 백엔드 사진 조회 호출
    const fetchMyPhotos = async (userNo, category = '', sort = 'latest') => {
        try {
            const response = await fetch(
                `http://localhost:3010/mypage/photos?userNo=${userNo}&limit=12&category=${category}&sort=${sort}`
            );
            const data = await response.json();
            if (data.success) setPhotoList(data.list); 
        } catch (error) {
            console.error("사진 목록 조회 실패:", error);
        }
    };

    // [API 2] 백엔드 게시물 조회 호출 함수
    const fetchMyPosts = async (userNo, category = '', sort = 'latest') => {
        try {
            const response = await fetch(
                `http://localhost:3010/mypage/posts?userNo=${userNo}&limit=6&category=${category}&sort=${sort}`
            );
            const data = await response.json();
            if (data.success) setPostList(data.list);
        } catch (error) {
            console.error("게시물 목록 조회 실패:", error);
        }
    };

    // [API 3] 사진 카테고리 전체 목록 조회
    const fetchPhotoCategories = async () => {
        try {
            const response = await fetch('http://localhost:3010/mypage/photo');
            const data = await response.json();
            if (data.success) setCategories(data.categories);
        } catch (error) {
            console.error("사진 카테고리 조회 실패:", error);
        }
    };

    // [API 4] 게시물 카테고리 전체 목록 조회 함수
    const fetchPostCategories = async () => {
        try {
            const response = await fetch('http://localhost:3010/mypage/post');
            const data = await response.json();
            if (data.success) setCategories(data.categories);
        } catch (error) {
            console.error("게시물 카테고리 조회 실패:", error);
        }
    };

    // 탭 전환 시 카테고리 리스트 동적 구성
    useEffect(() => {
        setSelectedCategory(''); 
        
        if (uploadType === 'photo') {
            fetchPhotoCategories();
        } else {
            fetchPostCategories();
        }
    }, [uploadType]);

    // 💡 조건별 데이터 패칭 통합 감지 
    // 의존성 배열에 myUserNo를 추가하여, 세션 정보가 늦게 로드되더라도 동기화되도록 안전 장치를 걸어둡니다.
    useEffect(() => {
        if (!myUserNo) return;
        
        if (uploadType === 'photo') {
            fetchMyPhotos(myUserNo, selectedCategory, sortOrder);
        } else {
            fetchMyPosts(myUserNo, selectedCategory, sortOrder);
        }
    }, [uploadType, selectedCategory, sortOrder, myUserNo]);

    return (
        <div className="my-upload-container">
            
            {/* [상단 영역] 사진 / 게시물 전환 라디오 버튼 */}
            <div className="tab-radio-group">
                <label className={`tab-label ${uploadType === 'photo' ? 'active' : ''}`}>
                    <input 
                        type="radio" 
                        name="uploadType" 
                        value="photo" 
                        checked={uploadType === 'photo'} 
                        onChange={() => setUploadType('photo')}
                        style={{ display: 'none' }} 
                    />
                    사진
                </label>
                
                <label className={`tab-label ${uploadType === 'post' ? 'active' : ''}`}>
                    <input 
                        type="radio" 
                        name="uploadType" 
                        value="post" 
                        checked={uploadType === 'post'} 
                        onChange={() => setUploadType('post')}
                        style={{ display: 'none' }} 
                    />
                    게시물
                </label>
            </div>

            {/* [필터 영역] 카테고리 선택 및 정렬 드롭다운 */}
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
                    <option value="latest">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="likes">좋아요순</option>
                    <option value="views">조회수순</option>
                    <option value="scraps">스크랩순</option>
                    <option value="comments">댓글순</option>
                </select>
            </div>

            {/* [콘텐츠 영역] 상태에 따른 조건부 그리드 렌더링 */}
            {uploadType === 'photo' ? (
                /* 6열 이미지 그리드 뷰 (내 업로드 - 사진) */
                <div className="photo-grid">
                    {photoList.length > 0 ? (
                        photoList.map((photo) => (
                            <div 
                                key={photo.PHOTO_ID} 
                                className="photo-card-wrapper"
                                onClick={() => alert(`사진 고유ID [${photo.PHOTO_ID}] 상세/수정 페이지 이동`)}
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
                            업로드한 사진이 없습니다.
                        </div>
                    )}
                </div>
            ) : (
                /* 3열 카드 그리드 뷰 (내 업로드 - 게시물) */
                <div className="post-grid">
                    {postList.length > 0 ? (
                        postList.map((post) => (
                            <div key={post.POST_ID} className="post-card">
                                <div className="post-author">{post.NICKNAME || '익명 작가'}</div>
                                <div className="post-body">
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{post.TITLE}</div>
                                    <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                                        {post.CONTENT && post.CONTENT.length > 40 
                                            ? `${post.CONTENT.substring(0, 40)}...` 
                                            : post.CONTENT}
                                    </div>
                                    <small 
                                        className="post-detail-btn"
                                        onClick={() => alert(`게시글 고유ID [${post.POST_ID}] 상세/수정 이동`)}
                                    >
                                        자세히 보기
                                    </small>
                                </div>
                                <div className="post-image-placeholder">
                                    {post.THUMB_LIST && post.THUMB_LIST.length > 0 ? (
                                        <img 
                                            src={post.THUMB_LIST[0]} 
                                            alt="게시글 대표 이미지" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '12px', color: '#aaa' }}>이미지 없음</span>
                                    )}
                                </div>
                                <div className="post-footer">
                                    <span>좋아요 {post.LIKE_COUNT || 0}</span>
                                    <span>스크랩 {post.SCRAP_COUNT || 0}</span>
                                    <span>댓글 {post.COMMENT_COUNT || 0}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '20px' }}>
                            업로드한 게시물이 없습니다.
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

export default MyUpload;