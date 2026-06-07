import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import './css/MyAccount.css';

const MyAccount = () => {
    const navigate = useNavigate();

    const { myUserNo, refreshProfile } = useOutletContext();

    // 프로필 상태
    const [isProfileEditing, setIsProfileEditing] = useState(false);
    const [profileData, setProfileData] = useState({ id: '', nickname: '', email: '', intro: '', profileImageUrl: '' });
    const [originalProfile, setOriginalProfile] = useState({});

    // 💡 1. 파일 업로드를 위한 상태 및 참조 추가
    const [selectedFile, setSelectedFile] = useState(null); 
    const fileInputRef = useRef(null);

    // 카테고리 상태 (마스터 데이터 목록 상태 추가)
    const [isCategoryEditing, setIsCategoryEditing] = useState(false);
    const [categoryData, setCategoryData] = useState({ photo: [], post: [] });
    const [originalCategory, setOriginalCategory] = useState({ photo: [], post: [] });
    
    // 💡 DB에서 실시간으로 불러온 전체 카테고리 리스트를 저장할 상태창
    const [masterCategories, setMasterCategories] = useState({ photo: [], post: [] });

    const INTRO_MAX_LENGTH = 150;

    // 🚀 DB에서 내 정보, 내 관심사, 전체 마스터 목록 동시 셋팅
    useEffect(() => {
        const fetchAccountInfo = async () => {
            try {
                const res = await fetch(`http://localhost:3010/mypage/account?userNo=${myUserNo}`);
                const data = await res.json();
                
                if (data.success) {
                    // 1. 프로필 바인딩
                    const loadedProfile = {
                        id: data.user.USER_ID,
                        nickname: data.user.NICKNAME,
                        email: data.user.EMAIL,
                        intro: data.user.INTRO || '',
                        profileImageUrl: data.user.PROFILE_IMAGE_URL
                    };
                    setProfileData(loadedProfile);
                    setOriginalProfile(loadedProfile); 

                    // 2. 마스터 카테고리 바인딩 (하드코딩 대체)
                    setMasterCategories({
                        photo: data.masterCategories.photo || [],
                        post: data.masterCategories.post || []
                    });

                    // 3. 내 선호 관심사 바인딩
                    const loadedCategories = {
                        photo: data.categories.photo || [],
                        post: data.categories.post || []
                    };
                    setCategoryData(loadedCategories);
                    setOriginalCategory(loadedCategories); 
                }
            } catch (error) {
                console.error("계정 정보 로드 에러:", error);
            }
        };

        if (myUserNo) fetchAccountInfo();
    }, [myUserNo]);

    // --- 프로필 핸들러 ---
    const handleProfileEdit = () => setIsProfileEditing(true);
    const handleProfileCancel = () => {
        setProfileData(originalProfile); 
        setSelectedFile(null); // 💡 취소 시 선택된 파일도 초기화
        setIsProfileEditing(false);
    };
    // 💡 2. 파일을 포함하여 백엔드로 전송하도록 FormData로 변경
    const handleProfileSave = async () => {
        try {
            const formData = new FormData();
            formData.append('userNo', myUserNo);
            formData.append('email', profileData.email);
            formData.append('intro', profileData.intro);
            if (selectedFile) {
                formData.append('profileImage', selectedFile); // 파일 첨부
            }

            // 주의: FormData를 보낼 때는 'Content-Type' 헤더를 수동으로 설정하지 않습니다. (브라우저가 자동 설정)
            const res = await fetch(`http://localhost:3010/mypage/account/profile`, {
                method: 'PUT',
                body: formData 
            });
            
            const data = await res.json();
            if (data.success) {
                // 💡 파일이 업로드되어 새로운 URL을 받았다면 원본 상태 갱신
                const updatedProfile = { 
                    ...profileData, 
                    profileImageUrl: data.newImageUrl || profileData.profileImageUrl 
                };
                setOriginalProfile(updatedProfile);
                setProfileData(updatedProfile);
                setSelectedFile(null);
                setIsProfileEditing(false);

                if (refreshProfile) {
                    refreshProfile(); 
                }

                alert('프로필이 성공적으로 저장되었습니다.');
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("프로필 저장 에러:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    // 💡 3. 파일 선택 창이 열렸을 때 파일 정보를 상태에 저장하는 함수
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // --- 카테고리 핸들러 고도화 완료 ---
    const handleCategoryEdit = () => setIsCategoryEditing(true);
    const handleCategoryCancel = () => { 
        setCategoryData(originalCategory); 
        setIsCategoryEditing(false); 
    };

    // 🚀 수정된 카테고리 체크 리스트 상태를 백엔드로 PUT 전송
    const handleCategorySave = async () => {
        try {
            const res = await fetch(`http://localhost:3010/mypage/account/category`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userNo: myUserNo,
                    photoCategories: categoryData.photo, // 선택된 사진 카테고리 문자열 배열
                    postCategories: categoryData.post    // 선택된 게시물 카테고리 문자열 배열
                })
            });

            const data = await res.json();
            if (data.success) {
                setOriginalCategory(categoryData); // 복구용 원본 최신화
                setIsCategoryEditing(false);       // 수정 모드 닫기
                alert('카테고리가 성공적으로 저장되었습니다.');
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("카테고리 저장 중 오류 발생:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };
    
    const handleCategoryToggle = (type, cate) => {
        if (!isCategoryEditing) return;
        setCategoryData(prev => {
            const list = prev[type];
            return list.includes(cate) 
                ? { ...prev, [type]: list.filter(item => item !== cate) } 
                : { ...prev, [type]: [...list, cate] };
        });
    };

    return (
        <div className="my-account-container">
            
            {/* 💡 상단 1행: 내 프로필(좌) + 계정 삭제(우) */}
            <div className="account-top-row">
                
                {/* 1. 내 프로필 섹션 */}
                <section className="account-section profile-section">
                    <div className="section-header">
                        <h3>내 프로필</h3>
                        {!isProfileEditing && <button className="edit-btn" onClick={handleProfileEdit}>수정</button>}
                    </div>
                    
                    <div className="profile-form">
                        <div className="profile-form-top">
                            <div className="profile-info-left">
                                <div className="form-group row">
                                    <label className="fixed-label">아이디</label>
                                    <input type="text" value={profileData.id} disabled className="short-input" />
                                    
                                    <label className="fixed-label ml-20">닉네임</label>
                                    <input type="text" value={profileData.nickname} disabled className="short-input" />
                                </div>
                                <div className="form-group row mt-16">
                                    <label className="fixed-label">이메일</label>
                                    <input 
                                        type="email" 
                                        value={profileData.email} 
                                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                        disabled={!isProfileEditing} 
                                        className={`long-input ${isProfileEditing ? 'editable' : ''}`}
                                    />
                                </div>
                            </div>

                            <div className="profile-avatar-right">
                                <div className="profile-image-preview">
                                    {/* 💡 4. 프로필 사진이 없으면 기본 이모티콘(SVG) 표시 */}
                                    {profileData.profileImageUrl ? (
                                        <img src={profileData.profileImageUrl} alt="프로필" />
                                    ) : (
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                                        </svg>
                                    )}
                                </div>
                                {isProfileEditing && (
                                    <>
                                        {/* 💡 5. 숨겨진 파일 인풋창과 변경 버튼, 안내 문구 */}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            style={{ display: 'none' }} 
                                        />
                                        <p className="avatar-edit-text" onClick={() => fileInputRef.current.click()}>
                                            사진 변경
                                        </p>
                                        <p style={{fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '4px', lineHeight: '1.4'}}>
                                            권장: 1:1 비율<br/>최대 5MB
                                        </p>
                                        {/* 선택된 파일 이름 표시 (미리보기 대체) */}
                                        {selectedFile && (
                                            <p style={{fontSize: '11px', color: '#007bff', textAlign: 'center', marginTop: '6px', wordBreak: 'break-all'}}>
                                                📎 {selectedFile.name}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="form-group intro-group">
                            <label>내 소개</label>
                            <div className="textarea-wrapper">
                                <textarea 
                                    value={profileData.intro}
                                    onChange={(e) => setProfileData({...profileData, intro: e.target.value.substring(0, INTRO_MAX_LENGTH)})}
                                    disabled={!isProfileEditing}
                                    placeholder={isProfileEditing ? "나를 소개하는 글을 적어보세요." : ""}
                                    className={isProfileEditing ? 'editable' : ''}
                                />
                                <div className="char-count">
                                    {profileData.intro.length} / {INTRO_MAX_LENGTH}자
                                </div>
                            </div>
                        </div>

                        {isProfileEditing && (
                            <div className="form-actions">
                                <button className="cancel-btn" onClick={handleProfileCancel}>취소</button>
                                <button className="save-btn" onClick={handleProfileSave}>저장</button>
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. 계정 삭제 섹션 (1행의 우측으로 당겨옴) */}
                <aside className="account-section delete-section">
                    <h3>계정 삭제</h3>
                    <div className="delete-desc">삭제 후 모든 데이터가 삭제되며,</div>
                    <div className="delete-desc">복구 불가능해집니다.</div>
                    <button className="delete-btn" onClick={() => navigate('./del-account')}>계정 삭제</button>
                </aside>

            </div>

            {/* 💡 하단 2행: 내 카테고리 (가로 100% 꽉 채우기) */}
            <div className="account-bottom-row">
                <section className="account-section category-section">
                    <div className="section-header">
                        <h3>내 카테고리</h3>
                        {!isCategoryEditing && <button className="edit-btn" onClick={handleCategoryEdit}>수정</button>}
                    </div>
                    
                    <div className="category-form">
                        <div className="category-group">
                            <h4>사진</h4>
                            <div className="checkbox-grid">
                                {masterCategories.photo.map(cate => (
                                    <label key={cate} className={`checkbox-label ${!isCategoryEditing ? 'disabled' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={categoryData.photo.includes(cate)}
                                            onChange={() => handleCategoryToggle('photo', cate)}
                                            disabled={!isCategoryEditing}
                                        />
                                        {cate}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="category-group">
                            <h4>게시물</h4>
                            <div className="checkbox-grid">
                                {masterCategories.post.map(cate => (
                                    <label key={cate} className={`checkbox-label ${!isCategoryEditing ? 'disabled' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={categoryData.post.includes(cate)}
                                            onChange={() => handleCategoryToggle('post', cate)}
                                            disabled={!isCategoryEditing}
                                        />
                                        {cate}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {isCategoryEditing && (
                            <div className="form-actions">
                                <button className="cancel-btn" onClick={handleCategoryCancel}>취소</button>
                                <button className="save-btn" onClick={handleCategorySave}>저장</button>
                            </div>
                        )}
                    </div>
                </section>
            </div>
            
        </div>
    );
};

export default MyAccount;