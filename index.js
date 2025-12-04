import "dotenv/config";
import bodyParser from "body-parser";
import express from "express";
import pg from "pg";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
// app.use(express.static(path.join(__dirname, "public")));

// static files

// Session Management
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day session
  })
);

app.use(passport.initialize());
app.use(passport.session());

// DB Connection
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// --- ROUTES ---

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/expense");
  } else {
    res.render("login.ejs");
  }
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/expense");
  } else {
    res.render("register.ejs");
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

// --- DASHBOARD ROUTE (The Main Logic) ---
app.get("/expense", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const userId = req.user.id;
      
      // Fetch all transactions for the user, sorted by date (newest first)
      const result = await db.query(
        "SELECT * FROM expense WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      
      const transactions = result.rows;

      // Calculate Totals
      let totalIncome = 0;
      let totalExpense = 0;
      let totalReceivable = 0;
      let totalPayable = 0;

      // Prepare Data for Charts
      // We'll create a simple map for categories or monthly data here
      // For this example, let's group expenses by month for the chart
      const chartData = {}; 

      transactions.forEach(t => {
        const amount = parseFloat(t.amount_rs);
        
        if (t.type === 'income') totalIncome += amount;
        else if (t.type === 'expense') {
            totalExpense += amount;
            
            // Chart Data Logic (Grouping by Month-Year)
            const date = new Date(t.created_at);
            const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            if(chartData[monthYear]) {
                chartData[monthYear] += amount;
            } else {
                chartData[monthYear] = amount;
            }
        }
        else if (t.type === 'receivable') totalReceivable += amount;
        else if (t.type === 'payable') totalPayable += amount;
      });

      const totalBalance = totalIncome - totalExpense;

      res.render("expense.ejs", {
        user: req.user,
        transactions: transactions,
        totals: {
          income: totalIncome.toFixed(2),
          expense: totalExpense.toFixed(2),
          balance: totalBalance.toFixed(2),
          receivable: totalReceivable.toFixed(2),
          payable: totalPayable.toFixed(2)
        },
        chartLabels: JSON.stringify(Object.keys(chartData)),
        chartValues: JSON.stringify(Object.values(chartData))
      });

    } catch (err) {
      console.error(err);
      res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/add-expense", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const { expenseDate, description, transfer_to, amount, type } = req.body;
      const user_id = req.user.id;

      await db.query(
        "INSERT INTO expense(description, transfer_to, amount_rs, created_at, user_id, type) VALUES($1,$2,$3,$4,$5,$6)",
        [description, transfer_to, amount, expenseDate, user_id, type]
      );
      res.redirect("/expense");
    } catch (error) {
      console.log("Error adding expense:", error);
      res.redirect("/expense");
    }
  } else {
    res.redirect("/login");
  }
});

// --- AUTHENTICATION HANDLERS ---

app.post("/register", async (req, res) => {
  const { name, username, password, phno } = req.body;
  try {
    const check = await db.query("SELECT * FROM users WHERE gmail = $1", [username]);
    if (check.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) throw err;
        const result = await db.query(
          "INSERT INTO users(name, gmail, password, ph_no) VALUES($1,$2,$3,$4) RETURNING *",
          [name, username, hash, phno]
        );
        req.login(result.rows[0], (err) => {
            if(err) console.error(err);
            res.redirect("/expense");
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.redirect("/register");
  }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/expense",
    failureRedirect: "/login",
}));

// Passport Strategies
passport.use(new Strategy(async function verify(username, password, cb) {
  try {
    const result = await db.query("SELECT * FROM users WHERE gmail = $1", [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      bcrypt.compare(password, user.password, (err, valid) => {
        if (err) return cb(err);
        if (valid) return cb(null, user);
        return cb(null, false);
      });
    } else {
      return cb("User not found");
    }
  } catch (err) {
    return cb(err);
  }
}));

// Google Auth (Keep your existing Google Strategy setup if credentials are in .env)
passport.use("google", new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  async (accessToken, refreshToken, profile, cb) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE gmail = $1", [profile.email]);
      if (result.rows.length === 0) {
        const newUser = await db.query(
          "INSERT INTO users (name, gmail, password) VALUES ($1, $2, $3) RETURNING *",
          [profile.name.givenName, profile.email, "google"]
        );
        return cb(null, newUser.rows[0]);
      } else {
        return cb(null, result.rows[0]);
      }
    } catch (err) {
      return cb(err);
    }
  }
));

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/secrets", passport.authenticate("google", {
    successRedirect: "/expense",
    failureRedirect: "/login",
}));

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});