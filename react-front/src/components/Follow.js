import React, { useState } from 'react';
import Header from '../components/Header'; // 경로 확인
import Sidebar from '../components/Sidebar'; // 경로 확인
import FollowGrid from './FollowGrid'; // 작가 리스트 컴포넌트
import './css/Follow.css';

function Follow() {
    // 💡 정렬 상태 관리 (기본값: 팔로워 순)
    const [sortOption, setSortOption] = useState('followers'); 
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <div className="follow-page-container">
            <Header />

            {/* 🚀 PhotoPage.js와 완벽하게 동일한 DOM 구조 적용 */}
            <div className="follow-page-body">
                
                <Sidebar 
                    pageType="following" 
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                    refreshTrigger={refreshTrigger} 
                />
                
                {/* 🚀 우측 콘텐츠 영역 (독립 스크롤 영역) */}
                <main className="follow-content-area">
                    <FollowGrid 
                        sortOption={sortOption} 
                        onFollowChange={() => setRefreshTrigger(prev => prev + 1)} 
                    />
                </main>

            </div>
        </div>
    );
}

export default Follow;