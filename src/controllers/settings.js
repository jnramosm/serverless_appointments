const { settings } = require("../models");
const utils = require("../utils");

//The following two functions should have token validation
const getSettings = (req, res, next) => {
  // e.g.
  //const accessToken = req.headers.authorization.split(" ")[1]

  settings.getSettings(req.body, (obj) => {
    res.json(obj);
  });
};

const setSettings = (req, res, next) => {
  settings.setSettings(req.body, (message) => res.json(message));
};

const register = (req, res, next) => {
  settings.register(req.body, (message) => res.json(message));
};

const login = (req, res, next) => {
  settings.login(req.body, (message) => res.json(message));
};

const googleCall = (req, res, next) => {
  settings.googleCall(
    utils.google,
    utils.oauth2Client,
    utils.SCOPES,
    (authorizeUrl) => res.redirect(authorizeUrl)
  );
};

const googleCallBack = (req, res, next) => {
  settings.googleCallBack(
    req.url,
    utils.oauth2Client,
    utils.google,
    (redirect) => res.redirect(redirect)
  );
};

const googleRemove = (req, res, next) => {
  settings.googleRemove(req.body.email, (message) => res.json({ message }));
};

const slots = (req, res, next) => {
  settings.slots(req.body, utils.oauth2Client, utils.google, (slotsArray) =>
    res.json(slotsArray)
  );
};

const createEvent = (req, res, next) => {
  settings.createEvent(req.body, utils.oauth2Client, utils.google, (message) =>
    res.json({ message })
  );
};

module.exports = {
  getSettings,
  setSettings,
  register,
  login,
  googleCall,
  googleCallBack,
  googleRemove,
  slots,
  createEvent,
};
