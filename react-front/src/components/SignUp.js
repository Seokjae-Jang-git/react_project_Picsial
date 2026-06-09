import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/SignUp.css';

function SignUp() {
    const userIdRef = useRef(null);
    const emailRef = useRef(null);
    const nicknameRef = useRef(null);

    const [idCheckStatus, setIdCheckStatus] = useState('');
    const [verifiedId, setVerifiedId] = useState('');

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const [nicknameCheckStatus, setNicknameCheckStatus] = useState('');
    const [verifiedNickname, setVerifiedNickname] = useState('');

    const [photoCategories, setPhotoCategories] = useState([]);
    const [postCategories, setPostCategories] = useState([]);
    const [selectedPhotoCategories, setSelectedPhotoCategories] = useState([]);
    const [selectedPostCategories, setSelectedPostCategories] = useState([]);

    const [introText, setIntroText] = useState('');
    const MAX_INTRO_LENGTH = 100;

    const [isChecked, setIsChecked] = useState(false);

    const navigate = useNavigate();

    useEffect(function() {
        async function fetchCategories() {
            try {
                const [photoRes, postRes] = await Promise.all([
                    fetch('http://localhost:3010/category/photo'),
                    fetch('http://localhost:3010/category/post')
                ]);

                const photoData = await photoRes.json();
                const postData = await postRes.json();

                if (photoRes.ok && photoData.success) {
                    setPhotoCategories(photoData.categories);
                }
                if (postRes.ok && postData.success) {
                    setPostCategories(postData.categories);
                }
            } catch (error) {
                console.error('카테고리 Fetch 에러:', error);
            }
        }
        fetchCategories();
    }, []);

    function handlePhotoCategoryChange(id) {
        if (selectedPhotoCategories.includes(id)) {
            setSelectedPhotoCategories(selectedPhotoCategories.filter(catId => catId !== id));
        } else {
            setSelectedPhotoCategories([...selectedPhotoCategories, id]);
        }
    }

    function handlePostCategoryChange(id) {
        if (selectedPostCategories.includes(id)) {
            setSelectedPostCategories(selectedPostCategories.filter(catId => catId !== id));
        } else {
            setSelectedPostCategories([...selectedPostCategories, id]);
        }
    }

    async function handleCheckId() {
        const userId = userIdRef.current.value.trim();
        if (!userId) { alert('중복 확인할 아이디를 입력하세요.'); return; }

        try {
            const response = await fetch('http://localhost:3010/auth/check-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                if (data.isDuplicate) {
                    alert(data.message);
                    setIdCheckStatus('failed');
                    setVerifiedId('');
                } else {
                    alert(data.message);
                    setIdCheckStatus('checked');
                    setVerifiedId(userId);
                }
            }
        } catch (error) {
            console.error('중복확인 요청 에러:', error);
        }
    }

    async function handleCheckNickname() {
        const nickname = nicknameRef.current.value.trim();
        if (!nickname) { alert('중복 확인할 닉네임을 입력하세요.'); return; }

        try {
            const response = await fetch('http://localhost:3010/auth/check-nickname', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                if (data.isDuplicate) {
                    alert(data.message);
                    setNicknameCheckStatus('failed');
                    setVerifiedNickname('');
                } else {
                    alert(data.message);
                    setNicknameCheckStatus('checked');
                    setVerifiedNickname(nickname);
                }
            }
        } catch (error) {
            console.error('닉네임 중복확인 요청 에러:', error);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const userId = userIdRef.current.value.trim();
        const email = emailRef.current.value.trim();
        const nickname = nicknameRef.current.value.trim();
        const intro = introText.trim();

        if (idCheckStatus !== 'checked' || verifiedId !== userId) { alert('아이디 중복확인을 완료해 주세요.'); return; }
        if (nicknameCheckStatus !== 'checked' || verifiedNickname !== nickname) { alert('닉네임 중복확인을 완료해 주세요.'); return; }
        if (!isChecked) { alert('약관에 동의해 주세요.'); return; }
        if (password !== passwordConfirm) { alert('비밀번호가 일치하지 않습니다.'); return; }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^*()_+\- =])[A-Za-z\d~!@#$%^*()_+\- =]{8,}$/;
        if (!passwordRegex.test(password)) {
            alert('비밀번호 제약조건을 확인해 주세요.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3010/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId, email, password, nickname,
                    intro: intro || null,
                    photoCategories: selectedPhotoCategories, 
                    postCategories: selectedPostCategories    
                })
            });

            const data = await response.json();
            if (data.success) {
                alert(data.message);
                navigate('/login');
            } else {
                alert(data.message || '회원가입 실패');
            }
        } catch (error) {
            console.error('회원가입 요청 에러:', error);
        }
    }

    return (
        <div className="signup-container">
            <h2>Picsial 회원가입</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>아이디 (필수)</label>
                    <div className="id-input-group">
                        <input 
                            type="text" 
                            ref={userIdRef} 
                            placeholder="사용할 아이디를 입력하세요" 
                            className="form-control"
                            required 
                            onChange={function() { setIdCheckStatus(''); }}
                        />
                        <button 
                            type="button" 
                            onClick={handleCheckId} 
                            className="btn-check-id"
                            disabled={idCheckStatus === 'checked'}
                        >
                            {idCheckStatus === 'checked' ? '확인완료' : '중복확인'}
                        </button>
                    </div>
                    {idCheckStatus === 'checked' && <span className="check-msg success">✓ 사용 가능한 아이디입니다.</span>}
                    {idCheckStatus === 'failed' && <span className="check-msg error">✗ 이미 사용 중인 아이디입니다.</span>}
                </div>

                <div className="form-group">
                    <label>이메일 (필수)</label>
                    <input type="email" ref={emailRef} placeholder="example@picsial.com" className="form-control" required />
                </div>

                <div className="form-group">
                    <div className="label-with-tooltip">
                        <label>비밀번호 (필수)</label>
                        <div className="tooltip-container">
                            <span className="tooltip-icon">!</span>
                            <div className="tooltip-box">
                                <strong>비밀번호 설정 안내</strong>
                                <ul>
                                    <li>영문 대문자, 소문자 필수 포함</li>
                                    <li>숫자 필수 포함</li>
                                    <li>특수기호 필수 포함 <strong>(8자 이상)</strong></li>
                                    <li className="allowed-symbols">인정 특수문자: ~ ! @ # $ % ^ * ( ) _ + - =</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={function(e) { setPassword(e.target.value); }}
                        placeholder="영문 대&소문자, 숫자, 특수기호 조합, 8자 이상" 
                        className="form-control" 
                        required 
                    />
                </div>

                <div className="form-group">
                    <label>비밀번호 확인 (필수)</label>
                    <input 
                        type="password" 
                        value={passwordConfirm}
                        onChange={function(e) { setPasswordConfirm(e.target.value); }}
                        placeholder="비밀번호를 다시 한번 입력하세요" 
                        className="form-control" 
                        required 
                    />
                    {passwordConfirm && (
                        password === passwordConfirm 
                            ? <span className="check-msg success">✓ 비밀번호가 일치합니다.</span>
                            : <span className="check-msg error">✗ 비밀번호가 일치하지 않습니다.</span>
                    )}
                </div>

                <div className="form-group">
                    <label>닉네임 (필수)</label>
                    <div className="id-input-group"> 
                        <input 
                            type="text" 
                            ref={nicknameRef} 
                            placeholder="활동할 닉네임을 입력하세요" 
                            className="form-control" 
                            required 
                            onChange={function() { setNicknameCheckStatus(''); }} 
                        />
                        <button 
                            type="button" 
                            onClick={handleCheckNickname} 
                            className="btn-check-id"
                            disabled={nicknameCheckStatus === 'checked'}
                        >
                            {nicknameCheckStatus === 'checked' ? '확인완료' : '중복확인'}
                        </button>
                    </div>
                    {nicknameCheckStatus === 'checked' && <span className="check-msg success">✓ 사용 가능한 닉네임입니다.</span>}
                    {nicknameCheckStatus === 'failed' && <span className="check-msg error">✗ 이미 사용 중인 닉네임입니다.</span>}
                </div>

                <div className="form-group">
                    <label>한 줄 소개 (선택)</label>
                    <div className="textarea-wrapper">
                        <textarea 
                            value={introText}
                            maxLength={MAX_INTRO_LENGTH} 
                            onChange={function(e) { setIntroText(e.target.value); }}
                            placeholder="자신을 한 줄로 소개해 보세요" 
                            className="form-textarea" 
                        />
                        <div className="char-counter">
                            <span>{introText.length}</span> / {MAX_INTRO_LENGTH}자
                        </div>
                    </div>
                </div>
                
                <div className="form-group">
                    <label>관심 카테고리 (사진)</label>
                    <div className="category-checkbox-group">
                        {photoCategories.map(function(category) {
                            return (
                                <label key={`photo-${category.CATEGORY_ID}`} className="category-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedPhotoCategories.includes(category.CATEGORY_ID)} 
                                        onChange={function() { handlePhotoCategoryChange(category.CATEGORY_ID); }} 
                                    />
                                    {category.CATEGORY_NAME}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group">
                    <label>관심 카테고리 (게시물)</label>
                    <div className="category-checkbox-group">
                        {postCategories.map(function(category) {
                            return (
                                <label key={`post-${category.CATEGORY_ID}`} className="category-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedPostCategories.includes(category.CATEGORY_ID)} 
                                        onChange={function() { handlePostCategoryChange(category.CATEGORY_ID); }} 
                                    />
                                    {category.CATEGORY_NAME}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group checkbox-group">
                    <input 
                        type="checkbox" 
                        id="terms" 
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)} 
                    />
                    <label htmlFor="terms">
                        회원가입 시 Picsial(픽셜)의 서비스 이용 약관과 개인정보 보호정책에 동의합니다.
                    </label>
                </div>

                <button 
                    type="submit" 
                    className="signup-submit-btn"
                    disabled={!isChecked || idCheckStatus !== 'checked' || nicknameCheckStatus !== 'checked'}
                >
                    가입하기
                </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button onClick={() => navigate('/login')} className="back-btn">
                    로그인 화면으로 돌아가기
                </button>
            </div>
        </div>
    );
}

export default SignUp;