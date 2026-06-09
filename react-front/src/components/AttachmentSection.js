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

    const handleDownload = async (url, originalName, e) => {
        e.preventDefault(); 
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('다운로드 실패');
            
            const blob = await response.blob(); 
            const blobUrl = window.URL.createObjectURL(blob); 

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = originalName; 
            document.body.appendChild(a);
            a.click();
            
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