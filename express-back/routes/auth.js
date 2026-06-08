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
// [POST] /auth/signup - 회원가입 API
// ==========================================
router.post('/signup', async (req, res) => {
    // 1. 프론트엔드에서 분리되어 넘어온 카테고리 배열 두 개를 받습니다.
    const { userId, email, password, nickname, intro, photoCategories, postCategories } = req.body; 

    let connection;
    try {
        connection = await db.getConnection();

        // 2. 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. 유저 기본 정보 삽입
        const userSql = `INSERT INTO PS_USER_INFO (USER_NO, USER_ID, EMAIL, PASSWORD, NICKNAME, INTRO) 
             VALUES (PS_USER_INFO_SEQ.NEXTVAL, :userId, :email, :password, :nickname, :intro)
             RETURNING USER_NO INTO :userNo`;
        
        const userBind = {
            userId,
            email,
            password: hashedPassword,
            nickname,
            intro: intro || null,
            userNo: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };

        const userResult = await connection.execute(userSql, userBind);
        const newUserNo = userResult.outBinds.userNo[0]; 

        // 4. 사진 카테고리 매핑 (PS_USER_PREF_PHOTO)
        if (photoCategories && photoCategories.length > 0) {
            const photoSql = `
                INSERT INTO PS_USER_PREF_PHOTO (PREF_ID, USER_NO, CATEGORY_ID) 
                VALUES (PS_USER_PREF_PHOTO_SEQ.NEXTVAL, :userNo, :categoryId)
            `;
            for (const catId of photoCategories) {
                await connection.execute(photoSql, { userNo: newUserNo, categoryId: catId });
            }
        }

        // 5. 게시물 카테고리 매핑 (PS_USER_PREF_POST) - 새로 추가된 부분
        if (postCategories && postCategories.length > 0) {
            const postSql = `
                INSERT INTO PS_USER_PREF_POST (PREF_ID, USER_NO, CATEGORY_ID) 
                VALUES (PS_USER_PREF_POST_SEQ.NEXTVAL, :userNo, :categoryId)
            `;
            for (const catId of postCategories) {
                await connection.execute(postSql, { userNo: newUserNo, categoryId: catId });
            }
        }

        // 6. 커밋
        await connection.commit();
        res.status(201).json({ success: true, message: "Picsial 회원가입이 성공적으로 완료되었습니다!" });

    } catch (error) {
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
            process.env.JWT_SECRET,
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

// ==========================================
// [DELETE] /auth/delete-account - 계정 삭제 API
// ==========================================
router.delete('/delete-account', async (req, res) => {
    // 프론트에서 넘어온 userNo와 reason
    // (JWT 미들웨어를 쓰신다면 req.user.userNo 등으로 대체 가능합니다)
    const { userNo, reason } = req.body; 

    if (!userNo) {
        return res.status(400).json({ success: false, message: "유저 식별 정보가 없습니다." });
    }

    let connection;
    try {
        connection = await db.getConnection();

        // 1. 삭제할 유저의 USER_ID 조회 (이력 테이블에 남기기 위해)
        const checkSql = `SELECT USER_ID FROM PS_USER_INFO WHERE USER_NO = :userNo`;
        const checkResult = await connection.execute(
            checkSql, 
            { userNo }, 
            { outFormat: oracledb.OUT_FORMAT_OBJECT } 
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "존재하지 않는 유저입니다." });
        }
        const userId = checkResult.rows[0].USER_ID;

        // 2. PS_DELETED_USER 테이블에 삭제 이력 삽입
        // DELETED_AT은 테이블 Default값(SYSDATE)이 있으므로 생략합니다.
        const insertHistSql = `
            INSERT INTO PS_DELETED_USER (DEL_NO, USER_NO, USER_ID, REASON)
            VALUES (PS_DELETED_USER_SEQ.NEXTVAL, :userNo, :userId, :reason)
        `;
        await connection.execute(insertHistSql, { 
            userNo, 
            userId, 
            reason: reason || '사유 미작성' 
        });

        // 3. PS_USER_INFO에서 유저 정보 삭제
        // 🚨 주의: 외래키에 ON DELETE CASCADE가 없으면 여기서 ORA-02292 에러가 터집니다!
        const deleteUserSql = `DELETE FROM PS_USER_INFO WHERE USER_NO = :userNo`;
        await connection.execute(deleteUserSql, { userNo });

        // 4. 모든 작업이 성공하면 트랜잭션 커밋
        await connection.commit();
        res.json({ success: true, message: "계정이 삭제되었습니다." });

    } catch (error) {
        // 오류 발생 시 롤백 (이력은 남았는데 본계정은 안 지워지는 등 데이터 꼬임 방지)
        if (connection) await connection.rollback();
        
        console.error("계정 삭제 API 에러:", error);

        // ORA-02292: 자식 레코드가 발견되었습니다 에러 처리
        if (error.message.includes('ORA-02292')) {
            return res.status(409).json({ 
                success: false, 
                message: "DB 외래키 제약조건 오류: 해당 유저의 글/사진/댓글 등 자식 데이터가 남아있어 삭제할 수 없습니다. (CASCADE 확인 필요)" 
            });
        }

        res.status(500).json({ success: false, message: "서버 오류로 계정 삭제에 실패했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;