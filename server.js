/* =========================================================
   LEARNING T-MAP จอมพระ
   SERVER V4 - RENDER / ROOT FRONTEND VERSION
   ========================================================= */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

/* =========================================================
   PORT
   ========================================================= */

const PORT = process.env.PORT || 3000;

/* =========================================================
   PATHS
   ========================================================= */

const ROOT = __dirname;

const DATA_DIR = path.join(
  ROOT,
  "data"
);

const UPLOAD_DIR = path.join(
  ROOT,
  "uploads"
);

const DB_FILE = path.join(
  DATA_DIR,
  "places.json"
);

const BACKUP_DIR = path.join(
  DATA_DIR,
  "backup"
);

/* =========================================================
   CREATE DIRECTORIES
   ========================================================= */

for (const dir of [
  DATA_DIR,
  UPLOAD_DIR,
  BACKUP_DIR
]) {
  fs.mkdirSync(
    dir,
    {
      recursive: true
    }
  );
}

/* =========================================================
   DATABASE
   ========================================================= */

/*
  IMPORTANT

  - ไม่สร้างข้อมูลตัวอย่าง
  - ไม่เขียนทับ places.json เดิม
  - ถ้าไม่มีไฟล์ ให้สร้างเป็น []
*/

function ensureDatabase() {

  if (
    !fs.existsSync(
      DB_FILE
    )
  ) {

    fs.writeFileSync(
      DB_FILE,
      "[]",
      "utf8"
    );

    console.log(
      "สร้าง places.json ใหม่เป็นข้อมูลว่าง"
    );

  }

}

ensureDatabase();

/* =========================================================
   READ DATABASE
   ========================================================= */

function readDatabase() {

  try {

    const raw =
      fs.readFileSync(
        DB_FILE,
        "utf8"
      );

    if (
      !raw.trim()
    ) {
      return [];
    }

    const data =
      JSON.parse(
        raw
      );

    if (
      !Array.isArray(
        data
      )
    ) {

      console.error(
        "places.json ต้องเป็น Array"
      );

      return [];

    }

    return data;

  } catch (error) {

    console.error(
      "อ่าน places.json ไม่สำเร็จ:",
      error.message
    );

    return [];

  }

}

/* =========================================================
   BACKUP DATABASE
   ========================================================= */

function backupDatabase() {

  if (
    !fs.existsSync(
      DB_FILE
    )
  ) {
    return;
  }

  try {

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );

    const backupFile =
      path.join(
        BACKUP_DIR,
        `places-${timestamp}.json`
      );

    fs.copyFileSync(
      DB_FILE,
      backupFile
    );

    console.log(
      `สำรองข้อมูลแล้ว: ${path.basename(backupFile)}`
    );

  } catch (error) {

    console.error(
      "สำรองข้อมูลไม่สำเร็จ:",
      error.message
    );

  }

}

/* =========================================================
   WRITE DATABASE SAFELY
   ========================================================= */

function writeDatabase(
  data
) {

  if (
    !Array.isArray(
      data
    )
  ) {

    throw new Error(
      "ข้อมูลที่จะบันทึกต้องเป็น Array"
    );

  }

  /* สำรองข้อมูลก่อนเขียน */
  backupDatabase();

  const tempFile =
    `${DB_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    tempFile,
    DB_FILE
  );

  console.log(
    `บันทึกข้อมูลแล้ว ${data.length} รายการ`
  );

}

/* =========================================================
   HELPERS
   ========================================================= */

function clean(
  value
) {

  return String(
    value ?? ""
  ).trim();

}

function toNumberOrNull(
  value
) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return null;

  }

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;

}

/* =========================================================
   MULTER - IMAGE UPLOAD
   ========================================================= */

const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(
          null,
          UPLOAD_DIR
        );

      },

    filename:
      (req, file, cb) => {

        const ext =
          path.extname(
            file.originalname
          ).toLowerCase();

        const filename =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}${ext}`;

        cb(
          null,
          filename
        );

      }

  });

