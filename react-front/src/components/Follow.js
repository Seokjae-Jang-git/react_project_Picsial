import React, { useState } from 'react';
import Header from '../components/Header'; // 헤더 컴포넌트 경로에 맞게 수정
import Sidebar from '../components/Sidebar';
import FollowGrid from './FollowGrid';
import './css/Follow.css';

function Follow() {
    // 💡 정렬 상태 관리 (기본값: 팔로워 순)
    const [sortOption, setSortOption] = useState('followers'); 

    return (
        <div className="follow-page-container">
            <Header />
            <main className="follow-main-content">
                <div className="follow-layout-wrapper">
                    
                    {/* 💡 왼쪽: 팔로잉 전용 사이드바 */}
                    <Sidebar 
                        pageType="following" 
                        currentSort={sortOption}
                        onSortSelect={setSortOption} 
                    />

                    {/* 💡 오른쪽: 작가 리스트 카드 영역 */}
                    <FollowGrid 
                        sortOption={sortOption} 
                    />
                    
                </div>
            </main>
        </div>
    );
}

export default Follow;