const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const uploadsDir = process.env.UPLOADS_DIR || path.join(dataDir, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'graduados.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      graduation_mode TEXT NOT NULL,
      graduation_date TEXT NOT NULL,
      avatar_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/students', (_, res) => {
  db.all('SELECT * FROM students ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al listar estudiantes.' });
    res.json(rows);
  });
});

app.get('/api/students/:id', (req, res) => {
  db.get('SELECT * FROM students WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al obtener estudiante.' });
    if (!row) return res.status(404).json({ error: 'Estudiante no encontrado.' });
    res.json(row);
  });
});

app.post('/api/students', upload.single('avatar'), (req, res) => {
  const { full_name, graduation_mode, graduation_date } = req.body;

  if (!full_name || !graduation_mode || !graduation_date) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  const avatar_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    `INSERT INTO students (full_name, graduation_mode, graduation_date, avatar_path)
     VALUES (?, ?, ?, ?)`,
    [full_name.trim(), graduation_mode.trim(), graduation_date, avatar_path],
    function onInsert(err) {
      if (err) return res.status(500).json({ error: 'No se pudo guardar estudiante.' });
      db.get('SELECT * FROM students WHERE id = ?', [this.lastID], (getErr, row) => {
        if (getErr) return res.status(500).json({ error: 'Guardado parcial.' });
        res.status(201).json(row);
      });
    }
  );
});

app.put('/api/students/:id', upload.single('avatar'), (req, res) => {
  const { full_name, graduation_mode, graduation_date } = req.body;
  const id = req.params.id;

  db.get('SELECT * FROM students WHERE id = ?', [id], (findErr, current) => {
    if (findErr) return res.status(500).json({ error: 'Error al actualizar.' });
    if (!current) return res.status(404).json({ error: 'Estudiante no encontrado.' });

    const newAvatarPath = req.file ? `/uploads/${req.file.filename}` : current.avatar_path;

    db.run(
      `UPDATE students
       SET full_name = ?, graduation_mode = ?, graduation_date = ?, avatar_path = ?
       WHERE id = ?`,
      [
        (full_name || current.full_name).trim(),
        (graduation_mode || current.graduation_mode).trim(),
        graduation_date || current.graduation_date,
        newAvatarPath,
        id
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: 'No se pudo actualizar.' });

        if (req.file && current.avatar_path) {
          const oldPath = path.join(
            uploadsDir,
            path.basename(current.avatar_path)
          );
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        db.get('SELECT * FROM students WHERE id = ?', [id], (getErr, row) => {
          if (getErr) return res.status(500).json({ error: 'Actualizado parcial.' });
          res.json(row);
        });
      }
    );
  });
});

app.delete('/api/students/:id', (req, res) => {
  const id = req.params.id;

  db.get('SELECT * FROM students WHERE id = ?', [id], (findErr, row) => {
    if (findErr) return res.status(500).json({ error: 'Error al eliminar.' });
    if (!row) return res.status(404).json({ error: 'Estudiante no encontrado.' });

    db.run('DELETE FROM students WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ error: 'No se pudo eliminar.' });

      if (row.avatar_path) {
        const avatarFile = path.join(uploadsDir, path.basename(row.avatar_path));
        if (fs.existsSync(avatarFile)) fs.unlinkSync(avatarFile);
      }

      res.json({ ok: true });
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
