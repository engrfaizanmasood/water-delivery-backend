const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

// =====================================
// CONFIG
// =====================================

const BOTTLE_PRICE = 200;

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());
app.use(express.json());

// =====================================
// DATABASE
// =====================================

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "water_db"
});

db.connect((err) => {

  if (err) {
    console.log("DB ERROR:", err);
  } else {

    console.log("MySQL Connected");

    // DAILY RECORDS
    db.query(`
      CREATE TABLE IF NOT EXISTS daily_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(50),
        record_date DATE,
        delivered INT DEFAULT 0,
        returned_bottles INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // USERS
    db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'admin'
      )
    `);

    // PAYMENTS
    db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        amount_paid INT,
        method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Tables ready");

  }

});

// =====================================
// ROOT
// =====================================

app.get("/", (req, res) => {
  res.send("Water Dashboard Backend Running");
});

// =====================================
// CUSTOMERS
// =====================================

app.get("/api/customers", (req, res) => {

  db.query("SELECT * FROM customers ORDER BY id DESC", (err, result) => {

    if (err) return res.status(500).json({ error: err.message });

    res.json(result);

  });

});

app.post("/api/customers", (req, res) => {

  const { name, phone, address } = req.body;

  db.query(
    "INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)",
    [name, phone, address],
    (err, result) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({
        id: result.insertId,
        name,
        phone,
        address
      });

    }
  );

});

app.put("/api/customers/:id", (req, res) => {

  const { id } = req.params;
  const { name, phone, address } = req.body;

  db.query(
    "UPDATE customers SET name=?, phone=?, address=? WHERE id=?",
    [name, phone, address, id],
    (err) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({ success: true });

    }
  );

});

app.delete("/api/customers/:id", (req, res) => {

  const { id } = req.params;

  db.query(
    "DELETE FROM customers WHERE id=?",
    [id],
    (err) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({ success: true });

    }
  );

});

// =====================================
// DAILY RECORDS
// =====================================

app.post("/api/daily-records", (req, res) => {

  const { date, records } = req.body;

  db.query(
    "DELETE FROM daily_records WHERE record_date = ?",
    [date],
    (err) => {

      if (err) return res.status(500).json({ error: err.message });

      const values = records.map(r => [
        r.id,
        date,
        Number(r.delivered || 0),
        Number(r.returned || 0),
        r.notes || ""
      ]);

      db.query(
        `
        INSERT INTO daily_records
        (customer_id, record_date, delivered, returned_bottles, notes)
        VALUES ?
        `,
        [values],
        (err2) => {

          if (err2) return res.status(500).json({ error: err2.message });

          res.json({ success: true });

        }
      );

    }
  );

});

app.get("/api/daily-records/:date", (req, res) => {

  const { date } = req.params;

  db.query(
    "SELECT * FROM daily_records WHERE record_date = ?",
    [date],
    (err, results) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json(results);

    }
  );

});

// =====================================
// PAYMENTS
// =====================================

app.post("/api/payments", (req, res) => {

  const { customer_id, amount_paid, method } = req.body;

  db.query(
    "INSERT INTO payments (customer_id, amount_paid, method) VALUES (?, ?, ?)",
    [customer_id, amount_paid, method],
    (err) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({ success: true });

    }
  );

});

// =====================================
// DASHBOARD (BALANCE SYSTEM)
// =====================================

app.get("/api/dashboard", (req, res) => {

  db.query("SELECT * FROM customers", (err, customers) => {

    if (err) return res.status(500).json({ error: err.message });

    db.query(`
      SELECT 
        customer_id,
        SUM(delivered) as total_delivered,
        SUM(returned_bottles) as total_returned
      FROM daily_records
      GROUP BY customer_id
    `, (err2, records) => {

      if (err2) return res.status(500).json({ error: err2.message });

      db.query(`
        SELECT 
          customer_id,
          SUM(amount_paid) as total_paid
        FROM payments
        GROUP BY customer_id
      `, (err3, payments) => {

        if (err3) return res.status(500).json({ error: err3.message });

        const data = customers.map((c) => {

          const rec = records.find(r => Number(r.customer_id) === Number(c.id));
          const pay = payments.find(p => Number(p.customer_id) === Number(c.id));

          const delivered = rec?.total_delivered || 0;
          const returned = rec?.total_returned || 0;
          const paid = pay?.total_paid || 0;

          const balance = (delivered - returned) * BOTTLE_PRICE - paid;

          return {
            ...c,
            delivered,
            returned,
            paid,
            balance
          };

        });

        res.json({ data });

      });

    });

  });

});

// =====================================
// AUTH
// =====================================

app.post("/api/register", async (req, res) => {

  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashed],
    (err) => {

      if (err) return res.status(500).json({ error: err.message });

      res.json({ success: true });

    }
  );

});

app.post("/api/login", (req, res) => {

  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, result) => {

      if (err) return res.status(500).json({ error: err.message });

      if (result.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const user = result[0];

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({ error: "Wrong password" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });

    }
  );

});

// =====================================
// START SERVER
// =====================================

app.get("/api/reports", (req, res) => {

  const { month } = req.query;

  // example month format: 2026-05
  const start = `${month}-01`;
  const end = `${month}-31`;

  db.query(`
    SELECT 
      SUM(delivered) as total_delivered,
      SUM(returned_bottles) as total_returned
    FROM daily_records
    WHERE record_date BETWEEN ? AND ?
  `, [start, end], (err, records) => {

    if (err) return res.status(500).json({ error: err.message });

    db.query(`
      SELECT SUM(amount_paid) as total_paid
      FROM payments
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [start, end], (err2, payments) => {

      if (err2) return res.status(500).json({ error: err2.message });

      const delivered = records[0]?.total_delivered || 0;
      const returned = records[0]?.total_returned || 0;
      const paid = payments[0]?.total_paid || 0;

      const revenue = (delivered - returned) * BOTTLE_PRICE;
      const pending = revenue - paid;

      res.json({
        delivered,
        returned,
        revenue,
        paid,
        pending
      });

    });

  });

});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});