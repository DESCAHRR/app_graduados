const express = require('express');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'avatars';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function safeFileName(originalName) {
  const ext = path.extname(originalName || '').toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  const base = path.basename(originalName || 'avatar', ext).replace(/[^a-zA-Z0-9_-]/g, '');
  return `${base || 'avatar'}${safeExt}`;
}

async function uploadAvatar(file) {
  if (!file) return { publicUrl: null, key: null };

  const fileName = safeFileName(file.originalname);
  const key = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw new Error(uploadError.message || 'No se pudo subir el avatar.');
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(key);
  return { publicUrl: data.publicUrl, key };
}

async function removeAvatar(key) {
  if (!key) return;
  await supabase.storage.from(SUPABASE_BUCKET).remove([key]);
}

app.get('/api/students', async (_, res) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: 'Error al listar estudiantes.' });
  res.json(data || []);
});

app.get('/api/students/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID invalido.' });

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Estudiante no encontrado.' });
  res.json(data);
});

app.post('/api/students', upload.single('avatar'), async (req, res) => {
  const { full_name, graduation_mode, graduation_date } = req.body;

  if (!full_name || !graduation_mode || !graduation_date) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  try {
    const avatar = await uploadAvatar(req.file);

    const { data, error } = await supabase
      .from('students')
      .insert({
        full_name: full_name.trim(),
        graduation_mode: graduation_mode.trim(),
        graduation_date,
        avatar_path: avatar.publicUrl,
        avatar_key: avatar.key
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'No se pudo guardar estudiante.' });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al subir avatar.' });
  }
});

app.put('/api/students/:id', upload.single('avatar'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID invalido.' });

  const { full_name, graduation_mode, graduation_date } = req.body;

  const { data: current, error: findError } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !current) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' });
  }

  try {
    let avatarPath = current.avatar_path;
    let avatarKey = current.avatar_key;

    if (req.file) {
      const avatar = await uploadAvatar(req.file);
      avatarPath = avatar.publicUrl;
      avatarKey = avatar.key;
      if (current.avatar_key) await removeAvatar(current.avatar_key);
    }

    const { data, error } = await supabase
      .from('students')
      .update({
        full_name: (full_name || current.full_name).trim(),
        graduation_mode: (graduation_mode || current.graduation_mode).trim(),
        graduation_date: graduation_date || current.graduation_date,
        avatar_path: avatarPath,
        avatar_key: avatarKey
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'No se pudo actualizar.' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar.' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID invalido.' });

  const { data: current, error: findError } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !current) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' });
  }

  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (deleteError) return res.status(500).json({ error: 'No se pudo eliminar.' });

  if (current.avatar_key) await removeAvatar(current.avatar_key);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
