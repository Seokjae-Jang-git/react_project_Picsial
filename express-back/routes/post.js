const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const SftpClient = require('ssh2-sftp-client'); 
const sharp = require('sharp'); 

// 로컬에 저장하지 않고 메모리 버퍼(Buffer)로 파일을 받도록 변경
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 1개당 10MB 제한
});

// ==========================================
// [GET] /post - 게시물 전체 목록 조회 
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        const { category, sort } = req.query;
        connection = await db.getConnection();

        const bindParams = {};

        let sql = `
            SELECT 
                P.POST_ID, P.USER_NO, P.TITLE, P.CONTENT, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                UI.NICKNAME, UI.PROFILE_IMAGE_URL,
                NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
                NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
                (
                    SELECT LISTAGG(C.CATEGORY_NAME, ', ') WITHIN GROUP (ORDER BY C.CATEGORY_NAME)
                    FROM PS_POST_CATEMAP PC
                    JOIN PS_CATEGORY_POST C ON PC.CATEGORY_ID = C.CATEGORY_ID
                    WHERE PC.POST_ID = P.POST_ID
                ) AS CATEGORIES,
                (
                    SELECT LISTAGG(T.TAG_NAME, ', ') WITHIN GROUP (ORDER BY T.TAG_NAME)
                    FROM PS_POST_TAGMAP TM
                    JOIN PS_TAG_POST T ON TM.TAG_ID = T.TAG_ID
                    WHERE TM.POST_ID = P.POST_ID
                ) AS TAGS,
                (
                    SELECT LISTAGG(IMG.THUMB_URL, ',') WITHIN GROUP (ORDER BY IMG.SORT_ORDER)
                    FROM PS_POST_IMAGE IMG
                    WHERE IMG.POST_ID = P.POST_ID
                ) AS ALL_THUMBS
            FROM PS_POST P
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY POST_ID) S ON P.POST_ID = S.POST_ID
            LEFT JOIN (SELECT POST_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY POST_ID) CM ON P.POST_ID = CM.POST_ID
            WHERE P.IS_PUBLIC = 'Y'
        `;

        if (category && category.trim() !== '' && category !== 'undefined') {
            const parsedCategory = Number(category);
            if (!isNaN(parsedCategory)) { 
                sql += ` AND EXISTS (
                    SELECT 1 FROM PS_POST_CATEMAP PC2 
                    WHERE PC2.POST_ID = P.POST_ID AND PC2.CATEGORY_ID = :category
                )`;
                bindParams.category = parsedCategory;
            }
        }

        if (sort === 'scraps') sql += ` ORDER BY SCRAP_COUNT DESC, P.POST_ID DESC`;
        else if (sort === 'comments') sql += ` ORDER BY COMMENT_COUNT DESC, P.POST_ID DESC`;
        else if (sort === 'likes') sql += ` ORDER BY P.LIKE_COUNT DESC, P.POST_ID DESC`;
        else if (sort === 'views') sql += ` ORDER BY P.VIEW_COUNT DESC, P.POST_ID DESC`;
        else if (sort === 'oldest') sql += ` ORDER BY P.POST_ID ASC`;
        else sql += ` ORDER BY P.POST_ID DESC`; 

        const result = await connection.execute(sql, bindParams, { 
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchInfo: { CONTENT: { type: oracledb.STRING } }
        });

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

            // 3. 최종 조립된 데이터를 반환
            return {
                ...post,
                PROFILE_IMAGE_URL: finalProfileUrl, // 완성된 주소로 덮어쓰기
                CATEGORIES: post.CATEGORIES ? post.CATEGORIES.split(', ') : [],
                TAGS: post.TAGS ? post.TAGS.split(', ') : [],
                THUMB_LIST: fullThumbUrls
            };
        });

        res.json({ success: true, posts: processedPosts });
    } catch (error) {
        console.error("게시물 목록 조회 에러:", error);
        res.status(500).json({ success: false, message: "게시물을 불러오지 못했습니다." });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
});

