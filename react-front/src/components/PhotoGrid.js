// PhotoGrid.js
import React from 'react';
import { useNavigate } from 'react-router-dom'; // 💡 1. 페이지 이동을 위한 훅 임포트
import './css/PhotoGrid.css';

function PhotoGrid({ photos }) {
    const navigate = useNavigate(); // 💡 2. navigate 함수 초기화
    
    // 사진이 없을 경우 처리
    if (!photos || photos.length === 0) {
        return <div className="no-photos">조건에 맞는 사진이 없습니다.</div>;
    }

    return (
        <div className="photo-grid-container">
            {photos.map((photo) => (
                <div 
                    key={photo.PHOTO_ID} 
                    className="grid-photo-card"
                    // 💡 3. 카드를 클릭하면 해당 사진의 ID를 달고 상세 페이지로 이동!
                    onClick={() => navigate(`/photo/${photo.PHOTO_ID}`)}
                    style={{ cursor: 'pointer' }} // 마우스를 올렸을 때 클릭 가능한 손가락 모양으로 변경
                >
                    <div className="grid-photo-placeholder">
                        <img 
                            /* 💡 팁: 그리드 목록에서는 IMAGE_URL(원본)보다 THUMB_URL(썸네일)을 쓰시면 
                               네트워크 렉을 기적처럼 더 줄일 수 있습니다! */
                            src={photo.IMAGE_URL} 
                            alt={photo.TITLE || 'Picsial 사진'} 
                            
                            /* 🔥 네트워크 렉 방지 핵심: 화면에 보일 때만 이미지를 로딩함 */
                            loading="lazy" 
                            decoding="async"
                        />
                    </div>
                    
                    {/* 하단 정보 영역 (스크린샷 참고) */}
                    <div className="photo-info">
                        <span>조회 {photo.VIEW_COUNT || 0}</span>
                        <span>좋아요 {photo.LIKE_COUNT || 0}</span>
                        <span>스크랩 {photo.SCRAP_COUNT || 0}</span>
                        <span>댓글 {photo.COMMENT_COUNT || 0}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// 💡 부모가 렌더링되어도 photos 데이터가 안 바뀌면 재렌더링 방지
export default React.memo(PhotoGrid);