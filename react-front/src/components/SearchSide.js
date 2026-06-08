import React from 'react';
import './css/SearchSide.css'; // 라디오 스타일 CSS 매칭용

function SearchSide({ activeTab, setActiveTab, results }) {
    const totalCount = results.photos.length + results.posts.length + results.users.length;

    return (
        <aside className="search-sidebar" style={{ width: '260px', padding: '20px', borderRight: '1px solid #e9ecef' }}>
            <div className="sort-section" style={{ textAlign: 'left' }}>
                <h3 className="sidebar-title" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px' }}>검색 필터</h3>
                <div className="sort-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    <div className={`filter-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <div className="radio-circle"></div> 통합 검색 ({totalCount})
                    </div>
                    
                    <div className={`filter-item ${activeTab === 'photo' ? 'active' : ''}`} onClick={() => setActiveTab('photo')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <div className="radio-circle"></div> 사진 ({results.photos.length})
                    </div>
                    
                    <div className={`filter-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <div className="radio-circle"></div> 게시물 ({results.posts.length})
                    </div>
                    
                    <div className={`filter-item ${activeTab === 'photog' ? 'active' : ''}`} onClick={() => setActiveTab('photog')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <div className="radio-circle"></div> 작가/유저 ({results.users.length})
                    </div>

                </div>
            </div>
        </aside>
    );
}

export default SearchSide;