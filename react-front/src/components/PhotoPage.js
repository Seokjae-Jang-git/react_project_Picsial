import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PhotoGrid from '../components/PhotoGrid';
import './css/PhotoPage.css';

function PhotoPage() {
    // 💡 1. 즉각 반응하는 UI용 State (초기값을 sessionStorage에서 가져옴)
    const [currentFilter, setCurrentFilter] = useState(() => {
        const savedFilter = sessionStorage.getItem('photoPageFilter');
        return savedFilter !== null ? savedFilter : '';
    }); 
    const [currentSort, setCurrentSort] = useState(() => {
        const savedSort = sessionStorage.getItem('photoPageSort');
        return savedSort !== null ? savedSort : 'likes';
    });  
    
    // 💡 2. 0.3초 대기 후 API 호출에 쓰일 '확정된' State 
    // (이 값도 초기 렌더링 시 스토리지 값을 물고 시작해야 API가 두 번 호출되지 않습니다)
    const [debouncedFilter, setDebouncedFilter] = useState(currentFilter);
    const [debouncedSort, setDebouncedSort] = useState(currentSort);

    const [photos, setPhotos] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 💡 [추가된 로직] 필터나 정렬이 바뀔 때마다 sessionStorage에 실시간 백업
    useEffect(() => {
        sessionStorage.setItem('photoPageFilter', currentFilter);
        sessionStorage.setItem('photoPageSort', currentSort);
    }, [currentFilter, currentSort]);

    // 디바운싱 타이머
    // 사용자가 버튼 누르기를 멈추고 0.3초가 지나면 debounced 상태를 업데이트합니다.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilter(currentFilter);
            setDebouncedSort(currentSort);
        }, 300); // 300ms(0.3초) 지연

        // 만약 0.3초 안에 다른 버튼을 또 누르면, 이전 타이머를 취소(초기화)합니다.
        return () => clearTimeout(timer);
    }, [currentFilter, currentSort]);


    // 3. 실제 백엔드(DB)에서 데이터를 가져오는 로직
    // 의존성 배열에 current가 아닌 'debounced' 값을 넣어서, 타이머가 끝났을 때만 실행되게 합니다.
    useEffect(() => {
        const fetchPhotos = async () => {
            try {
                // 확정된(debounced) 값을 URL 파라미터로 사용
                const url = `http://localhost:3010/photo?category=${debouncedFilter}&sort=${debouncedSort}`;
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
        console.log(`📡 서버로 데이터 요청됨 -> 필터: ${debouncedFilter}, 정렬: ${debouncedSort}`);
    }, [debouncedFilter, debouncedSort]); // debounced 값이 바뀔 때만 재실행

    return (
        <div className="photo-page-container">
            <Header />

            <div className={`photo-page-body ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
                {/* Sidebar에는 여전히 '즉각 반응하는' current 상태를 넘겨줍니다. 
                    (버튼 색상은 누르는 즉시 바뀌어야 하니까요!) */}
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