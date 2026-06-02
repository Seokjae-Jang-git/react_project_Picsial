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

    const [categoryList, setCategoryList] = useState([]);
    const [preferenceCategories, setPreferenceCategories] = useState([]);

    const [introText, setIntroText] = useState('');
    const MAX_INTRO_LENGTH = 100;

    const [isChecked, setIsChecked] = useState(false);

    const navigate = useNavigate();

    useEffect(function() {
        async function fetchCategories() {
            try {
                const response = await fetch('http://localhost:3010/category');
                const data = await response.json();
                if (response.ok && data.success) {
                    setCategoryList(data.categories);
                }
            } catch (error) {
                console.error('카테고리 Fetch 에러:', error);
            }
        }
        fetchCategories();
    }, []);

    async function handleCheckId() {
        const userId = userIdRef.current.value.trim();

        if (!userId) {
            alert('중복 확인할 아이디를 입력하세요.');
            return;
        }

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
            } else {
                alert(data.message || '중복 확인 중 에러가 발생했습니다.');
            }
        } catch (error) {
            console.error('중복확인 요청 에러:', error);
            alert('서버와 통신에 실패했습니다.');
        }
    }

    async function handleCheckNickname() {
        const nickname = nicknameRef.current.value.trim();

        if (!nickname) {
            alert('중복 확인할 닉네임을 입력하세요.');
            return;
        }

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
                    setVerifiedNickname(nickname); // 통과된 닉네임 백업
                }
            } else {
                alert(data.message || '중복 확인 중 에러가 발생했습니다.');
            }
        } catch (error) {
            console.error('닉네임 중복확인 요청 에러:', error);
            alert('서버와 통신에 실패했습니다.');
        }
    }

    function handleCategoryChange(id) {
        if (preferenceCategories.includes(id)) {
            setPreferenceCategories(preferenceCategories.filter(catId => catId !== id));
        } else {
            setPreferenceCategories([...preferenceCategories, id]);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const userId = userIdRef.current.value.trim();
        const email = emailRef.current.value.trim();
        const nickname = nicknameRef.current.value.trim();
        const intro = introText.trim();

        if (idCheckStatus !== 'checked' || verifiedId !== userId) {
            alert('아이디 중복확인을 완료해 주세요.');
            return;
        }

        if (nicknameCheckStatus !== 'checked' || verifiedNickname !== nickname) {
            alert('닉네임 중복확인을 완료해 주세요.');
            return;
        }

        if (!isChecked) {
            alert('서비스 이용 약관 및 개인정보 보호정책에 동의해 주세요.');
            return;
        }

        if (!userId || !email || !password || !nickname) {
            alert('필수 입력 항목을 모두 채워주세요.');
            return;
        }

        if (password !== passwordConfirm) {
            alert('비밀번호와 비밀번호 확인 값이 일치하지 않습니다.');
            return;
        }

        // 허용 특수문자: ~ ! @ # $ % ^ * ( ) _ + - =
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^*()_+\- =])[A-Za-z\d~!@#$%^*()_+\- =]{8,}$/;
        
        if (!passwordRegex.test(password)) {
            alert('비밀번호 제약조건을 확인해 주세요.\n(대소문자, 숫자, 특수기호 포함 8자 이상)');
            return;
        }

        try {
            const response = await fetch('http://localhost:3010/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    email,
                    password,
                    nickname,
                    intro: intro || null,
                    preferenceCategories
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '회원가입 중 오류가 발생했습니다.');
            }

            if (data.success) {
                alert(data.message);
                navigate('/login');
                
                userIdRef.current.value = '';
                emailRef.current.value = '';
                nicknameRef.current.value = '';
                setPassword('');
                setPasswordConfirm('');
                setIntroText('');
                setPreferenceCategories([]);
                setIdCheckStatus('');
                setVerifiedId('');
                setNicknameCheckStatus('');
                setVerifiedNickname('');
            }
        } catch (error) {
            console.error('회원가입 요청 에러:', error);
            alert(error.message);
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
                    {/* 실시간 일치 여부 판별 안내 (입력창에 값이 있을 때만 표출) */}
                    {passwordConfirm && (
                        password === passwordConfirm 
                            ? <span className="check-msg success">✓ 비밀번호가 일치합니다.</span>
                            : <span className="check-msg error">✗ 비밀번호가 일치하지 않습니다.</span>
                    )}
                </div>

                <div className="form-group">
                    <label>닉네임 (필수)</label>
                    <div className="id-input-group"> {/* 아이디와 정렬 구조가 같으므로 기존 클래스 재활용 */}
                        <input 
                            type="text" 
                            ref={nicknameRef} 
                            placeholder="활동할 닉네임을 입력하세요" 
                            className="form-control" 
                            required 
                            // 글자를 다시 고쳐쓰면 중복 확인 해제
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
                            maxLength={MAX_INTRO_LENGTH} // 브라우저 자체에서 최대 글자수 입력 차단
                            onChange={function(e) { setIntroText(e.target.value); }}
                            placeholder="자신을 한 줄로 소개해 보세요" 
                            className="form-textarea" 
                        />
                        {/* 실시간 글자수 표시기 */}
                        <div className="char-counter">
                            <span>{introText.length}</span> / {MAX_INTRO_LENGTH}자
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>관심 카테고리 (실시간 DB 반영)</label>
                    <div className="category-checkbox-group">
                        {categoryList.map(function(category) {
                            return (
                                <label key={category.CATEGORY_ID} className="category-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={preferenceCategories.includes(category.CATEGORY_ID)} 
                                        onChange={function() { handleCategoryChange(category.CATEGORY_ID); }} 
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
                    // [수정] 체크박스가 체크되어야 버튼 활성화 (선택 사항)
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