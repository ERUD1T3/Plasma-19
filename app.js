// main file for the app
"use strict";
const express = require("express");
const mongoose = require("mongoose");
const layouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash"); //for sending messages on redirect
const session = require("express-session");
const methodOverride = require("method-override");
const MongoStore = require("connect-mongo")(session);
const app = express();
const server = require("http").Server(app);
/* At the top, with other redirect methods before other routes */

if (process.env.NODE_ENV !== "production") {
  // loading environment variable when not in production
  require("dotenv").config();
  const morgan = require("morgan");
  app.use(morgan("dev")); // logging requests to server
} else {
  app.get("*", function (req, res, next) {
    if (req.headers["x-forwarded-proto"] != "https")
      res.redirect("https://plasma-19.com" + req.url);
    else next(); /* Continue to other routes if we're not redirecting */
  });
}

// settings
app.set("view engine", "ejs");
app.set("views", __dirname + "/views/");
app.set("layout", "root/layout"); // not a file path; does a lookpu

app.use(layouts);
app.use(express.static(__dirname + "/public")); // serving frontend file; index.html is starting point
app.use(cookieParser());
app.use(express.json()); // middleware to read json
app.use(methodOverride("_method"));
app.use(
  bodyParser.urlencoded({
    limit: "5mb",
    extended: false,
  })
);

(async function DBconnectMangoose() {
  // connecting to database with env variable
  try {
    console.log("MongoDB connection with retry");
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false, // Don't build indexes
      // reconnectTries: 30, // Retry up to 30 times
      // reconnectInterval: 500, // Reconnect every 500ms
      poolSize: 10, // Maintain up to 10 socket connections
      // If not connected, return errors immediately rather than waiting for reconnect
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB is connected");
  } catch (error) {
    console.error(error);
    console.log("MongoDB connection unsuccessful, retry after 5 seconds.");
    setTimeout(connectWithRetry, 5000);
  }
})();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
  })
);

// Connect flash
app.use(flash());
//Express Session

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Global vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.logged_donor = req.user;
  // res.locals.logged_donor = null;
  res.locals.error = req.flash("error");

  next();
});

const donor_route = require("./routes/donor.route");
const misc_route = require("./routes/misc.route");
app.use("/", donor_route);
app.use("/info", misc_route);

server.listen(process.env.PORT, (error) => {
  console.log(
    error ? error : `***Plasma-19***\nServer up on ${process.env.PORT}`
  );
});
