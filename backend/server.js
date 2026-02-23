const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

const INSTAGRAM_APP_ID = 'YOUR_APP_ID';
const INSTAGRAM_APP_SECRET = 'YOUR_APP_SECRET';
const INSTAGRAM_REDIRECT_URI = 'http://localhost:3000/auth/instagram/callback';

let accessTokens = {};

app.get('/auth/instagram', (req, res) => {
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
    res.redirect(authUrl);
});

app.get('/auth/instagram/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
            client_id: INSTAGRAM_APP_ID,
            client_secret: INSTAGRAM_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: INSTAGRAM_REDIRECT_URI,
            code
        });

        const { access_token, user_id } = tokenResponse.data;
        accessTokens[user_id] = access_token;
        res.redirect('/');
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).send('Authentication failed');
    }
});

app.get('/api/profile', async (req, res) => {
    try {
        const { user_id } = req.query;
        const access_token = accessTokens[user_id];
        if (!access_token) return res.status(401).json({ error: 'Not authenticated' });

        const response = await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`);
        res.json(response.data);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.get('/api/media', async (req, res) => {
    try {
        const { user_id } = req.query;
        const access_token = accessTokens[user_id];
        if (!access_token) return res.status(401).json({ error: 'Not authenticated' });

        const response = await axios.get(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&access_token=${access_token}`);
        res.json(response.data);
    } catch (error) {
        console.error('Media error:', error);
        res.status(500).json({ error: 'Failed to fetch media' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
