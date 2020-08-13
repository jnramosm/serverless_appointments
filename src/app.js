"use strict";
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { routes } = require("./routes");
const serverless = require("serverless-http");

const app = express();
// const port = 9000;

app.use(
  cors({
    origin: "https://distracted-jennings-0c5b65.netlify.app",
    credentials: true,
  })
);
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json({ type: "application/json" }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded());

const router = express.Router();

routes(router);

app.use(`/.netlify/functions/app`, router);

module.exports = app;
module.exports.handler = serverless(app);

// app.listen(process.env.PORT || port, () =>
//   console.log(`Listening at port ${port}`)
// );
