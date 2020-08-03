const { connection } = require("../database");
const url = require("url");
const moment = require("moment-timezone");

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
    const dayOfWeek = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
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
          // var since = new Date(data.day);
          var since = moment(data.day).tz("America/Santiago");
          since.hours(parseInt(docs[0][dayOfWeek[day]][0].split(":")[0]));
          since.minutes(parseInt(docs[0][dayOfWeek[day]][0].split(":")[1]));
          since.seconds(0);
          since.milliseconds(0);
          var today = moment().tz("America/Santiago");
          // since.setHours(parseInt(docs[0][dayOfWeek[day]][0].split(":")[0]));
          // since.setMinutes(parseInt(docs[0][dayOfWeek[day]][0].split(":")[1]));
          // since.setSeconds(0);
          // since.setMilliseconds(0);

          var to = moment(data.day).tz("America/Santiago");
          to.hours(parseInt(docs[0][dayOfWeek[day]][1].split(":")[0]));
          to.minutes(parseInt(docs[0][dayOfWeek[day]][1].split(":")[1]));
          to.seconds(0);
          to.milliseconds(0);
          if (to <= today) return res.json(slots);
          if (since <= today && to >= today) {
            since.hours(today.hours() + 1);
          }

          var timeframe =
            to.hours() - since.hours() + (to.minutes() - since.minutes()) / 60;
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
            try {
              await calendar.freebusy.query(
                {
                  resource: {
                    timeMin: since,
                    timeMax: to,
                    items: [{ id: "primary" }],
                  },
                },
                (err, res) => {
                  // Check for errors in our query and log them if they exist.
                  if (err) return console.error("Free Busy Query Error: ", err);

                  // Create an array of all events on our calendar during that time.
                  const events = res.data.calendars.primary.busy;
                  // console.log(events);
                  var first = moment(since);
                  var e = 0;

                  for (var i = 0; i < quantity; i++) {
                    var last = moment(first);
                    last.hours(
                      last.hours() + parseInt(docs[0].sess.split(":")[0])
                    );
                    last.minutes(
                      last.minutes() + parseInt(docs[0].sess.split(":")[1])
                    );

                    var ok = true;
                    if (e < events.length) {
                      var google_start = moment(events[e].start).tz(
                        "America/Santiago"
                      );
                      var google_end = moment(events[e].end).tz(
                        "America/Santiago"
                      );
                      // console.log("first: " + first);
                      // console.log("google: " + google_start);

                      if (google_start >= first && google_start < last) {
                        ok = false;
                        if (google_end <= last) e++;
                      } else if (google_end >= first && google_end < last) {
                        ok = false;
                        e++;
                      }
                    }

                    // console.log(ok);
                    if (ok) {
                      slots.push([
                        ("0" + first.hours()).slice(-2) +
                          ":" +
                          ("0" + first.minutes()).slice(-2),
                        ("0" + last.hours()).slice(-2) +
                          ":" +
                          ("0" + last.minutes()).slice(-2),
                      ]);
                    }

                    first = moment(last);
                    first.minutes(first.minutes());
                  }
                  cb(slots);
                }
              );
              // console.log(events);
            } catch (e) {
              console.log(e);
            }
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
