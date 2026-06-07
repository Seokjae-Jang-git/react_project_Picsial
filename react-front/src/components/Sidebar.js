import React, { useEffect, useState } from 'react';
import Hashids from 'hashids';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import './css/Sidebar.css'; 

function Sidebar({ pageType = 'photo', selectedCategory, setSelectedCategory, sortOption, setSortOption, refreshTrigger }) {    
    const [categories, setCategories] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const navigate = useNavigate();
  const hashids = new Hashids(process.env.REACT_APP_HASHIDS_SECRET, 8);

    useEffect(() => {
        if (pageType === 'following') {
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

    const handleCategoryClick = (categoryId) => {
        if (setSelectedCategory) setSelectedCategory(categoryId);
    };

    const handleSortClick = (sortType) => {
        if (setSortOption) setSortOption(sortType);
    };

    return (
        <aside className={`photo-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            
            <div className="sidebar-top">
                {!isCollapsed && (
                    <span className="sidebar-title">
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

            {!isCollapsed && (
                <>
                    {pageType === 'following' ? (
                        <>
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

                            {/* 팔로잉 리스트 영역 */}
                            <div className="sort-section">
                                <h3 className="sidebar-title">팔로잉 목록</h3>
                                <div className="following-user-list">
                                    {followingList.length > 0 ? followingList.map(user => (
                                        <div 
                                            key={user.USER_NO} 
                                            className="filter-item following-item"
                                            onClick={() => {
                                                const hashedId = hashids.encode(user.USER_NO);
                                                navigate(`/photog/${hashedId}`);
                                            }}
                                        >
                                            {user.PROFILE_IMAGE_URL ? (
                                                <img 
                                                    src={user.PROFILE_IMAGE_URL} 
                                                    alt="프로필 이미지" 
                                                    className="yt-photog-avatar"
                                                />
                                            ) : (
                                                <svg className="yt-photog-avatar" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor: '#f1f3f5'}}>
                                                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                                </svg>
                                            )}
                                            <span className="following-nickname">{user.NICKNAME}</span>
                                        </div>
                                    )) : (
                                        <div className="empty-following">팔로우한 작가가 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="category-grid">
                                <div 
                                    className={`filter-item ${selectedCategory === '' ? 'active' : ''}`}
                                    onClick={() => handleCategoryClick('')}
                                >
                                    <div className="radio-circle"></div>전체
                                </div>
                                {categories.map(cat => (
                                    <div 
                                        key={cat.CATEGORY_ID}
                                        className={`filter-item ${Number(selectedCategory) === cat.CATEGORY_ID ? 'active' : ''}`}
                                        onClick={() => handleCategoryClick(cat.CATEGORY_ID)}
                                    >
                                        <div className="radio-circle"></div>{cat.CATEGORY_NAME}
                                    </div>
                                ))}
                            </div>

                            <div className="sort-section">
                                <h3 className="sidebar-title sort-title-margin">정렬</h3>
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