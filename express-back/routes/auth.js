const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
const db = require('../db'); 

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

        const sql = `SELECT COUNT(*) AS CNT FROM PS_USER_INFO WHERE USER_ID = :userId`;
        const result = await connection.execute(sql, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const count = result.rows[0].CNT;

        if (count > 0) {
            return res.json({ success: true, isDuplicate: true, message: "이미 사용 중인 아이디입니다." });
        } else {
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
    const { userId, email, password, nickname, intro, photoCategories, postCategories } = req.body; 

    let connection;
    try {
        connection = await db.getConnection();

        const hashedPassword = await bcrypt.hash(password, 10);

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

        if (photoCategories && photoCategories.length > 0) {
            const photoSql = `
                INSERT INTO PS_USER_PREF_PHOTO (PREF_ID, USER_NO, CATEGORY_ID) 
                VALUES (PS_USER_PREF_PHOTO_SEQ.NEXTVAL, :userNo, :categoryId)
            `;
            for (const catId of photoCategories) {
                await connection.execute(photoSql, { userNo: newUserNo, categoryId: catId });
            }
        }

        if (postCategories && postCategories.length > 0) {
            const postSql = `
                INSERT INTO PS_USER_PREF_POST (PREF_ID, USER_NO, CATEGORY_ID) 
                VALUES (PS_USER_PREF_POST_SEQ.NEXTVAL, :userNo, :categoryId)
            `;
            for (const catId of postCategories) {
                await connection.execute(postSql, { userNo: newUserNo, categoryId: catId });
            }
        }

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
// [POST] /auth/login - 로그인 API
// ==========================================
router.post('/login', async (req, res) => {
    const { userId, password } = req.body; 
    let connection;

    try {
        connection = await db.getConnection();

        const sql = `
            SELECT USER_NO, USER_ID, PASSWORD, NICKNAME 
            FROM PS_USER_INFO 
            WHERE USER_ID = :userId
        `;
        const result = await connection.execute(sql, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: "가입되지 않은 아이디입니다." });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "비밀번호가 일치하지 않습니다." });
        }

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
    const { userNo, reason } = req.body; 

    if (!userNo) {
        return res.status(400).json({ success: false, message: "유저 식별 정보가 없습니다." });
    }

    let connection;
    try {
        connection = await db.getConnection();

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

        const insertHistSql = `
            INSERT INTO PS_DELETED_USER (DEL_NO, USER_NO, USER_ID, REASON)
            VALUES (PS_DELETED_USER_SEQ.NEXTVAL, :userNo, :userId, :reason)
        `;
        await connection.execute(insertHistSql, { 
            userNo, 
            userId, 
            reason: reason || '사유 미작성' 
        });

        const deleteUserSql = `DELETE FROM PS_USER_INFO WHERE USER_NO = :userNo`;
        await connection.execute(deleteUserSql, { userNo });

        await connection.commit();
        res.json({ success: true, message: "계정이 삭제되었습니다." });

    } catch (error) {
        if (connection) await connection.rollback();
        
        console.error("계정 삭제 API 에러:", error);

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