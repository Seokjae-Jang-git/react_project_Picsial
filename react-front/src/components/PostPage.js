import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import PostGrid from './PostGrid';
import './css/PostPage.css'; 

function PostPage() {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortOption, setSortOption] = useState('latest');

    return (
        <div className="post-page-container">
            <Header />
            
            <div className="post-page-body">
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