const upload =
  multer({

    storage,

    limits: {

      fileSize:
        8 * 1024 * 1024

    },

    fileFilter:
      (req, file, cb) => {

        const allowed =
          /^image\/(jpeg|png|webp|gif)$/i;

        if (
          allowed.test(
            file.mimetype
          )
        ) {

          cb(
            null,
            true
          );

        } else {

          cb(
            new Error(
              "รองรับเฉพาะ JPG, PNG, WEBP และ GIF"
            )
          );

        }

      }

  });

/* =========================================================
   EXPRESS MIDDLEWARE
   ========================================================= */

app.use(
  cors()
);

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

/* =========================================================
   UPLOADS
   ========================================================= */

app.use(
  "/uploads",
  express.static(
    UPLOAD_DIR
  )
);

/* =========================================================
   FRONTEND
   ========================================================= */

/*
  สำคัญมาก

  ไฟล์ index.html / admin.html / app.js / style.css
  อยู่ที่ ROOT ของโปรเจกต์

  ไม่ได้อยู่ใน public/

  ดังนั้นต้องใช้ ROOT ตรงนี้
*/

app.use(
  express.static(
    ROOT
  )
);

/* =========================================================
   API META
   ========================================================= */

app.get(
  "/api/meta",
  (req, res) => {

    const places =
      readDatabase();

    const districts =
      [
        ...new Set(
          places
            .map(
              item =>
                clean(
                  item.district
                )
            )
            .filter(Boolean)
        )
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "th"
          )
      );

    const categories =
      [
        ...new Set(
          places
            .map(
              item =>
                clean(
                  item.category
                )
            )
            .filter(Boolean)
        )
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "th"
          )
      );

    res.json({

      districts,

      categories,

      count:
        places.length

    });

  }
);

/* =========================================================
   GET ALL PLACES
   ========================================================= */

app.get(
  "/api/places",
  (req, res) => {

    let places =
      readDatabase();

    const q =
      clean(
        req.query.q
      ).toLowerCase();

    const district =
      clean(
        req.query.district
      );

    const category =
      clean(
        req.query.category
      );

    /* -----------------------------------------------------
       SEARCH
       ----------------------------------------------------- */

    if (q) {

      places =
        places.filter(
          item => {

            const searchable =
              [
                item.name,
                item.district,
                item.category,
                item.description,
                item.village,
                item.contactName,
                item.phone
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              q
            );

          }
        );

    }

    /* -----------------------------------------------------
       DISTRICT FILTER
       ----------------------------------------------------- */

    if (district) {

      places =
        places.filter(
          item =>
            String(
              item.district ?? ""
            ) === district
        );

    }

    /* -----------------------------------------------------
       CATEGORY FILTER
       ----------------------------------------------------- */

    if (category) {

      places =
        places.filter(
          item =>
            String(
              item.category ?? ""
            ) === category
        );

    }

    console.log(
      `GET /api/places -> ${places.length} รายการ`
    );

    res.json(
      places
    );

  }
);

/* =========================================================
   GET ONE PLACE
   ========================================================= */

app.get(
  "/api/places/:id",
  (req, res) => {

    const id =
      Number(
        req.params.id
      );

    const places =
      readDatabase();

    const item =
      places.find(
        place =>
          Number(
            place.id
          ) === id
      );

    if (!item) {

      return res
        .status(404)
        .json({
          error:
            "ไม่พบข้อมูล"
        });

    }

    res.json(
      item
    );

  }
);

/* =========================================================
   BUILD PAYLOAD
   ========================================================= */

