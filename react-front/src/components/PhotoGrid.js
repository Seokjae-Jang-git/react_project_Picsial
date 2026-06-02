import React from 'react';
import './css/PhotoGrid.css';

function PhotoGrid({ photos }) {
    return (
        <div className="photo-page-grid">
            {photos.map((photo) => (
                <div key={photo.id} className="grid-photo-card">
                    {/* 상단 사진 영역 */}
                    <div className="grid-photo-placeholder">
                        <span className="main-label">사진</span>
                    </div>
                    {/* 하단 지표 통계 바 */}
                    <div className="grid-photo-bottom">
                        <span>조회 {photo.views}</span>
                        <span>좋아요 {photo.likes}</span>
                        <span>스크랩 {photo.scraps}</span>
                        <span>댓글 {photo.comments}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PhotoGrid;