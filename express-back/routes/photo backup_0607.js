// routes/photo.js
const express = require('express');
const router = express.Router();
const SftpClient = require('ssh2-sftp-client');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const db = require('../db');
const oracledb = require('oracledb');

const upload = multer({ storage: multer.memoryStorage() });

// [함수] SFTP NAS 파일 전송 
async function uploadToNAS(fileBuffer, thumbBuffer, originalFileName, thumbFileName) {
    const sftp = new SftpClient();
    const originalRemotePath = `${process.env.NAS_ROOT_PATH}/${originalFileName}`;
    const thumbRemotePath = `${process.env.NAS_ROOT_PATH}${thumbFileName}`;
    
    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: Number(process.env.SFTP_PORT),
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });
        
        await Promise.all([
            sftp.put(fileBuffer, originalRemotePath),
            sftp.put(thumbBuffer, thumbRemotePath)
        ]);
        
        return { originalFileName, thumbFileName }; 
    } catch (err) {
        console.error('SFTP 업로드 실패:', err);
        throw err;
    } finally {
        await sftp.end();
    }
}

// ==========================================
// [POST] /photo/upload-bulk - 다중 사진 업로드 및 데이터 저장 (태그, 카테고리 포함)
// ==========================================
// 💡 주의: upload.array('files', 20)을 사용하여 최대 20장까지 배열로 받습니다.
router.post('/upload-bulk', upload.array('files', 20), async (req, res) => {
    let connection;
    try {
        const files = req.files;
        // 프론트에서 JSON.stringify()로 묶어서 보낸 데이터를 다시 배열 객체로 풉니다.
        const itemsData = JSON.parse(req.body.itemsData); 
        const { uploadType, userNo } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: '파일이 없습니다.' });
        }
        if (files.length !== itemsData.length) {
            return res.status(400).json({ success: false, message: '파일과 데이터의 개수가 일치하지 않습니다.' });
        }

        connection = await db.getConnection();
        // 💡 오라클은 기본적으로 Auto-Commit이 false이므로, 모든 작업이 끝나고 commit()을 해야 반영됩니다.

        // 각 파일과 데이터를 순회하며 순차적으로 처리합니다.
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = itemsData[i];

            // 1. 이미지 리사이징 및 NAS 업로드 (기존 uploadToNAS 함수 재사용)
            const ext = path.extname(file.originalname);
            const baseName = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
            const originalFileName = `${baseName}${ext}`;
            const thumbFileName = `thumb_${baseName}.webp`;

            const thumbBuffer = await sharp(file.buffer)
                .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // NAS 서버로 파일 전송 (SFTP)
            await uploadToNAS(file.buffer, thumbBuffer, originalFileName, thumbFileName);

            // 2. PS_PHOTO 테이블에 데이터 INSERT (공개여부 포함)
            const insertPhotoSql = `
                INSERT INTO PS_PHOTO (
                    PHOTO_ID, USER_NO, TITLE, DESCRIPTION, IMAGE_URL, THUMB_URL,
                    CAMERA_MODEL, LENS, FOCAL_LENGTH, APERTURE, SHUTTER_SPEED, ISO, LOCATION, IS_PUBLIC
                ) VALUES (
                    PS_PHOTO_SEQ.NEXTVAL, :userNo, :title, :description, :imageName, :thumbName,
                    :model, :lens, :focal, :aperture, :shutter, :iso, :location, :isPublic
                )
                RETURNING PHOTO_ID INTO :newPhotoId
            `;
            
            const photoResult = await connection.execute(insertPhotoSql, {
                userNo: userNo || 1, 
                title: data.title || '제목 없음',
                description: data.description || '',
                imageName: originalFileName,
                thumbName: thumbFileName,
                model: data.meta?.Model || null,
                lens: data.meta?.LensModel || null,
                focal: data.meta?.FocalLength ? String(data.meta.FocalLength) : null,
                aperture: data.meta?.FNumber ? String(data.meta.FNumber) : null,
                shutter: data.meta?.ExposureTime ? String(data.meta.ExposureTime) : null,
                iso: data.meta?.ISO ? String(data.meta.ISO) : null,
                location: data.location || null,
                isPublic: data.isPublic || 'Y', // 기본값 공개
                newPhotoId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            });

            // 생성된 사진 ID 가져오기
            const generatedPhotoId = photoResult.outBinds.newPhotoId[0];

            // 3. 카테고리 저장 (선택한 경우만)
            if (data.categoryId) {
                const insertCatSql = `
                    INSERT INTO PS_PHOTO_CATEMAP (MAPPING_ID, PHOTO_ID, CATEGORY_ID) 
                    VALUES (PS_PHOTO_CATEMAP_SEQ.NEXTVAL, :photoId, :categoryId)
                `;
                await connection.execute(insertCatSql, { 
                    photoId: generatedPhotoId, 
                    categoryId: Number(data.categoryId) 
                });
            }

            // 4. 태그 저장 및 매핑 (핵심 로직)
            if (data.tags && data.tags.length > 0) {
                for (const tagName of data.tags) {
                    let tagId;
                    
                    // 4-1. 태그가 이미 PS_TAG 테이블에 있는지 검사
                    const checkTagSql = `SELECT TAG_ID FROM PS_TAG_PHOTO WHERE TAG_NAME = :tagName`;
                    const tagResult = await connection.execute(checkTagSql, { tagName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

                    if (tagResult.rows.length > 0) {
                        // 이미 있는 태그면 ID만 가져옴
                        tagId = tagResult.rows[0].TAG_ID;
                    } else {
                        // 4-2. 없는 태그면 새로 INSERT 하고 ID를 반환받음
                        const insertTagSql = `
                            INSERT INTO PS_TAG_PHOTO (TAG_ID, TAG_NAME)
                            VALUES (PS_TAG_PHOTO_SEQ.NEXTVAL, :tagName)
                            RETURNING TAG_ID INTO :newTagId
                        `;
                        const newTagResult = await connection.execute(insertTagSql, {
                            tagName: tagName,
                            newTagId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
                        });
                        tagId = newTagResult.outBinds.newTagId[0];
                    }

                    // 4-3. 사진 ID와 태그 ID를 연결하는 매핑 테이블(PS_CONTENT_TAG)에 INSERT
                    const insertContentTagSql = `
                        INSERT INTO PS_PHOTO_TAGMAP (MAPPING_ID, TAG_ID, PHOTO_ID)
                        VALUES (PS_PHOTO_TAGMAP_SEQ.NEXTVAL, :tagId, :photoId)
                    `;
                    await connection.execute(insertContentTagSql, { tagId: tagId, photoId: generatedPhotoId });
                }
            }
        } // for 루프 끝 (모든 사진 처리 완료)

        // 5. 💡 모든 작업이 에러 없이 끝났다면 완전 승인 (Commit)
        await connection.commit();
        res.status(200).json({ success: true, message: '업로드가 완료되었습니다.' });

    } catch (error) {
        console.error("다중 업로드 에러:", error);
        // 💡 중간에 하나라도 에러가 나면 롤백하여 DB 쓰레기 데이터 방지
        if (connection) {
            try { 
                await connection.rollback(); 
                console.log("트랜잭션 롤백 완료");
            } catch (e) { 
                console.error("롤백 실패:", e); 
            }
        }
        res.status(500).json({ success: false, message: "서버 처리 중 오류가 발생했습니다." });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [GET] /photo - 사진 전체 목록 조회 (중복 버그 완벽 수선 버전)
// ==========================================
router.get('/', async (req, res) => {
    let connection;
    try {
        const { category, sort } = req.query;
        connection = await db.getConnection();

        const bindParams = {};

        // 💡 1. 기본 SELECT 구문 (LISTAGG 서브쿼리로 중복 원천 차단)
        // - 기존 메인 쿼리의 LEFT JOIN PC, LEFT JOIN C를 과감하게 제거합니다.
        // - 대신 한 사진이 여러 카테고리를 가질 경우 '풍경, 명소' 형태로 한 줄로 묶어 가져옵니다.
        let sql = `
            // SELECT 
            //     P.PHOTO_ID, P.USER_NO, P.TITLE, P.IMAGE_URL, P.THUMB_URL, P.VIEW_COUNT, P.LIKE_COUNT,
            //     NVL(S.SCRAP_COUNT, 0) AS SCRAP_COUNT,
            //     NVL(CM.COMMENT_COUNT, 0) AS COMMENT_COUNT,
            //     (
            //         SELECT LISTAGG(C.CATEGORY_NAME, ', ') WITHIN GROUP (ORDER BY C.CATEGORY_NAME)
            //         FROM PS_PHOTO_CATEMAP PC
            //         JOIN PS_CATEGORY_PHOTO C ON PC.CATEGORY_ID = C.CATEGORY_ID
            //         WHERE PC.PHOTO_ID = P.PHOTO_ID
            //     ) AS CATEGORY_NAME
            // FROM PS_PHOTO P
            // -- 미리 그룹핑해서 개수를 세어두고 한 번만 조인합니다
            // LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS SCRAP_COUNT FROM PS_SCRAP_TABLE GROUP BY PHOTO_ID) S ON P.PHOTO_ID = S.PHOTO_ID
            // LEFT JOIN (SELECT PHOTO_ID, COUNT(*) AS COMMENT_COUNT FROM PS_COMMENT_TABLE GROUP BY PHOTO_ID) CM ON P.PHOTO_ID = CM.PHOTO_ID
            // WHERE 1=1
            SELECT 
                P.PHOTO_ID, P.USER_NO, P.TITLE, P.DESCRIPTION, P.IMAGE_URL, P.THUMB_URL, 
                P.CAMERA_MODEL, P.LENS, P.FOCAL_LENGTH, P.APERTURE, P.SHUTTER_SPEED, 
                P.ISO, P.SHOOT_DATE, P.LOCATION, P.VIEW_COUNT, P.LIKE_COUNT,
                (
                    SELECT LISTAGG(C.CATEGORY_NAME, ', ') WITHIN GROUP (ORDER BY C.CATEGORY_NAME)
                    FROM PS_PHOTO_CATEMAP PC
                    JOIN PS_CATEGORY_PHOTO C ON PC.CATEGORY_ID = C.CATEGORY_ID
                    WHERE PC.PHOTO_ID = P.PHOTO_ID
                ) AS CATEGORY_NAME,
                (
                    -- 💡 태그 매핑 테이블과 태그 마스터 테이블을 조인하여 쉼표로 나열합니다.
                    -- ※ 실제 DB의 태그 테이블명(예: PS_PHOTO_TAGMAP, PS_TAG)에 맞게 이름을 수정해 주세요!
                    SELECT LISTAGG(T.TAG_NAME, ', ') WITHIN GROUP (ORDER BY T.TAG_NAME)
                    FROM PS_PHOTO_TAGMAP PT
                    JOIN PS_TAG T ON PT.TAG_ID = T.TAG_ID
                    WHERE PT.PHOTO_ID = P.PHOTO_ID
                ) AS TAGS
            FROM PS_PHOTO P
            WHERE P.PHOTO_ID = :id
        `;

        // 💡 2. 카테고리 필터링 적용 (IN 서브쿼리를 사용하여 데이터 뻥튀기 방지)
        if (category && category.trim() !== '' && category !== 'undefined') {
            const parsedCategory = Number(category);
            if (!isNaN(parsedCategory)) { 
                // 해당 카테고리 ID를 가진 사진 번호들만 IN 조건으로 걸러내므로 중복이 발생하지 않습니다.
                sql += ` AND P.PHOTO_ID IN (SELECT PHOTO_ID FROM PS_PHOTO_CATEMAP WHERE CATEGORY_ID = :category)`;
                bindParams.category = parsedCategory;
            }
        }

        // 💡 3. 동적 정렬 (Sort) 적용
        if (sort === 'scraps') {
            sql += ` ORDER BY SCRAP_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'comments') {
            sql += ` ORDER BY COMMENT_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'likes') {
            sql += ` ORDER BY P.LIKE_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'views') {
            sql += ` ORDER BY P.VIEW_COUNT DESC, P.PHOTO_ID DESC`;
        } else if (sort === 'oldest') {
            sql += ` ORDER BY P.PHOTO_ID ASC`;
        } else {
            // 기본값: 최신순
            sql += ` ORDER BY P.PHOTO_ID DESC`;
        }

        const result = await connection.execute(sql, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // NAS URL 방어 코드
        const processedPhotos = result.rows.map(photo => ({
            ...photo,
            IMAGE_URL: photo.IMAGE_URL && photo.IMAGE_URL.startsWith('http') 
                ? photo.IMAGE_URL 
                : `${process.env.NAS_BASE_URL}/${photo.IMAGE_URL}`,
            THUMB_URL: photo.THUMB_URL && photo.THUMB_URL.startsWith('http')
                ? photo.THUMB_URL 
                : `${process.env.NAS_BASE_URL}/${photo.THUMB_URL}`
        }));

        res.json({ success: true, photos: processedPhotos });
    } catch (error) {
        console.error("목록 조회 및 정렬 에러:", error);
        res.status(500).json({ success: false, message: "불러오기 실패" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [GET] /photo/:id - 사진 상세 및 댓글 목록 조회
// ==========================================
router.get('/:id', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    try {
        // 💡 프론트에서 넘어온 userNo 받기 (없으면 0)
        const userNo = req.query.userNo ? Number(req.query.userNo) : 0;
        
        connection = await db.getConnection();

        // 💡 0. 조회수 증가 (가장 먼저 실행)
        await connection.execute(`UPDATE PS_PHOTO SET VIEW_COUNT = VIEW_COUNT + 1 WHERE PHOTO_ID = :photoId`, { photoId }, { autoCommit: true });

        // 💡 IS_LIKED_BY_ME, IS_SCRAPPED_BY_ME 서브쿼리 추가 (PHOTO_ID 기준)
        const photoSql = `
            SELECT 
                P.*, UI.NICKNAME,
                (SELECT COUNT(*) FROM PS_LIKE_TABLE WHERE PHOTO_ID = P.PHOTO_ID AND USER_NO = :userNo) AS IS_LIKED_BY_ME,
                (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE PHOTO_ID = P.PHOTO_ID AND USER_NO = :userNo) AS IS_SCRAPPED_BY_ME,
                (SELECT COUNT(*) FROM PS_SCRAP_TABLE WHERE PHOTO_ID = P.PHOTO_ID) AS SCRAP_COUNT
            FROM PS_PHOTO P
            LEFT JOIN PS_USER_INFO UI ON P.USER_NO = UI.USER_NO
            WHERE P.PHOTO_ID = :photoId
        `;

        const photoResult = await connection.execute(photoSql, { photoId, userNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (photoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "사진을 찾을 수 없습니다." });
        }

        // 💡 [수정] 아래 4줄을 추가하여 URL을 가공합니다.
        const photoData = photoResult.rows[0];
        photoData.IMAGE_URL = photoData.IMAGE_URL && photoData.IMAGE_URL.startsWith('http') ? photoData.IMAGE_URL : `${process.env.NAS_BASE_URL}/${photoData.IMAGE_URL}`;
        photoData.THUMB_URL = photoData.THUMB_URL && photoData.THUMB_URL.startsWith('http') ? photoData.THUMB_URL : `${process.env.NAS_BASE_URL}/${photoData.THUMB_URL}`;

        // 2. 해당 사진의 댓글 목록 조회
        const commentSql = `
            SELECT COMMENT_ID, USER_NO, CONTENT, TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI') AS CREATED_AT
            FROM PS_COMMENT_TABLE
            WHERE PHOTO_ID = :id
            ORDER BY COMMENT_ID DESC
        `;
        const commentResult = await connection.execute(commentSql, { id: photoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 3. 응답 전송
        res.json({ 
            success: true, 
            photo: photoData, 
            comments: commentResult.rows 
        });

    } catch (error) {
        console.error("상세 조회 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /photo/:id/like - 좋아요 토글
// ==========================================
router.post('/:id/like', async (req, res) => {
    let connection;
    try {
        const photoId = req.params.id;
        const { isLiked, userNo } = req.body; 
        connection = await db.getConnection();

        if (isLiked) {
            // 💡 사진 좋아요: POST_ID는 NULL(기본값 또는 생략) 처리하고 PHOTO_ID에 값을 넣습니다.
            await connection.execute(
                `INSERT INTO PS_LIKE_TABLE (LIKE_ID, USER_NO, PHOTO_ID, CREATED_AT) VALUES (PS_LIKE_TABLE_SEQ.NEXTVAL, :userNo, :photoId, SYSDATE)`,
                { userNo, photoId }, { autoCommit: false }
            );
            await connection.execute(`UPDATE PS_PHOTO SET LIKE_COUNT = LIKE_COUNT + 1 WHERE PHOTO_ID = :photoId`, { photoId }, { autoCommit: false });
        } else {
            // 💡 좋아요 취소
            await connection.execute(
                `DELETE FROM PS_LIKE_TABLE WHERE USER_NO = :userNo AND PHOTO_ID = :photoId`,
                { userNo, photoId }, { autoCommit: false }
            );
            await connection.execute(`UPDATE PS_PHOTO SET LIKE_COUNT = GREATEST(LIKE_COUNT - 1, 0) WHERE PHOTO_ID = :photoId`, { photoId }, { autoCommit: false });
        }
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("사진 좋아요 처리 에러:", error);
        res.status(500).json({ success: false });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
});

// ==========================================
// [POST] /photo/:id/scrap - 스크랩 토글 처리
// ==========================================
router.post('/:id/scrap', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    // 프론트에서 isScrapped(채울지 말지)와 유저번호를 받습니다.
    const { isScrapped, userNo } = req.body; 

    try {
        connection = await db.getConnection();
        
        if (isScrapped) {
            // 💡 스크랩 설정: PS_SCRAP_TABLE에 새로운 레코드 INSERT
            const insertSql = `
                INSERT INTO PS_SCRAP_TABLE (SCRAP_ID, USER_NO, PHOTO_ID)
                VALUES (PS_SCRAP_TABLE_SEQ.NEXTVAL, :userNo, :photoId)
            `;
            await connection.execute(insertSql, { userNo: userNo || 1, photoId: photoId });
        } else {
            // 💡 스크랩 취소: PS_SCRAP_TABLE에서 해당 레코드 DELETE
            const deleteSql = `
                DELETE FROM PS_SCRAP_TABLE 
                WHERE USER_NO = :userNo AND PHOTO_ID = :photoId
            `;
            await connection.execute(deleteSql, { userNo: userNo || 1, photoId: photoId });
        }

        await connection.commit();
        res.json({ success: true, message: "스크랩 업데이트 완료" });
    } catch (error) {
        console.error("스크랩 업데이트 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// ==========================================
// [POST] /photo/:id/comment - 댓글 등록 API (신규 추가)
// ==========================================
router.post('/:id/comment', async (req, res) => {
    let connection;
    const photoId = req.params.id;
    const { content, userNo } = req.body; // 프론트에서 보낸 댓글 내용과 유저 번호

    if (!content || content.trim() === '') {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
    }

    try {
        connection = await db.getConnection();

        // 💡 질문자님이 설계하신 시퀀스를 사용하여 댓글 INSERT
        const insertSql = `
            INSERT INTO PS_COMMENT_TABLE (COMMENT_ID, USER_NO, PHOTO_ID, CONTENT)
            VALUES (PS_COMMENT_TABLE_SEQ.NEXTVAL, :userNo, :photoId, :content)
        `;
        
        await connection.execute(insertSql, {
            userNo: userNo || 1, // 로그인 연동 전까지는 1번 유저로 테스트
            photoId: photoId,
            content: content
        });

        await connection.commit();
        res.json({ success: true, message: "댓글이 성공적으로 등록되었습니다." });

    } catch (error) {
        console.error("댓글 등록 에러:", error);
        res.status(500).json({ success: false, message: "서버 오류" });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

module.exports = router;