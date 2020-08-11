// require("dotenv").config();
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const pem = require("jwk-to-pem");
const axios = require("axios");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
];
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://blissful-austin-a1bf3a.netlify.app/.netlify/functions/app/google/callback"
);

const timeZone = "America/Santiago";

const decode = (token, pm, cb) => {
  jwt.verify(token, pm, { algorithms: ["RS256"] }, (err, decoded) => {
    cb(decoded);
  });
};

const getPublicKeys = async () => {
  const url = `https://cognito-idp.us-east-2.amazonaws.com/${process.env.POOL_ID}/.well-known/jwks.json`;
  let d = await axios.get(url);
  const cacheKeys = d.data.keys.reduce((agg, current) => {
    const p = pem(current);
    agg[current.kid] = { instance: current, p };
    return agg;
  });
  return cacheKeys;
};

const verifyToken = async (accessToken, cb) => {
  const token = accessToken.split(" ")[1];
  const tokenSections = (token || "").split(".");
  if (tokenSections.length < 2) {
    throw new Error("requested token is invalid");
  }
  const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8");
  const header = JSON.parse(headerJSON);
  const keys = await getPublicKeys();
  const key = keys[header.kid];
  if (key === undefined) {
    throw new Error("claim made for unknown kid");
  }
  decode(token, key.p, (decoded) => {
    const currentSeconds = Math.floor(new Date().valueOf() / 1000);
    if (currentSeconds > decoded.exp || currentSeconds < decoded.auth_time) {
      throw new Error("claim is expired or invalid");
      //cb(false)
    }
    if (
      decoded.iss !==
      `https://cognito-idp.us-east-2.amazonaws.com/${process.env.POOL_ID}` //poolId
    ) {
      throw new Error("claim issuer is invalid");
      //cb(false)
    }
    if (decoded.token_use !== "access") {
      throw new Error("claim use is not access");
      //cb(false)
    }
    console.log(`claim confirmed for ${decoded.username}`);
    cb(true);
  });
};

module.exports = {
  SCOPES,
  oauth2Client,
  google,
  timeZone,
  verifyToken,
};
