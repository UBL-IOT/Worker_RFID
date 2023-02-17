const router = require("express").Router();
var q = "rfid";
const mongo = require("mongoose");
const db = mongo.connection;
KonekRmq();

function KonekRmq() {
  require("amqplib/callback_api").connect(
    {
      protocol: "amqp",
      hostname: "103.167.112.188",
      port: "5672",
      username: "blits",
      password: "blits123abc45",
      vhost: "/blits_ambulance",
    },
    function (err, conn) {
      try {
        if (err) {
          console.log("Tidak Ada Koneksi Internet");
          Reconnect();
        } else {
          console.log("Terhubung Ke Rmq");
          consumer(conn);
        }
      } catch (e) {
        console.log("Koneksi Rmq Error");
      }
    }
  );
}

function consumer(conn) {
  try {
    var ok = conn.createChannel(on_open);
    function on_open(err, ch) {
      ch.consume(q, function (msg) {
        if (msg == null) {
          console.log("Message Tidak Ada");
        } else {
          console.log(msg.content.toString());
          ch.ack(msg);
          var json = msg.content.toString();
          const obj = JSON.parse(json);
          var NO_KARTU = obj.NO_KARTU;
          var ID_CARD = obj.ID_CARD;
          var STATUS = obj.STATUS;
          const date = require("date-and-time");
          const now = new Date();
          const Time = date.format(now, "YYYY/MM/DD HH:mm:ss");

          // Display the result
          console.log("current date and time : " + Time);
          console.log(Time);
          const History = {
            NO_KARTU: NO_KARTU,
            ID_CARD: ID_CARD,
            STATUS: STATUS,
            Time,
          };
          try {
            Save(History);
          } catch (e) {
            console.log("Error");
          }
        }
      });
    }
  } catch (e) {
    console.log("Error");
  }
}

function Save(history) {
  Koneksi();
  try {
    db.collection("data_kartus")
      .findOne({ ID_CARD: history.ID_CARD })
      .then((data) => {
        if (data) {
          console.log("Data Kartu Sama");
        } else {
          db.collection("data_kartus").findOne(
            {},
            { sort: { NO_KARTU: -1 } },
            (err, data) => {
              if (data == null) {
                history.NO_KARTU = 1;
                db.collection("data_kartus").insertOne(history, function (err) {
                  if (err) {
                    console.log("Gagal");
                  } else {
                    console.log("Berhasil Menyimpan data Kartu");
                  }
                });
              } else {
                history.NO_KARTU = data.NO_KARTU + 1;
                db.collection("data_kartus").insertOne(history, function (err) {
                  if (err) {
                    console.log("Gagal");
                  } else {
                    console.log("Berhasil Menyimpan data Kartu");
                  }
                });
              }
            }
          );
        }
      });
  } catch (e) {
    console.log("Error");
  }
}

function Koneksi() {
  mongo.connect("mongodb://127.0.0.1:27017/rfid", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    db.once("open", () => console.log("Berhasil Terhubung ke database"));
  } catch (e) {
    db.on("error", (error) => console.error(error));
    console.log(error);
  }
}

function Reconnect() {
  console.log("Menghubungkan Ulang Ke Rmq");
  KonekRmq(setInterval, 1000);
}
module.exports = { router, Koneksi };
