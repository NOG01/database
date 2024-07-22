const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const db = new sqlite3.Database('./db/users.db');
const secretKey = 'your-secret-key';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, favoriteMovie TEXT, favoriteSeries TEXT, favoriteGame TEXT, favoriteComic TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
});

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password are required.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const stmt = db.prepare("INSERT INTO admins (username, password) VALUES (?, ?)");
    stmt.run(username, hashedPassword, function (err) {
        if (err) {
            res.json({ success: false, message: 'User already exists.' });
        } else {
            res.json({ success: true });
        }
    });
    stmt.finalize();
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password are required.' });
    }

    db.get("SELECT * FROM admins WHERE username = ?", [username], (err, row) => {
        if (err || !row || !bcrypt.compareSync(password, row.password)) {
            return res.json({ success: false, message: 'Invalid username or password.' });
        }

        const token = jwt.sign({ username: row.username }, secretKey, { expiresIn: '1h' });
        res.json({ success: true, token });
    });
});

app.post('/add-user', authenticateToken, (req, res) => {
    const { name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic } = req.body;

    if (!name || !favoriteMovie || !favoriteSeries || !favoriteGame || !favoriteComic) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    const stmt = db.prepare("INSERT INTO users (name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic) VALUES (?, ?, ?, ?, ?)");
    stmt.run(name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic, function (err) {
        if (err) {
            res.json({ success: false });
        } else {
            res.json({ success: true, user: { id: this.lastID, name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic } });
        }
    });
    stmt.finalize();
});

app.put('/update-user/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic } = req.body;

    if (!name || !favoriteMovie || !favoriteSeries || !favoriteGame || !favoriteComic) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    const stmt = db.prepare("UPDATE users SET name = ?, favoriteMovie = ?, favoriteSeries = ?, favoriteGame = ?, favoriteComic = ? WHERE id = ?");
    stmt.run(name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic, id, function (err) {
        if (err) {
            res.json({ success: false });
        } else {
            res.json({ success: true, user: { id, name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic } });
        }
    });
    stmt.finalize();
});

app.delete('/delete-user/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    stmt.run(id, function (err) {
        if (err) {
            res.json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
    stmt.finalize();
});

app.get('/users', authenticateToken, (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            res.json({ success: false });
        } else {
            res.json({ success: true, users: rows });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
