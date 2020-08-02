const { connection } = require("../database");
const url = require("url");

const getSettings = (user = {}, cb) => {
  connection((db) => {
    db.collection("users").findOne({ email: user.email }, (err, userDb) => {
      if (err) console.log(err);
      obj = {};
      obj["mon"] = userDb.mon;
      obj["tue"] = userDb.tue;
      obj["wed"] = userDb.wed;
      obj["thu"] = userDb.thu;
      obj["fri"] = userDb.fri;
      obj["sat"] = userDb.sat;
      obj["sun"] = userDb.sun;
      obj["sess"] = userDb.sess;
      obj["email"] = userDb.email;
      obj["google"] = userDb.google;
      cb(obj);
    });
  });
};

const setSettings = (user = {}, cb) => {
  connection((db) => {
    db.collection("users").updateOne(
      { email: user.email },
      {
        $set: {
          mon: user.mon,
          tue: user.tue,
          wed: user.wed,
          thu: user.thu,
          fri: user.fri,
          sat: user.sat,
          sun: user.sun,
          sess: user.sess,
        },
      },
      {
        upsert: true,
      },
      (err, userDb) => {
        if (err) console.log(err);
        cb({ message: "Success" });
      }
    );
  });
};

const register = (user = {}, cb) => {
  connection((db) => {
    db.collection("users").findOne({ email: user.email }, (err, data) => {
      if (err) console.log(err);
      if (data) cb({ message: "User exists" });
      else {
        db.collection("users").insert(
          {
            email: user.email,
            mon: [0, 0],
            tue: [0, 0],
            wed: [0, 0],
            thu: [0, 0],
            fri: [0, 0],
            sat: [0, 0],
            sun: [0, 0],
            sess: [0],
            google: false,
          },
          (err, userDb) => {
            if (err) console.log(err);
            cb({ message: "Success" });
          }
        );
      }
    });
  });
};

const login = (user = {}, cb) => {
  connection((db) => {
    db.collection("users").findOne({ email: user.email }, (err, data) => {
      if (err) console.log(err);
      if (data) cb({ message: "Success" });
      else cb({ message: "User does not exist" });
    });
  });
};

const googleCall = (google, client, scopes, cb) => {
  google.options({ auth: client });
  const authorizeUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  cb(authorizeUrl);
};

const googleCallBack = async (reqUrl, client, google, cb) => {
  // Successful authentication, redirect home.
  const qs = new url.URL(reqUrl, "http://localhost:4000").searchParams;
  const { tokens } = await client.getToken(qs.get("code"));
  client.credentials = tokens;
  var email = "";
  const service = google.people({ version: "v1", client });
  await service.people
    .get({ resourceName: "people/me", personFields: "emailAddresses" })
    .then((d) => (email = d.data.emailAddresses[0].value));

  connection((db) => {
    db.collection("users").updateOne(
      { email: email },
      {
        $set: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          google: true,
        },
      },
      {
        upsert: true,
      },
      (err, docs) => {
        if (err) console.log(err);
        cb("http://localhost:3000/");
      }
    );
  });
};

const googleRemove = async (email, cb) => {
  // console.log(email);
  connection((db) => {
    db.collection("users").updateOne(
      { email: email },
      {
        $set: {
          google: false,
          access_token: "",
          refresh_token: "",
        },
      },
      (err, data) => {
        if (err) cb("Error from DB");
        cb("Success");
      }
    );
  });
};

