import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import PostGrid from './PostGrid';
import './css/PostPage.css'; // 아래에서 제공할 CSS 파일 연결

function PostPage() {
    // 💡 사이드바와 그리드가 공유할 상태 (필터 및 정렬)
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortOption, setSortOption] = useState('latest');

    return (
        <div className="page-wrapper">
            <Header />
            
            <div className="content-layout">
                {/* 💡 pageType="post"를 전달하여 게시물 카테고리를 부르도록 지시 */}
                <Sidebar 
                    pageType="post" 
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                />
                
                <main className="main-content">
                    <PostGrid 
                        selectedCategory={selectedCategory} 
                        sortOption={sortOption} 
                    />
                </main>
            </div>
        </div>
    );
}

export default PostPage;