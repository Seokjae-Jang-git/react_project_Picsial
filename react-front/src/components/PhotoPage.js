import React, { useState, useEffect } from 'react';
import Header from '../components/Header'; 
import Sidebar from '../components/Sidebar'; 
import PhotoGrid from '../components/PhotoGrid'; 
import './css/PhotoPage.css';

function PhotoPage() {
    const [selectedCategory, setSelectedCategory] = useState(() => {
        const savedCategory = sessionStorage.getItem('photoPageCategory');
        return savedCategory !== null ? savedCategory : '';
    }); 
    const [sortOption, setSortOption] = useState(() => {
        const savedSort = sessionStorage.getItem('photoPageSort');
        return savedSort !== null ? savedSort : 'latest'; 
    });  
    
    const [debouncedCategory, setDebouncedCategory] = useState(selectedCategory);
    const [debouncedSortOption, setDebouncedSortOption] = useState(sortOption);

    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        sessionStorage.setItem('photoPageCategory', selectedCategory);
        sessionStorage.setItem('photoPageSort', sortOption);
    }, [selectedCategory, sortOption]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCategory(selectedCategory);
            setDebouncedSortOption(sortOption);
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedCategory, sortOption]);

    useEffect(() => {
        const fetchPhotos = async () => {
            try {
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
    }, [debouncedCategory, debouncedSortOption]); 

    return (
        <div className="photo-page-container">
            <Header />

            <div className="photo-page-body">
                
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