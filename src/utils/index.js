// require("dotenv").config();
const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
];
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  // "http://localhost:9000/.netlify/functions/app/google/callback"
  "https://blissful-austin-a1bf3a.netlify.app/.netlify/functions/app/google/callback"
);

const timeZone = "America/Santiago";

module.exports = {
  SCOPES,
  oauth2Client,
  google,
  timeZone,
};
