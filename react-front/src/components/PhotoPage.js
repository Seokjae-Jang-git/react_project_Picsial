import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PhotoGrid from '../components/PhotoGrid';
import './css/PhotoPage.css';

function PhotoPage() {
    const [currentFilter, setCurrentFilter] = useState(''); // 선택된 카테고리
    const [currentSort, setCurrentSort] = useState('likes');  // 선택된 정렬 기준
    const [photos, setPhotos] = useState([]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 필터나 정렬이 바뀔 때마다 실행 (추후 백엔드 API 호출과 연동)
    useEffect(() => {
        // 샘플 데이터 12개 생성 (기획안의 4열 3행 배치 맞춤)
        const mockPhotos = Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            category: i % 2 === 0 ? '동물' : '풍경',
            views: 100 + i * 15,
            likes: 50 + i * 8,
            scraps: 10 + i * 2,
            comments: 5 + i
        }));

        setPhotos(mockPhotos);
        console.log(`필터: ${currentFilter}, 정렬: ${currentSort} 기준으로 데이터 요청됨`);
    }, [currentFilter, currentSort]);

    return (
        <div className="photo-page-container">
            {/* 공통 헤더 */}
            <Header />

            {/* 레이아웃 바디: 사이드바 + 중앙 사진 그리드 */}
            <div className={`photo-page-body ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
                <Sidebar 
                    isSidebarOpen={isSidebarOpen} 
                    setIsSidebarOpen={setIsSidebarOpen} 
                    currentFilter={currentFilter}
                    setCurrentFilter={setCurrentFilter}
                    currentSort={currentSort}
                    setCurrentSort={setCurrentSort}
                />
                <main className="photo-content-area">
                    <PhotoGrid photos={photos} />
                </main>
            </div>
        </div>
    );
}

export default PhotoPage;