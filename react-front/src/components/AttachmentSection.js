import React from 'react';
import './css/AttachmentSection.css'; // 아래 세련된 디자인 스타일이 담길 CSS 파일

function AttachmentSection({ attachments }) {
    if (!attachments || attachments.length === 0) return null;

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        // 💡 카테고리/태그 박스와 통일감을 주는 전체 컨테이너 박스
        <div className="detail-box attachment-box">
            <h3 className="box-title">첨부파일</h3>
            <div className="attachment-list">
                {attachments.map((file) => (
                    // 💡 개별 첨부파일들을 한 줄씩 감싸는 플랫 라운드 박스
                    <div key={file.fileId} className="attachment-item-box">
                        <div className="file-info-left">
                            <svg className="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            <span className="file-name">{file.originalName}</span>
                            <span className="file-size">{formatFileSize(file.fileSize)}</span>
                        </div>
                        
                        {/* 💡 텍스트 분리로 빨간 줄을 없애고 독립시킨 플랫 다운로드 버튼 */}
                        <a 
                            href={file.downloadUrl} 
                            download={file.originalName} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flat-download-btn"
                        >
                            다운로드
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AttachmentSection;