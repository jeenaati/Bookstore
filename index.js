const express = require("express");
const jwt = require("jsonwebtoken");
const sqlite3 = require('sqlite3');
const moment = require('moment');
const now = moment().format('YYYY-MM-DD hh:mm:ss');


const app = express();
app.use(express.json());
//execut db
const execute = async (db, sql, params = []) => {
    if (params && params.length > 0) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });
    }
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
};
const fetchAll = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  };
  
const fetchFirst = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
        if (err) reject(err);
        resolve(row);
        });
    });
};
//check authentication 
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization");//
    if (!token) return res.status(401).json({ error: "Access denied" });
  
    // verify token with key
    jwt.verify(token, 'secretKey2025!', (err, user) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = user;
      next();
    });
};

// User login (Generate JWT)
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "password") {
      const token = jwt.sign({ username }, 'secretKey2025!', { expiresIn: "1h" });// created token with key and set exprid period
      return res.json({ token });
    }
    res.status(401).json({ error: "Invalid credentials" });
});
  
//Add Book
app.post("/addBook", authenticateToken, async (req, res) => {
    try {
      const { title, author, isbn, published_year, amount } = req.body;
      const db = new sqlite3.Database("bookBank.db");
      const sql = `INSERT INTO books (title, author, isbn, published_year, amount, createdDate, updatedDate) VALUES(?, ?, ?, ?, ?, ?, ?)`;
        try {
            
            await execute(db, sql, [title, author, isbn, published_year, amount, now, now]).then((result) => {
                //query last row after insert
                fetchFirst(db, 'SELECT * FROM books ORDER BY id DESC LIMIT 1', []).then((result) => { 
                    let resData = {
                        success: true,
                        date: result
                    }
                    res.status(200).json(resData);
                })
            
        })
      } catch (err) {
          console.log(err);
          res.status(500).json({ error: err.message });
      } finally {
          db.close();
      }
        
      
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});
// Update a book
app.put("/updateBook", authenticateToken, async (req, res) => {
    try {
        const { id, title, author, isbn, published_year, amount } = req.body;
        const db = new sqlite3.Database("bookBank.db");
      const sql = `UPDATE books SET title = ?, author = ?, isbn = ?, published_year = ?, amount = ? , updatedDate = ? WHERE id = ?`;
      try {
          await execute(db, sql, [title, author, isbn, published_year, amount, now, id]).then((result) => {
              fetchFirst(db, 'SELECT * FROM books WHERE id = ?', [id]).then((result) => { 
                let resData = {
                    success: true,
                    date: result
                }
                res.status(200).json(resData);
            })
        })
      } catch (err) {
          console.log(err);
          res.status(500).json({ error: err.message });
      } finally {
          db.close();
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});
  // Delete a book
app.post("/deleteBook", authenticateToken, async (req, res) => {
    try {
        const { id } = req.body;
        console.log('id : ' + id);
        const db = new sqlite3.Database("bookBank.db");
        const sql = `DELETE FROM books WHERE id = ?`;
      try {
            await execute(db, sql, [id]).then((result) => {
            res.status(200).json({success : true});
        })
      } catch (err) {
          console.log(err);
          res.status(500).json({ error: err.message });
      } finally {
          db.close();
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

// Search books
app.post("/searchBooks", authenticateToken, async (req, res) => {
    try {
        const { title, author, isbn, published_year, amount } = req.body;
        const db = new sqlite3.Database("bookBank.db");
        const conditions = [];
        const values = [];
        let sql = "SELECT * FROM books";
  
        if (title) {
            conditions.push('title = ?');
            values.push(title);
        }
        if (author) {
            conditions.push('author = ?');
            values.push(author);
        }
        if (isbn) {
            conditions.push('isbn = ?');
            values.push(isbn);
        }
        if (published_year) {
            conditions.push('published_year = ?');
            values.push(published_year);
        }
        if (amount) {
            conditions.push('amount = ?');
            values.push(amount);
        }
        if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    
        try {
            await fetchAll(db, sql, values).then((result) => {
                let resData = {
                    success: true,
                    date: result
                }
                res.status(200).json(resData);
            })
        } catch (err) {
            console.log(err);
            res.status(500).json({ error: err.message });
        } finally {
            db.close();
        }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});
  

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});