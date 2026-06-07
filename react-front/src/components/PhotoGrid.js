// PhotoGrid.js
import React from 'react';
import { useNavigate } from 'react-router-dom'; // 💡 1. 페이지 이동을 위한 훅 임포트
import './css/PhotoGrid.css';

function PhotoGrid({ photos }) {
    const navigate = useNavigate(); // 💡 2. navigate 함수 초기화
    
    // 사진이 없을 경우 처리
    if (!photos || photos.length === 0) {
        return <div className="no-photos"></div>;
    }

    return (
        <div className="photo-grid-container">
            {photos.map((photo) => (
                <div 
                    key={photo.PHOTO_ID} 
                    className="photo-card-wrapper"
                    onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)}
                >
                    {/* 1. 이미지: THUMB_URL을 사용하여 성능 최적화 */}
                    <img 
                        src={photo.THUMB_URL || photo.IMAGE_URL} 
                        alt={photo.TITLE || 'Picsial 사진'} 
                        className="photo-image"
                        loading="lazy" 
                        decoding="async"
                    />
                    
                    <div className="stats-overlay">
                        {/* 여기를 감싸는 별도 div가 없어도 overlay가 직접 row로 배치되게 설정할 겁니다 */}
                        <div className="stat-item">
                            <span className="grid-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </span>
                            {photo.VIEW_COUNT || 0}
                        </div>
                        <div className="stat-item">
                            <span className="grid-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </span>
                            {photo.LIKE_COUNT || 0}
                        </div>
                        <div className="stat-item">
                            <span className="grid-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </span>
                            {photo.SCRAP_COUNT || 0}
                        </div>
                        <div className="stat-item">
                            <span className="grid-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                            </span>
                            {photo.COMMENT_COUNT || 0}
                        </div>
                    </div>
                </div>
            ))}
        </div>

    );
}

// 💡 부모가 렌더링되어도 photos 데이터가 안 바뀌면 재렌더링 방지
export default React.memo(PhotoGrid);