const slots = async (data = {}, client, google, cb) => {
  connection((db) => {
    //Refresh refresh token if necessary
    client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        db.collection("users").updateOne(
          { email: data.email },
          {
            $set: {
              refresh_token: tokens.refresh_token,
            },
          },
          {
            upsert: true,
          },
          (err, docs) => {
            if (err) console.log(err);
          }
        );
      }
    });

    var date = new Date(data.day);
    var day = date.getDay();
    const dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    db.collection("users")
      .find({ email: data.email })
      .toArray()
      .then(async (docs) => {
        var slots = [];
        if (docs[0][dayOfWeek[day]][0] == docs[0][dayOfWeek[day]][1]) cb(slots);
        else {
          var sess_dur =
            parseInt(docs[0].sess.split(":")[0]) +
            parseInt(docs[0].sess.split(":")[1]) / 60;
          var since = new Date(data.day);
          var today = new Date();
          since.setHours(parseInt(docs[0][dayOfWeek[day]][0].split(":")[0]));
          since.setMinutes(parseInt(docs[0][dayOfWeek[day]][0].split(":")[1]));
          since.setSeconds(0);
          since.setMilliseconds(0);
          var to = new Date(data.day);
          to.setHours(parseInt(docs[0][dayOfWeek[day]][1].split(":")[0]));
          to.setMinutes(parseInt(docs[0][dayOfWeek[day]][1].split(":")[1]));
          to.setSeconds(0);
          to.setMilliseconds(0);

          if (to <= today) return res.json(slots);
          if (since <= today && to >= today) {
            since.setHours(today.getHours() + 1);
          }

          var timeframe =
            to.getHours() -
            since.getHours() +
            (to.getMinutes() - since.getMinutes()) / 60;
          var quantity = parseInt(timeframe / sess_dur);

          //Freebusy query
          client.setCredentials({
            refresh_token: docs[0].refresh_token,
          });
          // Create a new calender instance.
          const calendar = google.calendar({
            version: "v3",
            auth: client,
          });

          if (docs[0][dayOfWeek[day]][0] != 0) {
            await calendar.freebusy.query(
              {
                resource: {
                  timeMin: since,
                  timeMax: to,
                  timeZone: "America/Santiago",
                  items: [{ id: "primary" }],
                },
              },
              (err, res) => {
                // Check for errors in our query and log them if they exist.
                if (err) return console.error("Free Busy Query Error: ", err);

                // Create an array of all events on our calendar during that time.
                const events = res.data.calendars.primary.busy;
                // console.log(events);
                var first = new Date(since);
                var e = 0;

                for (var i = 0; i < quantity; i++) {
                  var last = new Date(first);
                  last.setHours(
                    last.getHours() + parseInt(docs[0].sess.split(":")[0])
                  );
                  last.setMinutes(
                    last.getMinutes() + parseInt(docs[0].sess.split(":")[1]) - 1
                  );

                  var ok = true;
                  if (e < events.length) {
                    const google_start = new Date(events[e].start);
                    const google_end = new Date(events[e].end);
                    console.log("first: " + first);
                    console.log("google: " + google_start);
                    if (
                      google_start.getTime() >= first.getTime() &&
                      google_start.getTime() <= last.getTime()
                    ) {
                      ok = false;
                      if (google_end.getTime() <= last.getTime()) e++;
                    } else if (
                      google_end.getTime() >= first.getTime() &&
                      google_end.getTime() <= last.getTime()
                    ) {
                      ok = false;
                      e++;
                    }
                  }

                  // console.log(ok);
                  if (ok) {
                    slots.push([
                      ("0" + first.getHours()).slice(-2) +
                        ":" +
                        ("0" + first.getMinutes()).slice(-2),
                      ("0" + last.getHours()).slice(-2) +
                        ":" +
                        ("0" + last.getMinutes()).slice(-2),
                    ]);
                  }

                  first = new Date(last);
                  first.setMinutes(first.getMinutes() + 1);
                }
                cb(slots);
              }
            );
            // console.log(events);
          } else {
            cb(slots);
          }
        }
      });
  });
};

const createEvent = (data = {}, client, google, cb) => {
  connection(async (db) => {
    await client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        db.collection("users").updateOne(
          { email: data.email_doctor },
          {
            $set: {
              refresh_token: tokens.refresh_token,
            },
          },
          {
            upsert: true,
          },
          (err, docs) => {
            if (err) console.log(err);
          }
        );
      }
    });
    var name = data.name;
    var email = data.email_customer;
    var date = data.date;
    var slot = data.slot;
    var start = new Date(date);
    start.setHours(parseInt(slot.split("/")[0].split(":")[0]));
    start.setMinutes(parseInt(slot.split("/")[0].split(":")[1]));
    var end = new Date(date);
    end.setHours(parseInt(slot.split("/")[1].split(":")[0]));
    end.setMinutes(parseInt(slot.split("/")[1].split(":")[1]) + 1);

    db.collection("users")
      .find({ email: data.email_doctor })
      .toArray()
      .then(async (docs) => {
        await client.setCredentials({
          refresh_token: docs[0].refresh_token,
        });
        // Create a new calender instance.
        const calendar = google.calendar({
          version: "v3",
          auth: client,
        });
        var event = {
          summary: "Appointment",
          description:
            "Hello " +
            name +
            ":\nYour appointment has been scheduled. See you soon!",
          start: {
            dateTime: start,
          },
          end: {
            dateTime: end,
          },
          attendees: [{ email: data.email_doctor }, { email }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 },
              { method: "popup", minutes: 10 },
            ],
          },
        };
        calendar.events.insert(
          {
            auth: client,
            calendarId: "primary",
            resource: event,
            sendUpdates: "all",
          },
          function (err, event) {
            if (err) {
              console.log(
                "There was an error contacting the Calendar service: " + err
              );
              cb("Error: " + err);
            }
            cb("Success");
          }
        );
      });
  });
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