function buildPayload(
  req,
  file
) {

  const body =
    req.body || {};

  return {

    name:
      clean(
        body.name
      ),

    district:
      clean(
        body.district
      ),

    category:
      clean(
        body.category
      ),

    description:
      clean(
        body.description
      ),

    village:
      clean(
        body.village
      ),

    contactName:
      clean(
        body.contactName
      ),

    phone:
      clean(
        body.phone
      ),

    mapsUrl:
      clean(
        body.mapsUrl
      ),

    lat:
      toNumberOrNull(
        body.lat
      ),

    lng:
      toNumberOrNull(
        body.lng
      ),

    image:
      file
        ? `/uploads/${file.filename}`
        : clean(
            body.oldImage
          )

  };

}

/* =========================================================
   CREATE PLACE
   ========================================================= */

app.post(
  "/api/places",
  upload.single("image"),
  (req, res) => {

    try {

      const item =
        buildPayload(
          req,
          req.file
        );

      /* ตรวจข้อมูลจำเป็น */

      if (
        !item.name ||
        !item.district
      ) {

        return res
          .status(400)
          .json({
            error:
              "กรุณากรอกชื่อแหล่งเรียนรู้และตำบล"
          });

      }

      const places =
        readDatabase();

      /* ตรวจชื่อซ้ำ */

      const duplicate =
        places.some(
          place =>
            clean(
              place.name
            ).toLowerCase() ===
              item.name
                .toLowerCase() &&
            clean(
              place.district
            ) ===
              item.district
        );

      if (duplicate) {

        return res
          .status(409)
          .json({
            error:
              "มีแหล่งเรียนรู้ชื่อนี้ในตำบลเดียวกันแล้ว"
          });

      }

      /* สร้าง ID */

      const ids =
        places
          .map(
            place =>
              Number(
                place.id
              )
          )
          .filter(
            Number.isFinite
          );

      const nextId =
        ids.length
          ? Math.max(
              ...ids
            ) + 1
          : 1;

      const newItem = {

        id:
          nextId,

        ...item

      };

      places.push(
        newItem
      );

      writeDatabase(
        places
      );

      console.log(
        `เพิ่มข้อมูลใหม่ ID ${nextId}: ${newItem.name}`
      );

      res
        .status(201)
        .json(
          newItem
        );

    } catch (error) {

      console.error(
        "POST /api/places:",
        error
      );

      res
        .status(500)
        .json({
          error:
            error.message ||
            "ไม่สามารถบันทึกข้อมูลได้"
        });

    }

  }
);

/* =========================================================
   UPDATE PLACE
   ========================================================= */

app.put(
  "/api/places/:id",
  upload.single("image"),
  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );

      const places =
        readDatabase();

      const index =
        places.findIndex(
          place =>
            Number(
              place.id
            ) === id
        );

      if (
        index < 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "ไม่พบข้อมูล"
          });

      }

      const old =
        places[index];

      const updated =
        buildPayload(
          req,
          req.file
        );

      /* ตรวจข้อมูลจำเป็น */

      if (
        !updated.name ||
        !updated.district
      ) {

        return res
          .status(400)
          .json({
            error:
              "กรุณากรอกชื่อแหล่งเรียนรู้และตำบล"
          });

      }

      /* ตรวจชื่อซ้ำ */

      const duplicate =
        places.some(
          (place, placeIndex) =>
            placeIndex !== index &&
            clean(
              place.name
            ).toLowerCase() ===
              updated.name
                .toLowerCase() &&
            clean(
              place.district
            ) ===
              updated.district
        );

      if (duplicate) {

        return res
          .status(409)
          .json({
            error:
              "มีแหล่งเรียนรู้ชื่อนี้ในตำบลเดียวกันแล้ว"
          });

      }

      const newItem = {

        ...old,

        ...updated,

        id:
          old.id

      };

      places[index] =
        newItem;

      writeDatabase(
        places
      );

      /* ---------------------------------------------------
         ลบรูปเก่าหลังจากบันทึกสำเร็จ
         --------------------------------------------------- */

      if (
        req.file &&
        old.image &&
        old.image.startsWith(
          "/uploads/"
        )
      ) {

        const oldFile =
          path.join(
            ROOT,
            old.image.replace(
              /^\//,
              ""
            )
          );

        if (
          fs.existsSync(
            oldFile
          )
        ) {

          try {

            fs.unlinkSync(
              oldFile
            );

          } catch (error) {

            console.warn(
              "ลบรูปเก่าไม่สำเร็จ:",
              error.message
            );

          }

        }

      }

      console.log(
        `แก้ไขข้อมูล ID ${id}: ${newItem.name}`
      );

      res.json(
        newItem
      );

    } catch (error) {

      console.error(
        "PUT /api/places:",
        error
      );

      res
        .status(500)
        .json({
          error:
            error.message ||
            "ไม่สามารถแก้ไขข้อมูลได้"
        });

    }

  }
);

