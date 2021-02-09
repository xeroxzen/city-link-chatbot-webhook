"use strict";

// let's hack
// Author: Andile Jaden Mbele
// Program: index.js
// Purpose: webhook for my virtual assistant
var express = require("express");

var app = express();

var dfff = require("dialogflow-fulfillment");

var _require = require("dialogflow-fulfillment"),
    Card = _require.Card,
    Suggestion = _require.Suggestion;

var admin = require("firebase-admin");

var serviceAccount = require("./config/lynxwebhook-firebase-adminsdk-q590u-6fb2939cc9.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lynxwebhook.firebaseio.com"
  });
  console.log("Connected to DB");
} catch (error) {
  console.log("Error here ".concat(error));
}

var db = admin.firestore(); //Let's define port number

var port = process.env.PORT || 8080;
app.get("/", function (req, res) {
  res.send("Yes the server is live dude, go to bed.");
});
app.post("/dialogflow-fulfillment", express.json(), function (req, res) {
  var agent = new dfff.WebhookClient({
    request: req,
    response: res
  }); // First function, let's test if we are running live

  function demo(agent) {
    agent.add("We are live, sending response from Webhook server as [Version 1.1.11.1]");
    agent.add("Okay let's see what we can get up to today");
  } // Second function: this is for telling something nice


  function somethingNice(agent) {
    agent.add("Awesome Work");
  } // Third function: tells a joke


  function somethingCrazy(agent) {
    agent.add("Why were they called the Dark Ages? Because there were lots of knights.");
  } // Prompt the user for where they're travelling from


  function askBookingFrom(agent) {
    var departure = "Please tell us where you are traveling from? \n\nRoutes covered include Bulawayo, Chegutu, Gweru, Kadoma, Kwekwe and Harare.";
    agent.add(departure);
  } // Prompt the user for where they're travelling to


  function askBookingTo(agent) {
    var destination = "What is your travel destination? \n\nRoutes covered include Bulawayo, Chegutu, Gweru, Kadoma, Kwekwe and Harare.";
    agent.add(destination);
  } // Confirm data before saving to db


  function confirmBooking(agent) {
    var firstname = agent.context.get("capture-fullname").parameters.firstname;
    var lastname = agent.context.get("capture-fullname").parameters.lastname;
    var person = agent.context.get("capture-fullname").parameters.person;
    var phone = agent.context.get("confirm-ticket").parameters["phone-number"];
    var travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    var travelTo = agent.context.get("capture-date").parameters.travelTo;
    var travelDate = agent.context.get("capture-schedule").parameters["travel-date"];
    var travelTime = agent.context.get("confirm-booking").parameters["travel-time"]; // Let's join firstname, lastname and person.

    var fullname = "".concat(firstname, " ").concat(lastname); // Let's talk to our agent

    agent.add("Confirm ".concat(fullname || person, " with phone number ").concat(phone, " wishes to travel from ").concat(travelFrom, " to ").concat(travelTo, " on ").concat(travelDate, " in the ").concat(travelTime, ". \nTo proceed type Yes or No to Cancel"));
  } // Confirming #capture-fullname.firstname #capture-fullname.lastname with phone number $phone-number wishes to travel from #capture-to.travel-from to #capture-date.travel-to on #capture-schedule.travel-date.original in the #confirm-booking.travel-time
  // Save the user data to the db


  function confirmationMessage(agent) {
    var firstname = agent.context.get("capture-fullname").parameters.firstname;
    var lastname = agent.context.get("capture-fullname").parameters.lastname;
    var person = agent.context.get("capture-fullname").parameters.person;
    var phone = agent.context.get("confirm-ticket").parameters["phone-number"];
    var travelFrom = agent.context.get("capture-to").parameters.travelFrom;
    var travelTo = agent.context.get("capture-date").parameters.travelTo;
    var travelDate = agent.context.get("capture-schedule").parameters["travel-date"];
    var travelTime = agent.context.get("confirm-booking").parameters["travel-time"]; // Save human readable date

    var dateObject = new Date(); // Let's join firstname, lastname

    var fullname = "".concat(firstname, " ").concat(lastname);
    var busRider = "".concat(person);
    var trip = "".concat(travelFrom, " to ").concat(travelTo); // save trip instead of travelFrom and travelTo

    if (travelFrom == travelTo) {
      agent.add("The trip departure point cannot be the same as the destination. Please start again your booking process. Type Start Over");
    } else {
      agent.add("BOOKING CONFIRMATION \nNAME: ".concat(fullname || busRider[0], " \nPHONE NUMBER: ").concat(phone, " \nTRIP: ").concat(trip, " \nDATE: ").concat(travelDate, " \nTIME: ").concat(travelTime, " \n\nSafe Travels with City Link Luxury Coaches"));
      return db.collection("tickets").add({
        //firstname: firstname,
        //lastname: lastname,
        fullname: fullname,
        busRider: busRider,
        phone: phone,
        trip: trip,
        dateOfTravel: travelDate,
        timeOfTravel: travelTime,
        time: dateObject
      }).then(function (ref) {
        return (//fetching free slots
          console.log("Ticket successfully added.")
        );
      }, agent.add("Ticket reservation successful"));
    }
  } // view all ordered tickets


  function viewTickets() {
    agent.add("We're yet to work on this function..."); // confirmationMessage(agent);
  } // intentMaps, more like a register for all functions


  var intentMap = new Map();
  intentMap.set("webhookDemo", demo);
  intentMap.set("askBookingFrom", askBookingFrom);
  intentMap.set("askBookingTo", askBookingTo);
  intentMap.set("confirmBooking", confirmBooking);
  intentMap.set("confirmationMessage", confirmationMessage);
  intentMap.set("viewTickets", viewTickets);
  intentMap.set("somethingNice", somethingNice);
  intentMap.set("somethingCrazy", somethingCrazy);
  agent.handleRequest(intentMap);
});
app.listen(port, function () {
  console.log("Server is live at port ".concat(port));
  console.log("Press Ctrl+C to abort connection");
});