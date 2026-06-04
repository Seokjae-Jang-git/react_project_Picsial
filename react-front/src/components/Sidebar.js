import React, { useEffect, useState } from 'react';
import './css/Sidebar.css'; 

function Sidebar({ pageType = 'photo', selectedCategory, setSelectedCategory, sortOption, setSortOption }) {
    const [categories, setCategories] = useState([]);
    // 💡 접기/펴기 상태 관리
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        // pageType에 따라 게시물용 카테고리 또는 사진용 카테고리를 동적으로 불러옵니다.
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
    }, [pageType]);

    // 카테고리 선택 핸들러
    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId);
    };

    // 정렬 선택 핸들러
    const handleSortClick = (sortType) => {
        setSortOption(sortType);
    };

    return (
        <aside className={`photo-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            
            {/* 1. 상단 타이틀 & 접기/펴기 토글 버튼 */}
            <div className="sidebar-top">
                {!isCollapsed && <span className="sidebar-title">필터</span>}
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
                    {/* 2. 카테고리 2열 그리드 영역 */}
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

                    {/* 3. 정렬 2열 그리드 영역 (조회수, 댓글 포함 6종) */}
                    <div className="sort-section">
                        <h3 className="sidebar-title" style={{ marginTop: '10px' }}>정렬</h3>
                        <div className="sort-grid">
                            <div 
                                className={`filter-item ${sortOption === 'latest' ? 'active' : ''}`}
                                onClick={() => handleSortClick('latest')}
                            >
                                <div className="radio-circle"></div>
                                최신 순
                            </div>
                            <div 
                                className={`filter-item ${sortOption === 'oldest' ? 'active' : ''}`}
                                onClick={() => handleSortClick('oldest')}
                            >
                                <div className="radio-circle"></div>
                                오래된 순
                            </div>
                            <div 
                                className={`filter-item ${sortOption === 'likes' ? 'active' : ''}`}
                                onClick={() => handleSortClick('likes')}
                            >
                                <div className="radio-circle"></div>
                                좋아요 순
                            </div>
                            <div 
                                className={`filter-item ${sortOption === 'views' ? 'active' : ''}`}
                                onClick={() => handleSortClick('views')}
                            >
                                <div className="radio-circle"></div>
                                조회수 순
                            </div>
                            <div 
                                className={`filter-item ${sortOption === 'scraps' ? 'active' : ''}`}
                                onClick={() => handleSortClick('scraps')}
                            >
                                <div className="radio-circle"></div>
                                스크랩 순
                            </div>
                            <div 
                                className={`filter-item ${sortOption === 'comments' ? 'active' : ''}`}
                                onClick={() => handleSortClick('comments')}
                            >
                                <div className="radio-circle"></div>
                                댓글 순
                            </div>
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
}

export default Sidebar;