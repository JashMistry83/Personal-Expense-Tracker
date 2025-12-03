import "dotenv/config";
import bodyParser from "body-parser";
import express from "express";
import postgres from "postgres";
import pg from "pg";

const app = express();
const port = 3000;

//db connection
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
db.connect();

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/expense", (req, res) => {
  res.render("expense.ejs");
});

app.post("/register", async (req, res) => {
  const name = req.body.name;
  const gmail = req.body.username;
  const pwd = req.body.password;
  const phno = req.body.phno;

  console.log(req.body);
  try {
    const result = await db.query(
      "SELECT gmail FROM users WHERE gmail = ($1)",
      [gmail]
    );
    console.log(result);

    if (result.rows.length === 0) {
      try {
        const query = await db.query(
          "INSERT INTO users(name,gmail,password,ph_no) VALUES($1,$2,$3,$4)",
          [name, gmail, pwd, phno]
        );
        console.log("registered successfully...");
        res.redirect("/login");
      } catch (error) {
        console.log(error);
        res.redirect("/register");
      }
    } else {
      console.log("User already have their accound...");
      res.redirect("/login");
    }
  } catch (error) {}
});

let currect_user_id;

app.post("/login", async (req, res) => {
  const gmail = req.body.username;
  const pwd = req.body.password;

  try {
    const result = await db.query(
      "SELECT gmail,password,id FROM users WHERE gmail=($1)",
      [gmail]
    );

    if (result.rows.length === 0) {
      console.log("User not exits...");
      res.redirect("/Register");
    } else {
      const login_pwd = result.rows[0].password;

      try {
        if (login_pwd == pwd) {
          console.log("Logged In.");
          currect_user_id = result.rows[0].id;
          console.log("Current user id = ", currect_user_id);
          res.redirect("/expense");
        } else {
          console.log("Wrong password");
          res.redirect("/login");
        }
      } catch (error) {
        console.log(error);
      }
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/add-expense", (req, res) => {
  const date = req.body.expenseDate;
  const description = req.body.description;
  const transfer_to = req.body.transfer_to;
  const amount = req.body.amount;

  console.log(req.body);

  try {
    try {
      const result = db.query(
        "INSERT INTO expense(description,transfer_to,amount_rs,created_at,user_id) VALUES($1,$2,$3,$4,$5)",
        [description, transfer_to, amount, date, currect_user_id]
      );
    } catch (error) {
      console.log("Error in insertion of expense...", error);
    }
    res.redirect("/expense");
  } catch (error) {
    console.log(error);
    res.send("User does not exits...");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});
