const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
const db = require('../db'); // 지난주에 완성한 db.js 파일 경로 확인

// ==========================================
// [POST] /auth/check-id - 아이디 중복 확인
// ==========================================
router.post('/check-id', async (req, res) => {
    const { userId } = req.body;
    let connection;

    if (!userId) {
        return res.status(400).json({ success: false, message: "아이디를 입력해 주세요." });
    }

    try {
        connection = await db.getConnection();

        // 대소문자 구분 없이 정확하게 일치하는 유저 아이디가 있는지 카운트
        const sql = `SELECT COUNT(*) AS CNT FROM PS_USER_INFO WHERE USER_ID = :userId`;
        const result = await connection.execute(sql, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const count = result.rows[0].CNT;

        if (count > 0) {
            // 이미 사용 중인 아이디인 경우
            return res.json({ success: true, isDuplicate: true, message: "이미 사용 중인 아이디입니다." });
        } else {
            // 사용 가능한 아이디인 경우
            return res.json({ success: true, isDuplicate: false, message: "사용 가능한 아이디입니다." });
        }

    } catch (error) {
        console.error("아이디 중복확인 DB 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류로 인해 중복확인을 할 수 없습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /auth/check-nickname - 닉네임 중복 확인
// ==========================================
router.post('/check-nickname', async (req, res) => {
    const { nickname } = req.body;
    let connection;

    if (!nickname) {
        return res.status(400).json({ success: false, message: "닉네임을 입력해 주세요." });
    }

    try {
        connection = await db.getConnection();

        // 대소문자나 공백을 고려하여 정확히 일치하는 닉네임이 있는지 COUNT 조회
        const sql = `SELECT COUNT(*) AS CNT FROM PS_USER_INFO WHERE NICKNAME = :nickname`;
        const result = await connection.execute(sql, { nickname }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const count = result.rows[0].CNT;

        if (count > 0) {
            return res.json({ success: true, isDuplicate: true, message: "이미 사용 중인 닉네임입니다." });
        } else {
            return res.json({ success: true, isDuplicate: false, message: "사용 가능한 닉네임입니다." });
        }

    } catch (error) {
        console.error("닉네임 중복확인 DB 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류로 인해 중복확인을 할 수 없습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// 1. [POST] /auth/signup - 회원가입 API
// ==========================================
router.post('/signup', async (req, res) => {
    // 사용자가 입력한 userId, 한 줄 소개 intro를 구조분해 할당으로 받습니다.
    const { userId, email, password, nickname, intro, preferenceCategories } = req.body; 

    let connection;
    try {
        connection = await db.getConnection();

        // 1. 비밀번호 단방향 암호화 (Salt round: 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. 부모 테이블(PS_USER_INFO)에 유저 기본 정보 삽입
        // USER_NO 자리에 지정하신 'SEQ_PS_USER_NO.NEXTVAL'을 주입하고 RETURNING으로 받아옵니다.
        const userSql = `INSERT INTO PS_USER_INFO (USER_NO, USER_ID, EMAIL, PASSWORD, NICKNAME, INTRO) 
             VALUES (PS_USER_INFO_SEQ.NEXTVAL, :userId, :email, :password, :nickname, :intro)
             RETURNING USER_NO INTO :userNo`;
        
        const userBind = {
            userId,
            email,
            password: hashedPassword,
            nickname,
            intro: intro || null,
            userNo: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } // 발행된 시퀀스 번호 꺼내기
        };

        const userResult = await connection.execute(userSql, userBind);
        const newUserNo = userResult.outBinds.userNo[0]; // 새로 생성된 유저의 고유 번호 (숫자)

        // 3. 자식 테이블(PS_USER_PREFERENCE)에 선호 카테고리 매핑 데이터 삽입
        if (preferenceCategories && preferenceCategories.length > 0) {
            // 수정된 컬럼명 USER_NO와 시퀀스 ADMIN.PS_USER_PREFERENCE_SEQ.NEXTVAL 적용
            const prefSql = `
                INSERT INTO PS_USER_PREFERENCE (PREF_ID, USER_NO, CATEGORY_ID) 
                VALUES (ADMIN.PS_USER_PREFERENCE_SEQ.NEXTVAL, :userNo, :categoryId)
            `;

            // 프론트엔드에서 넘어온 카테고리 ID 배열을 돌며 다중 매핑 저장
            for (const catId of preferenceCategories) {
                await connection.execute(prefSql, { userNo: newUserNo, categoryId: catId });
            }
        }

        // 4. 트랜잭션 최종 커밋 (모든 INSERT 성공 시 DB에 실제 반영)
        await connection.commit();
        res.status(201).json({ success: true, message: "Picsial 회원가입이 성공적으로 완료되었습니다!" });

    } catch (error) {
        // 과정 중 하나라도 실패하면 롤백하여 데이터 정합성 유지
        if (connection) await connection.rollback();
        console.error("회원가입 트랜잭션 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류로 회원가입에 실패했습니다.", error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});


// ==========================================
// 2. [POST] /auth/login - 로그인 API
// ==========================================
router.post('/login', async (req, res) => {
    // 이제 로그인 아이디인 userId와 password를 받습니다.
    const { userId, password } = req.body; 
    let connection;

    try {
        connection = await db.getConnection();

        // 사용자가 입력한 아이디(USER_ID)로 회원이 존재하는지 조회
        // 세션 정보나 토큰 발행에 필요한 고유키 USER_NO와 NICKNAME도 함께 가져옵니다.
        const sql = `
            SELECT USER_NO, USER_ID, PASSWORD, NICKNAME 
            FROM PS_USER_INFO 
            WHERE USER_ID = :userId
        `;
        const result = await connection.execute(sql, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 해당하는 아이디가 없는 경우
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: "가입되지 않은 아이디입니다." });
        }

        const user = result.rows[0];

        // bcrypt를 이용해 입력된 비밀번호와 DB에 암호화되어 저장된 비밀번호 비교
        const isMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "비밀번호가 일치하지 않습니다." });
        }

        // 로그인 성공 시 JWT 토큰 생성 (유효기간: 1일)
        // 토큰의 페이로드(Payload)에는 유저 아이디 문자열 대신 고유 식별 번호인 userNo를 심어 관리합니다.
        const token = jwt.sign(
            { userNo: user.USER_NO, userId: user.USER_ID, nickname: user.NICKNAME },
            process.env.JWT_SECRET || 'picsial_secret_key',
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: "로그인에 성공했습니다.",
            token: token,
            user: {
                userNo: user.USER_NO,
                userId: user.USER_ID,
                nickname: user.NICKNAME
            }
        });

    } catch (error) {
        console.error("로그인 프로세스 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류로 로그인에 실패했습니다.", error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;