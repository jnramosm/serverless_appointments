const { connection } = require("../database");
const url = require("url");
const moment = require("moment-timezone");
const { verifyToken } = require("../utils");
const { Console } = require("console");

const timeZone = "America/Santiago";
const domainApi =
  "https://blissful-austin-a1bf3a.netlify.app/.netlify/functions/app";
const domainSite = "http://localhost:3000";

const getSettings = async (user = {}, accessToken, cb) => {
  verifyToken(accessToken, (ok) => {
    if (ok) {
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
          obj["mon_b"] = userDb.mon_b;
          obj["tue_b"] = userDb.tue_b;
          obj["wed_b"] = userDb.wed_b;
          obj["thu_b"] = userDb.thu_b;
          obj["fri_b"] = userDb.fri_b;
          obj["sat_b"] = userDb.sat_b;
          obj["sun_b"] = userDb.sun_b;
          obj["sess"] = userDb.sess;
          obj["email"] = userDb.email;
          obj["google"] = userDb.google;
          obj["val"] = userDb.val;
          cb(obj);
        });
      });
    }
  });
};

const getSettingsPublic = async (user = {}, cb) => {
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
      obj["val"] = userDb.val;
      cb(obj);
    });
  });
};

const setSettings = (user = {}, accessToken, cb) => {
  verifyToken(accessToken, (ok) => {
    if (ok) {
      connection((db) => {
        db.collection("users").updateOne(
          { email: user.email },
          {
            $set: {
              mon: user.available.mon,
              tue: user.available.tue,
              wed: user.available.wed,
              thu: user.available.thu,
              fri: user.available.fri,
              sat: user.available.sat,
              sun: user.available.sun,
              mon_b: user.unavailable.mon,
              tue_b: user.unavailable.tue,
              wed_b: user.unavailable.wed,
              thu_b: user.unavailable.thu,
              fri_b: user.unavailable.fri,
              sat_b: user.unavailable.sat,
              sun_b: user.unavailable.sun,
              sess: user.available.sess,
              val: user.val,
            },
          },
          {
            upsert: true,
          },
          (err, userDb) => {
            if (err) console.log(err);
            cb({ message: "success" });
          }
        );
      });
    }
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
            mon_b: [0, 0],
            tue_b: [0, 0],
            wed_b: [0, 0],
            thu_b: [0, 0],
            fri_b: [0, 0],
            sat_b: [0, 0],
            sun_b: [0, 0],
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

// const login = (user = {}, cb) => {
//   connection((db) => {
//     db.collection("users").findOne({ email: user.email }, (err, data) => {
//       if (err) console.log(err);
//       if (data) cb({ message: "Success" });
//       else cb({ message: "User does not exist" });
//     });
//   });
// };

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
  const qs = new url.URL(reqUrl, domainApi).searchParams;
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
        cb(domainSite);
      }
    );
  });
};

const googleRemove = async (email, accessToken, cb) => {
  verifyToken(accessToken, (ok) => {
    if (ok) {
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
    }
  });
  // console.log(email);
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
    var date = moment(data.day);
    var day = date.day();
    const dayOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    db.collection("users")
      .find({ email: data.email })
      .toArray()
      .then(async (docs) => {
        var slots = [];
        if (docs[0][dayOfWeek[day]][0] == docs[0][dayOfWeek[day]][1]) {
          cb(slots);
        } else {
          var sess_dur =
            parseInt(docs[0].sess.split(":")[0]) +
            parseInt(docs[0].sess.split(":")[1]) / 60;
          // var since = new Date(data.day);
          var since = moment(data.day).tz(timeZone);
          since.hours(parseInt(docs[0][dayOfWeek[day]][0].split(":")[0]));
          since.minutes(parseInt(docs[0][dayOfWeek[day]][0].split(":")[1]));
          since.seconds(0);
          since.milliseconds(0);
          var today = moment().tz(timeZone);
          var to = moment(data.day).tz(timeZone);
          to.hours(parseInt(docs[0][dayOfWeek[day]][1].split(":")[0]));
          to.minutes(parseInt(docs[0][dayOfWeek[day]][1].split(":")[1]));
          to.seconds(0);
          to.milliseconds(0);

          var break_start = moment(data.day).tz(timeZone);
          break_start.hours(
            parseInt(docs[0][`${dayOfWeek[day]}_b`][0].split(":")[0])
          );
          break_start.minutes(
            parseInt(docs[0][`${dayOfWeek[day]}_b`][0].split(":")[1])
          );
          break_start.seconds(0);
          break_start.millisecond(0);

          var break_end = moment(data.day).tz(timeZone);
          break_end.hours(
            parseInt(docs[0][`${dayOfWeek[day]}_b`][1].split(":")[0])
          );
          break_end.minutes(
            parseInt(docs[0][`${dayOfWeek[day]}_b`][1].split(":")[1])
          );
          break_end.seconds(0);
          break_end.millisecond(0);

          if (to <= today) {
            cb(slots);
            return null;
          }
          if (since <= today && to >= today) {
            since.hours(today.hours() + 1);
            if (since >= to) {
              cb(slots);
              return null;
            }
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

                    if (break_start >= first && break_start < last) ok = false;
                    else if (break_end >= first && break_end < last) ok = false;

                    if (e < events.length) {
                      var google_start = moment(events[e].start).tz(timeZone);
                      var google_end = moment(events[e].end).tz(timeZone);

                      if (
                        !ok &&
                        google_end <= last &&
                        google_start >= first &&
                        google_start < last
                      )
                        e++;
                      else if (!ok && google_end >= first && google_end < last)
                        e++;
                      else {
                        if (google_start >= first && google_start < last) {
                          ok = false;
                          if (google_end <= last) e++;
                        } else if (google_end >= first && google_end < last) {
                          ok = false;
                          e++;
                        }
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
    var email = data.email;
    var date = data.date;
    var slot = data.slot;
    var start = moment(date).tz(timeZone);
    start.hours(parseInt(slot.split("/")[0].split(":")[0]));
    start.minutes(parseInt(slot.split("/")[0].split(":")[1]));
    var end = moment(date).tz(timeZone);
    end.hours(parseInt(slot.split("/")[1].split(":")[0]));
    end.minutes(parseInt(slot.split("/")[1].split(":")[1]));

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
          summary: "Hora nutricional con Nutricionista María Jesús Ramos",
          description:
            "Hola " +
            name +
            ":\nSe ha reservado tu hora con éxito. Nos vemos pronto!",
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
  getSettingsPublic,
  setSettings,
  register,
  // login,
  googleCall,
  googleCallBack,
  googleRemove,
  slots,
  createEvent,
};