// ==========================================
// [GET] /post/:id - 게시물 상세 정보 및 상태 조회 (이미지 변수명 호환성 보장)
// ==========================================
router.get('/:id', async (req, res) => {
    let connection;
    try {
        const postId = req.params.id;
        const userNo = req.query.userNo ? Number(req.query.userNo) : 0; 
        connection = await db.getConnection();

        // 1. 조회수 증가
        await connection.execute(`UPDATE PS_POST SET VIEW_COUNT = VIEW_COUNT + 1 WHERE POST_ID = :postId`, { postId }, { autoCommit: true });

        // 2. 게시물 본문 데이터 조회
        const postSql = `
            SELECT 
                P.POST_ID, P.USER_NO, P.TITLE, P.CONTENT, P.VIEW_COUNT, P.LIKE_COUNT, P.CREATED_AT,
                UI.NICKNAME, UI.PROFILE_IMAGE_URL,
                (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE POST_ID = P.POST_ID) AS SCRAP_COUNT,
                (SELECT COUNT(*) FROM PS_COMMENT_TABLE WHERE POST_ID = P.POST_ID) AS COMMENT_COUNT,
                (SELECT COUNT(*) FROM PS_LIKE_TABLE WHERE POST_ID = P.POST_ID AND USER_NO = :userNo) AS IS_LIKED_BY_ME,
                (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE POST_ID = P.POST_ID AND USER_NO = :userNo) AS IS_SCRAPPED_BY_ME,
                (
                    SELECT LISTAGG(IMG.IMAGE_URL, ',') WITHIN GROUP (ORDER BY IMG.SORT_ORDER)
                    FROM PS_POST_IMAGE IMG
                    WHERE IMG.POST_ID = P.POST_ID
                ) AS ALL_IMAGES,
                (
                    SELECT LISTAGG(C.CATEGORY_NAME, ' / ') WITHIN GROUP (ORDER BY C.CATEGORY_NAME)
                    FROM PS_POST_CATEMAP PC
                    JOIN PS_CATEGORY_POST C ON PC.CATEGORY_ID = C.CATEGORY_ID
                    WHERE PC.POST_ID = P.POST_ID
                ) AS CATEGORIES,
                (
                    SELECT LISTAGG(T.TAG_NAME, ' / ') WITHIN GROUP (ORDER BY T.TAG_NAME)
                    FROM PS_POST_TAGMAP TM
                    JOIN PS_TAG_POST T ON TM.TAG_ID = T.TAG_ID
                    WHERE TM.POST_ID = P.POST_ID
                ) AS TAGS
            FROM PS_POST P
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            WHERE P.POST_ID = :postId
        `;

        const postResult = await connection.execute(postSql, { postId, userNo }, { 
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchInfo: { CONTENT: { type: oracledb.STRING } } 
        });

        if (postResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "게시물을 찾을 수 없습니다." });
        }

        const postData = postResult.rows[0];
        
        // 💡 [추가] 게시물 작성자의 프로필 이미지 URL 조립
        if (postData.PROFILE_IMAGE_URL && !postData.PROFILE_IMAGE_URL.startsWith('http')) {
            const profileBaseUrl = process.env.NAS_BASE_URL_PROFILE;
            if (profileBaseUrl) {
                postData.PROFILE_IMAGE_URL = `${profileBaseUrl}/${postData.PROFILE_IMAGE_URL}`;
            }
        }

        // 이미지 URL 결합 처리
        const imgList = postData.ALL_IMAGES ? postData.ALL_IMAGES.split(',') : [];
        const fullImageUrls = imgList.map(fileName => {
            if (fileName.startsWith('http')) return fileName;
            return `${process.env.NAS_BASE_URL_POS_IMG}/${fileName}`;
        });

        // 💡 [해결책] 프론트엔드가 어떤 이름으로 사진을 그리든 무조건 동작하게 양쪽 모두 바인딩합니다.
        postData.IMAGE_LIST = fullImageUrls;
        postData.THUMB_LIST = fullImageUrls;

        // 3. 댓글 데이터 조회
        const commentSql = `
            SELECT C.COMMENT_ID, C.USER_NO, C.CONTENT, C.CREATED_AT, UI.NICKNAME
            FROM PS_COMMENT_TABLE C
            LEFT JOIN PS_USER_INFO UI ON C.USER_NO = UI.USER_NO
            WHERE C.POST_ID = :postId
            ORDER BY C.CREATED_AT DESC
        `;
        const commentResult = await connection.execute(commentSql, { postId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 4. 첨부파일 데이터 조회 및 NAS 다운로드 URL 조립
        const fileSql = `
            SELECT FILE_ID, FILE_URL, ORIGINAL_NAME, FILE_SIZE, SORT_ORDER
            FROM PS_POST_FILE
            WHERE POST_ID = :postId
            ORDER BY SORT_ORDER ASC
        `;
        const fileResult = await connection.execute(fileSql, { postId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        const processedAttachments = fileResult.rows.map(file => ({
            fileId: file.FILE_ID,
            originalName: file.ORIGINAL_NAME,
            fileSize: file.FILE_SIZE,
            sortOrder: file.SORT_ORDER,
            downloadUrl: `${process.env.NAS_BASE_URL_POS_ATTCH}/${file.FILE_URL}`
        }));

        res.json({ 
            success: true, 
            post: postData, 
            comments: commentResult.rows, 
            attachments: processedAttachments
        });

    } catch (error) {
        console.error("게시물 상세 조회 에러:", error);
        res.status(500).json({ success: false, message: "상세 정보를 불러오는 중 에러가 발생했습니다." });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
});

// ==========================================
// [POST] /post/:id/like - 좋아요 토글 
// ==========================================
router.post('/:id/like', async (req, res) => {
    let connection;
    try {
        const postId = req.params.id;
        const { isLiked, userNo = 1 } = req.body; 
        connection = await db.getConnection();

        if (isLiked) {
            await connection.execute(
                `INSERT INTO PS_LIKE_TABLE (LIKE_ID, USER_NO, POST_ID, CREATED_AT) VALUES (PS_LIKE_TABLE_SEQ.NEXTVAL, :userNo, :postId, SYSDATE)`,
                { userNo, postId }, { autoCommit: false }
            );
            await connection.execute(`UPDATE PS_POST SET LIKE_COUNT = LIKE_COUNT + 1 WHERE POST_ID = :postId`, { postId }, { autoCommit: false });
        } else {
            await connection.execute(
                `DELETE FROM PS_LIKE_TABLE WHERE USER_NO = :userNo AND POST_ID = :postId`,
                { userNo, postId }, { autoCommit: false }
            );
            await connection.execute(`UPDATE PS_POST SET LIKE_COUNT = GREATEST(LIKE_COUNT - 1, 0) WHERE POST_ID = :postId`, { postId }, { autoCommit: false });
        }
        
        await connection.commit(); 
        res.json({ success: true });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("좋아요 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /post/:id/scrap - 스크랩 토글
// ==========================================
router.post('/:id/scrap', async (req, res) => {
    let connection;
    try {
        const postId = req.params.id;
        const { isScrapped, userNo = 1 } = req.body;
        connection = await db.getConnection();

        if (isScrapped) {
            await connection.execute(
                `INSERT INTO PS_SCRAP_TABLE (SCRAP_ID, USER_NO, POST_ID, CREATED_AT) VALUES (PS_SCRAP_TABLE_SEQ.NEXTVAL, :userNo, :postId, SYSDATE)`,
                { userNo, postId }, { autoCommit: true }
            );
        } else {
            await connection.execute(
                `DELETE FROM PS_SCRAP_TABLE WHERE USER_NO = :userNo AND POST_ID = :postId`,
                { userNo, postId }, { autoCommit: true }
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error("스크랩 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /post/:id/comment - 댓글 등록
// ==========================================
router.post('/:id/comment', async (req, res) => {
    let connection;
    try {
        const postId = req.params.id;
        const { content, userNo = 1 } = req.body;
        connection = await db.getConnection();

        await connection.execute(
            `INSERT INTO PS_COMMENT_TABLE (COMMENT_ID, USER_NO, POST_ID, CONTENT) 
             VALUES (PS_COMMENT_TABLE_SEQ.NEXTVAL, :userNo, :postId, :content)`,
            { userNo, postId, content },
            { autoCommit: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error("댓글 등록 에러:", error);
        res.status(500).json({ success: false, message: "댓글 등록에 실패했습니다." });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /post/upload - 게시물 전체 업로드 
// ==========================================
router.post('/upload', upload.fields([
    { name: 'images', maxCount: 3 },
    { name: 'attachments', maxCount: 3 }
]), async (req, res) => {
    let connection;    
    let sftp = null;   
    
    try {
        connection = await db.getConnection();
        
        sftp = new SftpClient();
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: Number(process.env.SFTP_PORT),
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        const userNo = Number(req.body.userNo);
        const title = req.body.title;
        const content = req.body.content;
        const isPublic = req.body.isPublic || 'Y';
        
        const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        await sftp.mkdir('/picsial_images/post/image/', true);
        await sftp.mkdir('/picsial_images/post/attachment/', true);

        const insertPostSql = `
            INSERT INTO PS_POST (POST_ID, USER_NO, TITLE, CONTENT, VIEW_COUNT, LIKE_COUNT, IS_PUBLIC)
            VALUES (PS_POST_SEQ.NEXTVAL, :userNo, :title, :content, 0, 0, :isPublic)
            RETURNING POST_ID INTO :newPostId
        `;
        const postResult = await connection.execute(insertPostSql, {
            userNo, title, content, isPublic,
            newPostId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: false });
        
        const newPostId = postResult.outBinds.newPostId[0];

        // ==========================================
        // 1. 이미지 파일 처리 영역
        // ==========================================
        if (req.files['images'] && req.files['images'].length > 0) {
            const images = req.files['images'];
            for (let i = 0; i < images.length; i++) {
                const file = images[i];
                
                // 💡 한글 파일명 깨짐 방지 처리를 가장 상단에서 진행합니다.
                const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(originalName);
                
                const saveFileName = `image-${uniqueSuffix}${ext}`;
                const thumbFileName = `thumb_${saveFileName}`;
                
                const remotePath = `/picsial_images/post/image/${saveFileName}`;
                const thumbRemotePath = `/picsial_images/post/image/${thumbFileName}`;

                await sftp.put(file.buffer, remotePath, { mode: 0o644 });

                const thumbBuffer = await sharp(file.buffer)
                    .resize({ width: 500 })
                    .toBuffer();

                await sftp.put(thumbBuffer, thumbRemotePath, { mode: 0o644 });

                // 🚀 약속대로 CREATED_AT 및 SYSDATE 제외
                const imgSql = `
                    INSERT INTO PS_POST_IMAGE (IMAGE_ID, POST_ID, IMAGE_URL, THUMB_URL, SORT_ORDER)
                    VALUES (PS_POST_IMAGE_SEQ.NEXTVAL, :postId, :imgUrl, :thumbUrl, :sortOrder)
                `;
                await connection.execute(imgSql, { 
                    postId: newPostId, 
                    imgUrl: saveFileName,
                    thumbUrl: thumbFileName,
                    sortOrder: i + 1 
                });
            }
        }

        // ==========================================
        // 2. 첨부파일 처리 영역
        // ==========================================
        if (req.files['attachments'] && req.files['attachments'].length > 0) {
            const files = req.files['attachments'];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // 💡 한글 파일명 깨짐 방지 처리를 가장 상단에서 진행하여 변수 에러를 막습니다.
                const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(originalName);
                
                const saveFileName = `attach-${uniqueSuffix}${ext}`;
                const remotePath = `/picsial_images/post/attachment/${saveFileName}`;

                await sftp.put(file.buffer, remotePath, { mode: 0o644 });

                const fileSize = file.size;

                // 🚀 약속대로 CREATED_AT 및 SYSDATE 제외
                const fileSql = `
                    INSERT INTO PS_POST_FILE (FILE_ID, POST_ID, FILE_URL, ORIGINAL_NAME, FILE_SIZE, SORT_ORDER)
                    VALUES (PS_POST_FILE_SEQ.NEXTVAL, :postId, :fileUrl, :originalName, :fileSize, :sortOrder)
                `;
                
                // 여기서 originalName이 정상적으로 바인딩됩니다.
                await connection.execute(fileSql, { 
                    postId: newPostId, 
                    fileUrl: saveFileName,
                    originalName: originalName, 
                    fileSize, 
                    sortOrder: i + 1 
                });
            }
        }

        if (categories && categories.length > 0) {
            for (const categoryId of categories) {
                const cateMapSql = `INSERT INTO PS_POST_CATEMAP (MAPPING_ID, POST_ID, CATEGORY_ID) VALUES (PS_POST_CATEMAP_SEQ.NEXTVAL, :postId, :categoryId)`;
                await connection.execute(cateMapSql, { postId: newPostId, categoryId: Number(categoryId) });
            }
        }

        if (tags && tags.length > 0) {
            for (const tagName of tags) {
                let tagId;
                const checkTagSql = `SELECT TAG_ID FROM PS_TAG_POST WHERE TAG_NAME = :tagName`;
                const tagResult = await connection.execute(checkTagSql, { tagName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

                if (tagResult.rows.length > 0) {
                    tagId = tagResult.rows[0].TAG_ID;
                } else {
                    const insertTagSql = `INSERT INTO PS_TAG_POST (TAG_ID, TAG_NAME) VALUES (PS_TAG_POST_SEQ.NEXTVAL, :tagName) RETURNING TAG_ID INTO :newTagId`;
                    const newTagResult = await connection.execute(insertTagSql, { tagName, newTagId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } });
                    tagId = newTagResult.outBinds.newTagId[0];
                }

                const insertTagMapSql = `INSERT INTO PS_POST_TAGMAP (MAPPING_ID, POST_ID, TAG_ID) VALUES (PS_POST_TAGMAP_SEQ.NEXTVAL, :postId, :tagId)`;
                await connection.execute(insertTagMapSql, { postId: newPostId, tagId: tagId });
            }
        }

        await connection.commit();
        res.json({ success: true, message: "게시물이 성공적으로 업로드되었습니다.", postId: newPostId });

    } catch (error) {
        console.error("게시물 업로드 에러:", error);
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error("롤백 실패:", e); }
        }
        res.status(500).json({ success: false, message: "게시물 업로드 중 에러가 발생했습니다." });
    } finally {
        if (sftp) {
            try { await sftp.end(); console.log("NAS SFTP 커넥션 정상 닫힘"); } catch (e) { console.error(e); }
        }
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;