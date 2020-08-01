const { settings } = require("../controllers");

const routes = (app) => {
  app.get("/", (req, res) => res.send("Hello world!"));

  //Change to post and send tokens to add more security to this function
  app.post("/getsettings", settings.getSettings);

  app.post("/setsettings", settings.setSettings);

  app.post("/register", settings.register);

  app.post("/login", settings.login);

  app.get("/google", settings.googleCall);

  app.get("/google/callback", settings.googleCallBack);

  app.post("/google/remove", settings.googleRemove);

  app.post("/slots", settings.slots);

  app.post("/createevent", settings.createEvent);
};

module.exports = {
  routes,
};
