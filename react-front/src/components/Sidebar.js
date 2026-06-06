import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode'; // 🚀 토큰 디코딩 라이브러리 추가
import './css/Sidebar.css'; 

function Sidebar({ pageType = 'photo', selectedCategory, setSelectedCategory, sortOption, setSortOption, refreshTrigger }) {    // 💡 기존 카테고리 상태
    const [categories, setCategories] = useState([]);
    
    // 💡 팔로잉 전용: 팔로우한 작가 목록 상태
    const [followingList, setFollowingList] = useState([]);
    
    // 💡 접기/펴기 상태 관리
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (pageType === 'following') {
            // ==========================================
            // 🚀 [팔로잉 페이지] 내 팔로잉 목록 가져오기
            // ==========================================
            const fetchFollowingList = async () => {
                const token = localStorage.getItem('jwtToken');
                if (!token) return;
                
                try {
                    const decoded = jwtDecode(token);
                    const response = await fetch(`http://localhost:3010/follow/list?userNo=${decoded.userNo}`);
                    const data = await response.json();
                    if (data.success) {
                        setFollowingList(data.followingList);
                    }
                } catch (error) {
                    console.error("팔로잉 목록 로드 실패:", error);
                }
            };
            fetchFollowingList();

        } else {
            // ==========================================
            // 📸 [사진/게시물 페이지] 카테고리 가져오기
            // ==========================================
            const fetchCategories = async () => {
                try {
                    const endpoint = pageType === 'post' 
                        ? 'http://localhost:3010/category/post' 
                        : 'http://localhost:3010/category/photo';
                    
                    const response = await fetch(endpoint);
                    const data = await response.json();
                    if (data.success) {
                        setCategories(data.categories);
                    }
                } catch (error) {
                    console.error("카테고리 불러오기 실패:", error);
                }
            };
            fetchCategories();
        }
    }, [pageType, refreshTrigger]);

    // 카테고리 및 정렬 선택 핸들러
    const handleCategoryClick = (categoryId) => {
        if (setSelectedCategory) setSelectedCategory(categoryId);
    };

    const handleSortClick = (sortType) => {
        if (setSortOption) setSortOption(sortType);
    };

    return (
        <aside className={`photo-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            
            {/* 1. 상단 타이틀 & 접기/펴기 토글 버튼 */}
            <div className="sidebar-top">
                {!isCollapsed && (
                    <span className="sidebar-title">
                        {/* 🚀 팔로잉 페이지면 '정렬', 아니면 '필터' 출력 */}
                        {pageType === 'following' ? '정렬' : '필터'}
                    </span>
                )}
                <button 
                    className="toggle-btn" 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "사이드바 열기" : "사이드바 닫기"}
                >
                    {isCollapsed ? '>' : '<'}
                </button>
            </div>

            {/* 💡 사이드바가 열려있을 때만 내용 렌더링 */}
            {!isCollapsed && (
                <>
                    {pageType === 'following' ? (
                        <>
                            {/* 🚀 인라인 스타일(marginTop)을 모두 제거하여 기존 사이드바와 간격 통일 */}
                            <div className="sort-section">
                                <div className="sort-grid">
                                    <div className={`filter-item ${sortOption === 'followers' ? 'active' : ''}`} onClick={() => handleSortClick('followers')}>
                                        <div className="radio-circle"></div>팔로워 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'updated' ? 'active' : ''}`} onClick={() => handleSortClick('updated')}>
                                        <div className="radio-circle"></div>업데이트 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'likes' ? 'active' : ''}`} onClick={() => handleSortClick('likes')}>
                                        <div className="radio-circle"></div>좋아요 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'scraps' ? 'active' : ''}`} onClick={() => handleSortClick('scraps')}>
                                        <div className="radio-circle"></div>스크랩 순
                                    </div>
                                </div>
                            </div>

                            {/* 팔로잉 관리 리스트 */}
                            <div className="sort-section">
                                <h3 className="sidebar-title">팔로잉 관리</h3>
                                <div className="following-user-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
                                    {followingList.length > 0 ? followingList.map(user => (
                                        <div key={user.USER_NO} className="filter-item" style={{ paddingLeft: '5px' }} onClick={() => alert("이동")}>
                                            <img 
                                                src={user.PROFILE_IMAGE ? user.PROFILE_IMAGE : '/default-profile.png'} 
                                                alt="프로필" 
                                                style={{ width: '28px', height: '28px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }} 
                                            />
                                            <span className="nickname" style={{ fontSize: '14px', fontWeight: '500' }}>{user.NICKNAME}</span>
                                        </div>
                                    )) : (
                                        <div style={{ fontSize: '13px', color: '#888', padding: '10px 5px' }}>팔로우한 작가가 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        // ==========================================
                        // 📸 [사진/게시물 모드] 사이드바 UI (기존 코드 유지)
                        // ==========================================
                        <>
                            {/* 카테고리 영역 */}
                            <div className="category-grid">
                                <div 
                                    className={`filter-item ${selectedCategory === '' ? 'active' : ''}`}
                                    onClick={() => handleCategoryClick('')}
                                >
                                    <div className="radio-circle"></div>
                                    전체
                                </div>
                                {categories.map(cat => (
                                    <div 
                                        key={cat.CATEGORY_ID}
                                        className={`filter-item ${Number(selectedCategory) === cat.CATEGORY_ID ? 'active' : ''}`}
                                        onClick={() => handleCategoryClick(cat.CATEGORY_ID)}
                                    >
                                        <div className="radio-circle"></div>
                                        {cat.CATEGORY_NAME}
                                    </div>
                                ))}
                            </div>

                            {/* 정렬 영역 */}
                            <div className="sort-section">
                                <h3 className="sidebar-title" style={{ marginTop: '10px' }}>정렬</h3>
                                <div className="sort-grid">
                                    <div className={`filter-item ${sortOption === 'latest' ? 'active' : ''}`} onClick={() => handleSortClick('latest')}>
                                        <div className="radio-circle"></div>최신 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'oldest' ? 'active' : ''}`} onClick={() => handleSortClick('oldest')}>
                                        <div className="radio-circle"></div>오래된 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'likes' ? 'active' : ''}`} onClick={() => handleSortClick('likes')}>
                                        <div className="radio-circle"></div>좋아요 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'views' ? 'active' : ''}`} onClick={() => handleSortClick('views')}>
                                        <div className="radio-circle"></div>조회수 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'scraps' ? 'active' : ''}`} onClick={() => handleSortClick('scraps')}>
                                        <div className="radio-circle"></div>스크랩 순
                                    </div>
                                    <div className={`filter-item ${sortOption === 'comments' ? 'active' : ''}`} onClick={() => handleSortClick('comments')}>
                                        <div className="radio-circle"></div>댓글 순
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </aside>
    );
}

export default Sidebar;