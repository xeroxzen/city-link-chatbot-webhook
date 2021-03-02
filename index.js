// let's hack
// Author: Andile Jaden Mbele
// Program: index.js
// Purpose: webhook for City Link virtual assistant
//https://lynx-heroku.herokuapp.com/booking
const express = require("express");
const { Paynow } = require("paynow");
const app = express();
const dfff = require("dialogflow-fulfillment");
const { Card, Suggestion } = require("dialogflow-fulfillment");
var moment = require("moment"); // require
//moment().format();
moment().format("LLLL");

// firebase admin credentials
var admin = require("firebase-admin");

var serviceAccount = require("./config/lynxwebhook-firebase-adminsdk-q590u-6fb2939cc9.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lynxwebhook.firebaseio.com",
  });

  console.log("Connected to DB");
} catch (error) {
  console.log(`Error here ${error}`);
}

var db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

//Let's define port number
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Yes the server is live dude, go to bed.");
});

app.post("/booking", express.json(), (req, res) => {
  const agent = new dfff.WebhookClient({
    request: req,
    response: res,
  });

  // First function, let's test if we are running live
  function demo(agent) {
    agent.add("We are live, sending response from Webhook server as [v107]");
  }

  // Second function: this is for telling something nice
  function somethingNice(agent) {
    agent.add("Awesome Work");
  }

  // Third function: tells a joke
  function somethingCrazy(agent) {
    agent.add(
      "Why were they called the Dark Ages? Because there were lots of knights."
    );
  }


  function askName(agent) {
    agent.add("I am an AI assistant, you can call me Lynx");
  }

  // travel destination booking error
 async function travelDestinationErrorChecking(agent) {
    let travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    let travelTo = agent.context.get("capture-date").parameters.travelTo;

  //simplify
    var trip = `${travelFrom} to ${travelTo}`;

    if (travelFrom == travelTo) {
      agent.add(
          `The trip departure point cannot be the same as the destination.`
      );
  }
  //make sure we have a fare for this trip
  else{
    await db.collection("trips")
        .where("to","=",travelFrom)
        .where("from","=",travelTo)
        .limit(1)
        .get()
        .then(snapshot => {
          if (snapshot.size == 0)
            agent.add("We currently do not cover the route you selected!");
            agent.add(new Suggestion(`Start Over`));
            agent.add(new Suggestion(`Cancel`));
      });
  }
  }

  // Starts here
  async function askBookingDate(agent) {
    let travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    let travelTo = agent.context.get("capture-date").parameters.travelTo;

    // simplify
    var trip = `${travelFrom} to ${travelTo}`;

    if (travelFrom == travelTo) {
      agent.add(
        `The trip departure point cannot be the same as the destination.`
      );
      // Quick reply suggestions
      // agent.add("Choose your travel destination one more time!");
      agent.add(new Suggestion(`Start Over`));
      agent.add(new Suggestion(`Cancel`));

      // agent.setContext({
      //   name: "askBookingDate",
      //   lifespan: 5,
      //   parameters: { travelTo: "" },
      // });

      //Quick Reply
      // agent.add(
      //   new QuickReply([
      //     "Bulawayo",
      //     "Chegutu",
      //     "Gweru",
      //     "Harare",
      //     "Kadoma",
      //     "Kwekwe",
      //   ])
      // );
      // Ends here

      //this starts here
    } else if (travelFrom == null) {
      console.log("Blank departure point");
      agent.add(
        `The trip departure point cannot be empty. Please start again your booking process. Type Start Over`
      );
      // Suggestions
      agent.add(new Suggestion(`Start Over`));
      agent.add(new Suggestion(`Cancel`));
    } 
    else{
    await db.collection("trips")
        .where("to","==",travelTo)
        .where("from","==",travelFrom)
        .limit(1)
        .get()
        .then(snapshot => {
          if (snapshot.size == 0){
            agent.add("We currently do not cover the route you selected!");
            agent.add(new Suggestion(`Start Over`));
          agent.add(new Suggestion(`Cancel`));
          }
          else{
            agent.add(
              `On what date would you like to travel? \n\nExample: 30 January or next week Friday`
            );
          }
      })
      .catch(ex => {
        console.log("Something is really wrong", ex);
      });
  }
  }

  async function askTime(agent){
    let travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    let travelTo = agent.context.get("capture-date").parameters.travelTo;
    let travelDate = agent.context.get("capture-schedule").parameters[
      "travel-date"
    ];

    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let day = days[Date(travelDate).getDay()];
    let day = "Monday";
    await db.collection("trips")
      .where("to","=",travelFrom)
      .where("from","=",travelTo)
      .where("days." + day + ".id" , "==" , day)
      .limit(1)
      .get()
      .then(snapshot => {
        if (snapshot.size == 0){
          agent.add("The date you selected has no coach services!");
          agent.add(new Suggestion(`Start Over`));
        agent.add(new Suggestion(`Cancel`));
        }
        else{
          let fare =  snapshot.docs[0].data();
          agent.add("Choose your preferred Departure time?");
          fare.days.forEach((key,value)=>{
            agent.add(new Suggestion(key));
          });
        }
    });
  }

  // Get Traveller's Name
  function askTravellersName(agent) {
    //make sure the date is valid
    agent.add("May I have your first name and surname to finish booking?");
  }

  function askEmail(agent){
    agent.add("May i have your email address");
  }

  function askPaymentMethod(agent) {
    agent.add("How will you settle this transaction?");
    agent.add(new Suggestion("EcoCash"));
    agent.add(new Suggestion("OneMoney"));
  }

  function askPaymentAccount(agent) {
    agent.add("May i have you mobile money account number?");
  }

  //Get Traveller's Phone
  function askTravellersPhone(agent) {
    var firstname = agent.context.get("capture-fullname").parameters.firstname;
    var lastname = agent.context.get("capture-fullname").parameters.lastname;
    var person = agent.context.get("capture-fullname").parameters.person;

    var name = `${firstname} ${lastname}`;
    if (name == null || name == "" || person == null) {
      agent.add(
        "The name of the one travelling is required. The section cannot be empty."
      );
    } else {
      agent.add(
        "May I have your valid mobile phone number please. \n\nFormat: 0776814777"
      );
    }
  }

  // ticket id function
  function ticketID() {
    //format: CityLink-yymmdd-count

    const date = new Date();
    var dateString = formatDate(date);
    var num = (Math.floor(Math.random() * 1000) + 1).toString();
    num.length == 1 && (num = "0" + num);
    num.length == 2 && (num = "0" + num);

    return `CityLink-${dateString}-${num}`;
  }

  //format date
  function formatDate(date) {
    let str = "";
    var y = date.getFullYear().toString();
    var m = (date.getMonth() + 1).toString();
    var d = date.getDate().toString();

    d.length == 1 && (d = "0" + d);
    m.length == 1 && (m = "0" + m);

    str = y + m + d;
    return str;
  }

  // Save the user data to the db
  async function confirmationMessage(agent) {
    var firstname = agent.context.get("capture-fullname").parameters.firstname;
    var lastname = agent.context.get("capture-fullname").parameters.lastname;
    var paymentEmail = agent.context.get("capture-email").parameters.email;
    var paymentMethod = agent.context.get("capture-payment-method").parameters.paymentType;
    var paymentAccount = agent.context.get("capture-payment-account").parameters.paymentAccount;
    var person = agent.context.get("capture-fullname").parameters.person;
    var phone = agent.context.get("confirm-ticket").parameters.phoneNumber;
    var travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    var travelTo = agent.context.get("capture-date").parameters.travelTo;
    var travelDate = agent.context.get("capture-schedule").parameters[
      "travel-date"
    ];
    var travelTime = agent.context.get("confirm-booking").parameters[
      "travel-time"
    ];

    var amount = 0;
    // get fare
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let day = days[Date(travelDate).getDay()];
     await db.collection("trips")
      .where("to","=",travelFrom)
      .where("from","=",travelTo)
      .where("days." + day + ".id" , "==" , day)
      .limit(1)
      .get()
      .then(snapshot => {
        if (snapshot.size == 0){
          agent.add("We currently do not cover the route you select!");
          agent.add(new Suggestion(`Start Over`));
        agent.add(new Suggestion(`Cancel`));
        }
        else{
          let fare =  snapshot.docs[0].data();
        if (travelTime in fare.days[day]){
          amount = fare.days[day][travelTime];
        }         
          else{
            agent.add("The date you selected has no coach services!");
            agent.add(new Suggestion(`Start Over`));
          agent.add(new Suggestion(`Cancel`));
          }
        }
    });

    if (amount !== 0 && amount !== NaN && amount !== "undefined"){
      // Save human readable date
      const dateObject = new Date();

      //new Unix TimeStamp
      var momentTravelDate = moment(travelDate, "YYYY-MM-DD HH:mm:ss").toDate();

      // moment().format('LLLL');

      // Let's join firstname, lastname
      var fullname = `${firstname} ${lastname}`;
      var trip = `${travelFrom} to ${travelTo}`; // save trip instead of travelFrom and travelTo

      //ticket // IDEA:
      var ticketId = ticketID(); //uniqid.process();

      //reservation id
      // var reservationId = uuidV1();

      //Testing
      console.log(
        `\n\nNAME: ${
          fullname || person
        } \nPHONE NUMBER: ${phone} \nTRIP: ${trip} \nDATE: ${travelDate} \nTIME: ${travelTime} \nTicket ID: ${ticketId} \nMoment Time: ${momentTravelDate}`
      );

      agent.add(
          `BOOKING CONFIRMATION \n\nFull Name: ${
            fullname || person
          } \nPHONE NUMBER: ${phone} \nTRIP: ${trip} \nTRAVEL DATE: ${momentTravelDate} \nTRAVEL TIME: ${travelTime} \nTICKET ID: ${ticketId} \n\nSafe Travels with City Link Luxury Coaches`
    );

      //Telegram and Messenger

      let paynow = new Paynow("INTEGRATION_ID", "INTEGRATION_KEY");
      let payment = paynow.createPayment(ticketId, paymentEmail);
      payment.add(`Bus fare(${trip})`, amount);
      paynow.sendMobile(payment, paymentAccount, paymentMethod.toLowerCase())
        .then(function(response) {
          if(response.success) {     
          var paynowReference = response.pollUrl;
              //save the id
              var id = uuid();
              agent.add(
              `BOOKING CONFIRMATION \n\nFull Name: ${
                fullname || person
              } \nPHONE NUMBER: ${phone} \nTRIP: ${trip} \nTRAVEL DATE: ${momentTravelDate} \nTRAVEL TIME: ${travelTime} \nTICKET ID: ${ticketId} \n\nSafe Travels with City Link Luxury Coaches`
        );
              // save to db
              return db
              .collection("tickets")
              .add({
                //firstname: firstname,
                //lastname: lastname,
                fullname: fullname,
                person: person,
                phone: phone,
                trip: trip,
                fare: fare,
                // dateOfTravel: travelDate,
                momentTravelDate: momentTravelDate,
                timeOfTravel: travelTime,
                time: dateObject,
                ticketId: ticketId,
                // reservationId: uuidV1(),
                paymentMethod: paymentMethod,
                paymentAccount: paymentAccount,
                paynowReference: paynowReference,
                paymentEmail: paymentEmail,
            })
            .then(
              (ref) =>
                //fetching free slots

                console.log("Ticket successfully added."),
              agent.add(`Your ticket reservation was successful.`)
            );
          } else {
            gent.add("Whoops something went wrong!");
            console.log(response.error);
          }
      }).catch(ex => {
        agent.add("Whoops something went wrong!");
        console.log("Something is really wrong", ex)
      });  
  }
  }

  //finished
  function done(agent) {
    agent.add("Thank you for using City Link. We hope to see you again.");
  }

  // view all ordered tickets
  function viewTickets(agent) {
    agent.add(`Give us the name of the person whom the ticket was issued to.`);
  }

  // reading data from db
  function issuedTo(agent) {
    // name
    var name = agent.context.get("viewTicket").parameters.person;
    // var surname = agent.context.get("viewTicket").parameters["last-name"];
    // const phone = agent.context.get("viewTicket").parameters.phone;
    const docRef = db.collection("tickets").doc(sessionId);

    return docRef
      .get()
      .then((doc) => {
        if (!doc.exists) {
          agent.add("No data found in the database!");
        } else {
          agent.add(doc.data().name);
        }
        return Promise.resolve("Read Complete");
      })
      .catch(() => {
        agent.add(
          "Could not retrieve your ticket information from the database"
        );
      });
  }

  // intentMaps, more like a register for all functions
  var intentMap = new Map();
  intentMap.set("webhookDemo", demo);
  // intentMap.set("askBookingFrom", askBookingFrom);
  // intentMap.set("askBookingTo", askBookingTo);
  intentMap.set("askBookingDate", askBookingDate);
  intentMap.set("askName", askName);
  intentMap.set("askTravellersName", askTravellersName);
  intentMap.set("askTravellersPhone", askTravellersPhone);
  intentMap.set("askEmail", askEmail);
  intentMap.set("askPaymentMethod", askPaymentMethod);
  intentMap.set("askPaymentAccount", askPaymentAccount);
  intentMap.set("askTime", askTime);
  intentMap.set("done", done);
  // intentMap.set("confirmBooking", confirmBooking);
  intentMap.set("confirmationMessage", confirmationMessage);
  intentMap.set("viewTickets", viewTickets);
  intentMap.set("issuedTo", issuedTo);
  intentMap.set("Ask.booking.schedule",askTime);
  intentMap.set("somethingNice", somethingNice);
  intentMap.set("somethingCrazy", somethingCrazy);
  // intentMap.set(
  //   "travelDestinationErrorChecking",
  //   travelDestinationErrorChecking
  // );

  agent.handleRequest(intentMap);
});

app.listen(port, () => {
  console.log(`Server is live at port ${port}`);
  console.log("Press Ctrl+C to abort connection");
});
