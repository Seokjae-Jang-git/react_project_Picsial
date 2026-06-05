import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import exifr from 'exifr';
import Header from '../components/Header';
import LocationSearch from './LocationSearch'; // 경로 확인 필요
import './css/Upload_Photo.css';

function Upload() {
    const navigate = useNavigate();
    const [uploadType, setUploadType] = useState('photo'); // 사진 or 게시물
    const [categories, setCategories] = useState([]);
    
    // 💡 핵심: 여러 장의 사진과 각각의 데이터를 객체 배열로 관리
    const [uploadItems, setUploadItems] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0); // 현재 편집 중인 사진 인덱스

    // 카테고리 불러오기
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:3010/category/photo'); // 기존 카테고리 API 활용
                const data = await response.json();
                if (data.success) setCategories(data.categories);
            } catch (error) {
                console.error("카테고리 로딩 에러:", error);
            }
        };
        fetchCategories();
    }, []);

    // 💡 사진 파일 선택 및 메타데이터 추출
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 💡 최대 10장 제한 방어 코드 추가
        const LIMIT_COUNT = 10;
        if (uploadItems.length + files.length > LIMIT_COUNT) {
            alert(`사진은 한 번에 최대 ${LIMIT_COUNT}장까지만 업로드할 수 있습니다.`);
            return;
        }

        const newItems = await Promise.all(files.map(async (file) => {
            let meta = {};
            try {
                // 프론트엔드에서 즉시 EXIF 추출
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
                isPublic: 'Y', // 기본값 공개
                meta: meta
            };
        }));

        setUploadItems(prev => [...prev, ...newItems]);
        setActiveIndex(0); // 새로 추가하면 첫 번째 사진 활성화
    };

    // 현재 활성화된 사진의 폼 데이터 업데이트
    const handleItemChange = (field, value) => {
        setUploadItems(prev => prev.map((item, index) => 
            index === activeIndex ? { ...item, [field]: value } : item
        ));
    };

    // 💡 사진 개별 삭제 로직
    const handleDeleteItem = (indexToDelete, e) => {
        // 🔥 매우 중요: X 버튼을 클릭했을 때 부모 div의 사진 선택(onClick) 이벤트가 실행되는 것을 차단!
        e.stopPropagation(); 

        // 💡 성능 최적화: 브라우저 메모리 관리를 위해 생성했던 미리보기 URL을 해제(메모리 누수 방지)
        if (uploadItems[indexToDelete]?.preview) {
            URL.revokeObjectURL(uploadItems[indexToDelete].preview);
        }

        // 선택한 사진을 배열에서 제외
        const filteredItems = uploadItems.filter((_, index) => index !== indexToDelete);
        setUploadItems(filteredItems);

        // 💡 인덱스 방어 코드: 현재 보고 있던 사진이 삭제되었을 때의 인덱스 조정
        if (activeIndex === indexToDelete) {
            // 삭제된 사진이 현재 활성화된 사진이었다면 첫 번째 사진으로 리셋
            setActiveIndex(0);
        } else if (activeIndex > indexToDelete) {
            // 삭제된 사진이 현재 활성화된 사진보다 앞에 있었다면 인덱스를 하나 당겨줌
            setActiveIndex(prev => prev - 1);
        }
    };

    // 💡 카테고리 개별 값 변경
    const handleCategoryChange = (catIndex, value) => {
        const currentItem = uploadItems[activeIndex];
        const newCategoryIds = [...currentItem.categoryIds];
        newCategoryIds[catIndex] = value;
        handleItemChange('categoryIds', newCategoryIds);
    };

    // 💡 카테고리 셀렉트 박스 추가 (+)
    const addCategoryRow = () => {
        const currentItem = uploadItems[activeIndex];
        // 최대 3개까지만 추가 가능
        if (currentItem.categoryIds.length < 3) {
            handleItemChange('categoryIds', [...currentItem.categoryIds, '']);
        }
    };

    // 💡 카테고리 셀렉트 박스 삭제 (-)
    const removeCategoryRow = (catIndex) => {
        const currentItem = uploadItems[activeIndex];
        const newCategoryIds = currentItem.categoryIds.filter((_, index) => index !== catIndex);
        handleItemChange('categoryIds', newCategoryIds);
    };

    // 태그 추가 로직 (최대 5개)
    const handleTagKeyDown = (e) => {
        // 💡 핵심: 한글 조합 중일 때 발생하는 중복 이벤트 방지
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter') {
            e.preventDefault(); // 폼 제출 방지
            const newTag = e.target.value.trim();
            const currentTags = uploadItems[activeIndex].tags;

            if (newTag && currentTags.length < 5 && !currentTags.includes(newTag)) {
                handleItemChange('tags', [...currentTags, newTag]);
                e.target.value = ''; // 입력창 초기화
            } else if (currentTags.length >= 5) {
                alert("태그는 최대 5개까지만 입력 가능합니다.");
            }
        }
    };

    // 태그 삭제 로직
    const removeTag = (tagToRemove) => {
        const currentTags = uploadItems[activeIndex].tags;
        handleItemChange('tags', currentTags.filter(tag => tag !== tagToRemove));
    };

    // 💡 폼 제출 (Plan B: FormData 묶어서 한 번에 전송)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (uploadItems.length === 0) return alert("업로드할 사진을 선택해주세요.");

        const formData = new FormData();
        
        // 1. 실제 파일들을 배열로 추가
        uploadItems.forEach(item => {
            formData.append('files', item.file);
        });

        // 2. 파일 제외한 나머지 데이터(제목, 태그, 메타데이터 등)를 JSON 문자열로 추가
        const itemsData = uploadItems.map(item => {
            const { file, preview, ...rest } = item; 
            return rest;
        });
        formData.append('itemsData', JSON.stringify(itemsData));
        formData.append('uploadType', uploadType);
        formData.append('userNo', 1); // 임시 유저 번호

        try {
            const response = await fetch('http://localhost:3010/photo/upload-bulk', {
                method: 'POST',
                body: formData // multipart/form-data 자동 적용
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
        }
    };

    return (
        <div className="upload-page-container">
            <Header />
            <main className="upload-main">
                
                {/* 1. 상단 영역: 뒤로가기 버튼만 깔끔하게 배치 */}
                <div className="upload-top-bar">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        &lt; 뒤로가기
                    </button>
                </div>

                <div className="upload-content-wrapper">
                    {/* 왼쪽: 사진 리스트 영역 */}
                    <div className="upload-left">
                        
                        {/* 💡 [위치 이동] 지정하신 점선 박스 바로 위쪽으로 배치 */}
                        <div className="upload-title-section">
                            <h2>업로드</h2>
                            <div className="type-radio-group">
                                <label>
                                    <input type="radio" name="uploadType" value="photo" 
                                        checked={uploadType === 'photo'} onChange={(e) => setUploadType(e.target.value)} />
                                    사진
                                </label>
                                <label>
                                    <input type="radio" name="uploadType" value="post" 
                                        checked={uploadType === 'post'} onChange={(e) => setUploadType(e.target.value)} />
                                    게시물
                                </label>
                            </div>
                        </div>

                        {/* 사진 그리드 리스트 */}
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
                                    {/* 💡 썸네일 우측 상단에 붙을 X 버튼 추가 */}
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

                    {/* 오른쪽: 활성화된 사진의 정보 입력 폼 */}
                    <div className="upload-right">
                        {uploadItems.length > 0 ? (
                            <form className="upload-form" onSubmit={handleSubmit}>
                                {/* 💡 2. 공개여부 라벨 추가 및 구조 변경 */}
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

                                {/* 1. 제목 입력 영역 */}
                                <div className="input-counter-group">
                                    <label className="toggle-label">제목 (필수)</label>
                                    <div className="input-wrapper">
                                        <input 
                                            type="text" 
                                            className="form-input"
                                            placeholder="제목을 입력하세요"
                                            value={uploadItems[activeIndex].title}
                                            onChange={(e) => handleItemChange('title', e.target.value)}
                                            maxLength={20} /* 💡 브라우저 자체적으로 30자 이상 입력 차단 */
                                            required 
                                        />
                                        {/* 💡 실시간 글자 수 표시 */}
                                        <span className="char-counter">
                                            {(uploadItems[activeIndex].title || '').length} / 20자
                                        </span>
                                    </div>
                                </div>

                                {/* 2. 설명 입력 영역 */}
                                <div className="input-counter-group">
                                    <label className="toggle-label">설명</label>
                                    <div className="input-wrapper">
                                        <textarea 
                                            className="form-input form-textarea"
                                            placeholder="사진을 소개해 보세요" /* 첨부 이미지 플레이스홀더 적용 */
                                            value={uploadItems[activeIndex].description}
                                            onChange={(e) => handleItemChange('description', e.target.value)}
                                            maxLength={100} /* 💡 브라우저 자체적으로 100자 이상 입력 차단 */
                                        />
                                        {/* 💡 실시간 글자 수 표시 */}
                                        <span className="char-counter">
                                            {(uploadItems[activeIndex].description || '').length} / 100자
                                        </span>
                                    </div>
                                </div>

                                {/* 기존 단일 카테고리 select 태그 영역을 통째로 교체 */}
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

                                            {/* 💡 플러스(+) 버튼: 마지막 항목이면서 아직 3개가 안 되었을 때만 노출 */}
                                            {index === uploadItems[activeIndex].categoryIds.length - 1 && uploadItems[activeIndex].categoryIds.length < 3 && (
                                                <button type="button" className="btn-cat-action add" onClick={addCategoryRow}>
                                                    +
                                                </button>
                                            )}

                                            {/* 💡 마이너스(-) 버튼: 항목이 2개 이상일 때 노출시켜서 삭제할 수 있게 함 */}
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

                                {/* 태그 입력 영역 */}
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

                                {/* 메타데이터 표시 영역 */}
                                <div className="meta-preview-box">
                                    <h4>메타 데이터</h4>
                                    <p>기종: {uploadItems[activeIndex].meta.Model || '-'}</p>
                                    <p>렌즈: {uploadItems[activeIndex].meta.LensModel || '-'}</p>
                                    <p>초점거리: {uploadItems[activeIndex].meta.FocalLength ? `${uploadItems[activeIndex].meta.FocalLength}mm` : '-'}</p>
                                    <p>조리개: {uploadItems[activeIndex].meta.FNumber ? `f/${uploadItems[activeIndex].meta.FNumber}` : '-'}</p>
                                    <p>ISO: {uploadItems[activeIndex].meta.ISO || '-'}</p>
                                </div>

                                <button type="submit" className="btn-upload-submit">업로드</button>
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

export default Upload;