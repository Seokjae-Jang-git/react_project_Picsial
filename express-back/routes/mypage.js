const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

const uploadProfileMem = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = process.env.NAS_SAVE_DIR_PROFILE || path.join(__dirname, '../uploads/profiles');
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `profile_${uniqueSuffix}${ext}`);
    }
});

const uploadProfile = multer({ 
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', async (req, res) => {
    let connection;
    try {
        const userNo = req.query.userNo ? Number(req.query.userNo) : 0;
        
        if (!userNo) {
            return res.status(400).json({ success: false, message: "유저 번호가 누락되었습니다." });
        }

        connection = await db.getConnection();
        
        const profileSql = `
            SELECT 
                U.USER_NO, U.NICKNAME, U.PROFILE_IMAGE_URL, U.INTRO,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWING_NO = U.USER_NO) AS FOLLOWER_COUNT,
                (SELECT COUNT(*) FROM PS_FOLLOW WHERE FOLLOWER_NO = U.USER_NO) AS FOLLOWING_COUNT,
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), 0) + 
                NVL((SELECT SUM(LIKE_COUNT) FROM PS_POST WHERE USER_NO = U.USER_NO), 0) AS TOTAL_LIKES,
                NVL((SELECT COUNT(*) FROM PS_SCRAP_TABLE S JOIN PS_POST P ON S.POST_ID = P.POST_ID WHERE P.USER_NO = U.USER_NO), 0) AS TOTAL_SCRAPS,
                TO_CHAR(
                    GREATEST(
                        NVL((SELECT MAX(CREATED_AT) FROM PS_PHOTO WHERE USER_NO = U.USER_NO), TO_DATE('1970-01-01', 'YYYY-MM-DD')),
                        NVL((SELECT MAX(CREATED_AT) FROM PS_POST WHERE USER_NO = U.USER_NO AND IS_PUBLIC = 'Y'), TO_DATE('1970-01-01', 'YYYY-MM-DD'))
                    ), 
                    'YYYY-MM-DD'
                ) AS LAST_UPDATE
            FROM PS_USER_INFO U
            WHERE U.USER_NO = :userNo
        `;

        const result = await connection.execute(
            profileSql, 
            { userNo }, 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "유저 정보를 찾을 수 없습니다." });
        }
        
        const profileData = result.rows[0];
        
        if (profileData.LAST_UPDATE === '1970-01-01') {
            profileData.LAST_UPDATE = null;
        }

        if (profileData.PROFILE_IMAGE_URL && !profileData.PROFILE_IMAGE_URL.startsWith('http')) {
            const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
            if (profileBaseUrl) {
                profileData.PROFILE_IMAGE_URL = `${profileBaseUrl}/${profileData.PROFILE_IMAGE_URL}`;
            }
        }

        res.json({ success: true, profile: profileData });

    } catch (error) {
        console.error("마이페이지 프로필 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "서버 에러가 발생했습니다." });
    } finally {
        if (connection) { 
            try { await connection.close(); } catch (e) {} 
        }
    }
});

