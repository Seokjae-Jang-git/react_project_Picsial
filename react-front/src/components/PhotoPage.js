import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PhotoGrid from '../components/PhotoGrid';
import './css/PhotoPage.css';

function PhotoPage() {
    // 1. 즉각 반응하는 UI용 State (Sidebar에 전달됨)
    const [currentFilter, setCurrentFilter] = useState(''); 
    const [currentSort, setCurrentSort] = useState('likes');  
    
    // 💡 2. 0.3초 대기 후 API 호출에 쓰일 '확정된' State
    const [debouncedFilter, setDebouncedFilter] = useState('');
    const [debouncedSort, setDebouncedSort] = useState('likes');

    const [photos, setPhotos] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 💡 [추가된 로직] 디바운싱 타이머
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
    // 💡 의존성 배열에 current가 아닌 'debounced' 값을 넣어서, 타이머가 끝났을 때만 실행되게 합니다.
    useEffect(() => {
        const fetchPhotos = async () => {
            try {
                // 💡 확정된(debounced) 값을 URL 파라미터로 사용
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
    }, [debouncedFilter, debouncedSort]); // 💡 debounced 값이 바뀔 때만 재실행

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