import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/PhotogPhGrid.css';

function PhotogPhGrid({ userNo, sortOption }) {
    const navigate = useNavigate();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userNo) return;

        const fetchPhotos = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:3010/photog/photos/${userNo}?sort=${sortOption}`);
                const data = await response.json();
                
                if (data.success) {
                    setPhotos(data.photos);
                }
            } catch (error) {
                console.error("작가의 사진 목록을 불러오는 중 오류 발생:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, [userNo, sortOption]);

    if (loading) return <div className="photog-grid-loading">사진을 불러오는 중입니다...</div>;
    if (!photos || photos.length === 0) {
        return <div className="photog-grid-empty">업로드한 사진이 없습니다.</div>;
    }

    // ... 상단 상태 및 API 호출 로직은 기존과 동일 ...

    return (
        <div className="photog-photo-grid-container">
            {photos.map((photo) => (
                <div 
                    key={photo.PHOTO_ID} 
                    className="photog-photo-card-wrapper"
                    onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)}
                >
                    <img 
                        src={photo.THUMB_URL || photo.IMAGE_URL} 
                        alt={photo.TITLE || 'Picsial 사진'} 
                        className="photog-photo-image"
                        loading="lazy" 
                        decoding="async"
                    />
                    
                    {/* 💡 메인 PhotoGrid와 완벽히 동일한 오버레이 구조 */}
                    <div className="photog-stats-overlay">
                        <div className="photog-stat-item">
                            <span className="photog-grid-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </span>
                            {photo.VIEW_COUNT || 0}
                        </div>
                        <div className="photog-stat-item">
                            <span className="photog-grid-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </span>
                            {photo.LIKE_COUNT || 0}
                        </div>
                        <div className="photog-stat-item">
                            <span className="photog-grid-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            </span>
                            {photo.SCRAP_COUNT || 0}
                        </div>
                        <div className="photog-stat-item">
                            <span className="photog-grid-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            </span>
                            {photo.COMMENT_COUNT || 0}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default React.memo(PhotogPhGrid);