import React from 'react';
import './css/Sidebar.css';

function Sidebar({ currentFilter, setCurrentFilter, currentSort, setCurrentSort, isSidebarOpen, setIsSidebarOpen }) {
    // 기획안의 카테고리 리스트
    const categories = ['동물', '식물', '인물', '풍경', '도시', '건물', '야경', '스포츠', '웨딩'];
    
    // 기획안의 정렬 옵션
    const sortOptions = [
        { label: '조회수 순', value: 'views' },
        { label: '좋아요 순', value: 'likes' },
        { label: '스크랩 순', value: 'scraps' },
        { label: '댓글 순', value: 'comments' },
        { label: '최신 순', value: 'latest' },
        { label: '오래된 순', value: 'oldest' }
    ];

    return (
        <aside className={`photo-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
            {/* 상단 타이틀 및 접기 버튼 */}
            <div className="sidebar-top">
                {isSidebarOpen && <span className="sidebar-title">필터</span>}
                <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? '<' : '>'}
                </button>
            </div>

            {/* 사이드바가 열려있을 때만 아래 필터/정렬 메뉴들을 렌더링함 */}
            {isSidebarOpen && (
                <>
                    {/* 카테고리 영역 */}
                    <div className="category-grid">
                        {categories.map((cat) => (
                            <button 
                                key={cat} 
                                className={`filter-item ${currentFilter === cat ? 'active' : ''}`}
                                onClick={() => setCurrentFilter(cat)}
                            >
                                <span className="radio-circle"></span>
                                {cat}
                            </button>
                        ))}
                    </div>

                    <hr className="sidebar-divider" />

                    {/* 정렬 영역 */}
                    <div className="sort-section">
                        <span className="sidebar-title">정렬</span>
                        <div className="sort-grid">
                            {sortOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={`filter-item ${currentSort === option.value ? 'active' : ''}`}
                                    onClick={() => setCurrentSort(option.value)}
                                >
                                    <span className="radio-circle"></span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
}

export default Sidebar;