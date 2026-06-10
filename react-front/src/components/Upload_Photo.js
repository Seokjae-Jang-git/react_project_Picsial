import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import exifr from 'exifr';
import LocationSearch from './LocationSearch'; 
import './css/Upload_Photo.css';

function Upload_Photo() {
    const navigate = useNavigate();
    const [uploadType, setUploadType] = useState('photo'); 
    const [categories, setCategories] = useState([]);
    
    const [uploadItems, setUploadItems] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0); 
    
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:3010/category/photo'); 
                const data = await response.json();
                if (data.success) setCategories(data.categories);
            } catch (error) {
                console.error("카테고리 로딩 에러:", error);
            }
        };
        fetchCategories();
    }, []);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const LIMIT_COUNT = 10;
        if (uploadItems.length + files.length > LIMIT_COUNT) {
            alert(`사진은 한 번에 최대 ${LIMIT_COUNT}장까지만 업로드할 수 있습니다.`);
            return;
        }

        const newItems = await Promise.all(files.map(async (file) => {
            let meta = {};
            try {
                meta = await exifr.parse(file) || {}; 
            } catch (err) {
                console.warn("메타데이터 추출 실패", err);
            }

            return {
                file: file,
                preview: URL.createObjectURL(file),
                title: '',
                description: '',
                categoryIds: [''],
                location: '',
                tags: [],
                isPublic: 'Y', 
                meta: meta
            };
        }));

        setUploadItems(prev => [...prev, ...newItems]);
        setActiveIndex(0); 
    };

    const handleItemChange = (field, value) => {
        setUploadItems(prev => prev.map((item, index) => 
            index === activeIndex ? { ...item, [field]: value } : item
        ));
    };

    const handleDeleteItem = (indexToDelete, e) => {
        e.stopPropagation(); 

        if (uploadItems[indexToDelete]?.preview) {
            URL.revokeObjectURL(uploadItems[indexToDelete].preview);
        }

        const filteredItems = uploadItems.filter((_, index) => index !== indexToDelete);
        setUploadItems(filteredItems);

        if (activeIndex === indexToDelete) {
            setActiveIndex(0);
        } else if (activeIndex > indexToDelete) {
            setActiveIndex(prev => prev - 1);
        }
    };

    const handleCategoryChange = (catIndex, value) => {
        const currentItem = uploadItems[activeIndex];
        const newCategoryIds = [...currentItem.categoryIds];
        newCategoryIds[catIndex] = value;
        handleItemChange('categoryIds', newCategoryIds);
    };

    const addCategoryRow = () => {
        const currentItem = uploadItems[activeIndex];
        if (currentItem.categoryIds.length < 3) {
            handleItemChange('categoryIds', [...currentItem.categoryIds, '']);
        }
    };

    const removeCategoryRow = (catIndex) => {
        const currentItem = uploadItems[activeIndex];
        const newCategoryIds = currentItem.categoryIds.filter((_, index) => index !== catIndex);
        handleItemChange('categoryIds', newCategoryIds);
    };

    const handleTagKeyDown = (e) => {
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter') {
            e.preventDefault(); 
            const newTag = e.target.value.trim();
            const currentTags = uploadItems[activeIndex].tags;

            if (newTag && currentTags.length < 5 && !currentTags.includes(newTag)) {
                handleItemChange('tags', [...currentTags, newTag]);
                e.target.value = ''; 
            } else if (currentTags.length >= 5) {
                alert("태그는 최대 5개까지만 입력 가능합니다.");
            }
        }
    };

    const removeTag = (tagToRemove) => {
        const currentTags = uploadItems[activeIndex].tags;
        handleItemChange('tags', currentTags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (uploadItems.length === 0) return alert("업로드할 사진을 선택해주세요.");

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

        if (!loginUserNo) {
            alert("유저 정보를 확인할 수 없습니다.");
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        
        uploadItems.forEach(item => {
            formData.append('files', item.file);
        });

        const itemsData = uploadItems.map(item => {
            const { file, preview, ...rest } = item; 
            return rest;
        });
        formData.append('itemsData', JSON.stringify(itemsData));
        formData.append('uploadType', uploadType);
        formData.append('userNo', loginUserNo);

        try {
            const response = await fetch('http://localhost:3010/photo/upload-bulk', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData 
            });
            const data = await response.json();
            
            if (data.success) {
                alert("업로드가 완료되었습니다.");
                navigate('/photo');
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
        <div className="photo-upload-page-container">
            
            {isUploading && (
                <div className="upload-loading-overlay">
                    <div className="upload-loading-box">
                        <div className="loading-spinner"></div>
                        <p>이미지를 업로드 중입니다...</p>
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
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                            {uploadItems.map((item, index) => (
                                <div key={index} 
                                    className={`thumbnail-item ${index === activeIndex ? 'active' : ''}`}
                                    onClick={() => setActiveIndex(index)}>
                                    <img src={item.preview} alt="미리보기" />
                                    <button 
                                        type="button" 
                                        className="btn-delete-thumb"
                                        onClick={(e) => handleDeleteItem(index, e)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="upload-right">
                        {uploadItems.length > 0 ? (
                            <form className="upload-form" onSubmit={handleSubmit}>
                                <div className="public-toggle">
                                    <span className="toggle-label">공개여부</span>
                                    <div className="radio-group">
                                        <label>
                                            <input type="radio" name="isPublic" value="Y" 
                                                   checked={uploadItems[activeIndex].isPublic === 'Y'} 
                                                   onChange={(e) => handleItemChange('isPublic', e.target.value)} /> 공개
                                        </label>
                                        <label>
                                            <input type="radio" name="isPublic" value="N" 
                                                   checked={uploadItems[activeIndex].isPublic === 'N'} 
                                                   onChange={(e) => handleItemChange('isPublic', e.target.value)} /> 비공개
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
                                            value={uploadItems[activeIndex].title}
                                            onChange={(e) => handleItemChange('title', e.target.value)}
                                            maxLength={20} 
                                            required 
                                        />
                                        <span className="char-counter">
                                            {(uploadItems[activeIndex].title || '').length} / 20자
                                        </span>
                                    </div>
                                </div>

                                <div className="input-counter-group">
                                    <label className="toggle-label">설명</label>
                                    <div className="input-wrapper">
                                        <textarea 
                                            className="form-input form-textarea"
                                            placeholder="사진을 소개해 보세요" 
                                            value={uploadItems[activeIndex].description}
                                            onChange={(e) => handleItemChange('description', e.target.value)}
                                            maxLength={100} 
                                        />
                                        <span className="char-counter">
                                            {(uploadItems[activeIndex].description || '').length} / 100자
                                        </span>
                                    </div>
                                </div>

                                <div className="category-multi-group">
                                    {uploadItems[activeIndex].categoryIds.map((catId, index) => (
                                        <div key={index} className="category-row">
                                            <select 
                                                className="form-input category-select" 
                                                value={catId} 
                                                onChange={(e) => handleCategoryChange(index, e.target.value)}
                                                required
                                            >
                                                <option value="">카테고리 선택 (필수)</option> 
                                                {categories.map(cat => (
                                                    <option key={cat.CATEGORY_ID} value={cat.CATEGORY_ID}>
                                                        {cat.CATEGORY_NAME}
                                                    </option>
                                                ))}
                                            </select>

                                            {index === uploadItems[activeIndex].categoryIds.length - 1 && uploadItems[activeIndex].categoryIds.length < 3 && (
                                                <button type="button" className="btn-cat-action add" onClick={addCategoryRow}>
                                                    +
                                                </button>
                                            )}

                                            {uploadItems[activeIndex].categoryIds.length > 1 && (
                                                <button type="button" className="btn-cat-action remove" onClick={() => removeCategoryRow(index)}>
                                                    -
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <LocationSearch 
                                    value={uploadItems[activeIndex].location}
                                    onChange={(val) => handleItemChange('location', val)}
                                />

                                <div className="tag-input-container">
                                    <div className="tag-list">
                                        {uploadItems[activeIndex].tags.map(tag => (
                                            <span key={tag} className="tag-badge">
                                                #{tag} <button type="button" onClick={() => removeTag(tag)}>x</button>
                                            </span>
                                        ))}
                                    </div>
                                    <input type="text" placeholder="태그 입력 후 Enter (최대 5개)" className="form-input"
                                           onKeyDown={handleTagKeyDown} disabled={uploadItems[activeIndex].tags.length >= 5} />
                                </div>

                                <div className="meta-preview-box">
                                    <h4>메타 데이터</h4>
                                    <p>기종: {uploadItems[activeIndex].meta.Model || '-'}</p>
                                    <p>렌즈: {uploadItems[activeIndex].meta.LensModel || '-'}</p>
                                    <p>초점거리: {uploadItems[activeIndex].meta.FocalLength ? `${uploadItems[activeIndex].meta.FocalLength}mm` : '-'}</p>
                                    <p>조리개: {uploadItems[activeIndex].meta.FNumber ? `f/${uploadItems[activeIndex].meta.FNumber}` : '-'}</p>
                                    <p>ISO: {uploadItems[activeIndex].meta.ISO || '-'}</p>
                                </div>

                                <button type="submit" className="btn-upload-submit" disabled={isUploading}>
                                    {isUploading ? "업로드 중..." : "업로드"}
                                </button>
                            </form>
                        ) : (
                            <div className="empty-form-state">사진을 선택해주세요.</div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Upload_Photo;