/* =========================================================
   DELETE PLACE
   ========================================================= */

app.delete(
  "/api/places/:id",
  (req, res) => {

    try {

      const id =
        Number(
          req.params.id
        );

      const places =
        readDatabase();

      const index =
        places.findIndex(
          place =>
            Number(
              place.id
            ) === id
        );

      if (
        index < 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "ไม่พบข้อมูล"
          });

      }

      const old =
        places[index];

      /* ลบจากฐานข้อมูล */

      places.splice(
        index,
        1
      );

      writeDatabase(
        places
      );

      /* ---------------------------------------------------
         ลบรูป
         --------------------------------------------------- */

      if (
        old.image &&
        old.image.startsWith(
          "/uploads/"
        )
      ) {

        const imageFile =
          path.join(
            ROOT,
            old.image.replace(
              /^\//,
              ""
            )
          );

        if (
          fs.existsSync(
            imageFile
          )
        ) {

          try {

            fs.unlinkSync(
              imageFile
            );

          } catch (error) {

            console.warn(
              "ลบรูปไม่สำเร็จ:",
              error.message
            );

          }

        }

      }

      console.log(
        `ลบข้อมูล ID ${id}`
      );

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "DELETE /api/places:",
        error
      );

      res
        .status(500)
        .json({
          error:
            error.message ||
            "ไม่สามารถลบข้อมูลได้"
        });

    }

  }
);

/* =========================================================
   EXPORT DATABASE
   ========================================================= */

app.get(
  "/api/export",
  (req, res) => {

    const places =
      readDatabase();

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="learning-tmap-places.json"'
    );

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.json(
      places
    );

  }
);

/* =========================================================
   API 404
   ========================================================= */

app.use(
  "/api",
  (req, res) => {

    res
      .status(404)
      .json({
        error:
          "ไม่พบ API endpoint"
      });

  }
);

/* =========================================================
   MULTER / SERVER ERROR HANDLER
   ========================================================= */

app.use(
  (error, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {

      return res
        .status(400)
        .json({
          error:
            `อัปโหลดไฟล์ไม่สำเร็จ: ${error.message}`
        });

    }

    res
      .status(500)
      .json({
        error:
          error.message ||
          "เกิดข้อผิดพลาดในระบบ"
      });

  }
);

/* =========================================================
   SPA FALLBACK
   ========================================================= */

/*
  สำหรับหน้าเว็บที่ไม่ใช่ API

  ตัวอย่าง:
  /
  /?id=1

  จะส่ง index.html

  แต่ /admin.html จะถูกส่งโดย
  express.static(ROOT) โดยตรง
*/

app.get(
  "/{*splat}",
  (req, res) => {

    res.sendFile(
      path.join(
        ROOT,
        "index.html"
      )
    );

  }
);

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
  PORT,
  () => {

    const currentData =
      readDatabase();

    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      " Learning T-MAP จอมพระ"
    );

    console.log(
      "=========================================="
    );

    console.log(
      ` Server Port: ${PORT}`
    );

    console.log(
      ` Database: ${DB_FILE}`
    );

    console.log(
      ` ข้อมูลปัจจุบัน: ${currentData.length} รายการ`
    );

    console.log(
      "=========================================="
    );

    console.log("");

  }
);
