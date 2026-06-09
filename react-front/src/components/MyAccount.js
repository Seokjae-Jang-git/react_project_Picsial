import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import './css/MyAccount.css';

const MyAccount = () => {
    const navigate = useNavigate();

    const { myUserNo, refreshProfile } = useOutletContext();

    const [isProfileEditing, setIsProfileEditing] = useState(false);
    const [profileData, setProfileData] = useState({ id: '', nickname: '', email: '', intro: '', profileImageUrl: '' });
    const [originalProfile, setOriginalProfile] = useState({});

    const [selectedFile, setSelectedFile] = useState(null); 
    const fileInputRef = useRef(null);

    const [isCategoryEditing, setIsCategoryEditing] = useState(false);
    const [categoryData, setCategoryData] = useState({ photo: [], post: [] });
    const [originalCategory, setOriginalCategory] = useState({ photo: [], post: [] });
    
    const [masterCategories, setMasterCategories] = useState({ photo: [], post: [] });

    const INTRO_MAX_LENGTH = 150;

    useEffect(() => {
        const fetchAccountInfo = async () => {
            try {
                const res = await fetch(`http://localhost:3010/mypage/account?userNo=${myUserNo}`);
                const data = await res.json();
                
                if (data.success) {
                    const loadedProfile = {
                        id: data.user.USER_ID,
                        nickname: data.user.NICKNAME,
                        email: data.user.EMAIL,
                        intro: data.user.INTRO || '',
                        profileImageUrl: data.user.PROFILE_IMAGE_URL
                    };
                    setProfileData(loadedProfile);
                    setOriginalProfile(loadedProfile); 

                    setMasterCategories({
                        photo: data.masterCategories.photo || [],
                        post: data.masterCategories.post || []
                    });

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

    const handleProfileEdit = () => setIsProfileEditing(true);
    const handleProfileCancel = () => {
        setProfileData(originalProfile); 
        setSelectedFile(null); 
        setIsProfileEditing(false);
    };
    const handleProfileSave = async () => {
        try {
            const formData = new FormData();
            formData.append('userNo', myUserNo);
            formData.append('email', profileData.email);
            formData.append('intro', profileData.intro);
            if (selectedFile) {
                formData.append('profileImage', selectedFile); 
            }

            const res = await fetch(`http://localhost:3010/mypage/account/profile`, {
                method: 'PUT',
                body: formData 
            });
            
            const data = await res.json();
            if (data.success) {
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
            console.error("profile 저장 에러:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleCategoryEdit = () => setIsCategoryEditing(true);
    const handleCategoryCancel = () => { 
        setCategoryData(originalCategory); 
        setIsCategoryEditing(false); 
    };

    const handleCategorySave = async () => {
        try {
            const res = await fetch(`http://localhost:3010/mypage/account/category`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userNo: myUserNo,
                    photoCategories: categoryData.photo, 
                    postCategories: categoryData.post    
                })
            });

            const data = await res.json();
            if (data.success) {
                setOriginalCategory(categoryData); 
                setIsCategoryEditing(false);       
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
            
            <div className="account-top-row">
                
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

                <aside className="account-section delete-section">
                    <h3>계정 삭제</h3>
                    <div className="delete-desc">삭제 후 모든 데이터가 삭제되며,</div>
                    <div className="delete-desc">복구 불가능해집니다.</div>
                    <button className="delete-btn" onClick={() => navigate('./del-account')}>계정 삭제</button>
                </aside>

            </div>

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