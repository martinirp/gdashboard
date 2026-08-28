const crypto = require('crypto');

const sessions = new Set();
const VALIDITY_MS = 24 * 60 * 60 * 1000;
const tokenTimes = new Map();

function login(user, password, expectedUser, expectedPass) {
    if (user !== expectedUser || password !== expectedPass) return null;
    const token = crypto.randomBytes(24).toString('hex');
    sessions.add(token);
    tokenTimes.set(token, Date.now());
    return token;
}

function verify(token) {
    if (!token || !sessions.has(token)) return false;
    const created = tokenTimes.get(token);
    if (Date.now() - created > VALIDITY_MS) {
        logout(token);
        return false;
    }
    return true;
}

function logout(token) {
    sessions.delete(token);
    tokenTimes.delete(token);
}

module.exports = { login, verify, logout };