// ==========================================
// [GET] /PHOTO 카테고리 전체 목록 조회 (가나다순, '기타'는 맨 아래 고정)
// ==========================================
router.get('/photos', async (req, res) => {
    let connection;
    try {
        const { userNo, category, sort } = req.query;

        if (!userNo) {
            return res.status(400).json({ success: false, message: "유저 번호가 누락되었습니다." });
        }

        connection = await db.getConnection();
        
        const bindParams = { userNo };
        
        let categoryCondition = '';
        if (category && category !== '') {
            categoryCondition = `AND P.PHOTO_ID IN (SELECT PHOTO_ID FROM PS_PHOTO_CATEMAP WHERE CATEGORY_ID = :category)`;
            bindParams.category = Number(category);
        }

        let orderByClause = '';
        if (sort === 'scraps') {
            orderByClause = 'ORDER BY SCRAP_COUNT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'comments') {
            orderByClause = 'ORDER BY COMMENT_COUNT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'likes') {
            orderByClause = 'ORDER BY P.LIKE_COUNT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'views') {
            orderByClause = 'ORDER BY P.VIEW_COUNT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'oldest') {
            orderByClause = 'ORDER BY P.PHOTO_ID ASC';
        } else {
            orderByClause = 'ORDER BY P.PHOTO_ID DESC'; 
        }

        const sql = `
            SELECT 
                P.PHOTO_ID, P.USER_NO, P.TITLE, P.IMAGE_URL, P.THUMB_URL, P.VIEW_COUNT, P.LIKE_COUNT,
                NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT
            FROM PS_PHOTO P
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY PHOTO_ID) S ON P.PHOTO_ID = S.PHOTO_ID
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY PHOTO_ID) CM ON P.PHOTO_ID = CM.PHOTO_ID
            WHERE P.USER_NO = :userNo 
            ${categoryCondition}
            ${orderByClause}
        `;

        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const processedPhotos = result.rows.map(photo => ({
            ...photo,
            IMAGE_URL: photo.IMAGE_URL && photo.IMAGE_URL.startsWith('http') 
                ? photo.IMAGE_URL 
                : `${process.env.NAS_BASE_URL}/${photo.IMAGE_URL}`,
            THUMB_URL: photo.THUMB_URL && photo.THUMB_URL.startsWith('http')
                ? photo.THUMB_URL 
                : `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}`
        }));

        res.json({ success: true, list: processedPhotos });
    } catch (error) {
        console.error("마이페이지 사진 조회 및 정렬 에러:", error);
        res.status(500).json({ success: false, message: "내 사진 목록 불러오기 실패" });
    } finally {
        if (connection) { 
            try { await connection.close(); } catch (e) { console.error(e); } 
        }
    }
});

