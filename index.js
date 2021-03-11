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
var moment = require("moment");
const { uuid } = require("uuidv4"); // require
require("dotenv").config();
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
        agent.add(
          `On what date would you like to travel? \n\nExample: 30 January or next week Friday`
        );
      }
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
    agent.context.set({
    'name':'backend-captured-email',
    'lifespan': 6,
    'parameters':{
      'email':agent.query
      }
  });
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

  async function checkPaymentStatus(agent){
    const pollUrl = agent.context.get("capture_payment_status_information").parameters.pollUrl;
    const amount = agent.context.get("capture_payment_status_information").parameters.amount;
    const ticketID = agent.context.get("capture_payment_status_information").parameters.ticketID;
    const trip = agent.context.get("capture_payment_status_information").parameters.trip;
    const date = agent.context.get("capture_payment_status_information").parameters.date;
    const time = agent.context.get("capture_payment_status_information").parameters.time;
    const phone = agent.context.get("capture_payment_status_information").parameters.phone;

    let paynow = new Paynow(process.env.PAYNOW_INTEGRATION_ID, process.env.PAYNOW_INTEGRATION_KEY);
    let response = await paynow.pollTransaction(pollUrl);
    let status = await response.status;
    if (status==='paid' || status=='awaiting delivery' || status=='delivered') {
      agent.add(
        `You have successfully booked you ticket! \r\n` + 
        `TICKET ID: ${ticketID} \r\n` +
        `AMOUNT: ZWL${amount} \r\n` +
        `TRIP: ${trip} \r\n` +
        `DATE: ${date} \r\n` +
        `TIME: ${time} \r\n` +
        `PHONE: ${phone} \r\n`
      );
    } else {
      if (status == 'cancelled' || status=='refunded' || status=='disputed'){
        agent.add("Rate payment transaction successfully cancelled!");
      }
      else if(status == 'sent' || status=='pending' || status=='created')
        agent.add("You have not completed your payment!");
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
    var firstname = agent.context.get("confirm-booking").parameters.firstname;
    var lastname = agent.context.get("confirm-booking").parameters.lastname;
    var paymentEmail = agent.context.get("backend-captured-email").parameters.email;
    var paymentMethod = agent.context.get("capture-payment-method").parameters['payment-method'];
    var paymentAccount = agent.context.get("capture-payment-account").parameters.paymentAccount;
    var person = agent.context.get("capture-fullname").parameters.person;
    var phone = agent.context.get("capture-fullname").parameters.phoneNumber;
    var travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    var travelTo = agent.context.get("capture-date").parameters.travelTo;
    var travelDate = agent.context.get("capture-schedule").parameters[
      "travel-date"
    ];

    var travelTime = agent.context.get("capture-schedule").parameters[
      "travel-time"
    ];
    var trip = `${travelFrom} to ${travelTo}`;
    var trip_vv = `${travelTo} to ${travelFrom}`;

    var amount = 0;
    var possible_trips = {
      "bulawayo to harare": 2500.00,
      "bulawayo to gweru": 1000.00,
      "bulawayo to kadoma": 1800.00,
      "bulawayo to kwekwe": 1500.00,
      "bulawayo to chegutu": 1200.00,
      "harare to gweru": 1500.00,
      "harare to kadoma": 1500.00,
      "harare to kwekwe": 1500.00,
      "chegutu to kweru": 800.00,
    "chegutu to kadoma": 700.00,
    "chegutu to kwekwe": 900.00,
      "gweru to kadoma": 500.00,
    "gweru to kwekwe": 500.00,
      "Kkwekwe to kadoma": 500.00
    }

    if (trip.toLowerCase() in possible_trips)
      amount = possible_trips[trip.toLowerCase()];
    else if(trip_vv.toLowerCase() in possible_trips)
      amount = possible_trips[trip_vv.toLowerCase()];
    else
      //for testing only
      amount = 2000.00;

    //if (amount !== 0 && amount !== NaN && amount !== "undefined"){
      // Save human readable date
      const dateObject = new Date();

      //new Unix TimeStamp
      var momentTravelDate = moment(travelDate, "YYYY-MM-DD HH:mm:ss").toDate();

      // moment().format('LLLL');

      // Let's join firstname, lastname
      var fullname = `${firstname} ${lastname}`;
       // save trip instead of travelFrom and travelTo

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
    /*
      agent.add(
          `BOOKING CONFIRMATION \n\nFull Name: ${
            fullname || person
          } \nPHONE NUMBER: ${phone} \nTRIP: ${trip} \nTRAVEL DATE: ${momentTravelDate} \nTRAVEL TIME: ${travelTime} \nTICKET ID: ${ticketId} \n\nSafe Travels with City Link Luxury Coaches`
    );
    */

      //Telegram and Messenger
      let paynow = new Paynow(process.env.PAYNOW_INTEGRATION_ID, process.env.PAYNOW_INTEGRATION_KEY);
      let payment = paynow.createPayment(ticketId, paymentEmail);
      payment.add(`Bus fare(${trip})`, amount);
      response = await paynow.sendMobile(payment, paymentAccount, paymentMethod.toLowerCase());
      if(response.success) {     
          var paynowReference = response.pollUrl;
            var id = uuid();

            /*
              agent.add(
              `BOOKING CONFIRMATION \n\nFull Name: ${
                fullname || person
              } \nPHONE NUMBER: ${phone} \nTRIP: ${trip} \nTRAVEL DATE: ${momentTravelDate} \nTRAVEL TIME: ${travelTime} \nTICKET ID: ${ticketId} \n\nSafe Travels with City Link Luxury Coaches`
        );*/
          // save to db
        agent.add("A popup will appear, enter your pn number to complete the payment. After making your payment, click CHECK PAYMENT STATUS");
      agent.add(new Suggestion("Check payment status"));
        agent.context.set('capture_payment_status_information',5,{
            "pollUrl": paynowReference, 
            "ticketID": ticketId,
            "amount": amount,
            "trip": trip,
            "date": momentTravelDate,
            "time": travelTime,
            "phone": phone
        });
        
    return;
    /*return db
      .collection("tickets")
      .add({
                //firstname: firstname,
                //lastname: lastname,
                fullname: fullname,
                person: person,
                phone: phone,
                trip: trip,
                amount: amount,
                // dateOfTravel: travelDate,
                momentTravelDate: momentTravelDate,
                timeOfTravel: travelTime,
                time: dateObject,
                ticketId: ticketId,
                status: 'pending',
                // reservationId: uuidV1(),
                paymentMethod: paymentMethod,
                paymentAccount: paymentAccount,
                paynowReference: paynowReference,
                paymentEmail: paymentEmail,
      })
      .then(
        (ref) =>
          console.log('success')
      );*/
    } else {
      gent.add("Whoops something went wrong!");
      console.log(response.error);
    }
  //}
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
  intentMap.set("done", done);
  // intentMap.set("confirmBooking", confirmBooking);
  intentMap.set("confirmationMessage", confirmationMessage);
  intentMap.set("viewTickets", viewTickets);
  intentMap.set("issuedTo", issuedTo);
  intentMap.set("somethingNice", somethingNice);
  intentMap.set("somethingCrazy", somethingCrazy);
  intentMap.set("checkPaymentStatus", checkPaymentStatus);
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
