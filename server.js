// 1. Imports right at the top
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; 

// 2. Derive __dirname manually for modern ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Initialize the app instance *before* using it
const app = express();
const PORT = process.env.PORT || 3000;

// 4. Mount global middlewares
app.use(cors());
app.use(express.json());

// 5. Serve your static front-end assets out of the public folder
app.use(express.static(path.join(__dirname, 'public')));

// 6. Establish connection to Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("CRITICAL ERROR: Supabase credentials are missing!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper for normalization
const norm = s => String(s || '').trim().toLowerCase();

// --- API ENDPOINTS ---

// Get all data layers
app.get('/api/data', async (req, res) => {
    try {
        const [fRes, vRes, eRes] = await Promise.all([
            supabase.from('funds').select('*'),
            supabase.from('venues').select('*'),
            supabase.from('ecosystem').select('*')
        ]);

        if (fRes.error) throw fRes.error;
        if (vRes.error) throw vRes.error;
        if (eRes.error) throw eRes.error;

        res.json({
            funds: fRes.data || [],
            venues: vRes.data || [],
            ecosystem: eRes.data || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create entry
app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    try {
        const { data, error } = await supabase.from(table).insert([req.body]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update engagement log
app.patch('/api/:table/log', async (req, res) => {
    const { table } = req.params;
    const { name, total_engagements, latest_engagement } = req.body;
    try {
        const { data, error } = await supabase.from(table)
            .update({ total_engagements, latest_engagement })
            .eq('name', name)
            .select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Bulk Import entries
app.post('/api/:table/bulk', async (req, res) => {
    const { table } = req.params;
    try {
        const { error } = await supabase.from(table).insert(req.body);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete entry
app.delete('/api/:table', async (req, res)5 => {
    const { table } = req.params;
    const { name } = req.body;
    try {
        const { error } = await supabase.from(table).delete().eq('name', name);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Catch-all fallback route to serve the UI
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server listening process
app.listen(PORT, () => {
    console.log(`Resource List running securely on Port: ${PORT}`);
});