// ==========================================
// [GET] /mypage/posts - 내 게시물 필터링 및 6가지 정렬 조회 (전체 조회)
// ==========================================
router.get('/posts', async (req, res) => {
    let connection;
    try {
        const { userNo, category, sort } = req.query;

        if (!userNo) {
            return res.status(400).json({ success: false, message: "유저 번호가 누락되었습니다." });
        }

        connection = await db.getConnection();
        
        const bindParams = { userNo };

        let categoryCondition = '';
        if (category && category !== '') {
            categoryCondition = `AND P.POST_ID IN (SELECT POST_ID FROM PS_POST_CATEMAP WHERE CATEGORY_ID = :category)`;
            bindParams.category = Number(category);
        }

        let orderByClause = '';
        if (sort === 'scraps') {
            orderByClause = 'ORDER BY SCRAP_COUNT DESC, P.POST_ID DESC';
        } else if (sort === 'comments') {
            orderByClause = 'ORDER BY COMMENT_COUNT DESC, P.POST_ID DESC';
        } else if (sort === 'likes') {
            orderByClause = 'ORDER BY P.LIKE_COUNT DESC, P.POST_ID DESC';
        } else if (sort === 'views') {
            orderByClause = 'ORDER BY P.VIEW_COUNT DESC, P.POST_ID DESC';
        } else if (sort === 'oldest') {
            orderByClause = 'ORDER BY P.POST_ID ASC';
        } else {
            orderByClause = 'ORDER BY P.POST_ID DESC'; 
        }

        const sql = `
            SELECT 
                P.POST_ID, P.USER_NO, P.TITLE, P.CONTENT, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                UI.NICKNAME, UI.PROFILE_IMAGE_URL,
                NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
                (
                    SELECT LISTAGG(IMG.THUMB_URL, ',') WITHIN GROUP (ORDER BY IMG.SORT_ORDER)
                    FROM PS_POST_IMAGE IMG
                    WHERE IMG.POST_ID = P.POST_ID
                ) AS ALL_THUMBS
            FROM PS_POST P
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY POST_ID) S ON P.POST_ID = S.POST_ID
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY POST_ID) CM ON P.POST_ID = CM.POST_ID
            WHERE P.USER_NO = :userNo
            ${categoryCondition}
            ${orderByClause}
        `;

        const result = await connection.execute(
            sql, 
            bindParams, 
            { 
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: { CONTENT: { type: oracledb.STRING } } 
            }
        );

        const processedPosts = result.rows.map(post => {
            const thumbList = post.ALL_THUMBS ? post.ALL_THUMBS.split(',') : [];
            const fullThumbUrls = thumbList.map(fileName => {
                if (fileName.startsWith('http')) return fileName; 
                return `${process.env.NAS_BASE_URL_POS_IMG}/${fileName}`; 
            });

            let finalProfileUrl = post.PROFILE_IMAGE_URL;
            if (finalProfileUrl && !finalProfileUrl.startsWith('http')) {
                const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
                if (profileBaseUrl) {
                    finalProfileUrl = `${profileBaseUrl}/${finalProfileUrl}`;
                }
            }

            return {
                ...post,
                PROFILE_IMAGE_URL: finalProfileUrl, 
                CATEGORIES: post.CATEGORIES ? post.CATEGORIES.split(', ') : [],
                TAGS: post.TAGS ? post.TAGS.split(', ') : [],
                THUMB_LIST: fullThumbUrls
            };
        });

        res.json({ success: true, list: processedPosts });

    } catch (error) {
        console.error("마이페이지 게시물 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "내 게시물 목록 불러오기 실패" });
    } finally {
        if (connection) { 
            try { await connection.close(); } catch (e) {} 
        }
    }
});

// ==========================================
// [GET] /mypage/scrap/photos - 내가 스크랩한 사진 목록 조회 (전체 조회)
// ==========================================
router.get('/scrap/photos', async (req, res) => {
    let connection;
    try {
        const { userNo, category, sort } = req.query;

        if (!userNo) {
            return res.status(400).json({ success: false, message: "유저 번호가 누락되었습니다." });
        }

        connection = await db.getConnection();
        
        const bindParams = { userNo };

        let categoryCondition = '';
        if (category && category !== '') {
            categoryCondition = `AND P.PHOTO_ID IN (SELECT PHOTO_ID FROM PS_PHOTO_CATEMAP WHERE CATEGORY_ID = :category)`;
            bindParams.category = Number(category);
        }

        let orderByClause = '';
        if (sort === 'scrap_latest') {
            orderByClause = 'ORDER BY ST.CREATED_AT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'scrap_oldest') {
            orderByClause = 'ORDER BY ST.CREATED_AT ASC, P.PHOTO_ID ASC';
        } else if (sort === 'latest') {
            orderByClause = 'ORDER BY P.CREATED_AT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'oldest') {
            orderByClause = 'ORDER BY P.CREATED_AT ASC, P.PHOTO_ID ASC';
        } else if (sort === 'likes') {
            orderByClause = 'ORDER BY P.LIKE_COUNT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'views') {
            orderByClause = 'ORDER BY P.VIEW_COUNT DESC, P.PHOTO_ID DESC';
        } else if (sort === 'comments') {
            orderByClause = 'ORDER BY COMMENT_COUNT DESC, P.PHOTO_ID DESC';
        } else {
            orderByClause = 'ORDER BY ST.CREATED_AT DESC'; 
        }

        const sql = `
            SELECT 
                P.PHOTO_ID, P.USER_NO, P.TITLE, P.IMAGE_URL, P.THUMB_URL, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                NVL(S_COUNT.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
                ST.CREATED_AT AS SCRAP_DATE
            FROM PS_SCRAP_TABLE ST
            JOIN PS_PHOTO P ON ST.PHOTO_ID = P.PHOTO_ID
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE WHERE PHOTO_ID IS NOT NULL GROUP BY PHOTO_ID) S_COUNT ON P.PHOTO_ID = S_COUNT.PHOTO_ID
            LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY PHOTO_ID) CM ON P.PHOTO_ID = CM.PHOTO_ID
            WHERE ST.USER_NO = :userNo AND ST.PHOTO_ID IS NOT NULL
            ${categoryCondition}
            ${orderByClause}
        `;

        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const processedPhotos = result.rows.map(photo => ({
            ...photo,
            IMAGE_URL: photo.IMAGE_URL && photo.IMAGE_URL.startsWith('http') 
                ? photo.IMAGE_URL 
                : `${process.env.NAS_BASE_URL}/${photo.IMAGE_URL}`,
            THUMB_URL: photo.THUMB_URL && photo.THUMB_URL.startsWith('http')
                ? photo.THUMB_URL 
                : `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}`
        }));

        res.json({ success: true, list: processedPhotos });

    } catch (error) {
        console.error("스크랩 사진 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "스크랩 사진 목록 불러오기 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /mypage/scrap/posts - 내가 스크랩한 게시물 목록 조회 (전체 조회)
// ==========================================
router.get('/scrap/posts', async (req, res) => {
    let connection;
    try {
        const { userNo, category, sort } = req.query;

        if (!userNo) {
            return res.status(400).json({ success: false, message: "유저 번호가 누락되었습니다." });
        }

        connection = await db.getConnection();
        
        const bindParams = { userNo };

        let categoryCondition = '';
        if (category && category !== '') {
            categoryCondition = `AND P.POST_ID IN (SELECT POST_ID FROM PS_POST_CATEMAP WHERE CATEGORY_ID = :category)`;
            bindParams.category = Number(category);
        }

        let orderByClause = '';
        if (sort === 'scrap_latest') {
            orderByClause = 'ORDER BY ST.CREATED_AT DESC, P.POST_ID DESC';
        } else if (sort === 'scrap_oldest') {
            orderByClause = 'ORDER BY ST.CREATED_AT ASC, P.POST_ID ASC';
        } else if (sort === 'latest') {
            orderByClause = 'ORDER BY P.CREATED_AT DESC, P.POST_ID DESC';
        } else if (sort === 'oldest') {
            orderByClause = 'ORDER BY P.CREATED_AT ASC, P.POST_ID ASC';
        } else if (sort === 'likes') {
            orderByClause = 'ORDER BY P.LIKE_COUNT DESC, P.POST_ID DESC';
        } else if (sort === 'views') {
            orderByClause = 'ORDER BY P.VIEW_COUNT DESC, P.POST_ID DESC';
        } else if (sort === 'comments') {
            orderByClause = 'ORDER BY COMMENT_COUNT DESC, P.POST_ID DESC';
        } else {
            orderByClause = 'ORDER BY ST.CREATED_AT DESC'; 
        }

        const sql = `
            SELECT 
                P.POST_ID, P.USER_NO, P.TITLE, P.CONTENT, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                UI.NICKNAME, UI.PROFILE_IMAGE_URL,
                NVL(S_COUNT.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
                (
                    SELECT LISTAGG(IMG.THUMB_URL, ',') WITHIN GROUP (ORDER BY IMG.SORT_ORDER)
                    FROM PS_POST_IMAGE IMG
                    WHERE IMG.POST_ID = P.POST_ID
                ) AS ALL_THUMBS,
                ST.CREATED_AT AS SCRAP_DATE
            FROM PS_SCRAP_TABLE ST
            JOIN PS_POST P ON ST.POST_ID = P.POST_ID
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE WHERE POST_ID IS NOT NULL GROUP BY POST_ID) S_COUNT ON P.POST_ID = S_COUNT.POST_ID
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY POST_ID) CM ON P.POST_ID = CM.POST_ID
            WHERE ST.USER_NO = :userNo AND ST.POST_ID IS NOT NULL
            ${categoryCondition}
            ${orderByClause}
        `;

        const result = await connection.execute(
            sql, 
            bindParams, 
            { 
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: { CONTENT: { type: oracledb.STRING } }
            }
        );

        const processedPosts = result.rows.map(post => {
            const thumbList = post.ALL_THUMBS ? post.ALL_THUMBS.split(',') : [];
            const fullThumbUrls = thumbList.map(fileName => {
                if (fileName.startsWith('http')) return fileName; 
                return `${process.env.NAS_BASE_URL_POS_IMG}/${fileName}`; 
            });

            let profileUrl = post.PROFILE_IMAGE_URL;
            if (profileUrl && !profileUrl.startsWith('http')) {
                profileUrl = process.env.NAS_BASE_URL_PROFILE ? `${process.env.NAS_BASE_URL_PROFILE}/${profileUrl}` : profileUrl;
            }

            return {
                ...post,
                PROFILE_IMAGE_URL: profileUrl,
                THUMB_LIST: fullThumbUrls
            };
        });

        res.json({ success: true, list: processedPosts });

    } catch (error) {
        console.error("스크랩 게시물 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "스크랩 게시물 목록 불러오기 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [GET] /mypage/account - 내 정보, 선호 카테고리 및 전체 마스터 카테고리 조회
// ==========================================
router.get('/account', async (req, res) => {
    let connection;
    try {
        const userNo = req.query.userNo;
        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        const sqlUser = `
            SELECT USER_ID, EMAIL, NICKNAME, PROFILE_IMAGE_URL, NVL(INTRO, '') AS INTRO 
            FROM PS_USER_INFO WHERE USER_NO = :userNo
        `;
        const resultUser = await connection.execute(sqlUser, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (resultUser.rows.length === 0) {
            return res.status(404).json({ success: false, message: "회원 정보를 찾을 수 없습니다." });
        }
        const user = resultUser.rows[0];

        if (user.PROFILE_IMAGE_URL && !user.PROFILE_IMAGE_URL.startsWith('http')) {
            const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;

            if (profileBaseUrl) {
                user.PROFILE_IMAGE_URL = `${profileBaseUrl}/${user.PROFILE_IMAGE_URL}`;
            } else {
                console.error("❌ CRITICAL CONFIG ERROR: .env 파일에 'NAS_BASE_URL_PROFILE' 변수가 정의되지 않았습니다. 프로필 이미지를 정상적으로 불러올 수 없습니다.");
            }
        }

        const sqlPhotoMaster = `SELECT CATEGORY_NAME FROM PS_CATEGORY_PHOTO ORDER BY CATEGORY_ID ASC`;
        const resultPhotoMaster = await connection.execute(sqlPhotoMaster, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const sqlPhotoPref = `
            SELECT C.CATEGORY_NAME FROM PS_USER_PREF_PHOTO P
            JOIN PS_CATEGORY_PHOTO C ON P.CATEGORY_ID = C.CATEGORY_ID WHERE P.USER_NO = :userNo
        `;
        const resultPhotoPref = await connection.execute(sqlPhotoPref, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const sqlPostMaster = `SELECT CATEGORY_NAME FROM PS_CATEGORY_POST ORDER BY CATEGORY_ID ASC`;
        const resultPostMaster = await connection.execute(sqlPostMaster, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const sqlPostPref = `
            SELECT C.CATEGORY_NAME FROM PS_USER_PREF_POST P
            JOIN PS_CATEGORY_POST C ON P.CATEGORY_ID = C.CATEGORY_ID WHERE P.USER_NO = :userNo
        `;
        const resultPostPref = await connection.execute(sqlPostPref, { userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({ 
            success: true, 
            user: user,
            masterCategories: {
                photo: resultPhotoMaster.rows.map(r => r.CATEGORY_NAME),
                post: resultPostMaster.rows.map(r => r.CATEGORY_NAME)
            },
            categories: {
                photo: resultPhotoPref.rows.map(r => r.CATEGORY_NAME),
                post: resultPostPref.rows.map(r => r.CATEGORY_NAME)
            }
        });

    } catch (error) {
        console.error("내 계정 데이터 종합 조회 에러:", error.message);
        res.status(500).json({ success: false, message: "계정 데이터 불러오기 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [PUT] /mypage/account/profile - 내 프로필(이메일, 내소개, 프로필사진) 수정 (SFTP 적용)
// ==========================================
router.put('/account/profile', uploadProfileMem.single('profileImage'), async (req, res) => {
    let connection;
    try {
        const { userNo, email, intro } = req.body;

        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        let sql = `UPDATE PS_USER_INFO SET EMAIL = :email, INTRO = :intro`;
        const binds = { email, intro, userNo };
        let newImageUrl = null;

        if (req.file) {
            const ext = path.extname(req.file.originalname);
            const filename = `profile_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`;
            
            const remoteDir = process.env.SFTP_PROFILE_DIR;
            const remotePath = `${remoteDir}/${filename}`;

            const sftp = new SftpClient();
            try {
                await sftp.connect({
                    host: process.env.SFTP_HOST,
                    port: Number(process.env.SFTP_PORT),
                    username: process.env.SFTP_USER,
                    password: process.env.SFTP_PASS
                });
                
                await sftp.put(req.file.buffer, remotePath);
                
            } catch (sftpErr) {
                console.error('프로필 이미지 SFTP 업로드 실패:', sftpErr);
                throw new Error('파일 전송 실패'); 
            } finally {
                await sftp.end(); 
            }

            sql += `, PROFILE_IMAGE_URL = :profileImage`;
            binds.profileImage = filename;
            
            const baseUrl = process.env.NAS_BASE_URL_PROFILE;
            newImageUrl = `${baseUrl}/${filename}`;
        }

        sql += ` WHERE USER_NO = :userNo`;

        connection = await db.getConnection();
        await connection.execute(sql, binds, { autoCommit: true });

        res.json({ 
            success: true, 
            message: "프로필이 성공적으로 수정되었습니다.",
            newImageUrl: newImageUrl 
        });

    } catch (error) {
        console.error("내 프로필 수정 에러:", error.message);
        res.status(500).json({ success: false, message: "프로필 수정 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [PUT] /mypage/account/category - 내 선호 카테고리 수정
// ==========================================
router.put('/account/category', async (req, res) => {
    let connection;
    try {
        const { userNo, photoCategories, postCategories } = req.body;

        if (!userNo) return res.status(400).json({ success: false, message: "유저 번호 누락" });

        connection = await db.getConnection();

        await connection.execute(`DELETE FROM PS_USER_PREF_PHOTO WHERE USER_NO = :userNo`, { userNo });
        await connection.execute(`DELETE FROM PS_USER_PREF_POST WHERE USER_NO = :userNo`, { userNo });

        if (photoCategories && photoCategories.length > 0) {
            for (const cateName of photoCategories) {
                const sqlId = `SELECT CATEGORY_ID FROM PS_CATEGORY_PHOTO WHERE CATEGORY_NAME = :cateName`;
                const resId = await connection.execute(sqlId, { cateName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
                
                if (resId.rows.length > 0) {
                    const categoryId = resId.rows[0].CATEGORY_ID;
                    const sqlInsert = `
                        INSERT INTO PS_USER_PREF_PHOTO (PREF_ID, USER_NO, CATEGORY_ID) 
                        VALUES (PS_USER_PREF_PHOTO_SEQ.NEXTVAL, :userNo, :categoryId)
                    `;
                    await connection.execute(sqlInsert, { userNo, categoryId });
                }
            }
        }

        if (postCategories && postCategories.length > 0) {
            for (const cateName of postCategories) {
                const sqlId = `SELECT CATEGORY_ID FROM PS_CATEGORY_POST WHERE CATEGORY_NAME = :cateName`;
                const resId = await connection.execute(sqlId, { cateName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
                
                if (resId.rows.length > 0) {
                    const categoryId = resId.rows[0].CATEGORY_ID;
                    const sqlInsert = `
                        INSERT INTO PS_USER_PREF_POST (PREF_ID, USER_NO, CATEGORY_ID) 
                        VALUES (PS_USER_PREF_POST_SEQ.NEXTVAL, :userNo, :categoryId)
                    `;
                    await connection.execute(sqlInsert, { userNo, categoryId });
                }
            }
        }

        await connection.commit();
        res.json({ success: true, message: "선호 카테고리가 성공적으로 수정되었습니다." });

    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (e) {} }
        console.error("카테고리 수정 에러:", error.message);
        res.status(500).json({ success: false, message: "카테고리 수정 실패" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});


// ==========================================
// [GET] /photo : 카테고리 전체 목록 조회 (가나다순, '기타'는 맨 아래 고정)
// ==========================================
router.get('/photo', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const sql = `
            SELECT CATEGORY_ID, CATEGORY_NAME 
            FROM PS_CATEGORY_PHOTO 
            ORDER BY 
                CASE WHEN CATEGORY_NAME = '기타' THEN 2 ELSE 1 END,
                CATEGORY_NAME ASC
        `;
        
        const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({ success: true, categories: result.rows });

    } catch (error) {
        console.error("카테고리 조회 API 에러:", error);
        res.status(500).json({ success: false, message: "카테고리 목록을 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [GET] /post - 게시물 카테고리 목록 조회 (가나다순, '기타'는 맨 아래 고정)
// ==========================================
router.get('/post', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const sql = `
            SELECT CATEGORY_ID, CATEGORY_NAME 
            FROM PS_CATEGORY_POST 
            ORDER BY 
                CASE WHEN CATEGORY_NAME = '기타' THEN 2 ELSE 1 END,
                CATEGORY_NAME ASC
        `;
        
        const result = await connection.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({ success: true, categories: result.rows });

    } catch (error) {
        console.error("게시물 카테고리 조회 API 에러:", error);
        res.status(500).json({ success: false, message: "게시물 카테고리 목록을 불러오지 못했습니다." });
    } finally {
        if (connection) {
            try { 
                await connection.close(); 
            } catch (e) { 
                console.error(e); 
            }
        }
    }
});

module.exports = router;