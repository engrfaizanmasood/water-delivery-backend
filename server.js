const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "water_db"
});

// Connect DB
 db.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
    return;
  }

  console.log("MySQL Connected");
});

// =====================================
// ROOT
// =====================================
app.get("/", (req, res) => {
  res.send("Water Dashboard Backend Running");
});

// =====================================
// CUSTOMERS API
// =====================================

// GET ALL CUSTOMERS
app.get("/api/customers", (req, res) => {

  const sql = `
    SELECT *
    FROM customers
    ORDER BY id DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json(result);
  });
});

// ADD CUSTOMER
app.post("/api/customers", (req, res) => {

  const { name, phone, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({
      error: "Name and phone are required"
    });
  }

  const sql = `
    INSERT INTO customers
    (name, phone, address)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [name, phone, address], (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json({
      id: result.insertId,
      name,
      phone,
      address
    });
  });
});

// UPDATE CUSTOMER
app.put("/api/customers/:id", (req, res) => {

  const { id } = req.params;
  const { name, phone, address } = req.body;

  const sql = `
    UPDATE customers
    SET name=?, phone=?, address=?
    WHERE id=?
  `;

  db.query(sql, [name, phone, address, id], (err) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json({
      success: true
    });
  });
});

// DELETE CUSTOMER
app.delete("/api/customers/:id", (req, res) => {

  const { id } = req.params;

  const sql = `
    DELETE FROM customers
    WHERE id=?
  `;

  db.query(sql, [id], (err) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json({
      success: true
    });
  });
});

// UPDATE CUSTOMER
app.put("/api/customers/:id", (req, res) => {

  const { id } = req.params;
  const { name, phone, address } = req.body;

  const sql = `
    UPDATE customers
    SET name=?, phone=?, address=?
    WHERE id=?
  `;

  db.query(sql, [name, phone, address, id], (err) => {

    if (err) {
      console.log(err);

      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json({ success: true });
  });
});

// DELETE CUSTOMER
app.delete("/api/customers/:id", (req, res) => {

  const { id } = req.params;

  const sql = `
    DELETE FROM customers
    WHERE id=?
  `;

  db.query(sql, [id], (err) => {

    if (err) {
      console.log(err);

      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json({ success: true });
  });
});


// =====================================
// DAILY RECORDS API
// =====================================

// GET ALL DAILY RECORDS
app.get("/api/daily-records", (req, res) => {

  const sql = `
    SELECT
      daily_records.*,
      customers.name,
      customers.phone,
      customers.address
    FROM daily_records
    JOIN customers
    ON daily_records.customer_id = customers.id
    ORDER BY record_date DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);

      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json(result);
  });
});


// SAVE DAILY RECORD
app.post("/api/daily-records", (req, res) => {

  const records = req.body;

  if (!Array.isArray(records)) {
    return res.status(400).json({
      error: "Expected array"
    });
  }

  const sql = `
    INSERT INTO daily_records
    (
      customer_id,
      delivered,
      returned,
      notes,
      record_date
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  let completed = 0;

  records.forEach((record) => {

    db.query(
      sql,
      [
        record.customer_id,
        record.delivered,
        record.returned,
        record.notes,
        record.record_date
      ],
      (err) => {

        if (err) {
          console.log(err);
        }

        completed++;

        if (completed === records.length) {

          res.json({
            success: true
          });

        }

      }
    );

  });

});

// =====================================
// PAYMENTS API
// =====================================

// GET PAYMENTS
app.get("/api/payments", (req, res) => {

  const sql = `
    SELECT *
    FROM payments
    ORDER BY id DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json(result);
  });
});

// ADD PAYMENT
app.post("/api/payments", (req, res) => {

  const {
    customer_id,
    amount_paid,
    method
  } = req.body;

  const sql = `
    INSERT INTO payments
    (customer_id, amount_paid, method)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [customer_id, amount_paid, method], (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: err.message
      });
    }

    res.json({
      success: true,
      id: result.insertId
    });
  });
});

// =====================================
// DAILY RECORDS
// =====================================

// GET DAILY RECORDS
app.get("/api/daily-records", (req, res) => {

  const sql = `
    SELECT *
    FROM daily_records
    ORDER BY date DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    res.json(result);
  });
});

// ADD DAILY RECORD
app.post("/api/daily-records", (req, res) => {

  const {
    customer_id,
    delivered,
    returned,
    date,
    notes
  } = req.body;

  const sql = `
    INSERT INTO daily_records
    (customer_id, delivered, returned, date, notes)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [customer_id, delivered, returned, date, notes],
    (err, result) => {

      if (err) {
        console.log(err);
        return res.status(500).json({
          error: "Database error"
        });
      }

      res.json({
        success: true,
        id: result.insertId
      });
    }
  );
});

// =====================================
// DASHBOARD API
// =====================================

app.get("/api/dashboard", (req, res) => {

  const month = req.query.month;

  const customersSql = `
    SELECT *
    FROM customers
  `;

  db.query(customersSql, (err, customers) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        error: "Database error"
      });
    }

    const paymentsSql = `
      SELECT SUM(amount_paid) as totalRevenue
      FROM payments
    `;

    db.query(paymentsSql, (err2, paymentsResult) => {

      if (err2) {
        console.log(err2);
        return res.status(500).json({
          error: "Database error"
        });
      }

      const totalRevenue = paymentsResult[0]?.totalRevenue || 0;

      const data = customers.map((c) => ({
        ...c,
        balance: 0,
        month: "March 2026"
      }));

      const summary = {
        totalCustomers: customers.length,
        activeCustomers: customers.length,
        activePercent: "80%",
        todayBottles: 11,
        totalRevenue,
        totalPending: 0,
        month: "March 2026",
        avgBottles: 8,
        mtdRevenue: totalRevenue,
        pendingInvoices: 3,
        overdue: 1,
        collectionRate: "90.3%"
      };

      res.json({
        data,
        summary
      });

    });

  });

});

// =====================================
// START SERVER
// =====================================

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});