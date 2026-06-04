import React, { useState, useEffect } from 'react';
import Header from '../components/Header'; // 경로에 맞게 수정하세요
import Sidebar from '../components/Sidebar'; // 경로에 맞게 수정하세요
import PhotoGrid from '../components/PhotoGrid'; // 경로에 맞게 수정하세요
import './css/PhotoPage.css';

function PhotoPage() {
    // 💡 1. 즉각 반응하는 UI용 State (Sidebar.js 및 PostPage.js와 이름 완벽 통일!)
    const [selectedCategory, setSelectedCategory] = useState(() => {
        const savedCategory = sessionStorage.getItem('photoPageCategory');
        return savedCategory !== null ? savedCategory : '';
    }); 
    const [sortOption, setSortOption] = useState(() => {
        const savedSort = sessionStorage.getItem('photoPageSort');
        return savedSort !== null ? savedSort : 'latest'; // 기본값을 최신순(latest)으로 맞췄습니다
    });  
    
    // 💡 2. 0.3초 대기 후 API 호출에 쓰일 '확정된' State (디바운싱)
    const [debouncedCategory, setDebouncedCategory] = useState(selectedCategory);
    const [debouncedSortOption, setDebouncedSortOption] = useState(sortOption);

    const [photos, setPhotos] = useState([]);

    // 💡 사이드바 열림 상태(isSidebarOpen)는 이제 Sidebar.js가 스스로 관리하므로 부모에서는 과감히 삭제했습니다.

    // [로직] 필터나 정렬이 바뀔 때마다 sessionStorage에 실시간 백업
    useEffect(() => {
        sessionStorage.setItem('photoPageCategory', selectedCategory);
        sessionStorage.setItem('photoPageSort', sortOption);
    }, [selectedCategory, sortOption]);

    // [로직] 디바운싱 타이머 (0.3초 지연)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCategory(selectedCategory);
            setDebouncedSortOption(sortOption);
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedCategory, sortOption]);


    // 3. 실제 백엔드(DB)에서 데이터를 가져오는 로직
    useEffect(() => {
        const fetchPhotos = async () => {
            try {
                // 확정된(debounced) 값을 URL 파라미터로 사용
                const url = `http://localhost:3010/photo?category=${debouncedCategory}&sort=${debouncedSortOption}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    setPhotos(data.photos); 
                } else {
                    setPhotos([]); 
                }
            } catch (error) {
                console.error("사진 데이터를 가져오는 중 오류가 발생했습니다:", error);
                setPhotos([]); 
            }
        };

        fetchPhotos();
    }, [debouncedCategory, debouncedSortOption]); // debounced 값이 바뀔 때만 재실행

    return (
        <div className="photo-page-container">
            <Header />

            {/* 부모가 억지로 컨트롤하던 sidebar-collapsed 클래스 제거 (CSS Flexbox가 알아서 여백을 채웁니다) */}
            <div className="photo-page-body">
                
                {/* 💡 Sidebar에 통일된 프롭스(Props) 이름으로 깔끔하게 전달! */}
                <Sidebar 
                    pageType="photo" 
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                />
                
                <main className="photo-content-area">
                    <PhotoGrid photos={photos} />
                </main>
            </div>
        </div>
    );
}

export default PhotoPage;