import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import UploadPhoto from './Upload_Photo';
import UploadPost from './Upload_Post';
import './css/Upload.css';

function Upload() {
    const navigate = useNavigate();
    const [uploadType, setUploadType] = useState('photo');

    return (
        <div className="upload-page-container">
            <Header />
            <main className="upload-main">
                {/* 🚀 상단 바: 뒤로가기(왼쪽) + 업로드 타입 선택(오른쪽) */}
                <div className="upload-top-bar">
                    <button onClick={() => navigate(-1)} className="btn-back">&lt; 뒤로가기</button>
                    
                    <div className="type-radio-group">
                        <label>
                            <input type="radio" value="photo" checked={uploadType === 'photo'} onChange={(e) => setUploadType(e.target.value)} /> 사진
                        </label>
                        <label>
                            <input type="radio" value="post" checked={uploadType === 'post'} onChange={(e) => setUploadType(e.target.value)} /> 게시물
                        </label>
                    </div>
                </div>

                {/* 🚀 내용물 영역: 선택된 컴포넌트만 로드 */}
                <div className="upload-content-area">
                    {uploadType === 'photo' ? <UploadPhoto /> : <UploadPost />}
                </div>
            </main>
        </div>
    );
}

export default Upload;