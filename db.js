// ----------------------------------------------------------------
// db.js - SQLite helper that provides a MySQL-like query() API
// ----------------------------------------------------------------

const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('./config');

const createConn = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    query: (sql, params = []) => {
                        return new Promise((resolve, reject) => {
                            const isSelect = /^\s*select/i.test(sql);

                            if (isSelect) {
                                db.all(sql, params, (err, rows) => {
                                    if (err) return reject(err);
                                    return resolve([rows]);
                                });
                            } else {
                                db.run(sql, params, function (err) {
                                    if (err) return reject(err);
                                    // return info similar to MySQL (affected rows and last insert ID)
                                    return resolve({ changes: this.changes, lastID: this.lastID });
                                });
                            }
                        });
                    },
                    close: () => db.close()
                });
            }
        });
    });
};

module.exports = createConn;
