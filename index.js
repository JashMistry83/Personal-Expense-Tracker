import "dotenv/config";
import bodyParser from "body-parser";
import express from "express";
import postgres from "postgres";
import pg from "pg";
import env from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//session management via express js
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60,
    },
  })
);
//initialize the session& start the session for user login management (MIDDLEWARES)
app.use(passport.initialize());
app.use(passport.session());

//db connection
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

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

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/expense");
  } else {
    res.render("register.ejs");
  }
});

// /expense url to comes after a successfull login after authentication
app.get("/expense", (req, res) => {
  //this isAuthenticated is comes from passport package that check a user is authenticated or not
  if (req.isAuthenticated) {
    res.render("expense.ejs");
  } else {
    res.redirect("/login");
  }
});

app.post("/register", async (req, res) => {
  const name = req.body.name;
  const gmail = req.body.username;
  const password = req.body.password;
  const phno = req.body.phno;

  console.log(req.body);
  try {
    const result = await db.query(
      "SELECT gmail FROM users WHERE gmail = ($1)",
      [gmail]
    );
    console.log(result);

    if (result.rows.length > 0) {
      console.log("User already have their accound...");
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          try {
            const result = await db.query(
              "INSERT INTO users(name,gmail,password,ph_no) VALUES($1,$2,$3,$4) RETURNING *",
              [name, gmail, hash, phno]
            );
          } catch (error) {
            console.log("Unique constraint", error);
          }

          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/expense");
          });
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

// app.post("/login", async (req, res) => {
//   const gmail = req.body.username;
//   const pwd = req.body.password;

//   try {
//     const result = await db.query(
//       "SELECT gmail,password,id FROM users WHERE gmail=($1)",
//       [gmail]
//     );

//     if (result.rows.length === 0) {
//       console.log("User not exits...");
//       res.redirect("/Register");
//     } else {
//       const login_pwd = result.rows[0].password;

//       try {
//         if (login_pwd == pwd) {
//           console.log("Logged In.");
//           res.redirect("/expense");
//         } else {
//           console.log("Wrong password");
//           res.redirect("/login");
//         }
//       } catch (error) {
//         console.log(error);
//       }
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/expense",
    failureRedirect: "/login",
  })
);

//in login req with post req we just set this if a user is authenticated it redirected to "/expesne" otherwise on "/login"
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/expense",
    failureRedirect: "/login",
  })
);

app.post("/add-expense", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const user_id = req.user.id;
      const date = req.body.expenseDate;
      const description = req.body.description;
      const transfer_to = req.body.transfer_to;
      const amount = req.body.amount;

      console.log("user = ", user_id);
      console.log("This is db qurey", req.user);

      try {
        try {
          const result = await db.query(
            "INSERT INTO expense(description,transfer_to,amount_rs,created_at,user_id) VALUES($1,$2,$3,$4,$5)",
            [description, transfer_to, amount, date, user_id]
          );
        } catch (error) {
          console.log("Error in insertion of expense...", error);
        }
        res.redirect("/expense");
      } catch (error) {
        console.log(error);
        res.send("User does not exits...");
      }
    } catch (error) {
      console.log(error);
    }
  } else {
    res.redirect("/login");
  }
});

//this is a stretegy that comes from passport package , this is a local stretegy
passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE gmail = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            return cb(err);
          } else {
            if (result) {
              console.log("User get founded & with pwd right & no errors...");
              return cb(null, user);
            } else {
              console.error("Pwd is wrong but user is founded");
              return cb(null, false);
            }
          }
        });
      } else {
        console.error("User is not founded...");
        return cb("User not found...");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile.name.givenName);
        const result = await db.query("SELECT * FROM users WHERE gmail = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (name,gmail, password) VALUES ($1, $2,$3)",
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
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});
