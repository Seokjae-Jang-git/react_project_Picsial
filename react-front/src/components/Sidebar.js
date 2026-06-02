import React, { useState, useEffect } from 'react';
import './css/Sidebar.css';

function Sidebar({ 
    currentFilter, 
    setCurrentFilter, 
    currentSort, 
    setCurrentSort, 
    isSidebarOpen, 
    setIsSidebarOpen 
}) {
    // 💡 1. DB에서 가져올 카테고리 데이터를 담을 상태 (초기값은 빈 배열)
    const [categories, setCategories] = useState([]);
    
    // 💡 2. 컴포넌트 마운트 시 백엔드 API 호출
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:3010/category');
                if (!response.ok) {
                    throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.success) {
                    setCategories(data.categories);
                }
            } catch (error) {
                console.error("카테고리 데이터를 가져오는 중 오류가 발생했습니다:", error);
            }
        };

        fetchCategories();
    }, []); 

    // 기획안의 정렬 옵션 (이 부분은 하드코딩 유지)
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

            {/* 메뉴 영역 렌더링 */}
            {isSidebarOpen && (
                <>
                    {/* 카테고리 영역 */}
                    <div className="category-grid">
                        
                        {/* 💡 '전체보기' 버튼 추가 (필터 해제 역할, 빈 값을 넘겨줍니다) */}
                        <button 
                            className={`filter-item ${currentFilter === '' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('')}
                        >
                            <span className="radio-circle"></span>
                            전체
                        </button>

                        {/* 💡 DB에서 가져온 데이터 뿌리기 */}
                        {categories.map((cat) => (
                            <button 
                                key={cat.CATEGORY_ID} 
                                /* active 조건: 선택된 filter 값(숫자)과 현재 카테고리 ID가 같으면 활성화 */
                                className={`filter-item ${currentFilter === String(cat.CATEGORY_ID) || currentFilter === cat.CATEGORY_ID ? 'active' : ''}`}
                                /* 백엔드 필터링을 위해 CATEGORY_NAME이 아닌 CATEGORY_ID를 넘겨줌 */
                                onClick={() => setCurrentFilter(cat.CATEGORY_ID)}
                            >
                                <span className="radio-circle"></span>
                                {cat.CATEGORY_NAME}
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