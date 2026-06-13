import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import './css/Upload_Post.css';

function UploadPost() {
    const navigate = useNavigate();
    
    const [postCategories, setPostCategories] = useState([]);

    const [postData, setPostData] = useState({
        title: '',
        content: '',
        categoryIds: [''], 
        tags: [],
        isPublic: 'Y'
    });
    
    const [postMainImages, setPostMainImages] = useState([]); 
    const [postAttachments, setPostAttachments] = useState([{ file: null, name: '' }]); 
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:3010/category/post'); 
                const data = await response.json();
                if (data.success) setPostCategories(data.categories);
            } catch (error) { console.error("카테고리 에러:", error); }
        };
        fetchCategories();
    }, []);

    const handlePostDataChange = (field, value) => {
        setPostData(prev => ({ ...prev, [field]: value }));
    };

    const handlePostImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const LIMIT_COUNT = 3;
        if (postMainImages.length + files.length > LIMIT_COUNT) {
            alert(`게시물 사진은 최대 ${LIMIT_COUNT}장까지만 업로드할 수 있습니다.`);
            return;
        }

        const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
        setPostMainImages(prev => [...prev, ...newImages]);
    };

    const removePostImage = (indexToRemove) => {
        setPostMainImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleAttachmentChange = (e, index) => {
        const file = e.target.files[0];
        if (!file) return;

        const MAX_SIZE = 10 * 1024 * 1024; 
        if (file.size > MAX_SIZE) {
            alert("첨부파일은 10MB 이하만 업로드 가능합니다.");
            e.target.value = ''; 
            return;
        }
        
        setPostAttachments(prev => prev.map((att, idx) => 
            idx === index ? { file: file, name: file.name } : att
        ));
    };

    const addAttachmentRow = () => {
        if (postAttachments.length >= 3) {
            alert("첨부파일은 최대 3개까지만 추가할 수 있습니다.");
            return;
        }
        setPostAttachments(prev => [...prev, { file: null, name: '' }]);
    };

    const removeAttachmentRow = (indexToRemove) => {
        setPostAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handlePostTagKeyDown = (e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTag = e.target.value.trim();
            if (newTag && postData.tags.length < 5 && !postData.tags.includes(newTag)) {
                handlePostDataChange('tags', [...postData.tags, newTag]);
                e.target.value = '';
            }
        }
    };

    const handleCategoryChange = (index, value) => {
        const newCategoryIds = [...postData.categoryIds];
        newCategoryIds[index] = value;
        setPostData(prev => ({ ...prev, categoryIds: newCategoryIds }));
    };

    const addCategoryRow = () => {
        if (postData.categoryIds.length < 3) {
            setPostData(prev => ({ ...prev, categoryIds: [...prev.categoryIds, ''] }));
        }
    };

    const removeCategoryRow = (index) => {
        const newCategoryIds = postData.categoryIds.filter((_, i) => i !== index);
        setPostData(prev => ({ ...prev, categoryIds: newCategoryIds }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!postData.title.trim()) return alert("제목을 입력해주세요.");
        if (!postData.content.trim()) return alert("내용을 입력해주세요.");
        
        const validCategories = postData.categoryIds.filter(id => id !== '');
        if (validCategories.length === 0) return alert("최소 1개의 카테고리를 선택해주세요.");

        const token = localStorage.getItem('jwtToken'); 
        if (!token) {
            alert("로그인이 필요한 서비스입니다.");
            navigate('/login');
            return;
        }

        let loginUserNo = null;
        try {
            const decoded = jwtDecode(token);
            loginUserNo = decoded.userNo; 
        } catch (error) {
            alert("유효하지 않은 로그인 정보입니다. 다시 로그인 해주세요.");
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        
        formData.append('userNo', loginUserNo);
        formData.append('title', postData.title);
        formData.append('content', postData.content);
        formData.append('isPublic', postData.isPublic);
        
        formData.append('categories', JSON.stringify(validCategories.map(Number)));
        
        const tagArr = Array.isArray(postData.tags) ? postData.tags : [];
        formData.append('tags', JSON.stringify(tagArr));

        postMainImages.forEach(img => formData.append('images', img.file));
        postAttachments.forEach(att => {
            if (att.file) formData.append('attachments', att.file);
        });

        try {
            const response = await fetch('http://localhost:3010/post/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` 
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert("게시물 업로드가 완료되었습니다.");
                navigate('/post'); 
            } else {
                alert("업로드 실패: " + data.message);
            }
        } catch (error) { 
            console.error("업로드 에러:", error); 
            alert("서버 오류가 발생했습니다.");
        } finally {
            setIsUploading(false);
        }
    }; 

    return (
        <div className="post-upload-page-container">
            {isUploading && (
                <div className="upload-loading-overlay">
                    <div className="upload-loading-box">
                        <div className="loading-spinner"></div>
                        <p>게시물을 업로드 중입니다...</p>
                        <span className="loading-sub-text">잠시만 기다려주세요.</span>
                    </div>
                </div>
            )}

            <main className="upload-main">
                <div className="upload-content-wrapper">
                    
                    <div className="upload-left">
                        <div className="photo-list-grid">
                            <label className="photo-add-btn">
                                +
                                <input type="file" accept="image/*" multiple onChange={handlePostImageChange} style={{ display: 'none' }} />
                            </label>
                            {postMainImages.map((img, idx) => (
                                <div key={idx} className="thumbnail-item">
                                    <img src={img.preview} alt="미리보기" />
                                    <button type="button" className="btn-delete-thumb" onClick={() => removePostImage(idx)}>✕</button>
                                </div>
                            ))}
                        </div>

                        <div className="attachment-section" style={{ marginTop: '20px' }}>
                            <h4 className="attachment-title" style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>첨부파일 (최대 3개, 10MB 이하)</h4>
                            {postAttachments.map((att, idx) => (
                                <div className="attachment-row" key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                    <input type="text" className="form-input" placeholder="파일명" value={att.name} readOnly style={{ flex: 1, padding: '10px' }} />
                                    <label className="btn-cat-action" style={{ width: 'auto', padding: '0 15px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                        파일 찾기
                                        <input type="file" onChange={(e) => handleAttachmentChange(e, idx)} style={{ display: 'none' }} />
                                    </label>
                                    
                                    {idx === postAttachments.length - 1 ? (
                                        postAttachments.length < 3 && (
                                            <button type="button" className="btn-cat-action add" onClick={addAttachmentRow}>+</button>
                                        )
                                    ) : (
                                        <button type="button" className="btn-cat-action remove" onClick={() => removeAttachmentRow(idx)}>-</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="upload-right">
                        <form className="upload-form" onSubmit={handleSubmit}>
                            
                            <div className="public-toggle">
                                <span className="toggle-label">공개여부</span>
                                <div className="radio-group">
                                    <label>
                                        <input type="radio" name="postPublic" value="Y" 
                                               checked={postData.isPublic === 'Y'} 
                                               onChange={(e) => handlePostDataChange('isPublic', e.target.value)} /> 공개
                                    </label>
                                    <label>
                                        <input type="radio" name="postPublic" value="N" 
                                               checked={postData.isPublic === 'N'} 
                                               onChange={(e) => handlePostDataChange('isPublic', e.target.value)} /> 비공개
                                    </label>
                                </div>
                            </div>

                            <div className="input-counter-group">
                                <label className="toggle-label">제목 (필수)</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="제목을 입력하세요" 
                                        value={postData.title} 
                                        onChange={(e) => handlePostDataChange('title', e.target.value)} 
                                        maxLength={30}
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="input-counter-group">
                                <label className="toggle-label">내용 (필수)</label>
                                <div className="input-wrapper">
                                    <textarea 
                                        className="form-input form-textarea" 
                                        placeholder="내용을 입력하세요" 
                                        value={postData.content} 
                                        onChange={(e) => handlePostDataChange('content', e.target.value)} 
                                        style={{ minHeight: '150px' }}
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="category-multi-group">
                                {postData.categoryIds.map((catId, index) => (
                                    <div key={index} className="category-row">
                                        <select 
                                            className="form-input category-select" 
                                            value={catId} 
                                            onChange={(e) => handleCategoryChange(index, e.target.value)}
                                            required={index === 0}
                                        >
                                            <option value="">카테고리 선택 (필수)</option>
                                            {postCategories.map(cat => (
                                                <option key={cat.CATEGORY_ID} value={cat.CATEGORY_ID}>{cat.CATEGORY_NAME}</option>
                                            ))}
                                        </select>

                                        {index === postData.categoryIds.length - 1 && postData.categoryIds.length < 3 && (
                                            <button type="button" className="btn-cat-action add" onClick={addCategoryRow}>
                                                +
                                            </button>
                                        )}

                                        {postData.categoryIds.length > 1 && (
                                            <button type="button" className="btn-cat-action remove" onClick={() => removeCategoryRow(index)}>
                                                -
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="tag-input-container">
                                <div className="tag-list">
                                    {postData.tags.map(tag => (
                                        <span key={tag} className="tag-badge">
                                            #{tag} <button type="button" onClick={() => handlePostDataChange('tags', postData.tags.filter(t => t !== tag))}>x</button>
                                        </span>
                                    ))}
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="태그 입력 후 Enter (최대 5개)" 
                                    className="form-input" 
                                    onKeyDown={handlePostTagKeyDown} 
                                    disabled={postData.tags.length >= 5} 
                                />
                            </div>
                            
                            <button type="submit" className="btn-upload-submit" disabled={isUploading}>
                                {isUploading ? "업로드 중..." : "업로드"}
                            </button>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default UploadPost;