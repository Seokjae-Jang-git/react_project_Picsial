import React from 'react';
import './css/AttachmentSection.css'; 

function AttachmentSection({ attachments }) {
    if (!attachments || attachments.length === 0) return null;

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // 🚀 1. 강제 다운로드를 실행하는 함수 추가
    const handleDownload = async (url, originalName, e) => {
        e.preventDefault(); // 기본 링크 이동 방지
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('다운로드 실패');
            
            // 파일을 blob 형태로 메모리에 올립니다.
            const blob = await response.blob(); 
            // blob을 기반으로 임시 URL 생성
            const blobUrl = window.URL.createObjectURL(blob); 

            // 눈에 보이지 않는 <a> 태그를 만들어 강제 클릭 이벤트를 발생시킵니다.
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = originalName; // 사용자가 지정한 원본 파일명 유지
            document.body.appendChild(a);
            a.click();
            
            // 다운로드 후 메모리 정리
            window.URL.revokeObjectURL(blobUrl); 
            document.body.removeChild(a);
        } catch (error) {
            console.error('파일 다운로드 에러:', error);
            alert('파일을 다운로드할 수 없습니다.');
        }
    };

    return (
        <div className="detail-box attachment-box">
            <h3 className="box-title">첨부파일</h3>
            <div className="attachment-list">
                {attachments.map((file) => (
                    <div key={file.fileId} className="attachment-item-box">
                        <div className="file-info-left">
                            <svg className="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            <span className="file-name">{file.originalName}</span>
                            <span className="file-size">{formatFileSize(file.fileSize)}</span>
                        </div>
                        
                        {/* 🚀 2. href 대신 onClick 이벤트로 강제 다운로드 함수 연결 */}
                        <button 
                            onClick={(e) => handleDownload(file.downloadUrl, file.originalName, e)} 
                            className="flat-download-btn"
                        >
                            다운로드
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AttachmentSection;