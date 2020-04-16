'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.misDatos = functions.https.onCall((data, context) => {
    if (!context.auth) {
        return null;
    }
    const userId = context.auth.uid;
    var database = admin.database();
    var usuarioRef = database.ref('usuarios/' + userId);
    return usuarioRef.once('value').then((snapshot) => {
        var datos = snapshot.val();
        if (!datos){
            datos = {
                nombre: userId,
                arquero: "0",
                defensa: ["0","0","0","0"],
                medio: ["0","0","0"],
                ataque: ["0","0","0"],
                perdidos: 0,
                ganados: 0,
                empatados: 0,
                nivel: 0,
                jugadores: [],
                favor: 0,
                contra: 0,
            };
            usuarioRef.set(datos);
        }
        return datos;
    });
});
exports.noJugar = functions.https.onCall((data, context) => {
    if (!context.auth) {
        return null;
    }
    const userId = context.auth.uid;
    var database = admin.database();
    var matchRef = database.ref("matchs");
    matchRef.orderByChild("visita").equalTo(userId).once("value", (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        var key = childSnapshot.key;
        database.ref('matchs/' + key).remove();
      });
    });
    matchRef.orderByChild("local").equalTo(userId).once("value", (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        var key = childSnapshot.key;
        database.ref('matchs/' + key).remove();
      });
    });
    return null;
});
exports.nvoNombre = functions.https.onCall((nombre, context) => {
  const userId = context.auth.uid;
  var database = admin.database();
  var usuarioRef = database.ref('usuarios/' + userId);
  return usuarioRef.once('value').then((snapshot) => {
    var datos = snapshot.val();
    if (datos.nombre !== nombre){
      var ref = firebase.database().ref("usuarios");
      return ref.orderByChild("nombre").equalTo(nombre).once("value", (snapshot) => {
        var otros = snapshot.val();
        if (otros === null){
          usuarioRef.update({
            nombre: nombre,
          });
        }
        return datos;
      });
    } else {
      return datos;
    }
  });
});

